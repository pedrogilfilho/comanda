# Comanda+ — Quintal do Roger

Sistema de comandas do restaurante **Quintal do Roger**: abertura de mesas, lançamento de pedidos, fila da cozinha, controle de estoque, fechamento de conta com divisão de pagamento, relatórios e auditoria.

O projeto tem dois apps independentes:

| Pasta | Stack | Porta local |
|---|---|---|
| `comanda-plus-backend-main/` | NestJS 10 · Prisma 5 · PostgreSQL · JWT · bcrypt · 2FA TOTP (otplib) | `3001` (prefixo `/api`) |
| `comanda-plus-frontend-main/` | Next.js 14 (App Router) · React 18 · Tailwind · Sonner · jsPDF | `3000` |

Produção: frontend na Vercel e backend em `https://comandaplus.duckdns.org`. O Next encaminha `/api/*` para o backend (rewrite em `next.config.js`).

---

## Como rodar localmente

### Backend

```bash
cd comanda-plus-backend-main
npm install
cp .env.example .env          # ajuste DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npx prisma db push            # o projeto não tem pasta de migrations (ver "Pontos a melhorar")
npx ts-node prisma/seed.ts    # cria usuários e cardápio
npm run start:dev
```

Usuários do seed (senha inicial `123`, troca obrigatória no 1º login):

| Usuário | Perfil |
|---|---|
| `admin` | ADMIN |
| `gerente` | GERENTE |
| `carlos` | GARCOM |
| `cozinha` | COZINHA |

### Frontend

```bash
cd comanda-plus-frontend-main
npm install
# aponte o proxy para o backend local (senão /api vai para produção)
API_PROXY_TARGET=http://localhost:3001 npm run dev
```

---

## Estrutura

```
comanda/
├── .claude/settings.json            # plugin taste-skill habilitado no projeto
├── comanda-plus-backend-main/
│   ├── prisma/
│   │   ├── schema.prisma            # modelos do banco
│   │   ├── seed.ts                  # usuários padrão + cardápio
│   │   ├── menu.ts / sync-menu.ts   # cardápio e sincronização
│   │   └── migrate-*.sql            # scripts SQL avulsos de migração de dados
│   └── src/
│       ├── main.ts                  # bootstrap, CORS, prefixo /api
│       ├── app.module.ts
│       ├── domain/
│       │   ├── entities/            # User, Table, Product, Order, OrderItem, ClosedAccount, AuditLog
│       │   └── repositories/        # interfaces dos repositórios
│       ├── usecases/                # um caso de uso por pasta (auth, order, product, report, table, two-factor, user)
│       ├── infra/
│       │   ├── repositories/prisma/ # implementações Prisma
│       │   ├── services/            # auth-session, hashing, jwt, two-factor, prisma
│       │   └── web/
│       │       ├── auth/            # AuthGuard, AuthOrChallengeGuard, @IsPublic
│       │       └── routes/          # controllers + modules
│       └── shared/utils/
└── comanda-plus-frontend-main/
    ├── next.config.js               # rewrite /api → backend
    └── src/
        ├── app/
        │   ├── login/ · change-password/
        │   └── (authenticated)/
        │       ├── layout.tsx       # header, checagem de sessão
        │       ├── dashboard/       # tela única que muda conforme o perfil
        │       └── seguranca/       # configuração de 2FA
        ├── components/
        │   ├── AddItemsModal.tsx · TableAccountModal.tsx
        │   ├── admin/               # abas: Usuários, Cardápio, Estoque, Contas fechadas, Relatórios, Logs
        │   ├── auth/                # CodeInput, TwoFactorSetup
        │   └── ui/                  # ConfirmModal, DateRangeFilter, PasswordInput
        ├── lib/
        │   ├── api/                 # cliente HTTP por domínio (fetchWithAuth em config.ts)
        │   ├── pdf/                 # exportação de relatórios
        │   ├── utils/format.ts
        │   └── apiMock.ts · mockData.ts   # resquícios da fase mockada
        └── hooks/useInitializeApp.ts
```

### Arquitetura do backend

Clean Architecture: **controller → usecase → interface de repositório → implementação Prisma**. As entidades de domínio encapsulam as regras (getters/setters), os usecases orquestram e gravam o `AuditLog`.

### Modelos (Prisma)

`User`, `Table`, `Product`, `Order`, `OrderItem`, `EstoqueMovimentacao`, `ClosedAccount`, `AccountPayment`, `AuditLog`. Todos os valores monetários em **centavos**; carne em **gramas** com preço por kg.

### Rotas da API (`/api`)

| Recurso | Endpoints | Acesso |
|---|---|---|
| `auth` | `login`, `change-password`, `2fa/{setup,enable,disable,verify,status}`, `health` | público / autenticado |
| `tables` | `GET /`, `POST /open`, `POST /:id/close` | autenticado |
| `orders` | `POST /`, `GET /kitchen`, `GET /table/:tableId`, `PATCH /:id/status` | autenticado |
| `products` | `GET /`, `POST /`, `DELETE /:id`, `PATCH /:id/stock` | escrita só ADMIN |
| `users` | CRUD, `reset-password`, `reset-two-factor`, `active`, `me` | só ADMIN |
| `reports`, `closed-accounts` | — | ADMIN, GERENTE |
| `logs` | — | ADMIN |

### Perfis no frontend

