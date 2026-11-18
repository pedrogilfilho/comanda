import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePolling } from './usePolling'

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(value: DocumentVisibilityState) {
  visibility = value
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    visibility = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('chama a cada intervalo com a aba visível', () => {
    const fn = vi.fn()
    renderHook(() => usePolling(fn, 1000))
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('pausa com a aba escondida e atualiza na hora ao voltar', () => {
    const fn = vi.fn()
    renderHook(() => usePolling(fn, 1000))
    act(() => setVisibility('hidden'))
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()

    act(() => setVisibility('visible'))
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('não chama enquanto desativado (diálogo aberto)', () => {
    const fn = vi.fn()
    const { rerender } = renderHook(({ enabled }) => usePolling(fn, 1000, { enabled }), { initialProps: { enabled: false } })
    vi.advanceTimersByTime(3000)
    expect(fn).not.toHaveBeenCalled()

    rerender({ enabled: true })
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
