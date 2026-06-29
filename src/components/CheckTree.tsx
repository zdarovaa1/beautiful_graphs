import { memo, useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { IconCheck, IconMinus } from '@tabler/icons-react'
import { useGraphTexts } from '../texts/GraphTextsContext'
import styles from './CheckTree.module.css'

export interface CheckItem {
  key: string
  label: string
}

interface CheckTreeProps {
  rootLabel?: string
  items: CheckItem[]
  state: Record<string, boolean>
  onChange: (key: string, value: boolean) => void
  onToggleAll: (value: boolean, keys: string[]) => void
  searchable?: boolean
  renderItemAction?: (item: CheckItem) => ReactNode
}

type TriState = 'on' | 'off' | 'mixed'

const Box = memo(function Box({ status }: { status: TriState }) {
  const cls = status === 'on' ? styles.on : status === 'mixed' ? styles.mixed : ''
  return (
    <span className={`${styles.box} ${cls}`}>
      {status === 'on' && <IconCheck size={12} stroke={3} />}
      {status === 'mixed' && <IconMinus size={12} stroke={3} />}
    </span>
  )
})

export const CheckTree = memo(function CheckTree({
  rootLabel,
  items,
  state,
  onChange,
  onToggleAll,
  searchable = false,
  renderItemAction,
}: CheckTreeProps) {
  const texts = useGraphTexts()
  const resolvedRootLabel = rootLabel ?? texts.checkTree.all
  const [query, setQuery] = useState('')
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [items, query])

  const root: TriState = useMemo(() => {
    const vals = filteredItems.map((i) => state[i.key])
    if (vals.length > 0 && vals.every(Boolean)) return 'on'
    if (vals.every((v) => !v)) return 'off'
    return 'mixed'
  }, [filteredItems, state])

  const handleToggleAll = useCallback(
    () =>
      onToggleAll(
        root !== 'on',
        filteredItems.map((i) => i.key),
      ),
    [filteredItems, onToggleAll, root],
  )
  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), [])

  return (
    <div>
      {searchable && (
        <input
          className={styles.search}
          value={query}
          onChange={handleSearch}
          placeholder={texts.checkTree.searchPlaceholder}
        />
      )}
      <div className={`${styles.row} ${styles.rowRoot}`} onClick={handleToggleAll}>
        <Box status={root} />
        <span>{resolvedRootLabel}</span>
      </div>
      <div className={styles.children}>
        {filteredItems.map((it) => (
          <CheckRow
            key={it.key}
            item={it}
            checked={state[it.key]}
            onChange={onChange}
            action={renderItemAction?.(it)}
          />
        ))}
      </div>
    </div>
  )
})

const CheckRow = memo(function CheckRow({
  item,
  checked,
  onChange,
  action,
}: {
  item: CheckItem
  checked: boolean
  onChange: (key: string, value: boolean) => void
  action?: ReactNode
}) {
  const handleClick = useCallback(() => onChange(item.key, !checked), [item.key, checked, onChange])
  return (
    <div className={styles.row} onClick={handleClick}>
      <Box status={checked ? 'on' : 'off'} />
      <span>{item.label}</span>
      {action && <span className={styles.action}>{action}</span>}
    </div>
  )
})
