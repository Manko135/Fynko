import { useSyncExternalStore } from 'react'

export type BalanceMode = 'caixa' | 'mensal'

const KEY = 'fynko:balance-mode'
const listeners = new Set<() => void>()

function getSnapshot(): BalanceMode {
  try {
    return localStorage.getItem(KEY) === 'mensal' ? 'mensal' : 'caixa'
  } catch {
    return 'caixa'
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Change the balance shown in the sidebar; notifies every subscriber live. */
export function setBalanceMode(mode: BalanceMode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

/**
 * Which balance the sidebar card shows: 'caixa' (accumulated, all-time up to
 * today — the default for new users) or 'mensal' (only the current month's
 * income minus expenses paid this month). Persisted per browser.
 */
export function useBalanceMode(): BalanceMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'caixa')
}
