# Etapa 1 — Salão com mesas fixas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mapa de mesas 1..N (N configurável pelo admin, padrão 30), abrir mesa tocando nela, botão "Adicionar itens" no topo, garçom que abriu gravado na conta, filtro por mesa nas contas fechadas e ranking "Vendas por mesa".

**Architecture:** Configuração em linha única `RestaurantConfig` (total de mesas) com repositório abstrato + Prisma + fake. As mesas continuam nascendo no banco na primeira abertura; o front monta o mapa juntando 1..N com as mesas ocupadas. `openedBy` vai na mesa ao abrir e é copiado para a conta ao fechar.

**Tech Stack:** NestJS 10 + Prisma 5 + Postgres; Next 14 + Tailwind; Jest (backend, fakes em `apps/backend/test/fakes`), Vitest (front); `packages/shared`.

**Spec:** `docs/superpowers/specs/2026-11-18-salao-itens-cozinha-config-design.md` (seção "Etapa 1 — Salão")

## Global Constraints

- Casos de uso sobre repositórios abstratos + `UnitOfWork` + `AuditLog`; erros com `AppError.badRequest('VALIDATION', msg)` / `AppError.notFound`.
- Valores em centavos. Total de mesas: padrão **30**, mínimo **1**, máximo **200**.
- Mudança de banco só por migration Prisma (`npm run prisma:migrate -w apps/backend -- --name <nome>`); dados existentes continuam válidos (`openedBy` nulo nas contas antigas, exibido como "—").
- Depois de mexer em `packages/shared`: `npm run build:shared`.
- Textos de tela em pt-BR. Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificação de cada tarefa: `npm run lint`, `npm run typecheck`, testes do workspace mexido.

## Review Focus

1. Admin diminui o total com mesa ocupada acima dele → a mesa continua no mapa até fechar (teste em Task 4).
2. Mesa legada com identificador não numérico ("Varanda") ainda aberta → aparece depois das numeradas e pode ser fechada (teste em Task 4).
3. Dois garçons tocam na mesma mesa livre ao mesmo tempo → o segundo recebe "já está ocupada" (regra atual de `OpenTableUsecase`, conferir no navegador em Task 7).
4. `PATCH /settings` com 0, 201, 2,5 ou texto → 400 com mensagem (teste em Task 2).
5. Ranking por mesa com contas de mesas "5" e "05" → são mesas diferentes (identificador como gravado; teste em Task 3).

---

### Task 1: Banco e shared

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration gerada `apps/backend/prisma/migrations/<ts>_salao_mesas/`
- Modify: `packages/shared/src/domain.ts`

**Interfaces:**
- Produces: modelo `RestaurantConfig { id Int @id @default(1); totalTables Int @default(30); updatedAt DateTime @updatedAt; @@map("restaurant_config") }`; `Table.openedBy String?`; `ClosedAccount.openedBy String?`; no shared: `DEFAULT_TOTAL_TABLES = 30`, `MAX_TOTAL_TABLES = 200`, AuditAction `CONFIG_ALTERADA: 'Configuração alterada'`.

- [ ] **Step 1:** Editar o schema e o shared como acima.
- [ ] **Step 2:** Run `npm run prisma:migrate -w apps/backend -- --name salao_mesas` e `npm run build:shared`. Expected: migration criada e aplicada; build sem erro.
- [ ] **Step 3:** Commit `Banco: configuração do restaurante e openedBy em mesa e conta`.

### Task 2: Configuração do restaurante (backend)

**Files:**
- Create: `apps/backend/src/domain/repositories/settings.repository.interface.ts`
- Create: `apps/backend/src/infra/repositories/prisma/settings/prisma-settings.repository.ts`
- Create: `apps/backend/src/usecases/settings/get/get-settings.usecase.ts`, `apps/backend/src/usecases/settings/update/update-settings.usecase.ts`
- Create: `apps/backend/src/infra/web/routes/settings/{settings.controller.ts,settings.module.ts,dto/settings.dto.ts}`; registrar o módulo no app module e o repositório onde os outros são providos.
- Modify: `apps/backend/test/fakes/in-memory.ts` (`InMemorySettingsRepository`, com snapshot)
- Test: `apps/backend/test/settings.test.ts`

**Interfaces:**
- Produces: `type RestaurantSettings = { totalTables: number }`; `abstract class SettingsRepository { get(): Promise<RestaurantSettings>; save(s: RestaurantSettings): Promise<void> }` (Prisma: `upsert` em `id: 1`; `get` devolve o padrão 30 se não houver linha); `GET /settings` → `{ totalTables }` (qualquer logado); `PATCH /settings` body `{ totalTables }` → `{ totalTables }`, `@Roles('ADMIN')`.

- [ ] **Step 1: Testes que falham**

