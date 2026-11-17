import { Global, Module } from '@nestjs/common';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { PrismaService } from './prisma.service';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

@Global()
@Module({
  providers: [PrismaService, { provide: UnitOfWork, useClass: PrismaUnitOfWork }],
  exports: [PrismaService, UnitOfWork],
})
export class PrismaModule {}
