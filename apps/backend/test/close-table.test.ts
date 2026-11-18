import { CloseTableUsecase } from 'src/usecases/table/close/close-table.usecase';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryClosedAccountRepository,
  InMemoryOrderRepository,
  InMemoryTableRepository,
} from './fakes/in-memory';
import { cerveja, openTable, orderFor } from './fakes/builders';

function setup() {
  const orders = new InMemoryOrderRepository();
  const tables = new InMemoryTableRepository();
  const accounts = new InMemoryClosedAccountRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([orders, tables, accounts, logs]);
  return {
    usecase: new CloseTableUsecase(uow, tables, orders, accounts, logs),
    orders,
    tables,
    accounts,
    logs,
  };
}

describe('CloseTableUsecase', () => {
  it('fecha a conta com taxa de 10% e pagamento dividido', async () => {
    const s = setup();
    const table = openTable();
    const beer = cerveja();
    const order = orderFor(table, [{ product: beer, quantity: 4 }]); // R$ 60,00
    order.updateStatus('PREPARING');
    order.updateStatus('READY');
    order.updateStatus('DELIVERED');
    s.tables.items = [table];
    s.orders.items = [order];

    const res = await s.usecase.execute({
      tableId: table.getId(),
      actor: 'carlos',
      actorRole: 'GARCOM',
      payments: [
        { method: 'PIX', amount: 3600, installments: 1 },
        { method: 'CREDITO', amount: 3000, installments: 3 },
      ],
    });

    expect(res.total).toBe(6600);
    expect(s.accounts.items[0].getServiceFee()).toBe(600);
    expect(s.orders.items[0].getStatus()).toBe('CLOSED');
    expect(s.orders.items[0].getClosedAccountId()).toBe(s.accounts.items[0].getId());
    expect(table.isOpen()).toBe(false);
  });

  it('recusa quando a soma dos pagamentos não bate com o total', async () => {
    const s = setup();
    const table = openTable();
    const order = orderFor(table, [{ product: cerveja(), quantity: 1 }]);
    order.updateStatus('PREPARING');
    order.updateStatus('READY');
    order.updateStatus('DELIVERED');
    s.tables.items = [table];
    s.orders.items = [order];

    await expect(
      s.usecase.execute({
        tableId: table.getId(),
        actor: 'carlos',
        actorRole: 'GARCOM',
        payments: [{ method: 'PIX', amount: 1500, installments: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
    expect(s.accounts.items).toHaveLength(0);
    expect(table.isOpen()).toBe(true);
  });

  it('garçom não fecha com pedido na cozinha; admin fecha', async () => {
    const s = setup();
    const table = openTable();
    s.tables.items = [table];
    s.orders.items = [orderFor(table, [{ product: cerveja(), quantity: 1 }])]; // PENDING

    await expect(
      s.usecase.execute({
        tableId: table.getId(),
        actor: 'carlos',
        actorRole: 'GARCOM',
        payments: [{ method: 'DINHEIRO', amount: 1650, installments: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDERS_IN_KITCHEN' });

    const res = await s.usecase.execute({
      tableId: table.getId(),
      actor: 'admin',
      actorRole: 'ADMIN',
      payments: [{ method: 'DINHEIRO', amount: 1650, installments: 1 }],
    });
    expect(res.total).toBe(1650);
  });

  it('mesa sem consumo só é liberada, sem conta no histórico', async () => {
    const s = setup();
    const table = openTable();
    s.tables.items = [table];
    const res = await s.usecase.execute({
      tableId: table.getId(),
      actor: 'carlos',
      actorRole: 'GARCOM',
      payments: [],
    });
    expect(res.total).toBe(0);
    expect(s.accounts.items).toHaveLength(0);
    expect(table.isOpen()).toBe(false);
  });

  it('limita o parcelamento', () => {
    expect(() =>
      CloseTableUsecase.validatePayments([{ method: 'CREDITO', amount: 100, installments: 13 }], 100),
    ).toThrow(/parcelamento/);
    expect(
      CloseTableUsecase.validatePayments([{ method: 'PIX', amount: 100, installments: 5 }], 100)[0]
        .installments,
    ).toBe(1);
  });
});
