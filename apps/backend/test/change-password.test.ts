import { ChangePasswordUsecase, passwordProblem } from 'src/usecases/auth/change-password/change-password.usecase';
import { HashingService } from 'src/infra/services/hashing/hashing.service';
import { User } from 'src/domain/entities/user/user.entity';
import { InMemoryUserRepository } from './fakes/in-memory';

describe('ChangePasswordUsecase', () => {
  const hashing = new HashingService();

  async function userWith(password: string, needsPasswordChange: boolean) {
    const users = new InMemoryUserRepository();
    const user = User.create({ username: 'ana', name: 'Ana', password: await hashing.hash(password), role: 'GARCOM', needsPasswordChange });
    users.items = [user];
    return { users, user, usecase: new ChangePasswordUsecase(users, hashing) };
  }

  it('no primeiro acesso troca sem pedir a senha atual', async () => {
    const { usecase, user } = await userWith('123', true);
    await usecase.execute(user.getId(), 'nova-senha1');
    expect(user.getNeedsPasswordChange()).toBe(false);
    expect(await hashing.compare('nova-senha1', user.getPassword())).toBe(true);
  });

  it('fora do primeiro acesso exige a senha atual correta', async () => {
    const { usecase, user } = await userWith('antiga1', false);
    await expect(usecase.execute(user.getId(), 'nova-senha1')).rejects.toMatchObject({ message: 'Senha atual incorreta' });
    await expect(usecase.execute(user.getId(), 'nova-senha1', 'errada')).rejects.toMatchObject({ message: 'Senha atual incorreta' });
    await usecase.execute(user.getId(), 'nova-senha1', 'antiga1');
    expect(await hashing.compare('nova-senha1', user.getPassword())).toBe(true);
  });

  it('valida a senha nova', () => {
    expect(passwordProblem('12345')).toMatch(/pelo menos 6/);
    expect(passwordProblem('123456')).toMatch(/só números/);
    expect(passwordProblem('abc123')).toBeNull();
  });
});
