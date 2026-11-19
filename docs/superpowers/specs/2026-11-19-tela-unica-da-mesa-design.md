# Tela única da mesa + tema no cabeçalho — design curto

**Por quê:** hoje, tocar numa mesa ocupada abre um menu e cada opção abre outra tela (pedidos, conta). O usuário quer tudo numa tela só, e trocar claro/escuro sem ir até Configurações.

## O que muda
1. **Tela da mesa (toque na mesa ocupada)**, de cima para baixo:
   - botão **Adicionar itens** (em cima de tudo);
   - título: mesa, cliente, quem abriu;
   - **pedidos** no meio, separados por pedido, com status, cancelar e ✎ tirar/diminuir item (como o `OrdersDialog` de hoje);
   - subtotal, taxa de 10% e total;
   - botão **Fechar conta** (embaixo de tudo). Ao tocar, a escolha das formas de pagamento abre na mesma tela (sem trocar de diálogo) e o botão confirma. Fica bloqueado enquanto houver pedido na cozinha, como hoje.
   - "Adicionar itens" abre a tela de produtos e volta para a tela da mesa ao terminar.
   - Igual para todos os perfis (o garçom já pode fechar conta).
2. **O menu de ações sai.** O botão "Adicionar itens" do topo da tela Mesas (com escolha da mesa) continua.
3. **Cabeçalho:** botão sol/lua ao lado da engrenagem, usando `applyTheme`/`readTheme` (`lib/theme.ts`). A escolha fica salva igual à de Configurações.

## Abordagens
- **Escolhida:** um diálogo novo que junta pedidos (`OrdersDialog`) e fechamento (`TableAccountDialog`), com o pagamento abrindo no rodapé.
- Descartadas: manter as duas telas com abas (continua sendo duas telas); lista única de itens somados (perde status e ações por pedido).

## Fica com quem construir
Só frontend; nenhuma rota nova. Nomes de componentes, como dividir o código e os testes.
