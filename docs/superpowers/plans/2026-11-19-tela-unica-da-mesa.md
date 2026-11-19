# Tela única da mesa + tema no cabeçalho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao tocar numa mesa ocupada, abrir uma tela só (Adicionar itens em cima, pedidos no meio, Fechar conta embaixo), e ter o botão claro/escuro no cabeçalho.

**Architecture:** Só frontend (`apps/frontend`). Um diálogo novo `TableDialog` junta o corpo de `OrdersDialog` (pedidos com status, alterar, cancelar) e o fechamento de `TableAccountDialog` (totais, aviso da cozinha, pagamento). O formulário de pagamento sai para `PaymentForm`. O tema ganha um hook `useTheme` que mantém o cabeçalho e Configurações em sincronia.

**Tech Stack:** Next 14, React, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-19-tela-unica-da-mesa-design.md`

## Global Constraints

- Nenhuma rota nova no backend.
- Ordem da tela, de cima para baixo: botão "Adicionar itens", título (mesa · cliente · aberta por), pedidos, subtotal/taxa/total, aviso da cozinha, pagamento (quando aberto), botão "Fechar conta".
- O mesmo para todos os perfis; regras atuais mantidas: alterar item via `canChangeItem`, cancelar só GERENTE/ADMIN, fechar bloqueado com pedido na cozinha (exceto ADMIN).
- O botão "Adicionar itens" do topo da tela Mesas (com `PickTableDialog`) continua.

## Review Focus

1. Mesa sem nenhum pedido: o botão de baixo vira "Liberar mesa" e libera sem pagamento.
2. Alterar ou cancelar um item com o pagamento aberto: o total muda, então o pagamento fecha (volta ao botão "Fechar conta") para não receber o valor antigo.
3. Trocar o tema no cabeçalho com Configurações aberta: o radio de lá acompanha (teste na Task 1).
4. Voltar de "Adicionar itens": a tela da mesa recarrega os pedidos.

---

### Task 1: `useTheme` e botão no cabeçalho

**Files:**
- Modify: `src/lib/theme.ts` — `applyTheme` dispara `window.dispatchEvent(new Event('comanda:tema'))`.
- Create: `src/hooks/useTheme.ts`, `src/hooks/useTheme.test.tsx`
- Modify: `src/components/layout/AppShell.tsx`, `src/app/(app)/configuracoes/page.tsx`

**Interfaces:** Produces `useTheme(): [Theme, (t: Theme) => void]` (lê `readTheme()` no mount, escuta `comanda:tema`).

- [ ] Teste `dois hooks ficam em sincronia`: `renderHook` duas vezes; `act(() => a.result.current[1]('dark'))`; espera `b.result.current[0] === 'dark'` e `document.documentElement.dataset.theme === 'dark'`.
- [ ] Rodar `npx vitest run src/hooks/useTheme.test.tsx` → FAIL (módulo não existe).
- [ ] Implementar o hook e o evento; rodar → PASS.
- [ ] AppShell: botão antes da engrenagem, classe `headerAction`, ícone `Moon` no claro e `Sun` no escuro, `aria-label` "Tema escuro" / "Tema claro", texto só em `sm:`.
- [ ] Configurações usa `useTheme` no lugar do `useState` + `readTheme`/`applyTheme`.
- [ ] Commit.

### Task 2: `TableDialog`

**Files:**
- Create: `src/components/features/tables/PaymentForm.tsx` (o bloco `confirming && needsPayment` atual, com `PaymentLine`, `lines`, `onChange`, `total`)
- Create: `src/components/features/tables/TableDialog.tsx`
- Delete: `OrdersDialog.tsx`, `TableAccountDialog.tsx`
- Modify: `TablesView.tsx` — toque em mesa ocupada abre `{ kind: 'table' }`; sai o `actions` e os `orders`/`account`; `addItems` com `back: 'table'` volta para a tela da mesa.

**Interfaces:** `TableDialog({ table, onClose, onAddItems, onChanged, onClosed })`.

- [ ] `TableDialog`: `Dialog` com `title` "Mesa N" e `description` cliente · aberta por; corpo começa com `<Button block icon={Plus}>Adicionar itens</Button>`; pedidos como no `OrdersDialog`; totais e aviso da cozinha como no `TableAccountDialog`; `PaymentForm` quando `confirming`; `footer` = "Fechar conta"/"Liberar mesa" ou "Voltar" + "Receber R$ X".
- [ ] Depois de alterar/cancelar item: recarrega, `setConfirming(false)` e `onChanged()`.
- [ ] `npm run typecheck`, `npm run lint`, `npx vitest run` → tudo verde.
- [ ] Commit.

### Task 3: Navegador

- [ ] Como gerente (dados populados): tocar numa mesa ocupada abre a tela única na ordem certa; alterar item; adicionar itens e voltar; fechar uma conta com pagamento; mesa sem pedido libera.
- [ ] Botão do tema no topo troca e Configurações acompanha; 375 px sem rolagem lateral.
- [ ] Restaurar usuário de teste no banco.
