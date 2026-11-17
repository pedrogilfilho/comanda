import { ClosedAccount } from '../entities/closed-account/closed-account.entity';

export abstract class ClosedAccountRepository {
  abstract create(account: ClosedAccount): Promise<void>;
  abstract findBetween(from: Date, to: Date): Promise<ClosedAccount[]>;
}
