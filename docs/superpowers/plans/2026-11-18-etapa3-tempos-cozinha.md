# Etapa 3 — Tempos da cozinha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Gravar a hora de cada etapa do pedido, mostrar os tempos ao vivo na fila da cozinha e as médias no relatório.

**Spec:** `docs/superpowers/specs/2026-11-18-salao-itens-cozinha-config-design.md` (seção "Etapa 3")

## Global Constraints

- Colunas novas em `Order`: `startedAt`, `readyAt`, `deliveredAt` (`DateTime?`). Os pedidos antigos ficam nulos.
- As colunas são gravadas na transição de status:
  - `PREPARING` grava `startedAt`;
  - `READY` grava `readyAt`;
  - `DELIVERED` grava `deliveredAt`.
- Pedido criado já `DELIVERED` (bebida) grava só `deliveredAt`.
- Sem meta e sem cor de alerta (decisão do Pedro).
- Médias do relatório, só com os pedidos que têm as duas pontas gravadas:
  - **espera**: `createdAt` → `startedAt`;
  - **preparo**: `startedAt` → `readyAt`;
  - **entrega**: `readyAt` → `deliveredAt`.

  Os pedidos de bebida ficam de fora naturalmente, porque não têm `startedAt`.
- Os rótulos de tempo usam "X min" e "1h05" (como o `openFor` da etapa 1).

## Review Focus

1. Pedido antigo sem horários → a fila não mostra "NaN" e o relatório não conta o pedido (testes nas Tasks 2 e 3).
2. Cancelado depois de iniciado → fica fora das médias, porque não tem `readyAt` (teste na Task 3).
3. A hora do servidor e a do navegador diferem → o tempo nunca fica negativo, o mínimo é "0 min" (teste na Task 2).

---

### Task 1: Banco e domínio
- [ ] Migration `tempos_cozinha`.
- [ ] `Order`: `getStartedAt()`, `getReadyAt()`, `getDeliveredAt()`. `updateStatus` grava a hora; `create` com `DELIVERED` grava `deliveredAt`; `with` e `copy` carregam os três campos.
- [ ] Prisma: mapear em `toEntity`, `create` e `update`.
- [ ] `KitchenOrderView` ganha `startedAt` e `readyAt`.
- [ ] Teste em `order-entity.test.ts`: `grava a hora de cada etapa`.

### Task 2: Fila da cozinha
- [ ] Criar `apps/frontend/src/components/features/kitchen/kitchenTimes.ts`, com `kitchenTimes(o: { status; createdAt; startedAt; readyAt }, now: number): string`:
  - `PENDING`: "Esperando há X";
  - `PREPARING`: "Esperou X · preparando há Y";
  - `READY`: "Preparo levou Y · pronto há Z".
  - Sem a hora necessária, mostra só o tempo desde a criação.
- [ ] Teste: `kitchenTimes.test.ts`.
- [ ] Na `KitchenQueue`, um tique de `now` a cada 30 s, e a linha de tempos abaixo do cabeçalho do cartão.

### Task 3: Relatório
- [ ] Criar `ReportsView.kitchenTimes: { orders: number; waitMin: number; prepMin: number; deliveryMin: number }`, com as médias em minutos arredondados.
- [ ] Teste `get-reports` com 2 pedidos completos, 1 cancelado depois de iniciado (`readyAt` nulo) e 1 antigo sem horários.
- [ ] Front: aba "Tempos da cozinha" com 3 StatTiles e o número de pedidos medidos, mais a seção no PDF.

### Task 4: Navegador
- [ ] Lançar um pedido, avançar na cozinha e conferir os tempos.
- [ ] Ver a aba do relatório.
- [ ] Em 375 px, sem rolagem lateral.
- [ ] Limpar os dados de teste.
