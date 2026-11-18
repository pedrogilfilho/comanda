import { Injectable } from '@nestjs/common';
import type { User as UserRow } from '@prisma/client';
import type { UserRole } from '@comanda/shared';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { User } from 'src/domain/entities/user/user.entity';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toEntity(raw: UserRow): User {
    return User.with({
      id: raw.id,
      username: raw.username,
      name: raw.name,
      email: raw.email,
      password: raw.password,
      role: raw.role as UserRole,
      needsPasswordChange: raw.needsPasswordChange,
      active: raw.active,
      deactivatedAt: raw.deactivatedAt,
      twoFactorEnabled: raw.twoFactorEnabled,
      twoFactorSecret: raw.twoFactorSecret,
      twoFactorRecoveryCodes: raw.twoFactorRecoveryCodes ?? [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async create(user: User): Promise<void> {
    await this.prisma.db.user.create({
      data: {
        id: user.getId(),
        username: user.getUsername(),
        name: user.getName(),
        email: user.getEmail(),
        password: user.getPassword(),
        role: user.getRole(),
        needsPasswordChange: user.getNeedsPasswordChange(),
        active: user.getActive(),
        deactivatedAt: user.getDeactivatedAt(),
        twoFactorEnabled: user.getTwoFactorEnabled(),
        twoFactorSecret: user.getTwoFactorSecret(),
        twoFactorRecoveryCodes: user.getTwoFactorRecoveryCodes(),
        createdAt: user.getCreatedAt(),
        updatedAt: user.getUpdatedAt(),
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.prisma.db.user.findUnique({ where: { id } });
    return raw ? this.toEntity(raw) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const raw = await this.prisma.db.user.findFirst({
      where: { username: { equals: username.trim(), mode: 'insensitive' } },
    });
    return raw ? this.toEntity(raw) : null;
  }

  async findByName(name: string): Promise<User | null> {
    const raw = await this.prisma.db.user.findUnique({ where: { name } });
    return raw ? this.toEntity(raw) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const raw = await this.prisma.db.user.findUnique({ where: { email } });
    return raw ? this.toEntity(raw) : null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.db.user.findMany({ where: { id: { in: ids } } });
    return rows.map((r) => this.toEntity(r));
  }

  async findAll(): Promise<User[]> {
    const rows = await this.prisma.db.user.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map((r) => this.toEntity(r));
  }

  async update(user: User): Promise<void> {
    await this.prisma.db.user.update({
      where: { id: user.getId() },
      data: {
        name: user.getName(),
        role: user.getRole(),
        password: user.getPassword(),
        needsPasswordChange: user.getNeedsPasswordChange(),
        active: user.getActive(),
        deactivatedAt: user.getDeactivatedAt(),
        twoFactorEnabled: user.getTwoFactorEnabled(),
        twoFactorSecret: user.getTwoFactorSecret(),
        twoFactorRecoveryCodes: user.getTwoFactorRecoveryCodes(),
        updatedAt: user.getUpdatedAt(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.user.delete({ where: { id } });
  }
}
