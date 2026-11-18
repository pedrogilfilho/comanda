# Plano de refatoração do Comanda+

Aprovado em 2026-11-16. Decisões: A monorepo (sim), B rotas por área (sim), **C garçom continua fechando conta**, D senha atual na troca (sim), E relatórios por `ClosedAccount` (sim), F cancelar pedido na UI para Gerente/Admin (sim), G banco local em Docker (sim).

Ordem: **Parte 1 lógica → Parte 2 estrutura → Parte 3 estilo**, com build/lint/testes a cada parte.

## Parte 1: lógica

### Backend

- B1 `create-order`: transação (UnitOfWork) + decremento condicional de estoque + `EstoqueMovimentacao(VENDA)`.
- B2 `close-table`: transação.
- B3 `update-order-status`: máquina de estados (`PENDING→PREPARING|CANCELLED`, `PREPARING→READY|CANCELLED`, `READY→DELIVERED`); `CLOSED` só via fechamento; `CANCELLED` repõe estoque + `EstoqueMovimentacao(ESTORNO)`.
- B4 `@Roles` + `RolesGuard`: abrir mesa/lançar pedido/fechar conta = GARCOM, GERENTE, ADMIN; status = COZINHA, GERENTE, ADMIN; cancelar = GERENTE, ADMIN; cardápio/usuários/logs = ADMIN; relatórios/contas = GERENTE, ADMIN.
- B5 `env` validado no bootstrap (zod); sem `JWT_SECRET` não sobe.
- B6 `AuthGuard` carrega o usuário: inativo = 401; `needsPasswordChange` só libera `auth/change-password`, `auth/me`, `auth/2fa/*`.
- B7 `change-password` exige `currentPassword` fora do 1º acesso.
- B8 `@nestjs/throttler` em `login` e `2fa/verify`.
- B9 DTOs `class-validator` + `ValidationPipe` global.
- B10 CORS por `CORS_ORIGINS`.
- B11 relatórios com `ClosedAccount` como fonte; pedidos só para rankings.
- B12 `isInKitchen` compartilhado; card diz "não entregues".
- B14 `actor` = username em todo `AuditLog`.
- B15 remover `refreshToken`, `cookie-parser`, `passport`.
- B16 `include product` nas consultas de pedido.
- B18 migration inicial + `prisma.seed`.
- B19 erros com `code`.
- `GET /auth/me`.

### Frontend

- F1 `useSession` com `GET /auth/me`; shell com skeleton.
- F2 carrinho: vazio = mínimo; `key` única.
- F3 pedido mostra só subtotal (taxa entra na conta).
- F4 backend devolve `total` da mesa; `SERVICE_FEE_RATE` em constants.
- F5 `usePolling` pausa com aba oculta/diálogo aberto.
- F6/F7/F8/F9 códigos de erro, labels, constantes compartilhadas.
- F10 remover nota de migração.
- F11 `http.ts` + `ApiError`.
- F12 apagar mocks.
- F13 `Dialog` acessível.
- F14 aviso de cozinha condicional ao perfil.

## Parte 2: estrutura

- `apps/backend`, `apps/frontend`, `packages/shared` (tipos, enums, constantes, pricing, status).
- Frontend: `app/(public)`, `app/(app)/{mesas,cozinha,contas,relatorios,admin/*,seguranca}`, `components/{ui,layout,features}`, `hooks`, `services`, `lib`, `types`, `constants`, `config`, `styles`.
- ESLint + Prettier na raiz (`singleQuote`, `semi: true`, `trailingComma: all`, `printWidth: 110`, `import/order`).
- Testes: Jest (backend usecases com repositórios em memória), Vitest (shared, frontend lib/hooks).
- `tsconfig strict: true` no backend.

## Parte 3: estilo

- Tokens em `globals.css`: bg `#faf6ef`, surface `#fff9f2`, surface-2 `#f3ece2`, bg-dark/ink `#2a1f14`, ink-muted `#6b5a4a`, hairline `rgba(42,31,20,.14)`, accent `#c45c2a` (único preenchido), success `#3d5c3a`, warning `#9a5f14`, danger `#b03a2e`; display Georgia, texto system sans; escala 28/22/18/16/14/13, nada abaixo de 13; espaço 4…48; raio 8/12/16.
- `ui/`: Button (primary/secondary/ghost, 44px), IconButton, Input, Select, Field, Dialog/Sheet, ConfirmDialog, Badge, Card, StatTile, Tabs, Skeleton, EmptyState, SearchInput, DateRangeFilter, BarList, Icon (lucide-react).
- Texto: caixa de frase, botões verbo+objeto, sem exclamação, sem travessão como tique, sem emoji.
- Mobile first (390/768/1024/1440), contraste, foco visível, `prefers-reduced-motion`.
