import { Injectable } from '@nestjs/common';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { ProductCategory, PRODUCT_CATEGORIES } from 'src/domain/entities/product/product.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { AppError } from 'src/shared/errors/app-error';

export interface UpdateProductInput {
  name: string;
  description?: string;
  category: ProductCategory;
  price?: number; // centavos por unidade (não carne)
  pricePerKg?: number; // centavos por kg (carne)
  minGrams?: number;
}

// Edita o cadastro do item. Estoque fica de fora (só muda pela tela de Estoque),
// e carne não troca de categoria com item por unidade: as unidades do estoque são outras.
@Injectable()
export class UpdateProductUsecase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(id: string, input: UpdateProductInput, actor: string): Promise<{ id: string }> {
    const product = await this.productRepository.findById(id);
    if (!product || !product.getAvailable()) throw AppError.notFound('Item não encontrado');

    const name = (input.name || '').trim();
    if (!name) throw AppError.badRequest('VALIDATION', 'Nome do item é obrigatório');
    if (!PRODUCT_CATEGORIES.includes(input.category))
      throw AppError.badRequest('VALIDATION', 'Categoria inválida');
    if (product.getIsMeat() !== (input.category === 'CARNE')) {
      throw AppError.badRequest(
        'VALIDATION',
        product.getIsMeat()
          ? 'Carne não pode mudar para outra categoria'
          : 'Um item por unidade não pode virar carne',
      );
    }
    const sameName = await this.productRepository.findByName(name);
    if (sameName && sameName.getId() !== id) {
      throw AppError.badRequest('VALIDATION', 'Já existe um item com esse nome no cardápio');
    }

    if (product.getIsMeat()) {
      if (!Number.isInteger(input.pricePerKg) || input.pricePerKg! <= 0)
        throw AppError.badRequest('VALIDATION', 'Informe o preço por kg');
      if (input.minGrams != null && (!Number.isInteger(input.minGrams) || input.minGrams <= 0)) {
        throw AppError.badRequest('VALIDATION', 'O pedido mínimo em gramas precisa ser maior que zero');
      }
    } else if (!Number.isInteger(input.price) || input.price! <= 0) {
      throw AppError.badRequest('VALIDATION', 'Informe o preço do item');
    }

    product.edit({
      name,
      description: input.description?.trim() || null,
      category: input.category,
      price: input.price,
      pricePerKg: input.pricePerKg,
      minGrams: input.minGrams,
    });
    await this.productRepository.updateDetails(product);
    await this.auditLogRepository.create(
      AuditLog.create('ITEM_EDITADO', actor, `${name} (${input.category})`),
    );
    return { id };
  }
}
