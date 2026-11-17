import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { toLoggedUser, type LoggedUser } from 'src/infra/services/auth-session/auth-session.service';
import { AppError } from 'src/shared/errors/app-error';

// Dados atuais do usuário logado: o frontend chama ao abrir o app, em vez de confiar no localStorage
@Injectable()
export class GetMeUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<LoggedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw AppError.notFound('Usuário não encontrado');
    return toLoggedUser(user);
  }
}
