import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export type PrismaDb = Prisma.TransactionClient;

// Um PrismaClient para o app inteiro. Dentro de `UnitOfWork.run`, `db` devolve o client
// da transação em andamento; fora dela, o client normal. Os repositórios só usam `db`.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;
  private readonly context = new AsyncLocalStorage<PrismaDb>();

  // Sem parâmetros no construtor: o Nest trataria qualquer parâmetro como dependência a injetar.
  // O PrismaClient lê DATABASE_URL sozinho.
  constructor() {
    this.client = new PrismaClient();
  }

  get db(): PrismaDb {
    return this.context.getStore() ?? this.client;
  }

  // Reutiliza a transação aberta quando já está dentro de uma (chamadas aninhadas)
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return work();
    return this.client.$transaction((tx) => this.context.run(tx, work), { maxWait: 5000, timeout: 15000 });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
