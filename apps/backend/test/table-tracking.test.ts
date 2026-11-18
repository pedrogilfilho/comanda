import { OpenTableUsecase } from 'src/usecases/table/open/open-table.usecase';
import { CloseTableUsecase } from 'src/usecases/table/close/close-table.usecase';
import { GetReportsUsecase } from 'src/usecases/report/get-reports/get-reports.usecase';
import { ClosedAccount } from 'src/domain/entities/closed-account/closed-account.entity';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryClosedAccountRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryTableRepository,
  InMemoryUserRepository,
} from './fakes/in-memory';
import { cerveja, orderFor } from './fakes/builders';

function setup() {
  const orders = new InMemoryOrderRepository();
  const tables = new InMemoryTableRepository();
  const accounts = new InMemoryClosedAccountRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([orders, tables, accounts, logs]);
  return {
    open: new OpenTableUsecase(tables, logs),
    close: new CloseTableUsecase(uow, tables, orders, accounts, logs),
    reports: new GetReportsUsecase(
      orders,
      new InMemoryProductRepository(),
      new InMemoryUserRepository(),
      accounts,
    ),
    orders,
    tables,
    accounts,
  };
}

const account = (tableIdentifier: string, subtotal: number) =>
  ClosedAccount.create({
    tableId: 't',
    tableIdentifier,
    clientName: null,
    openedAt: new Date(),
    closedBy: 'carlos',
    subtotal,
    serviceFee: 0,
    payments: [],
  });

describe('Rastreabilidade das mesas', () => {
  it('abre a mesa 7 guardando quem abriu', async () => {
    const s = setup();
    await s.open.execute({ identifier: '7', clientName: 'Ana' }, 'ana');
    expect(s.tables.items[0].getOpenedBy()).toBe('ana');
  });

  it('reabrir uma mesa livre troca quem abriu', async () => {
    const s = setup();
    await s.open.execute({ identifier: '7' }, 'ana');
    s.tables.items[0].free();
    expect(s.tables.items[0].getOpenedBy()).toBeNull();
    await s.open.execute({ identifier: '7' }, 'bruno');
    expect(s.tables.items[0].getOpenedBy()).toBe('bruno');
  });

  it('a conta guarda quem abriu a mesa e a mesa liberada esquece', async () => {
    const s = setup();
    await s.open.execute({ identifier: '7' }, 'ana');
    const table = s.tables.items[0];
    const order = orderFor(table, [{ product: cerveja(), quantity: 1 }]);
    order.updateStatus('PREPARING');
    order.updateStatus('READY');
    order.updateStatus('DELIVERED');
    s.orders.items = [order];

    await s.close.execute({
      tableId: table.getId(),
      actor: 'carlos',
      actorRole: 'GERENTE',
      payments: [{ method: 'PIX', amount: 1650, installments: 1 }],
    });

    expect(s.accounts.items[0].getOpenedBy()).toBe('ana');
    expect(table.getOpenedBy()).toBeNull();
  });

  it('vendas por mesa: soma, conta e ticket, da que mais vendeu; "5" e "05" são mesas diferentes', async () => {
    const s = setup();
    s.accounts.items = [account('5', 10000), account('5', 5000), account('05', 8000), account('2', 20000)];
    const r = await s.reports.execute(new Date(0), new Date());
    expect(r.byTable).toEqual([
      { tableIdentifier: '2', total: 20000, accounts: 1, averageTicket: 20000 },
      { tableIdentifier: '5', total: 15000, accounts: 2, averageTicket: 7500 },
      { tableIdentifier: '05', total: 8000, accounts: 1, averageTicket: 8000 },
    ]);
  });
});
