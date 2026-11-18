import { GetSettingsUsecase } from 'src/usecases/settings/get/get-settings.usecase';
import { UpdateSettingsUsecase } from 'src/usecases/settings/update/update-settings.usecase';
import { InMemoryAuditLogRepository, InMemorySettingsRepository } from './fakes/in-memory';

function setup() {
  const repo = new InMemorySettingsRepository();
  const logs = new InMemoryAuditLogRepository();
  return { repo, logs, get: new GetSettingsUsecase(repo), update: new UpdateSettingsUsecase(repo, logs) };
}

describe('Configuração do restaurante', () => {
  it('devolve 30 mesas quando nada foi salvo', async () => {
    expect(await setup().get.execute()).toEqual({ totalTables: 30 });
  });

  it('admin muda o total e gera log antes → depois', async () => {
    const s = setup();
    expect(await s.update.execute({ totalTables: 40 }, 'admin')).toEqual({ totalTables: 40 });
    expect(await s.repo.get()).toEqual({ totalTables: 40 });
    expect(s.logs.items[0].getAction()).toBe('CONFIG_ALTERADA');
    expect(s.logs.items[0].getDetails()).toBe('Total de mesas: 30 → 40');
  });

  it.each([0, 201, 2.5, NaN])('recusa total %p', async (n) => {
    await expect(setup().update.execute({ totalTables: n }, 'admin')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('mesmo valor não gera log', async () => {
    const s = setup();
    await s.update.execute({ totalTables: 30 }, 'admin');
    expect(s.logs.items).toHaveLength(0);
  });
});