| Perfil | O que vê no dashboard |
|---|---|
| ADMIN | Usuários, Cardápio, Estoque, Contas fechadas, Relatórios, Logs |
| GERENTE | Mesas, Contas fechadas, Relatórios |
| GARCOM | Mesas (abrir, lançar pedido, fechar conta) |
| COZINHA | Fila de pedidos (mudar status) |

### Regras de negócio

- **Pedido**: mesa precisa estar aberta; carne tem pedido mínimo (padrão 300 g); estoque insuficiente bloqueia; preço é congelado no item (snapshot); baixa automática no estoque; observação por item até 120 caracteres.
- **Fechamento**: taxa de serviço de 10%; bloqueado se houver pedido `PENDING`/`PREPARING` (exceto ADMIN); pagamento dividido em Dinheiro/Pix/Débito/Crédito parcelado, e a soma precisa bater exatamente com o total; mesa sem consumo é só liberada, sem entrar no histórico.
- **Segurança**: senha com bcrypt, troca obrigatória no 1º acesso, 2FA TOTP com segredo criptografado (AES-256-GCM) e códigos de recuperação; desativação de usuário com exclusão só após 30 dias.
- **Auditoria**: toda ação relevante grava em `AuditLog`.

---

## Pontos a melhorar

### Críticos (corretude e segurança)

1. **Pedido e baixa de estoque fora de transação** — `CreateOrderUsecase` cria o pedido e depois atualiza o estoque produto a produto, sem `prisma.$transaction`. Dois garçons lançando ao mesmo tempo podem vender o mesmo estoque, e uma falha no meio deixa pedido sem baixa. O mesmo vale para `CloseTableUsecase` (conta, pedidos e mesa em gravações separadas).
2. **Cancelar pedido não devolve estoque** — `UpdateOrderStatusUsecase` muda para `CANCELLED` sem repor as quantidades.
3. **Qualquer transição de status é aceita** — dá para voltar de `DELIVERED` para `PENDING` ou "reabrir" um `CANCELLED`. Falta uma máquina de estados com as transições permitidas.
4. **Rotas de mesa e pedido sem checagem de perfil** — qualquer usuário logado (inclusive COZINHA) pode abrir/fechar mesa e lançar pedido; qualquer um pode mudar status de pedido.
5. **Segredo JWT com fallback fixo** — `JwtService` usa `'secret'`/`'refresh'` se a variável de ambiente faltar. Em produção o app deveria recusar subir sem `JWT_SECRET`.
6. **Usuário desativado continua logado** — o `AuthGuard` só valida a assinatura do token (válido por 8 h); não confere se o usuário ainda está `active`.
7. **Login sem limite de tentativas** — não há rate limiting em `auth/login` nem em `2fa/verify`.
8. **Sem validação de entrada** — não há `ValidationPipe` nem DTOs com `class-validator`; os controllers recebem `body: any` e cada usecase valida na mão.

### Infraestrutura e setup

9. **Sem pasta de migrations** — o README do backend manda rodar `prisma migrate dev`, mas o histórico do schema não está versionado; as mudanças de dados estão em `migrate-*.sql` avulsos. Adotar `prisma migrate` de verdade.
10. **`prisma db seed` não funciona** — falta a chave `"prisma": { "seed": "ts-node prisma/seed.ts" }` no `package.json`.
11. **Projeto não está em git** — sem histórico nem como reverter mudanças.
12. **Frontend local aponta para produção** — com `NEXT_PUBLIC_API_URL=/api` e o rewrite padrão para `comandaplus.duckdns.org`, rodar `npm run dev` sem `API_PROXY_TARGET` usa o banco de produção. Criar um `.env.development` apontando para `localhost:3001`.
13. **Refresh token emitido mas nunca usado** — o login gera `refreshToken` (7 dias), mas não existe endpoint de renovação; após 8 h o usuário é deslogado.

### Código e manutenção

14. **Sobras da fase mockada** — `apiMock.ts`, `mockData.ts` e `useInitializeApp` (chama `restoreUsersFromStorage` em todo carregamento) podem ser removidos.
15. **`EstoqueMovimentacao` não é usado** — o modelo existe no schema, mas nenhum usecase grava movimentações; o histórico de estoque se perde.
16. **Permissões espalhadas** — cada controller faz `if (req.role !== ...)` manualmente. Um decorator `@Roles(...)` com guard central reduz repetição e esquecimentos (ver item 4).
17. **Sem testes automatizados** — nem unitários nos usecases (onde estão as regras de dinheiro e estoque) nem e2e.
18. **Dashboard monolítico** — `dashboard/page.tsx` concentra os quatro perfis; separar em componentes por perfil facilita manutenção.
19. **Estilos inline** — muitas cores em `style={{ ... }}` repetidas; mover para tokens no `tailwind.config.ts`.
20. **Token no `localStorage`** — exposto a XSS; preferir cookie `httpOnly` (o backend já usa `cookie-parser` e CORS com `credentials`).
21. **Documentação quebrada** — os READMEs dos apps citam `CLAUDE.md`, `GUIA-DEPLOYMENT-VM.md`, `RODAR-LOCALHOST.md` e `DEPLOY-VERCEL-RAPIDO.md`, que não existem; o README do frontend ainda descreve "login mockado" e "5 mesas".
22. **Tempo real** — cozinha e salão atualizam por polling a cada 15 s; WebSocket/SSE para novos pedidos e mudança de status melhoraria a operação.
