import { User } from '../entities/user/user.entity';

export abstract class UserRepository {
  abstract create(user: User): Promise<void>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByUsername(username: string): Promise<User | null>;
  abstract findByName(name: string): Promise<User | null>;
  abstract findByIds(ids: string[]): Promise<User[]>;
  abstract findAll(): Promise<User[]>;
  abstract update(user: User): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
