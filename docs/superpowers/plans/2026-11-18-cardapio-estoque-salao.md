# Cardápio editável, categorias recolhíveis, inventário e salão do admin — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O admin edita produtos, vê cardápio e estoque por categorias recolhíveis, faz inventário de todos os itens de uma vez e entra direto na tela de Mesas.

**Architecture:** Backend NestJS ganha dois use cases (`UpdateProductUsecase`, `InventoryUsecase`) no padrão dos existentes (repositórios abstratos + `UnitOfWork` + `AuditLog`), expostos em `PATCH /products/:id` e `POST /products/inventory`. O frontend ganha um componente `CategorySections` reaproveitado por `MenuManager` e `StockManager`, um `InventoryDialog` e a nova ordem do menu.

**Tech Stack:** NestJS 10, class-validator, Jest (backend, `apps/backend/test`), Next 14, Tailwind com os tokens da Parte 3, Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-11-18-cardapio-estoque-salao-design.md`

## Global Constraints

- Todo texto de tela e de log em pt-BR.
- Rotas novas só para `@Roles('ADMIN')`.
- Estoque: gramas para carne (`isMeat`), unidades para o resto; a tela mostra kg para carne.
- Carne não troca para outra categoria nem o contrário (backend recusa com 400).
- A edição não mexe no estoque.
- Inventário grava tudo numa transação; cada item alterado vira movimento `CONTAGEM` com nota `Inventário`.
- `CONTAGEM` continua aceito no `AdjustStockDto`; só some da tela.
- Rodar no fim: `npm run lint`, `npm run typecheck` (ou `tsc` dos workspaces), `npm test`, `npm run format:check`.

## Review Focus

- Inventário com um item inexistente/removido no meio → nada é gravado (rollback). Teste na Task 2.
- Inventário sem nenhuma alteração (todos iguais ao atual) → 400 "Nenhum item mudou", nada gravado. Teste na Task 2.
- Edição com nome igual ao de outro produto → 400; com o próprio nome (só mudou o preço) → aceita. Teste na Task 1.
- Inventário com valor decimal em unidades ("2,5" para bebida) → a tela recusa antes de enviar; backend recusa não-inteiro. Teste na Task 2 (backend).
- `localStorage` indisponível → categorias funcionam, só não lembram. Coberto pelo try/catch da Task 3 (verificar no navegador).

---

### Task 1: Editar produto (backend)

**Files:**

- Modify: `apps/backend/src/domain/entities/product/product.entity.ts` (método `edit`)
- Create: `apps/backend/src/usecases/product/update/update-product.usecase.ts`
- Modify: `apps/backend/src/infra/web/routes/product/dto/product.dto.ts` (`UpdateProductDto`)
- Modify: `apps/backend/src/infra/web/routes/product/product.controller.ts`, `product.module.ts`
- Modify: `packages/shared/src/domain.ts` (`AuditAction` + label `ITEM_EDITADO: 'Item editado no cardápio'`)
- Test: `apps/backend/test/update-product.test.ts`

**Interfaces:**

- Produces: `Product.edit(dto: { name: string; description: string | null; category: ProductCategory; price?: number; pricePerKg?: number; minGrams?: number }): void` — atualiza campos e `updatedAt`; não toca em `stock`.
- Produces: `UpdateProductUsecase.execute(id: string, input: UpdateProductInput, actor: string): Promise<{ id: string }>`, onde `UpdateProductInput` = mesmos campos de `CreateProductInput` sem `stock`.
- Produces: `PATCH /products/:id` (ADMIN, `ParseUUIDPipe`), body `UpdateProductDto` (= `CreateProductDto` sem `stock`).

- [ ] **Step 1: Testes que falham** em `update-product.test.ts`, com `InMemoryProductRepository`, `InMemoryAuditLogRepository` e os builders `picanha()`/`cerveja()`:
  - `edita nome, preço e descrição de uma bebida` → produto salvo com os novos valores, estoque igual, um log `ITEM_EDITADO`.
  - `edita preço por kg e mínimo de uma carne` → `getPricePerKg()` e `getMinGrams()` novos.
  - `recusa trocar carne para bebida` e `recusa trocar bebida para carne` → rejeita (`BadRequestException`), produto intacto.
  - `recusa nome de outro produto` → rejeita; `aceita o próprio nome` → resolve.
  - `recusa produto inexistente ou removido` → 404 (`AppError.notFound`).
- [ ] **Step 2:** `npm test -w apps/backend -- update-product` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar `Product.edit`, o use case (mesmas validações de preço/mínimo do `CreateProductUsecase`; checagem de troca carne↔não carne por `getIsMeat()` vs `category === 'CARNE'`; `findByName` só conflita se o id for outro), o DTO, a rota e o provider. Log: `` `${name} (${category})` ``.
- [ ] **Step 4:** `npm test -w apps/backend` → PASS.
- [ ] **Step 5:** Commit `Backend: editar produto do cardápio`.

### Task 2: Inventário (backend)

**Files:**

- Create: `apps/backend/src/usecases/product/inventory/inventory.usecase.ts`
- Modify: `product.dto.ts` (`InventoryDto`, `InventoryItemDto`), `product.controller.ts`, `product.module.ts`
- Modify: `packages/shared/src/domain.ts` (`INVENTARIO_FEITO: 'Inventário de estoque'`)
- Test: `apps/backend/test/inventory.test.ts`

**Interfaces:**

- Produces: `InventoryUsecase.execute(items: { productId: string; stock: number }[], actor: string): Promise<{ changed: number }>`.
- Produces: `POST /products/inventory` (ADMIN, `HttpCode(200)`), body `{ items: { productId: uuid; stock: int >= 0 }[] }` com `@ValidateNested({ each: true })`, `@Type(() => InventoryItemDto)`, `@ArrayMinSize(1)`. Declarar a rota **antes** de `:id` não é necessário (método POST diferente), mas manter perto de `adjustStock`.

- [ ] **Step 1: Testes que falham** em `inventory.test.ts` (usar `FakeUnitOfWork([products, movements, logs])`):
  - `grava só os itens que mudaram` → 2 produtos, um muda → `changed: 1`, um `StockMovement` `CONTAGEM` com `note: 'Inventário'`, `before`/`after` certos, um log `INVENTARIO_FEITO` com detalhe `"1 item: Cerveja 10 un → 7 un"` (usar `formatQuantity`).
  - `desfaz tudo se um item não existe` → um válido + um id inexistente → rejeita 404, estoque do válido intacto, nenhum movimento.
  - `recusa quando nada mudou` → 400 `"Nenhum item mudou"`, nada gravado.
  - `recusa estoque negativo ou não inteiro` → 400.
  - `recusa o mesmo produto duas vezes` → 400.
- [ ] **Step 2:** `npm test -w apps/backend -- inventory` → FAIL.
- [ ] **Step 3:** Implementar: validar tudo antes (`findByIds`, todos existem e `getAvailable()`), depois dentro de `uow.run` atualizar cada produto alterado, criar o movimento e, no fim, um único `AuditLog`.
- [ ] **Step 4:** `npm test -w apps/backend` → PASS.
- [ ] **Step 5:** Commit `Backend: inventário de estoque em uma transação`.

### Task 3: Categorias recolhíveis (frontend)

**Files:**

- Create: `apps/frontend/src/components/ui/CategorySections.tsx`
- Create: `apps/frontend/src/hooks/useOpenCategories.ts`
- Test: `apps/frontend/src/hooks/useOpenCategories.test.tsx`
- Modify: `apps/frontend/src/components/features/admin/MenuManager.tsx`, `StockManager.tsx` (trocar o bloco `CATEGORY_ORDER.filter(...).map(...)` pelo componente)

**Interfaces:**

- Produces: `useOpenCategories(storageKey: string): { isOpen(cat: ProductCategory): boolean; toggle(cat): void; openAll(cats: ProductCategory[]): void; closeAll(): void }` — começa tudo fechado; lê/grava `localStorage[storageKey]` como JSON de categorias abertas, cada acesso em try/catch.
- Produces: `<CategorySections storageKey="menu" | "stock" products={Product[]} renderItem={(p: Product) => ReactNode} idPrefix="menu" | "stock" />` — agrupa por `CATEGORY_ORDER`, pula vazias; cabeçalho `<button aria-expanded aria-controls>` com `CATEGORY_LABEL[cat]` e `(n)`, ícone `ChevronRight`/`ChevronDown`; botões "Abrir todas"/"Fechar todas" (`Button size="sm" variant="secondary"`) acima.

- [ ] **Step 1: Testes que falham** em `useOpenCategories.test.tsx` (`renderHook`): começa fechado; `toggle('CARNE')` abre e fecha; `openAll([...])` abre todas; `closeAll()` fecha; valor salvo é relido num novo `renderHook` com a mesma chave; com `localStorage.getItem` lançando erro, o hook ainda funciona.
- [ ] **Step 2:** `npm test -w apps/frontend -- useOpenCategories` → FAIL.
- [ ] **Step 3:** Implementar hook e componente; plugar em `MenuManager` (`renderItem` = card atual) e `StockManager` (idem).
- [ ] **Step 4:** `npm test -w apps/frontend` → PASS; `npm run lint` limpo.
- [ ] **Step 5:** Commit `Frontend: categorias recolhíveis no cardápio e no estoque`.

### Task 4: Editar produto (frontend)

**Files:**

- Modify: `apps/frontend/src/services/products.ts` (`updateProduct`)
- Modify: `apps/frontend/src/components/features/admin/MenuManager.tsx`

**Interfaces:**

- Consumes: `PATCH /products/:id` da Task 1.
- Produces: `updateProduct(id: string, data: Omit<Parameters<typeof createProduct>[0], 'stock'>) => http.patch<{ id: string }>(...)`.

- [ ] **Step 1:** `MenuManager`: o estado do diálogo vira `editing: Product | null` além de `showCreate`. Botão "Editar" (`variant="secondary" size="sm"`, `aria-label="Editar ${p.name}"`) ao lado de "Remover". O mesmo formulário abre preenchido (preço em reais com vírgula; carne: `pricePerKg`); título "Editar item", botão "Salvar alterações"; campo de estoque escondido na edição; no `Select` de categoria, se o item é carne só mostrar Carne, se não é, esconder Carne. Toast `"${nome} atualizado"`.
- [ ] **Step 2:** `npm run lint` e `tsc` do frontend limpos.
- [ ] **Step 3:** Commit `Frontend: editar produto no cardápio`.

### Task 5: Ajuste sem contagem e inventário (frontend)

**Files:**

- Modify: `apps/frontend/src/services/products.ts` (`saveInventory`)
- Create: `apps/frontend/src/components/features/admin/InventoryDialog.tsx`
- Create: `apps/frontend/src/components/features/admin/inventory.ts` + `inventory.test.ts`
- Modify: `apps/frontend/src/components/features/admin/StockManager.tsx`

**Interfaces:**

- Consumes: `POST /products/inventory` da Task 2.
- Produces: `saveInventory(items: { productId: string; stock: number }[]) => http.post<{ changed: number }>('/products/inventory', { items })`.
- Produces: `parseCount(text: string, isMeat: boolean): number | null` (kg com vírgula → gramas arredondadas; unidades só inteiras ≥ 0; vazio/ inválido → `null`) e `changedItems(products: Product[], values: Record<string, string>): { productId: string; stock: number }[] | { invalid: string[] }` em `inventory.ts`.

- [ ] **Step 1: Testes que falham** em `inventory.test.ts`: `parseCount('2,5', true) === 2500`; `parseCount('3', false) === 3`; `parseCount('2,5', false) === null`; `parseCount('-1', false) === null`; `changedItems` devolve só os alterados; com um valor inválido devolve `{ invalid: [nome] }`.
- [ ] **Step 2:** `npm test -w apps/frontend -- inventory` → FAIL.
- [ ] **Step 3:** Implementar `inventory.ts`; `InventoryDialog` (props `products`, `onClose`, `onSaved`): lista por categoria (`CATEGORY_ORDER`), cada linha com nome e `Input inputMode="decimal"` preenchido com o atual (kg para carne, formato `2,5`), rodapé `"N itens alterados"`, "Salvar inventário" desabilitado com 0, toast de erro listando inválidos, toast de sucesso `"Inventário salvo: N itens"`.
- [ ] **Step 4:** `StockManager`: tirar `CONTAGEM` de `MOVEMENTS`/`REASONS` (`Movement` = `'ENTRADA' | 'SAIDA'`; grade do radiogroup com 2 colunas; rótulo do campo sem o caso contagem); botão "Inventário" (`icon={ClipboardList}`) no fim da página abrindo o diálogo.
- [ ] **Step 5:** `npm test -w apps/frontend` → PASS; lint limpo.
- [ ] **Step 6:** Commit `Frontend: inventário de estoque e ajuste só com entrada e saída`.

### Task 6: Menu do admin e verificação

**Files:**

- Modify: `apps/frontend/src/constants/index.ts` (`NAV_BY_ROLE.ADMIN`)
- Modify: vault `Neuronios/Comanda/Comanda Plus - Parte 2 estrutura.md` (nota da nova ordem e tela inicial do admin) e um neurônio novo ou atualização do Comanda Plus, nos 4 passos do CLAUDE.md.

- [ ] **Step 1:** `ADMIN: [ITEMS.mesas, ITEMS.estoque, ITEMS.cardapio, ITEMS.contas, ITEMS.relatorios, ITEMS.usuarios, ITEMS.logs]` (o `homeFor` já usa o primeiro).
- [ ] **Step 2:** Rodar `npm run lint`, typecheck, `npm test`, `npm run format:check` na raiz → tudo verde.
- [ ] **Step 3:** No navegador com o stack local (Docker `comanda-db`, configuração `backend` + `frontend-local` do `.claude/launch.json`): entrar como admin → cai em Mesas; abrir/fechar categorias e recarregar (lembra); editar a Coca (preço) e conferir no cardápio do garçom; tentar categoria carne numa bebida (não aparece); inventário mudando 2 itens → logs e estoque certos; janela de ajuste só com Entrada/Saída.
- [ ] **Step 4:** Commit `Admin começa em Mesas; nova ordem do menu`, e atualizar a memória.
