import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';

@Injectable()
export class PrismaStockMovementRepository extends StockMovementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(m: StockMovement): Promise<void> {
    await this.prisma.db.estoqueMovimentacao.create({
      data: {
        id: m.getId(),
        productId: m.getProductId(),
        quantidadeAnterior: m.getBefore(),
        quantidadeAtual: m.getAfter(),
        tipoMovimentacao: m.getType(),
        pedidoId: m.getOrderId(),
        actor: m.getActor(),
        nota: m.getNote(),
        createdAt: m.getCreatedAt(),
      },
    });
  }
}
