# Etapa 2 — Tirar/diminuir itens e bebida rápida Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tirar ou diminuir um item de um pedido com motivo (estoque volta ou vira perda), com permissão por perfil, e lançar bebidas como já entregues, fora da cozinha.

**Architecture:** `Order.changeItemQuantity` no domínio e um caso de uso novo `ChangeOrderItemUsecase` (transação: itens do pedido, estoque, movimento, log). A rota é `PATCH /orders/:id/items/:itemId`. `CreateOrderUsecase` separa as bebidas num pedido que já nasce `DELIVERED`.

**Tech Stack:** NestJS 10 + Prisma 5; Next 14; Jest com fakes; Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-salao-itens-cozinha-config-design.md` (seção "Etapa 2")

## Global Constraints

- Motivos (shared, `ITEM_CHANGE_REASONS`):
  - `LANCADO_A_MAIS` "Lançado a mais": devolve ao estoque. Vem marcado por padrão.
  - `LANCADO_ERRADO` "Lançado errado": devolve ao estoque.
  - `PERDA` "Perda": não devolve.
- **Garçom:** só em pedido `PENDING`, e só com os motivos que devolvem ao estoque.
- **Gerente e admin:** em pedido `PENDING`, `PREPARING`, `READY` ou `DELIVERED`.
- Nunca em `CANCELLED` ou `CLOSED`.
- Só diminui: a nova quantidade vai de 0 até a atual menos 1, e 0 tira o item.
- Carne com nova quantidade acima de 0 respeita o mínimo do produto: abaixo dele, só tirando o item inteiro.
- Pedido que fica sem itens vira `CANCELLED`.
- **Estoque:**
  - Devolução gera movimento `ESTORNO` com o motivo na nota.
  - Perda gera movimento novo `PERDA`, com antes igual a depois e nota `Perda: <formatQuantity>`.
- **Log:** `ITEM_REMOVIDO` ("Item removido da conta") ou `ITEM_DIMINUIDO` ("Item diminuído na conta"), com o texto `Mesa X — Nome antes → depois (Motivo)`.
- **Bebida:** a categoria `BEBIDA` vai para um pedido próprio já `DELIVERED`. Nada mais muda no fluxo da bebida.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Garçom tenta diminuir um item com o pedido já em preparo → recebe 403 (teste na Task 2).
2. Nova quantidade igual ou maior que a atual, negativa ou fracionária → recebe 400 (teste na Task 2).
3. Dois itens do mesmo produto no mesmo pedido → só o item escolhido muda e o estoque volta só pela diferença (teste na Task 2).
4. Pedido misto de bebida e carne → nascem dois pedidos e só a carne aparece na cozinha. Uma falta de estoque desfaz os dois (teste na Task 3).
5. A conta é recalculada depois de diminuir (total do pedido e da mesa); conferir no navegador na Task 5.

---

### Task 1: Shared e domínio

**Files:**
- `packages/shared/src/domain.ts`:
  - `StockMovementType` ganha `'PERDA'`.
  - AuditActions ganham `ITEM_REMOVIDO` e `ITEM_DIMINUIDO`.
  - Novo `ITEM_CHANGE_REASONS = ['LANCADO_A_MAIS','LANCADO_ERRADO','PERDA'] as const`, com o tipo `ItemChangeReason`, `ITEM_CHANGE_REASON_LABEL` e `RETURNS_TO_STOCK: Record<ItemChangeReason, boolean>`.
- `apps/backend/src/domain/entities/order-item/order-item.entity.ts`: `withQuantity(quantity: number): OrderItem`, que mantém o id.
- `apps/backend/src/domain/entities/order/order.entity.ts`:
  - `Order.create` aceita `status?: 'PENDING' | 'DELIVERED'`.
  - `changeItemQuantity(itemId: string, quantity: number): void` troca o item (ou o tira quando a quantidade é 0) e recalcula `totalAmount`. Se não sobrar item, `status = 'CANCELLED'`. Atualiza `updatedAt`.
  - Os itens deixam de ser `readonly`.
- Test: `apps/backend/test/order-entity.test.ts`:
  - `diminui e recalcula o total`;
  - `quantidade 0 tira o item`;
  - `sem itens o pedido fica cancelado`;
  - `create com status DELIVERED`.

- [ ] Escrever os testes. Rodar `npx jest order-entity` → FAIL. Implementar. Rodar de novo → PASS. Depois `npm run build:shared`, lint e typecheck, e commit.

### Task 2: Caso de uso e rota para tirar/diminuir

**Files:**
- `apps/backend/src/domain/repositories/order.repository.interface.ts`: `abstract replaceItems(order: Order): Promise<void>`.
  - No Prisma, apaga os itens do pedido que não estão mais na lista, atualiza a `quantity` dos que ficaram e atualiza `totalAmount`, `status` e `updatedAt` do pedido.
  - No fake, chama `update`.
- Create: `apps/backend/src/usecases/order/change-item/change-order-item.usecase.ts`.
- Modify: `apps/backend/src/infra/web/routes/order/{order.controller.ts,order.module.ts,dto/*}`, com `ChangeOrderItemDto { @IsInt @Min(0) quantity; @IsIn(ITEM_CHANGE_REASONS) reason }`.
- Test: `apps/backend/test/change-order-item.test.ts`.

**Interfaces:**
- `ChangeOrderItemUsecase.execute(input: { orderId: string; itemId: string; quantity: number; reason: ItemChangeReason }, actor: { username: string; role: UserRole }): Promise<{ total: number }>`. Devolve o `totalAmount` novo do pedido.
- Rota: `@Patch(':id/items/:itemId')`, com `@Roles('GARCOM','GERENTE','ADMIN')` e `HttpCode 200`.

Testes, todos com as fakes e o `FakeUnitOfWork`:
- [ ] `gerente diminui cerveja 4 → 1 lançado a mais`: o total do pedido cai, o estoque sobe 3, há um movimento `ESTORNO` com nota "Lançado a mais" e um log `ITEM_DIMINUIDO` "Mesa 5 — Cerveja 4 → 1 (Lançado a mais)".
- [ ] `gerente tira picanha entregue como perda`: o item some, o estoque não muda, há um movimento `PERDA` com before = after e nota "Perda: 400 g" (conferir o texto de `formatQuantity`) e um log `ITEM_REMOVIDO`.
- [ ] `tirar o único item cancela o pedido`.
- [ ] `garçom tira de pedido aguardando` → ok.
- [ ] `garçom em pedido em preparo` → `{ status: 403 }`.
- [ ] `garçom com motivo perda` → 403.
- [ ] `quantidade inválida` com `it.each([4, 5, -1, 1.5])`, a partir de 4 → `VALIDATION`.
- [ ] `carne abaixo do mínimo` (picanha 400 → 200, com mínimo 300) → `VALIDATION`.
- [ ] `pedido fechado ou cancelado` → 400.
- [ ] `item inexistente` → 404.
- [ ] `dois itens do mesmo produto`: muda só o item escolhido.
- [ ] Rodar → FAIL. Implementar. Rodar → PASS. Lint, typecheck e commit.

### Task 3: Bebida já entregue

**Files:**
- Modify: `apps/backend/src/usecases/order/create/create-order.usecase.ts`.
- Test: `apps/backend/test/create-order.test.ts` (casos novos).

O que muda:
- Os itens com `product.getCategory() === 'BEBIDA'` vão para um `Order.create({..., status: 'DELIVERED'})`. Os demais vão para o pedido `PENDING`.
- Cria só os pedidos que tiverem itens, na mesma transação. Cada movimento `VENDA` aponta para o pedido do seu item.
- O log `PEDIDO_LANCADO` continua um só.
- Retorno: `{ id: string; ids: string[]; total: number }`. `id` é o pedido de comida se houver, senão o de bebida. `total` é a soma.

- [ ] Testes:
  - `só bebida nasce entregue e fora da cozinha`: `findForKitchen()` volta vazio.
  - `pedido misto vira dois`: um `PENDING` só com a carne e um `DELIVERED` só com a cerveja, e o total é a soma.
  - `sem estoque da carne desfaz os dois`: nenhum pedido criado e o estoque intacto.
- [ ] FAIL → implementar → PASS. Conferir o teste de cozinha que já existe. Lint, typecheck e commit.

### Task 4: Front — alterar item

**Files:**
- Create: `apps/frontend/src/components/features/tables/itemChange.ts` e o teste `itemChange.test.ts`.
  - `canChangeItem(role: UserRole, status: OrderStatus): boolean`. Garçom: só `PENDING`. Gerente e admin: `PENDING`, `PREPARING`, `READY` e `DELIVERED`.
  - `reasonsFor(role): ItemChangeReason[]`. Garçom não recebe `PERDA`.
- Create: `apps/frontend/src/components/features/tables/ChangeItemDialog.tsx`, com props `{ orderId, item: OrderItemView, role, onClose, onChanged }`.
  - Unidade: campo numérico de 0 a atual−1.
  - Carne: gramas.
  - Atalho "Tirar o item todo", que põe a quantidade em 0.
  - Radio de motivo com `LANCADO_A_MAIS` marcado.
  - Botão "Tirar item" quando a quantidade é 0; senão "Diminuir".
- Modify: `apps/frontend/src/services/orders.ts`, com `changeOrderItem(orderId, itemId, quantity, reason)`, que chama `PATCH /orders/:id/items/:itemId`.
- Modify: `OrdersDialog.tsx`. Cada item ganha o botão "Alterar" quando `canChangeItem` permite. Ao salvar, recarrega a lista e chama `onChanged`.
- Modify: `TableAccountDialog.tsx`. Mesma coisa para gerente e admin, antes de "Fechar conta". Os itens precisam saber o `orderId` e o `status` do pedido.

- [ ] Teste dos helpers → FAIL → implementar → PASS. Depois a UI. Lint, typecheck, testes do front e commit.

### Task 5: Navegador

- [ ] Como gerente:
  - Lançar 4 cervejas e 1 picanha. A cerveja entra já entregue e a picanha aparece na cozinha.
  - Diminuir a cerveja para 1 por "Lançado a mais": a conta e o estoque mudam.
  - Tirar a picanha como Perda: o estoque não volta, e o log e o movimento ficam registrados.
- [ ] Como garçom: num pedido em preparo não aparece "Alterar", e num aguardando só aparecem os 2 motivos.
- [ ] Em 375 px, sem rolagem lateral. Ao final, limpar os dados de teste.
