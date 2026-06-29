import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const COLLAPSED_BAR_W = 180
export const COLLAPSED_GAP = 8
export const COLLAPSED_LEFT = 16
export const COLLAPSED_BOTTOM = 8

interface CollapsedPanelsCtx {
  getIndex: (key: string) => number
  register: (key: string) => void
  unregister: (key: string) => void
}

const Ctx = createContext<CollapsedPanelsCtx>({
  getIndex: () => -1,
  register: () => {},
  unregister: () => {},
})

export function useCollapsedBarLeft(key: string | undefined, collapsed: boolean): number {
  const { getIndex, register, unregister } = useContext(Ctx)

  useEffect(() => {
    if (!key || !collapsed) return
    register(key)
    return () => unregister(key)
  }, [key, collapsed, register, unregister])

  const index = key && collapsed ? getIndex(key) : -1
  return index < 0 ? COLLAPSED_LEFT : COLLAPSED_LEFT + index * (COLLAPSED_BAR_W + COLLAPSED_GAP)
}

export function CollapsedPanelsProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<string[]>([])

  const register = useCallback((key: string) => {
    setKeys((prev) => {
      if (prev.includes(key)) return prev
      return [...prev, key].sort()
    })
  }, [])

  const unregister = useCallback((key: string) => {
    setKeys((prev) => prev.filter((k) => k !== key))
  }, [])

  const getIndex = useCallback((key: string) => keys.indexOf(key), [keys])

  const value = useMemo(() => ({ getIndex, register, unregister }), [getIndex, register, unregister])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
