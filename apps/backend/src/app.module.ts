import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './infra/core.module';
import { AuthGuard } from './infra/web/auth/auth.guard';
import { RolesGuard } from './infra/web/auth/roles.guard';
import { AppExceptionFilter } from './shared/errors/app-exception.filter';
import { AuthModule } from './infra/web/routes/auth/auth.module';
import { UserModule } from './infra/web/routes/user/user.module';
import { ProductModule } from './infra/web/routes/product/product.module';
import { TableModule } from './infra/web/routes/table/table.module';
import { OrderModule } from './infra/web/routes/order/order.module';
import { ReportModule } from './infra/web/routes/report/report.module';

@Module({
  imports: [
    // Limite padrão; só as rotas com @UseGuards(ThrottlerGuard) o aplicam (login e 2ª etapa)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    CoreModule,
    AuthModule,
    UserModule,
    ProductModule,
    TableModule,
    OrderModule,
    ReportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
})
export class AppModule {}
