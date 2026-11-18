# Etapa 4 — Configurações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Trocar o escudo do topo por uma engrenagem que leva a `/configuracoes`, com perfil, sessão, segurança, aparência (claro/escuro), restaurante (admin) e sair.

**Spec:** `docs/superpowers/specs/2026-11-18-salao-itens-cozinha-config-design.md` (seção "Etapa 4")

## Global Constraints

- Só frontend. A hora do login vem do `iat` do token que já fica salvo no navegador (`localStorage` `token`), sem mudar o backend.
  - Ruling: o spec sugeria devolver isso no `/auth/me`; ler do token dá o mesmo dado sem uma rota nova.
- **Tema:** claro (padrão) e escuro.
  - Salvo em `localStorage` (`comanda:tema`) e aplicado como `data-theme="dark"` no `<html>`.
  - Um script inline no layout aplica o tema antes de pintar, para não piscar.
  - Os tokens escuros ficam em `[data-theme='dark']` no `globals.css`.
  - O `bg-white` dos inputs vira `bg-surface`. O QR Code continua branco.
- `/seguranca` redireciona para `/configuracoes`.
- O total de mesas sai da tela Mesas e vai para a seção Restaurante (só admin), reaproveitando o `TotalTablesDialog`.

## Review Focus

1. Token ausente, ilegível ou sem `iat` → a seção Sessão não quebra e mostra "—" (teste na Task 1).
2. `localStorage` bloqueado → o tema fica claro e a escolha funciona até recarregar (teste na Task 1).
3. Contraste no escuro: o texto `ink-muted` sobre a `surface` precisa ter ≥ 4,5:1 (conferir na Task 3).

---

### Task 1: Helpers
- [ ] `lib/session.ts`:
  - `tokenIssuedAt(token: string | null): Date | null` decodifica o payload base64url e devolve `iat * 1000`.
  - `activeFor(from: Date, now: number): string` devolve "ativo há 5 min" ou "ativo há 2h15".
- [ ] `lib/theme.ts`:
  - `type Theme = 'light' | 'dark'`;
  - `readTheme(): Theme`, com try/catch;
  - `applyTheme(t: Theme): void`, que grava e põe o `data-theme`.
- [ ] Testes: `session.test.ts` e `theme.test.ts`.

### Task 2: Página Configurações
- [ ] Mover o conteúdo de `app/(app)/seguranca/page.tsx` para `components/features/settings/SecuritySection.tsx`, sem o `PageTitle`.
- [ ] `/seguranca` passa a só redirecionar.
- [ ] `app/(app)/configuracoes/page.tsx`, com as seções em Cards:
  - Meu perfil (nome, usuário, perfil, e-mail);
  - Sessão ("Entrou hoje às HH:MM · ativo há X", com tique de 30 s);
  - Segurança;
  - Aparência (radio Claro/Escuro);
  - Restaurante (admin: "Total de mesas: N" e o botão Alterar);
  - Sair.
- [ ] AppShell: ícone `Settings`, rótulo "Configurações" e link para `/configuracoes`.
- [ ] TablesView: remover o botão "N mesas" e o diálogo de total.

### Task 3: Tema escuro
- [ ] Tokens escuros: bg `24 20 16`, surface `34 29 23`, surface-2 `46 39 31`, ink `243 236 226`, ink-muted `190 176 160`, accent `214 120 72`, accent-strong `166 74 30`, success `120 170 110`, warning `214 160 70`, danger `225 110 95`. Mais `color-scheme: dark`.
- [ ] Script inline no `<head>` do layout.
- [ ] Trocar o `bg-white` do `Field` por `bg-surface`.

### Task 4: Navegador
- [ ] Configurações para os 4 perfis.
- [ ] Tema escuro em Mesas, Cozinha e nos diálogos.
- [ ] `/seguranca` redireciona.
- [ ] Admin muda o total de mesas.
- [ ] Em 375 px, sem rolagem lateral.
