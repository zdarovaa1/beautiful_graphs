import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { defaultTexts, type GraphTexts, type PartialGraphTexts } from './defaultTexts'

const Ctx = createContext<GraphTexts>(defaultTexts)

function mergeSection<T extends Record<string, string>>(base: T, patch?: Partial<T>): T {
  return patch ? { ...base, ...patch } : base
}

export function mergeTexts(base: GraphTexts, patch?: PartialGraphTexts): GraphTexts {
  if (!patch) return base
  return {
    toolbar: mergeSection(base.toolbar, patch.toolbar),
    detailPanel: mergeSection(base.detailPanel, patch.detailPanel),
    detailMarkdown: mergeSection(base.detailMarkdown, patch.detailMarkdown),
    settingsPanel: mergeSection(base.settingsPanel, patch.settingsPanel),
    selectionToolbar: mergeSection(base.selectionToolbar, patch.selectionToolbar),
    screenshotModal: mergeSection(base.screenshotModal, patch.screenshotModal),
    checkTree: mergeSection(base.checkTree, patch.checkTree),
  }
}

export function GraphTextsProvider({ texts, children }: { texts?: PartialGraphTexts; children: ReactNode }) {
  const value = useMemo(() => mergeTexts(defaultTexts, texts), [texts])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGraphTexts(): GraphTexts {
  return useContext(Ctx)
}
