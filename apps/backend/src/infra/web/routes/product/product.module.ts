import { Module } from '@nestjs/common';
import { ListProductsUsecase } from 'src/usecases/product/list/list-products.usecase';
import { CreateProductUsecase } from 'src/usecases/product/create/create-product.usecase';
import { RemoveProductUsecase } from 'src/usecases/product/remove/remove-product.usecase';
import { UpdateProductUsecase } from 'src/usecases/product/update/update-product.usecase';
import { InventoryUsecase } from 'src/usecases/product/inventory/inventory.usecase';
import { AdjustStockUsecase } from 'src/usecases/product/adjust-stock/adjust-stock.usecase';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [
    ListProductsUsecase,
    CreateProductUsecase,
    RemoveProductUsecase,
    AdjustStockUsecase,
    UpdateProductUsecase,
  ],
})
export class ProductModule {}
