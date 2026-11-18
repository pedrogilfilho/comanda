import { describe, expect, it } from 'vitest'
import { parseGrams } from './AddItemsDialog'

describe('parseGrams (carrinho de carne)', () => {
  it('campo vazio vale o pedido mínimo', () => {
    expect(parseGrams('', 300)).toBe(300)
    expect(parseGrams('   ', 300)).toBe(300)
    expect(parseGrams(undefined, 400)).toBe(400)
  })

  it('usa o valor digitado', () => {
    expect(parseGrams('450', 300)).toBe(450)
  })

  it('valor inválido vira NaN (a tela recusa)', () => {
    expect(parseGrams('abc', 300)).toBeNaN()
    expect(parseGrams('12.5', 300)).toBeNaN()
  })
})
