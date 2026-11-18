import { Product } from 'src/domain/entities/product/product.entity';
import { Table } from 'src/domain/entities/table/table.entity';
import { Order } from 'src/domain/entities/order/order.entity';
import { OrderItem } from 'src/domain/entities/order-item/order-item.entity';
import { User } from 'src/domain/entities/user/user.entity';

export const picanha = (stock = 5000) =>
  Product.create({ name: 'Picanha', category: 'CARNE', pricePerKg: 17800, minGrams: 300, stock });

export const cerveja = (stock = 10) =>
  Product.create({ name: 'Cerveja', category: 'BEBIDA', price: 1500, stock });

export const openTable = (identifier = '5') => Table.create({ identifier, status: 'OCCUPIED' });

export const orderFor = (table: Table, items: { product: Product; quantity: number }[], userId = 'u1') =>
  Order.create({
    tableId: table.getId(),
    userId,
    items: items.map(({ product, quantity }) =>
      OrderItem.create({
        productId: product.getId(),
        quantity,
        unitPrice: product.getUnitPrice(),
        weighed: product.getIsMeat(),
      }),
    ),
  });

export const waiter = () =>
  User.create({
    username: 'carlos',
    name: 'Carlos',
    password: 'hash',
    role: 'GARCOM',
    needsPasswordChange: false,
  });
