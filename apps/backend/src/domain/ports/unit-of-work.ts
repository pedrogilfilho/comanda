// Executa um bloco dentro de uma transação. Os repositórios usados dentro do bloco
// participam da mesma transação sem mudar de assinatura.
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
