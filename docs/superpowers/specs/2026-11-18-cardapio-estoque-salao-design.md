# Cardápio, estoque, inventário e salão do admin — desenho

Data: 2026-11-18. Tamanho: mudança pequena-média (front + uma rota nova e uma alteração de rota no backend).

## Por quê

O admin cuida do cadastro e também acompanha o salão. As listas de cardápio e estoque estão longas demais
para ver tudo de uma vez, falta poder corrigir um produto sem apagá-lo e a contagem de estoque item a item é
lenta. O admin precisa ver as mesas abertas com o mesmo controle do gerente.

## O que muda

1. **Menu do admin** (`NAV_BY_ROLE.ADMIN`): Mesas → Estoque → Cardápio → Contas fechadas → Relatórios →
   Usuários → Logs. A tela inicial do admin (`homeFor`) passa a ser `/mesas`. A tela de Mesas é a mesma do
   gerente (o `TablesView` já trata admin como gerente; a rota já permite ADMIN).

2. **Categorias recolhíveis** no Cardápio e no Estoque: cada categoria tem um cabeçalho clicável com o nome e
   a contagem de itens, que abre e fecha a lista. Botões "Abrir todas" e "Fechar todas" no topo.
   - _Minha proposta:_ começam todas fechadas; abrir uma não fecha as outras; o estado aberto/fechado fica
     no `localStorage` (por tela), sem quebrar se o armazenamento falhar.
   - Um componente só, usado pelas duas telas.

3. **Editar produto** no Cardápio: botão "Editar" ao lado de "Remover", abre a mesma janela de adicionar já
   preenchida.
   - Campos editáveis: nome, descrição, preço (ou preço/kg), mínimo em gramas (carne) e categoria.
   - _Minha proposta:_ carne não troca para outra categoria nem o contrário (carne é em gramas, o resto em
     unidades); o backend recusa essa troca. O estoque não aparece na edição: só muda na tela de Estoque.
   - Backend: `PATCH /products/:id` (ADMIN), use case novo, registro no log de ações como os demais.

4. **Ajustar estoque**: a janela fica só com Entrada e Saída (sai "Contagem").

5. **Inventário**: botão "Inventário" no fim da tela de Estoque. Abre uma janela com todos os itens agrupados
   por categoria, cada um com um campo já preenchido com o estoque atual (kg para carne, unidades para o
   resto). Mostra quantos itens mudaram; "Salvar inventário" só envia os alterados.
   - Backend (opção escolhida: **tudo de uma vez**): `POST /products/inventory` (ADMIN) recebe
     `[{ productId, stock }]` e grava tudo numa única transação (`UnitOfWork`): ou todas as correções
     entram, ou nenhuma. Cada item alterado vira movimento `CONTAGEM` com motivo "Inventário" no histórico,
     e um registro no log de ações.
   - O tipo `CONTAGEM` continua existindo no domínio; só deixa de ser aceito no ajuste manual se a tela não o
     usar mais (_minha proposta:_ manter aceito no backend, para não quebrar nada).

## Abordagens consideradas para o inventário

- **Tudo de uma vez (escolhida):** rota nova e transação única; sem inventário pela metade se cair a conexão.
- **Item por item:** reaproveita `PATCH /products/:id/stock` em várias chamadas; menos backend, mas uma falha
  no meio deixa parte salva e parte não. Descartada.

## Fora do escopo

- Mudar a tela de Mesas em si, permissões do gerente, ou a contagem que o pedido faz no estoque.

## Deixado para quem implementar

- Visual exato do cabeçalho recolhível (seguindo os tokens da Parte 3), nomes de arquivos, testes do use case
  de edição e do inventário (Jest), e o texto dos toasts.
