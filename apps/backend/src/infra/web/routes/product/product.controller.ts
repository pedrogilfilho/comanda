import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ListProductsUsecase } from 'src/usecases/product/list/list-products.usecase';
import { CreateProductUsecase } from 'src/usecases/product/create/create-product.usecase';
import { RemoveProductUsecase } from 'src/usecases/product/remove/remove-product.usecase';
import { UpdateProductUsecase } from 'src/usecases/product/update/update-product.usecase';
import { AdjustStockUsecase } from 'src/usecases/product/adjust-stock/adjust-stock.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { AdjustStockDto, CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Controller('products')
export class ProductController {
  constructor(
    private readonly listProductsUsecase: ListProductsUsecase,
    private readonly createProductUsecase: CreateProductUsecase,
    private readonly removeProductUsecase: RemoveProductUsecase,
    private readonly adjustStockUsecase: AdjustStockUsecase,
    private readonly updateProductUsecase: UpdateProductUsecase,
  ) {}

  @Get()
  list() {
    return this.listProductsUsecase.execute();
  }

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: RequestUser, @Body() body: CreateProductDto) {
    return this.createProductUsecase.execute(body, user.username);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.updateProductUsecase.execute(id, body, user.username);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.removeProductUsecase.execute(id, user.username);
  }

  @Roles('ADMIN')
  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  adjustStock(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdjustStockDto,
  ) {
    return this.adjustStockUsecase.execute({
      productId: id,
      stock: body.stock,
      type: body.type,
      reason: body.reason,
      actor: user.username,
    });
  }
}
