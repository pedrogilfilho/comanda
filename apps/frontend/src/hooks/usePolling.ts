'use client'

import { useEffect, useRef } from 'react'

interface PollingOptions {
  // false pausa (ex.: diálogo aberto, para a lista não mudar embaixo de quem está digitando)
  enabled?: boolean
}

// Chama fn a cada intervalMs, só com a aba visível. Ao voltar para a aba (ou reativar), atualiza na hora.
export function usePolling(fn: () => unknown, intervalMs: number, { enabled = true }: PollingOptions = {}) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      if (document.visibilityState === 'visible') fnRef.current()
    }
    const start = () => {
      if (timer === null) timer = setInterval(tick, intervalMs)
    }
    const stop = () => {
      if (timer !== null) clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fnRef.current()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
