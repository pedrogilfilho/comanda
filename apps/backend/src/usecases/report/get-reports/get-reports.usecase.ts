import { Injectable } from '@nestjs/common';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { ClosedAccountRepository } from 'src/domain/repositories/closed-account.repository.interface';
import {
  summarizePayments,
  type PaymentSummary,
} from 'src/domain/entities/closed-account/closed-account.entity';

export interface ReportsView {
  from: Date;
  to: Date;
  revenue: { subtotal: number; serviceFee: number; total: number; accounts: number };
  topEmployees: { name: string; username: string; subtotal: number; orders: number }[];
  topBeers: { name: string; quantity: number; subtotal: number }[];
  topMeats: { name: string; grams: number; subtotal: number }[];
  byCategory: { category: string; subtotal: number }[];
  byTable: { tableIdentifier: string; total: number; accounts: number; averageTicket: number }[]; // com taxa
  averageTicket: number; // por conta fechada (com taxa)
  // Médias em minutos dos pedidos que passaram pela cozinha até ficar prontos (bebida e antigos ficam fora)
  kitchenTimes: { orders: number; waitMin: number; prepMin: number; deliveryMin: number };
  byPayment: PaymentSummary;
}

// Fonte única: as contas fechadas no período. Os pedidos entram só para os rankings.
@Injectable()
export class GetReportsUsecase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly closedAccountRepository: ClosedAccountRepository,
  ) {}

  async execute(from: Date, to: Date): Promise<ReportsView> {
    const accounts = await this.closedAccountRepository.findBetween(from, to);
    const orders = await this.orderRepository.findByClosedAccountIds(accounts.map((a) => a.getId()));
    const [products, users] = await Promise.all([
      this.productRepository.findByIds([
        ...new Set(orders.flatMap((o) => o.getItems().map((i) => i.getProductId()))),
      ]),
      this.userRepository.findByIds([...new Set(orders.map((o) => o.getUserId()))]),
    ]);
    const productById = new Map(products.map((p) => [p.getId(), p]));
    const userById = new Map(users.map((u) => [u.getId(), u]));

    const subtotal = accounts.reduce((s, a) => s + a.getSubtotal(), 0);
    const serviceFee = accounts.reduce((s, a) => s + a.getServiceFee(), 0);
    const total = accounts.reduce((s, a) => s + a.getTotal(), 0);

    // Funcionário que mais vendeu
    const byEmployee = new Map<string, { subtotal: number; orders: number }>();
    for (const o of orders) {
      const cur = byEmployee.get(o.getUserId()) ?? { subtotal: 0, orders: 0 };
      cur.subtotal += o.getTotalAmount();
      cur.orders += 1;
      byEmployee.set(o.getUserId(), cur);
    }
    const topEmployees = [...byEmployee.entries()]
      .map(([userId, v]) => ({
        name: userById.get(userId)?.getName() ?? 'Usuário removido',
        username: userById.get(userId)?.getUsername() ?? '-',
        ...v,
      }))
      .sort((a, b) => b.subtotal - a.subtotal);

    // Itens: cervejas, carnes e categorias
    const beers = new Map<string, { quantity: number; subtotal: number }>();
    const meats = new Map<string, { grams: number; subtotal: number }>();
    const categories = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.getItems()) {
        const p = productById.get(it.getProductId());
        if (!p) continue;
        const sub = it.getSubtotal();
        categories.set(p.getCategory(), (categories.get(p.getCategory()) ?? 0) + sub);
        if (p.getIsMeat()) {
          const m = meats.get(p.getName()) ?? { grams: 0, subtotal: 0 };
          m.grams += it.getQuantity();
          m.subtotal += sub;
          meats.set(p.getName(), m);
        } else if (p.getCategory() === 'BEBIDA' && /cerveja|chope/i.test(p.getName())) {
          const b = beers.get(p.getName()) ?? { quantity: 0, subtotal: 0 };
          b.quantity += it.getQuantity();
          b.subtotal += sub;
          beers.set(p.getName(), b);
        }
      }
    }

    // Vendas por mesa: identificador como foi gravado na conta (vale para contas antigas)
    const tableTotals = new Map<string, { total: number; accounts: number }>();
    for (const a of accounts) {
      const cur = tableTotals.get(a.getTableIdentifier()) ?? { total: 0, accounts: 0 };
      cur.total += a.getTotal();
      cur.accounts += 1;
      tableTotals.set(a.getTableIdentifier(), cur);
    }
    const byTable = [...tableTotals.entries()]
      .map(([tableIdentifier, v]) => ({
        tableIdentifier,
        ...v,
        averageTicket: Math.round(v.total / v.accounts),
      }))
      .sort((a, b) => b.total - a.total || a.tableIdentifier.localeCompare(b.tableIdentifier));

    // Tempos da cozinha: só pedidos com início e pronto gravados
    const measured = orders.filter((o) => o.getStartedAt() && o.getReadyAt());
    const avgMin = (pairs: [Date | null, Date | null][]) => {
      const done = pairs.filter((p): p is [Date, Date] => !!p[0] && !!p[1]);
      if (done.length === 0) return 0;
      const total = done.reduce((s, [a, b]) => s + (b.getTime() - a.getTime()), 0);
      return Math.round(total / done.length / 60_000);
    };
    const kitchenTimes = {
      orders: measured.length,
      waitMin: avgMin(measured.map((o) => [o.getCreatedAt(), o.getStartedAt()])),
      prepMin: avgMin(measured.map((o) => [o.getStartedAt(), o.getReadyAt()])),
      deliveryMin: avgMin(measured.map((o) => [o.getReadyAt(), o.getDeliveredAt()])),
    };

    return {
      from,
      to,
      revenue: { subtotal, serviceFee, total, accounts: accounts.length },
      topEmployees,
      topBeers: [...beers.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.quantity - a.quantity),
      topMeats: [...meats.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.grams - a.grams),
      byCategory: [...categories.entries()]
        .map(([category, sub]) => ({ category, subtotal: sub }))
        .sort((a, b) => b.subtotal - a.subtotal),
      byTable,
      kitchenTimes,
      averageTicket: accounts.length > 0 ? Math.round(total / accounts.length) : 0,
      byPayment: summarizePayments(accounts.flatMap((a) => a.getPayments())),
    };
  }
}
