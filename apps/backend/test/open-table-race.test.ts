import { OpenTableUsecase } from 'src/usecases/table/open/open-table.usecase';
import { Table } from 'src/domain/entities/table/table.entity';
import { InMemoryAuditLogRepository, InMemoryTableRepository } from './fakes/in-memory';

// Como o banco: cada leitura devolve uma cópia, então duas aberturas simultâneas
// podem ler a mesa livre antes de qualquer uma gravar
class CopyingTableRepository extends InMemoryTableRepository {
  override async findByIdentifier(identifier: string) {
    const t = this.items.find((i) => i.getIdentifier() === identifier);
    return t
      ? Table.with({
          id: t.getId(),
          identifier: t.getIdentifier(),
          capacity: t.getCapacity(),
          status: t.getStatus(),
          clientName: t.getClientName(),
          openedAt: t.getOpenedAt(),
          openedBy: t.getOpenedBy(),
          createdAt: t.getCreatedAt(),
          updatedAt: t.getUpdatedAt(),
        })
      : null;
  }
}

function setup() {
  const tables = new CopyingTableRepository();
  return { tables, usecase: new OpenTableUsecase(tables, new InMemoryAuditLogRepository()) };
}

describe('Abrir a mesma mesa ao mesmo tempo', () => {
  it('mesa livre já existente: só um abre, o outro recebe "já está ocupada"', async () => {
    const s = setup();
    s.tables.items = [Table.create({ identifier: '7' })];
    const results = await Promise.allSettled([
      s.usecase.execute({ identifier: '7', clientName: 'Ana' }, 'ana'),
      s.usecase.execute({ identifier: '7', clientName: 'Bia' }, 'bruno'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'TABLE_ALREADY_OPEN' },
    });
    expect(s.tables.items[0].getOpenedBy()).toBe('ana');
  });

  it('mesa nunca aberta: só um cria, o outro recebe "já está ocupada"', async () => {
    const s = setup();
    const results = await Promise.allSettled([
      s.usecase.execute({ identifier: '17' }, 'ana'),
      s.usecase.execute({ identifier: '17' }, 'bruno'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'TABLE_ALREADY_OPEN' },
    });
    expect(s.tables.items).toHaveLength(1);
  });
});
