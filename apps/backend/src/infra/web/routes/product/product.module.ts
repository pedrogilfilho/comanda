import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ListProductsUsecase } from 'src/usecases/product/list/list-products.usecase';
import { CreateProductUsecase } from 'src/usecases/product/create/create-product.usecase';
import { RemoveProductUsecase } from 'src/usecases/product/remove/remove-product.usecase';
import { AdjustStockUsecase } from 'src/usecases/product/adjust-stock/adjust-stock.usecase';

@Module({
  controllers: [ProductController],
  providers: [ListProductsUsecase, CreateProductUsecase, RemoveProductUsecase, AdjustStockUsecase],
})
export class ProductModule {}
