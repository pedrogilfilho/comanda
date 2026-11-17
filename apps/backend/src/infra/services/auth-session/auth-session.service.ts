import { Injectable } from '@nestjs/common';
import { SESSION_HOURS, type UserRole } from '@comanda/shared';
import { User } from 'src/domain/entities/user/user.entity';
import { JwtService } from 'src/infra/services/jwt/jwt.service';

export interface LoggedUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: UserRole;
  needsPasswordChange: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  status: 'OK';
  accessToken: string;
  user: LoggedUser;
}

export function toLoggedUser(user: User): LoggedUser {
  return {
    id: user.getId(),
    username: user.getUsername(),
    name: user.getName(),
    email: user.getEmail(),
    role: user.getRole(),
    needsPasswordChange: user.getNeedsPasswordChange(),
    twoFactorEnabled: user.getTwoFactorEnabled(),
  };
}

@Injectable()
export class AuthSessionService {
  constructor(private readonly jwtService: JwtService) {}

  issue(user: User): AuthSession {
    // Um turno de trabalho sem deslogar
    const accessToken = this.jwtService.sign(
      { userId: user.getId(), username: user.getUsername(), name: user.getName(), role: user.getRole() },
      `${SESSION_HOURS}h`,
    );
    return { status: 'OK', accessToken, user: toLoggedUser(user) };
  }
}
