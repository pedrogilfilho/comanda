import { loadEnv } from 'src/config/env';

describe('env', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_SECRET: 'um-segredo-bem-comprido' };

  it('não sobe sem JWT_SECRET', () => {
    expect(() => loadEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('recusa segredo curto', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'curto' })).toThrow(/16 caracteres/);
  });

  it('separa as origens do CORS e aplica os padrões', () => {
    const env = loadEnv({ ...base, CORS_ORIGINS: 'http://a.com, https://b.com' });
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'https://b.com']);
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
  });
});
