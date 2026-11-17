// Formatação para mensagens e logs do servidor (pt-BR)

export const formatMoney = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export const formatQuantity = (value: number, isMeat: boolean) =>
  isMeat ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg` : `${value} un`;