```ts
it('devolve 30 quando nada foi salvo', async () => expect(await s.get.execute()).toEqual({ totalTables: 30 }));
it('admin muda o total e gera log antes → depois', async () => {
  await s.update.execute({ totalTables: 40 }, 'admin');
  expect(await s.repo.get()).toEqual({ totalTables: 40 });
  expect(s.logs.items[0].getAction()).toBe('CONFIG_ALTERADA');
  expect(s.logs.items[0].getDetails()).toBe('Total de mesas: 30 → 40');
});
it.each([0, 201, 2.5, NaN])('recusa total %p', async (n) =>
  await expect(s.update.execute({ totalTables: n }, 'admin')).rejects.toMatchObject({ code: 'VALIDATION' }));
it('mesmo valor não gera log', ...) // total 30 → 30: retorna sem log
```

- [ ] **Step 2:** Run `npm test -w apps/backend -- settings`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar repositório, fake, use cases (validação: inteiro, 1..`MAX_TOTAL_TABLES`), DTO (`@IsInt @Min(1) @Max(200)`), controller e módulo.
- [ ] **Step 4:** Run os testes. Expected: PASS. Run `npm run lint && npm run typecheck`.
- [ ] **Step 5:** Commit `Configuração do restaurante: total de mesas (GET/PATCH /settings)`.

### Task 3: Quem abriu a mesa e vendas por mesa (backend)

**Files:**
- Modify: `apps/backend/src/domain/entities/table/table.entity.ts` (`openedBy`), `closed-account.entity.ts` (`openedBy` no create/with/getter)
- Modify: `apps/backend/src/infra/repositories/prisma/table/prisma-table.repository.ts`, `.../closed-account/prisma-closed-account.repository.ts` (mapear `openedBy` na leitura, create e update)
- Modify: `apps/backend/src/usecases/table/open/open-table.usecase.ts`, `.../close/close-table.usecase.ts`, `.../list/list-tables.usecase.ts`, `apps/backend/src/usecases/report/list-closed-accounts/list-closed-accounts.usecase.ts`, `.../get-reports/get-reports.usecase.ts`
- Modify: `apps/backend/test/fakes/builders.ts` se `openTable()` precisar do novo campo
- Test: `apps/backend/test/close-table.test.ts` (novo caso), `apps/backend/test/open-table.test.ts` (novo), `apps/backend/test/get-reports.test.ts` (novo)

**Interfaces:**
- Produces: `Table.occupy(clientName: string | null, openedBy: string)`, `Table.getOpenedBy(): string | null` (`free()` zera); `ClosedAccount.getOpenedBy(): string | null`; `TableListItem.openedBy: string | null`; `ClosedAccountView.openedBy: string | null`; `ReportsView.byTable: { tableIdentifier: string; total: number; accounts: number; averageTicket: number }[]` (com taxa, ordenado por `total` desc, depois `tableIdentifier` asc; `averageTicket = Math.round(total / accounts)`).

- [ ] **Step 1: Testes que falham**
  - open-table: `abre a mesa 7 guardando quem abriu` → `tables.items[0].getOpenedBy() === 'ana'`; reabrir mesa livre existente troca o `openedBy`.
  - close-table: `a conta guarda quem abriu a mesa` → `accounts.items[0].getOpenedBy() === 'ana'` e a mesa liberada fica com `getOpenedBy() === null`.
  - get-reports: contas mesa "5" (100_00 e 50_00), mesa "05" (80_00), mesa "2" (200_00) → `byTable` = `[{'2',20000,1,20000},{'5',15000,2,7500},{'05',8000,1,8000}]`.
- [ ] **Step 2:** Run `npm test -w apps/backend`. Expected: os novos FAIL.
- [ ] **Step 3:** Implementar. `OpenTableUsecase` passa o `actor`; `Table.create` recebe `openedBy` opcional; o close copia `table.getOpenedBy()` para a conta.
- [ ] **Step 4:** Run testes, lint, typecheck. Expected: tudo PASS.
- [ ] **Step 5:** Commit `Mesa e conta guardam quem abriu; relatório de vendas por mesa`.

### Task 4: Mapa de mesas (lógica pura no front)

**Files:**
- Create: `apps/frontend/src/components/features/tables/tableMap.ts`
- Test: `apps/frontend/src/components/features/tables/tableMap.test.ts`

**Interfaces:**
- Consumes: `Table` de `@/types/api` (ganha `openedBy: string | null`).
- Produces: `type TableSlot = { number: string; table: Table | null }`; `buildTableMap(tables: Table[], total: number): TableSlot[]` — slots "1".."total" (com a mesa ocupada de mesmo identificador, senão `null`), depois as ocupadas numéricas acima do total (em ordem numérica), depois as ocupadas não numéricas (ordem alfabética). Mesas `FREE` do banco não entram por si só.

- [ ] **Step 1: Testes que falham**

