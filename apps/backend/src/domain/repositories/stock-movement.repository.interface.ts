import { StockMovement } from '../entities/stock-movement/stock-movement.entity';

export abstract class StockMovementRepository {
  abstract create(movement: StockMovement): Promise<void>;
}
