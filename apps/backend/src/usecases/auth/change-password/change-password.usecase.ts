import { Injectable } from '@nestjs/common';
import { PASSWORD_MIN_LENGTH } from '@comanda/shared';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { HashingService } from 'src/infra/services/hashing/hashing.service';
import { AppError } from 'src/shared/errors/app-error';

// Mesma regra do frontend: tamanho mínimo e não pode ser só números
export function passwordProblem(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`;
  if (/^\d+$/.test(password)) return 'A senha não pode ter só números';
  return null;
}

@Injectable()
export class ChangePasswordUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
  ) {}

  async execute(userId: string, newPassword: string, currentPassword?: string): Promise<{ success: boolean }> {
    const problem = passwordProblem(newPassword);
    if (problem) throw AppError.badRequest('VALIDATION', problem);

    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('Usuário não encontrado');

    // Fora do primeiro acesso, trocar a senha exige saber a atual (um token roubado não tranca o dono)
    if (!user.getNeedsPasswordChange()) {
      const ok = currentPassword ? await this.hashingService.compare(currentPassword, user.getPassword()) : false;
      if (!ok) throw AppError.badRequest('VALIDATION', 'Senha atual incorreta');
    }
    if (await this.hashingService.compare(newPassword, user.getPassword())) {
      throw AppError.badRequest('VALIDATION', 'A nova senha precisa ser diferente da atual');
    }

    user.updatePassword(await this.hashingService.hash(newPassword));
    await this.userRepository.update(user);
    return { success: true };
  }
}
