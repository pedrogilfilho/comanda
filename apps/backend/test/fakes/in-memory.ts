// Repositórios em memória para testar usecases sem banco. Cada um guarda um array de entidades.
import { ACTIVE_ORDER_STATUSES, KITCHEN_ORDER_STATUSES } from '@comanda/shared';
import { UnitOfWork } from 'src/domain/ports/unit-of-work';
import { OrderRepository } from 'src/domain/repositories/order.repository.interface';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { TableRepository } from 'src/domain/repositories/table.repository.interface';
import { UserRepository } from 'src/domain/repositories/user.repository.interface';
import { AuditLogRepository } from 'src/domain/repositories/audit-log.repository.interface';
import { ClosedAccountRepository } from 'src/domain/repositories/closed-account.repository.interface';
import { StockMovementRepository } from 'src/domain/repositories/stock-movement.repository.interface';
import {
  SettingsRepository,
  type RestaurantSettings,
} from 'src/domain/repositories/settings.repository.interface';
import { Order } from 'src/domain/entities/order/order.entity';
import { Product } from 'src/domain/entities/product/product.entity';
import { Table } from 'src/domain/entities/table/table.entity';
import { User } from 'src/domain/entities/user/user.entity';
import { AuditLog } from 'src/domain/entities/audit-log/audit-log.entity';
import { ClosedAccount } from 'src/domain/entities/closed-account/closed-account.entity';
import { StockMovement } from 'src/domain/entities/stock-movement/stock-movement.entity';

interface Snapshotable {
  snapshot(): () => void;
}

// Desfaz o que os repositórios fizeram quando o bloco lança, imitando o rollback do banco
export class FakeUnitOfWork extends UnitOfWork {
  constructor(private readonly repos: Snapshotable[]) {
    super();
  }
  async run<T>(work: () => Promise<T>): Promise<T> {
    const restores = this.repos.map((r) => r.snapshot());
    try {
      return await work();
    } catch (e) {
      restores.forEach((restore) => restore());
      throw e;
    }
  }
}

export class InMemoryOrderRepository extends OrderRepository implements Snapshotable {
  items: Order[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async create(order: Order) {
    this.items.push(order);
  }
  async findById(id: string) {
    return this.items.find((o) => o.getId() === id) ?? null;
  }
  async findActiveByTableId(tableId: string) {
    return this.items.filter(
      (o) => o.getTableId() === tableId && ACTIVE_ORDER_STATUSES.includes(o.getStatus()),
    );
  }
  async findAllActive() {
    return this.items.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.getStatus()));
  }
  async findForKitchen() {
    return this.items.filter((o) => KITCHEN_ORDER_STATUSES.includes(o.getStatus()));
  }
  async findByClosedAccountIds(ids: string[]) {
    return this.items.filter((o) => ids.includes(o.getClosedAccountId() ?? ''));
  }
  async countByUserId(userId: string) {
    return this.items.filter((o) => o.getUserId() === userId).length;
  }
  async update(order: Order) {
    this.items = this.items.map((o) => (o.getId() === order.getId() ? order : o));
  }
  closed: { tableId: string; closedAccountId: string }[] = [];
  async closeByTableId(tableId: string, closedAccountId: string) {
    this.closed.push({ tableId, closedAccountId });
    this.items = this.items.map((o) =>
      o.getTableId() === tableId && ACTIVE_ORDER_STATUSES.includes(o.getStatus())
        ? Order.with({
            id: o.getId(),
            tableId: o.getTableId(),
            userId: o.getUserId(),
            status: 'CLOSED',
            totalAmount: o.getTotalAmount(),
            notes: o.getNotes(),
            items: o.getItems(),
            closedAccountId,
            createdAt: o.getCreatedAt(),
            updatedAt: new Date(),
          })
        : o,
    );
  }
}

