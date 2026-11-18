import type { OrderStatus } from '@comanda/shared';
import { GetReportsUsecase } from 'src/usecases/report/get-reports/get-reports.usecase';
import { ClosedAccount } from 'src/domain/entities/closed-account/closed-account.entity';
import { Order, type OrderTimes } from 'src/domain/entities/order/order.entity';
import {
  InMemoryClosedAccountRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryUserRepository,
} from './fakes/in-memory';

const t0 = new Date('2026-11-18T18:00:00Z').getTime();
const at = (min: number | null) => (min === null ? null : new Date(t0 + min * 60_000));

const order = (accountId: string, status: OrderStatus, t: [number | null, number | null, number | null]) => {
  const times: OrderTimes = { startedAt: at(t[0]), readyAt: at(t[1]), deliveredAt: at(t[2]) };
  return Order.with({
    id: `o${Math.random()}`,
    tableId: 't',
    userId: 'u',
    status,
    totalAmount: 0,
    notes: null,
    items: [],
    closedAccountId: accountId,
    times,
    createdAt: at(0)!,
    updatedAt: at(0)!,
  });
};

describe('Relatório: tempos da cozinha', () => {
  it('médias só com os pedidos que têm as duas pontas', async () => {
    const accounts = new InMemoryClosedAccountRepository();
    const orders = new InMemoryOrderRepository();
    const acc = ClosedAccount.create({
      tableId: 't',
      tableIdentifier: '1',
      clientName: null,
      openedAt: at(0)!,
      closedBy: 'g',
      subtotal: 0,
      serviceFee: 0,
      payments: [],
    });
    accounts.items = [acc];
    orders.items = [
      order(acc.getId(), 'CLOSED', [4, 24, 26]), // espera 4, preparo 20, entrega 2
      order(acc.getId(), 'CLOSED', [6, 36, 40]), // espera 6, preparo 30, entrega 4
      order(acc.getId(), 'CANCELLED', [2, null, null]), // cancelado em preparo: fora (não terminou)
      order(acc.getId(), 'CLOSED', [null, null, null]), // antigo: fora de tudo
    ];
    const usecase = new GetReportsUsecase(
      orders,
      new InMemoryProductRepository(),
      new InMemoryUserRepository(),
      accounts,
    );
    const r = await usecase.execute(new Date(0), new Date(t0 + 86_400_000));
    expect(r.kitchenTimes).toEqual({ orders: 2, waitMin: 5, prepMin: 25, deliveryMin: 3 });
  });

  it('sem pedidos medidos: zeros', async () => {
    const usecase = new GetReportsUsecase(
      new InMemoryOrderRepository(),
      new InMemoryProductRepository(),
      new InMemoryUserRepository(),
      new InMemoryClosedAccountRepository(),
    );
    const r = await usecase.execute(new Date(0), new Date());
    expect(r.kitchenTimes).toEqual({ orders: 0, waitMin: 0, prepMin: 0, deliveryMin: 0 });
  });
});