```ts
it('gera 1..30 com as ocupadas no lugar', () => {
  const map = buildTableMap([occ('3', 'Ana')], 30);
  expect(map).toHaveLength(30);
  expect(map[2]).toMatchObject({ number: '3', table: { clientName: 'Ana' } });
  expect(map[0].table).toBeNull();
});
it('mantém ocupada acima do total', () => expect(buildTableMap([occ('35')], 30).at(-1)?.number).toBe('35'));
it('mesa com nome vem depois das numeradas', () =>
  expect(buildTableMap([occ('Varanda'), occ('40')], 30).slice(-2).map((s) => s.number)).toEqual(['40', 'Varanda']));
it('mesa livre do banco não duplica slot', () => expect(buildTableMap([free('3')], 30)[2].table).toBeNull());
```

- [ ] **Step 2:** Run `npm test -w apps/frontend -- tableMap`. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `Front: monta o mapa de mesas 1..N`.

### Task 5: Tela Mesas com mapa, abrir tocando e "Adicionar itens"

**Files:**
- Create: `apps/frontend/src/services/settings.ts` (`getSettings()`, `updateSettings(totalTables)`)
- Create: `apps/frontend/src/components/features/tables/PickTableDialog.tsx`
- Create: `apps/frontend/src/components/features/tables/TotalTablesDialog.tsx`
- Modify: `apps/frontend/src/types/api.ts` (`Table.openedBy`), `TablesView.tsx`, `OpenTableDialog.tsx`

**Interfaces:**
- Consumes: `buildTableMap` (Task 4), `GET/PATCH /settings` (Task 2).
- Produces: `OpenTableDialog` com prop `identifier: string` (número fixo, mostrado no título "Abrir mesa 7"; só o campo nome do cliente, opcional); `PickTableDialog({ tables: Table[], onPick(t: Table), onClose })`.

- [ ] **Step 1:** `TablesView` carrega mesas e settings juntos (o polling recarrega os dois). Grade: `grid-cols-4 sm:grid-cols-6 lg:grid-cols-8`; slot livre = botão neutro com o número (`aria-label="Mesa 7, livre"`); ocupado = cartão com número, cliente, total com taxa, "há X min" (de `openedAt`) e selo "N na cozinha"; tocar abre um diálogo pequeno com "Ver pedidos" e "Ver conta" (o que os botões fazem hoje). StatTiles continuam.
- [ ] **Step 2:** Topo: "Adicionar itens" (primário, ícone `Plus`) abre `PickTableDialog` com as ocupadas → escolhida abre `AddItemsDialog` (fechar volta para a tela, não para pedidos). Sem ocupadas: botão desabilitado com `title="Nenhuma mesa aberta"`. O botão "Abrir mesa" sai (abre-se tocando na mesa livre).
- [ ] **Step 3:** Admin vê "Total de mesas: 30" ao lado do título → `TotalTablesDialog` (input inteiro 1–200, salva com `updateSettings`, toast). Na Etapa 4 isso migra para Configurações.
- [ ] **Step 4:** Run `npm run lint && npm run typecheck && npm test -w apps/frontend`. Expected: PASS.
- [ ] **Step 5:** Commit `Mesas: mapa 1..N, abrir tocando na mesa e botão Adicionar itens`.

### Task 6: Contas fechadas por mesa e relatório "Vendas por mesa"

**Files:**
- Modify: `apps/frontend/src/types/api.ts` (`ClosedAccount.openedBy`, `Reports.byTable`)
- Modify: `apps/frontend/src/components/features/reports/ClosedAccountsView.tsx`
- Modify: `apps/frontend/src/components/features/reports/ReportsView.tsx` e `apps/frontend/src/lib/pdf/reports-pdf.*` (nova seção)

**Interfaces:**
- Consumes: `ClosedAccountView.openedBy`, `ReportsView.byTable` (Task 3).

- [ ] **Step 1:** Contas fechadas: `<select>` "Mesa" (Todas + identificadores presentes no período, ordem numérica) combinado com a busca existente; cada conta mostra "Garçom: {openedBy ?? '—'}" e a busca também procura em `openedBy`.
- [ ] **Step 2:** Relatórios: nova aba `{ key: 'tables', label: 'Vendas por mesa' }` depois de "Vendas por funcionário": tabela Mesa · Total · Contas · Ticket médio; o PDF ganha a mesma tabela.
- [ ] **Step 3:** Run lint, typecheck, testes do front. Expected: PASS.
- [ ] **Step 4:** Commit `Contas fechadas com filtro por mesa e garçom; relatório Vendas por mesa`.

### Task 7: Teste no navegador

- [ ] **Step 1:** Subir banco, API e front locais; entrar como admin, gerente e garçom.
- [ ] **Step 2:** Conferir: mapa com 30 mesas; abrir a mesa 7 tocando nela com nome; "Adicionar itens" escolhendo a 7; admin muda para 10 com a 12 ocupada → a 12 continua; fechar a conta da 7 → aparece em Contas fechadas filtrando "7" com o garçom; aba "Vendas por mesa"; 375 px sem rolagem lateral; dois abrindo a mesma mesa → segundo recebe "já está ocupada".
- [ ] **Step 3:** Voltar o total para 30 e limpar dados de teste no banco local.
