import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { UserRole } from '@comanda/shared';

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface ChallengePayload {
  userId: string;
  step: 'verify' | 'setup';
}

// O segredo vem validado do env (config/env.ts); aqui não existe fallback.
@Injectable()
export class JwtService {
  constructor(private readonly secret: string) {}

  sign(payload: SessionPayload, expiresIn: string): string {
    return jwt.sign(payload, this.secret, { expiresIn } as jwt.SignOptions);
  }

  verify(token: string): SessionPayload {
    const payload = jwt.verify(token, this.secret) as jwt.JwtPayload & Partial<SessionPayload>;
    if (!payload.userId || payload.purpose === '2fa') throw new Error('Token inválido');
    return payload as SessionPayload;
  }

  // Token provisório do login em 2 etapas: não dá acesso ao sistema, só à tela do código
  signChallenge(payload: ChallengePayload, expiresIn: string = '10m'): string {
    return jwt.sign({ ...payload, purpose: '2fa' }, this.challengeSecret(), { expiresIn } as jwt.SignOptions);
  }

  verifyChallenge(token: string): ChallengePayload {
    const payload = jwt.verify(token, this.challengeSecret()) as jwt.JwtPayload & Partial<ChallengePayload> & { purpose?: string };
    if (payload.purpose !== '2fa' || !payload.userId || !payload.step) throw new Error('Token de verificação inválido');
    return { userId: payload.userId, step: payload.step };
  }

  private challengeSecret(): string {
    return `${this.secret}:2fa-challenge`;
  }
}
