import { Injectable } from '@nestjs/common';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.transaction(work);
  }
}
