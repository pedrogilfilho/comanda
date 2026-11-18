# Salão com mesas fixas, tirar itens, tempos da cozinha e Configurações — design

Data: 2026-11-18. Aprovado na conversa com o Pedro (dono do Quintal do Roger).

## Por quê

- Saber **em tempo real** quem está em cada mesa e, depois, o **histórico** de cada mesa (quem sentou, quanto gastou, qual garçom atendeu) e **qual mesa vendeu mais** num período.
- Corrigir conta quando um item foi **lançado a mais ou errado**, sem cancelar o pedido inteiro.
- Medir o **tempo de produção** da cozinha.
- Lançar itens mais rápido: botão no topo, e bebida sem passar pela cozinha.
- Trocar o botão de segurança por uma tela de **Configurações** completa.

## Abordagens consideradas

1. **Total de mesas** — A (escolhida): uma configuração do restaurante guarda o total (30); a mesa vira registro no banco quando é aberta pela primeira vez (como hoje). B: pré-criar 30 linhas e criar/arquivar ao mudar o total — mais trabalho, sem ganho.
2. **Tirar/diminuir item** — A (escolhida): alterar a quantidade no próprio `OrderItem`, com movimento de estoque e log. B: "pedido negativo" — polui conta e cozinha.
3. **Entrega** — A (escolhida): 4 etapas, cada uma testada, mesclada e publicada sozinha. B: tudo de uma vez.

## Etapa 1 — Salão

**Configuração do restaurante**
- Novo modelo `Setting` (chave/valor) ou `RestaurantConfig` (linha única) com `totalTables` (padrão 30). Escolha do construtor.
- `GET /settings` (todos os perfis logados), `PATCH /settings` (só ADMIN), log `CONFIG_ALTERADA` com antes → depois.
- Total entre 1 e 200 (chamada minha). Diminuir o total nunca esconde mesa **ocupada**: o mapa mostra 1..total mais qualquer ocupada acima do total.

**Mapa de mesas (tela Mesas, todos os perfis do salão)**
- Grade com as mesas 1..total. Livre: neutra, com o número. Ocupada: destaque, número, nome do cliente, total com taxa, "aberta há X" e o selo "N na cozinha" que já existe.
- Tocar numa **livre** abre "Abrir mesa" já com o número preenchido e travado; só pede o nome do cliente (opcional).
- Tocar numa **ocupada** mostra as ações que existem hoje (Ver pedidos / Ver conta).
- O identificador livre (Varanda, A3) sai da tela: o número vem do mapa. O backend continua aceitando qualquer identificador (mesas antigas no banco seguem válidas); o front só oferece 1..total.
- Mesa com identificador não numérico ainda aberta (legado) aparece depois das numeradas, para poder ser fechada.

**Botão "Adicionar itens" no topo**
- Ao lado de "Abrir mesa". Abre um seletor com as mesas **ocupadas** e, ao escolher, abre o `AddItemsDialog` existente. Sem mesa ocupada, o botão fica desabilitado com dica.

**Rastreabilidade**
- Nova coluna `Table.openedBy` (username de quem abriu) e snapshot `ClosedAccount.openedBy` gravado no fechamento. Contas antigas ficam com `openedBy` nulo ("—").
- "Contas fechadas": filtro por mesa e coluna/linha do garçom (quem abriu).
- "Relatórios": seção **Vendas por mesa** no período escolhido — mesa, total, nº de contas, tíquete médio, ordenada pelo total. Usa `ClosedAccount.tableIdentifier`, então vale para o passado.

**Fora**: juntar mesas, trocar cliente de mesa.

## Etapa 2 — Tirar/diminuir itens e bebida rápida

