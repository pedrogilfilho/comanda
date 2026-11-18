import { Global, Module } from '@nestjs/common';
import { env } from 'src/config/env';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { ClosedAccountRepository } from 'src/domain/repositories/closed-account.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import { SettingsRepository } from 'src/domain/repositories/settings.repository.interface';
import { PrismaModule } from './services/database/prisma/prisma.module';
import { PrismaOrderRepository } from './repositories/prisma/order/prisma-order.repository';
import { PrismaProductRepository } from './repositories/prisma/product/prisma-product.repository';
import { PrismaTableRepository } from './repositories/prisma/table/prisma-table.repository';
import { PrismaSettingsRepository } from './repositories/prisma/settings/prisma-settings.repository';
import { PrismaUserRepository } from './repositories/prisma/user/prisma-user.repository';
import { PrismaAuditLogRepository } from './repositories/prisma/audit-log/prisma-audit-log.repository';
import { PrismaClosedAccountRepository } from './repositories/prisma/closed-account/prisma-closed-account.repository';
import { PrismaStockMovementRepository } from './repositories/prisma/stock-movement/prisma-stock-movement.repository';
import { HashingService } from './services/hashing/hashing.service';
import { JwtService } from './services/jwt/jwt.service';
import { TwoFactorService } from './services/two-factor/two-factor.service';
import { AuthSessionService } from './services/auth-session/auth-session.service';

const repositories = [
  { provide: OrderRepository, useClass: PrismaOrderRepository },
  { provide: ProductRepository, useClass: PrismaProductRepository },
  { provide: TableRepository, useClass: PrismaTableRepository },
  { provide: UserRepository, useClass: PrismaUserRepository },
  { provide: AuditLogRepository, useClass: PrismaAuditLogRepository },
  { provide: ClosedAccountRepository, useClass: PrismaClosedAccountRepository },
  { provide: StockMovementRepository, useClass: PrismaStockMovementRepository },
  { provide: SettingsRepository, useClass: PrismaSettingsRepository },
];

const services = [
  HashingService,
  AuthSessionService,
  { provide: JwtService, useFactory: () => new JwtService(env().JWT_SECRET) },
  {
    provide: TwoFactorService,
    useFactory: () => new TwoFactorService(env().TWO_FACTOR_KEY ?? env().JWT_SECRET),
  },
];

// Repositórios (ligados às interfaces do domínio) e serviços de infra, disponíveis para todo módulo
@Global()
@Module({
  imports: [PrismaModule],
  providers: [...repositories, ...services],
  exports: [
    ...repositories.map((r) => r.provide),
    HashingService,
    AuthSessionService,
    JwtService,
    TwoFactorService,
  ],
})
export class CoreModule {}