export class InMemoryProductRepository extends ProductRepository implements Snapshotable {
  items: Product[] = [];
  stock = new Map<string, number>(); // estoque "no banco", separado da entidade em memória
  snapshot() {
    const items = [...this.items];
    const stock = new Map(this.stock);
    return () => {
      this.items = items;
      this.stock = stock;
    };
  }
  seed(products: Product[]) {
    this.items = products;
    products.forEach((p) => this.stock.set(p.getId(), p.getStock()));
  }
  private withStock(p: Product): Product {
    const s = this.stock.get(p.getId());
    if (s === undefined || s === p.getStock()) return p;
    const copy = Product.with({
      id: p.getId(),
      name: p.getName(),
      description: p.getDescription(),
      price: p.getPrice(),
      pricePerKg: p.getPricePerKg(),
      minGrams: p.getMinGrams(),
      category: p.getCategory(),
      isMeat: p.getIsMeat(),
      available: p.getAvailable(),
      stock: s,
      minStock: p.getMinStock(),
      createdAt: p.getCreatedAt(),
      updatedAt: p.getUpdatedAt(),
    });
    return copy;
  }
  async findAll() {
    return this.items.map((p) => this.withStock(p));
  }
  async findById(id: string) {
    const p = this.items.find((x) => x.getId() === id);
    return p ? this.withStock(p) : null;
  }
  async findByIds(ids: string[]) {
    return this.items.filter((p) => ids.includes(p.getId())).map((p) => this.withStock(p));
  }
  async findByName(name: string) {
    return this.items.find((p) => p.getName() === name && p.getAvailable()) ?? null;
  }
  async create(product: Product) {
    this.items.push(product);
    this.stock.set(product.getId(), product.getStock());
  }
  async update(product: Product) {
    this.items = this.items.map((p) => (p.getId() === product.getId() ? product : p));
    this.stock.set(product.getId(), product.getStock());
  }
  async updateDetails(product: Product) {
    // O estoque "do banco" fica como está
    this.items = this.items.map((p) => (p.getId() === product.getId() ? product : p));
  }
  async hasOrders() {
    return false;
  }
  async delete(id: string) {
    this.items = this.items.filter((p) => p.getId() !== id);
  }
  async decrementStock(id: string, quantity: number) {
    const before = this.stock.get(id) ?? 0;
    if (before < quantity) return null;
    this.stock.set(id, before - quantity);
    return before;
  }
  async incrementStock(id: string, quantity: number) {
    const before = this.stock.get(id) ?? 0;
    this.stock.set(id, before + quantity);
    return before;
  }
}

export class InMemoryTableRepository extends TableRepository implements Snapshotable {
  items: Table[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async findAll() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((t) => t.getId() === id) ?? null;
  }
  async findByIdentifier(identifier: string) {
    return this.items.find((t) => t.getIdentifier() === identifier) ?? null;
  }
  async create(table: Table) {
    this.items.push(table);
  }
  async update(table: Table) {
    this.items = this.items.map((t) => (t.getId() === table.getId() ? table : t));
  }
}

export class InMemoryUserRepository extends UserRepository implements Snapshotable {
  items: User[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async create(user: User) {
    this.items.push(user);
  }
  async findById(id: string) {
    return this.items.find((u) => u.getId() === id) ?? null;
  }
  async findByUsername(username: string) {
    return this.items.find((u) => u.getUsername() === username) ?? null;
  }
  async findByName(name: string) {
    return this.items.find((u) => u.getName() === name) ?? null;
  }
  async findByIds(ids: string[]) {
    return this.items.filter((u) => ids.includes(u.getId()));
  }
  async findAll() {
    return this.items;
  }
  async update(user: User) {
    this.items = this.items.map((u) => (u.getId() === user.getId() ? user : u));
  }
  async delete(id: string) {
    this.items = this.items.filter((u) => u.getId() !== id);
  }
}

export class InMemoryAuditLogRepository extends AuditLogRepository implements Snapshotable {
  items: AuditLog[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async create(log: AuditLog) {
    this.items.push(log);
  }
  async findBetween() {
    return this.items;
  }
}

export class InMemoryClosedAccountRepository extends ClosedAccountRepository implements Snapshotable {
  items: ClosedAccount[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async create(account: ClosedAccount) {
    this.items.push(account);
  }
  async findBetween() {
    return this.items;
  }
}

export class InMemoryStockMovementRepository extends StockMovementRepository implements Snapshotable {
  items: StockMovement[] = [];
  snapshot() {
    const copy = [...this.items];
    return () => {
      this.items = copy;
    };
  }
  async create(m: StockMovement) {
    this.items.push(m);
  }
}

export class InMemorySettingsRepository extends SettingsRepository implements Snapshotable {
  value: RestaurantSettings | null = null;
  snapshot() {
    const copy = this.value;
    return () => {
      this.value = copy;
    };
  }
  async get() {
    return this.value ?? { totalTables: 30 };
  }
  async save(settings: RestaurantSettings) {
    this.value = { ...settings };
  }
}