**Tirar ou diminuir item** (novo endpoint, ex. `PATCH /orders/:id/items/:itemId` com `{ quantity, reason }`; `quantity = 0` tira o item)
- **Garçom**: só em pedido `PENDING`; motivo fixo "Lançado errado" ou "Lançado a mais"; sempre volta ao estoque.
- **Gerente e Admin** ("caixa" = gerente neste sistema): em qualquer pedido ainda não fechado (`PENDING`, `PREPARING`, `READY`, `DELIVERED`), inclusive pela tela de fechamento da conta.
- Motivo obrigatório, um de três:
  - **Lançado a mais** → devolve ao estoque (movimento `ESTORNO`). Já vem marcado.
  - **Lançado errado** → devolve ao estoque (`ESTORNO`).
  - **Perda** → não devolve; registra movimento novo `PERDA` (quantidade anterior = atual, só para rastrear) e entra no relatório como perda. Chamada minha: o movimento `PERDA` guarda a quantidade perdida na nota.
- Diminuir carne: em gramas, respeitando o mínimo do produto; abaixo do mínimo, só tirando o item inteiro.
- Tudo numa transação: item, total do pedido, estoque, movimento e log `ITEM_REMOVIDO`/`ITEM_DIMINUIDO` com mesa, item, antes → depois, motivo.
- Se o pedido ficar sem itens, vira `CANCELLED` (mesma regra do cancelamento atual).
- Front: no `OrdersDialog` (garçom e gerente) e no `TableAccountDialog` (gerente/admin), cada item ganha "Alterar" → diálogo com quantidade e motivo.

**Bebida em fluxo rápido**
- Ao lançar, os itens da categoria `BEBIDA` vão para um pedido próprio que já nasce `DELIVERED` (com `deliveredAt` = agora). O resto vai para outro pedido `PENDING`, como hoje. Pedido só com bebida nunca aparece na cozinha.
- Mesmo lançamento = mesma transação (estoque e log uma vez para cada pedido criado).

## Etapa 3 — Tempos da cozinha

- Novas colunas em `Order`: `startedAt`, `readyAt`, `deliveredAt`, gravadas na transição de status.
- Fila da cozinha mostra, ao vivo (atualiza a cada 30 s ou no polling já existente):
  - Aguardando: "esperando há X min".
  - Em preparo: "esperou X · preparando há Y".
  - Pronto: "preparo levou Y · pronto há Z".
- Sem meta e sem cor de alerta (decisão do Pedro).
- Relatórios: tempos médios do período — espera (criado → início), preparo (início → pronto), entrega (pronto → entregue) — só de pedidos com os tempos gravados. Pedidos antigos e de bebida ficam fora.

## Etapa 4 — Configurações

- O escudo do topo vira engrenagem → `/configuracoes` (a rota `/seguranca` redireciona para lá).
- Seções:
  - **Meu perfil**: nome, usuário, perfil (Gerente, Garçom…).
  - **Sessão**: "entrou hoje às HH:MM · ativo há Xh Ymin" — hora do login atual (ex. `iat` do token devolvido no `/auth/me`), contando ao vivo. Sem controle de turno.
  - **Segurança**: trocar senha e verificação em 2 etapas (o que a tela atual já faz).
  - **Aparência**: claro / escuro, salvo no navegador. Se o tema escuro não existir nos tokens, criar o mínimo para as telas atuais (chamada minha: pode virar etapa separada se pesar).
  - **Restaurante** (só admin): total de mesas.
  - **Sair**.

## Pendência pequena

- Inventário: o nome do produto existe (`label` truncado). O Pedro vai mandar print; provável ajuste de layout no celular.

## Restrições

- Regras do projeto: casos de uso sobre repositórios abstratos + `UnitOfWork` + `AuditLog`; testes Jest com fakes no backend e Vitest no front; preços em centavos, carne em gramas.
- Toda mudança de banco por migration Prisma; dados existentes continuam válidos.
- Cada etapa: testes, lint, typecheck, teste no navegador, merge e push.

## Deixado ao construtor

- Forma exata da configuração (`Setting` chave/valor vs linha única).
- Formato dos endpoints e nomes de DTO, seguindo o padrão atual.
- Layout fino do mapa em 375 px (grade de 4 a 6 colunas).
