import { Order } from 'src/domain/entities/order/order.entity';
import { OrderItem } from 'src/domain/entities/order-item/order-item.entity';

const item = (quantity: number, unitPrice = 1500) =>
  OrderItem.create({ productId: 'p1', quantity, unitPrice, weighed: false });

describe('Order.changeItemQuantity', () => {
  it('diminui e recalcula o total', () => {
    const a = item(4);
    const b = item(1, 800);
    const order = Order.create({ tableId: 't', userId: 'u', items: [a, b] });
    order.changeItemQuantity(a.getId(), 1);
    expect(order.getItems().map((i) => i.getQuantity())).toEqual([1, 1]);
    expect(order.getItems()[0].getId()).toBe(a.getId());
    expect(order.getTotalAmount()).toBe(1500 + 800);
  });

  it('quantidade 0 tira o item', () => {
    const a = item(2);
    const b = item(1, 800);
    const order = Order.create({ tableId: 't', userId: 'u', items: [a, b] });
    order.changeItemQuantity(a.getId(), 0);
    expect(order.getItems().map((i) => i.getId())).toEqual([b.getId()]);
    expect(order.getTotalAmount()).toBe(800);
    expect(order.getStatus()).toBe('PENDING');
  });

  it('sem itens o pedido fica cancelado', () => {
    const a = item(2);
    const order = Order.create({ tableId: 't', userId: 'u', items: [a] });
    order.changeItemQuantity(a.getId(), 0);
    expect(order.getStatus()).toBe('CANCELLED');
    expect(order.getTotalAmount()).toBe(0);
  });

  it('create com status DELIVERED', () => {
    const order = Order.create({ tableId: 't', userId: 'u', items: [item(1)], status: 'DELIVERED' });
    expect(order.getStatus()).toBe('DELIVERED');
  });
});

describe('Order: hora de cada etapa', () => {
  it('grava a hora de cada etapa', () => {
    const order = Order.create({ tableId: 't', userId: 'u', items: [item(1)] });
    expect([order.getStartedAt(), order.getReadyAt(), order.getDeliveredAt()]).toEqual([null, null, null]);
    order.updateStatus('PREPARING');
    expect(order.getStartedAt()).toBeInstanceOf(Date);
    order.updateStatus('READY');
    expect(order.getReadyAt()).toBeInstanceOf(Date);
    order.updateStatus('DELIVERED');
    expect(order.getDeliveredAt()).toBeInstanceOf(Date);
    expect(order.copy().getStartedAt()).toEqual(order.getStartedAt());
  });

  it('bebida criada entregue grava só a entrega', () => {
    const order = Order.create({ tableId: 't', userId: 'u', items: [item(1)], status: 'DELIVERED' });
    expect(order.getStartedAt()).toBeNull();
    expect(order.getDeliveredAt()).toBeInstanceOf(Date);
  });
});
