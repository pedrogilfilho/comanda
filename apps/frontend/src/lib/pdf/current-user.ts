// Nome do usuário logado, para constar no PDF/arquivo gerado. Quem preenche é o SessionProvider.
let name: string | undefined

export function setCurrentUserName(value: string | undefined) {
  name = value
}

export function currentUserName(): string | undefined {
  return name
}
