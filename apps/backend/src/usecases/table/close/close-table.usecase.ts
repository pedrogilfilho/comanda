import { Injectable } from '@nestjs/common';
import { MAX_INSTALLMENTS, PAYMENT_LABEL, PAYMENT_METHODS, serviceFee, type UserRole } from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ClosedAccountRepository } from 'src/domain/repositories/closed-account.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { ClosedAccount, type AccountPayment } from 'src/domain/entities/closed-account/closed-account.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { AppError } from 'src/shared/errors/app-error';
import { formatMoney } from 'src/shared/utils/format';

export interface CloseTableInput {
  tableId: string;
  actor: string;
  actorRole: UserRole;
  payments: AccountPayment[];
}

@Injectable()
export class CloseTableUsecase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tableRepository: TableRepository,
    private readonly orderRepository: OrderRepository,
    private readonly closedAccountRepository: ClosedAccountRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute({
    tableId,
    actor,
    actorRole,
    payments,
  }: CloseTableInput): Promise<{ success: boolean; total: number }> {
    const table = await this.tableRepository.findById(tableId);
    if (!table) throw AppError.notFound('Mesa não encontrada');
    if (!table.isOpen()) throw AppError.badRequest('TABLE_NOT_OPEN', 'Esta mesa não está aberta');

    const orders = await this.orderRepository.findActiveByTableId(tableId);

    // Regra de negócio: não fechar com pedidos ainda na cozinha (exceto administrador)
    if (orders.some((o) => o.isInKitchen()) && actorRole !== 'ADMIN') {
      throw AppError.badRequest(
        'ORDERS_IN_KITCHEN',
        'Há pedidos ainda em preparo nesta mesa. Aguarde a cozinha finalizar para fechar a conta.',
      );
    }

    // Mesa aberta e fechada sem nenhum pedido: só libera, não entra no histórico de contas
    if (orders.length === 0) {
      await this.uow.run(async () => {
        table.free();
        await this.tableRepository.update(table);
        await this.auditLogRepository.create(
          AuditLog.create('CONTA_FECHADA', actor, `Mesa ${table.getIdentifier()} — liberada sem consumo`),
        );
      });
      return { success: true, total: 0 };
    }

    const subtotal = orders.reduce((s, o) => s + o.getTotalAmount(), 0);
    const fee = serviceFee(subtotal);
    const total = subtotal + fee;
    const paid = total > 0 ? CloseTableUsecase.validatePayments(payments, total) : [];

    const account = ClosedAccount.create({
      tableId,
      tableIdentifier: table.getIdentifier(),
      clientName: table.getClientName(),
      openedAt: table.getOpenedAt() ?? orders[0].getCreatedAt(),
      closedBy: actor,
      openedBy: table.getOpenedBy(),
      subtotal,
      serviceFee: fee,
      payments: paid,
    });

    // Conta, pedidos e mesa mudam juntos ou não mudam
    await this.uow.run(async () => {
      await this.closedAccountRepository.create(account);
      await this.orderRepository.closeByTableId(tableId, account.getId());
      table.free();
      await this.tableRepository.update(table);
      const paidWith = paid
        .map(
          (p) =>
            `${PAYMENT_LABEL[p.method]}${p.installments > 1 ? ` ${p.installments}x` : ''} ${formatMoney(p.amount)}`,
        )
        .join(' + ');
      await this.auditLogRepository.create(
        AuditLog.create(
          'CONTA_FECHADA',
          actor,
          `Mesa ${table.getIdentifier()} — Total ${formatMoney(account.getTotal())}${paidWith ? ` (${paidWith})` : ''}`,
        ),
      );
    });

    return { success: true, total: account.getTotal() };
  }

  // Regra de negócio: a soma das formas de pagamento deve fechar exatamente o total
  static validatePayments(payments: AccountPayment[], total: number): AccountPayment[] {
    if (!Array.isArray(payments) || payments.length === 0) {
      throw AppError.badRequest('PAYMENT_MISMATCH', 'Informe a forma de pagamento da conta');
    }
    const normalized = payments.map((p) => {
      if (!PAYMENT_METHODS.includes(p?.method))
        throw AppError.badRequest('VALIDATION', 'Forma de pagamento inválida');
      if (!Number.isInteger(p.amount) || p.amount <= 0)
        throw AppError.badRequest('VALIDATION', 'Valor de pagamento inválido');
      const installments = p.method === 'CREDITO' ? Number(p.installments ?? 1) : 1;
      if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS) {
        throw AppError.badRequest('VALIDATION', `O parcelamento deve ser de 1 a ${MAX_INSTALLMENTS} vezes`);
      }
      return { method: p.method, amount: p.amount, installments };
    });
    const sum = normalized.reduce((s, p) => s + p.amount, 0);
    if (sum !== total) {
      throw AppError.badRequest(
        'PAYMENT_MISMATCH',
        `A soma dos pagamentos (${formatMoney(sum)}) precisa ser igual ao total da conta (${formatMoney(total)})`,
      );
    }
    return normalized;
  }
}
