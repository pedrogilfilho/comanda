import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_PASSWORD } from '@comanda/shared';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { HashingService } from 'src/infra/services/hashing/hashing.service';

@Injectable()
export class ResetPasswordUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  // Admin reseta a senha de um usuário para a padrão (troca obrigatória no próximo login)
  async execute(userId: string, actor: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const hashed = await this.hashingService.hash(DEFAULT_PASSWORD);
    user.updatePassword(hashed);
    user.requirePasswordChange();
    await this.userRepository.update(user);

    await this.auditLogRepository.create(
      AuditLog.create('SENHA_RESETADA', actor, `${user.getName()} (${user.getUsername()})`),
    );
    return { success: true };
  }
}
