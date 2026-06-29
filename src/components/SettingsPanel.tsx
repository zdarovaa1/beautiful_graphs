import { memo, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
  IconUpload,
  IconDownload,
  IconX,
  IconRestore,
} from '@tabler/icons-react'
import { IconSchema, IconSchemaOff } from '@tabler/icons-react'
import { useGraphTexts } from '../texts/GraphTextsContext'
import type { DisplaySettings } from '../types'
import { CheckTree, type CheckItem } from './CheckTree'
import { FloatingPanel, FloatingPanelActionsContext, type SnapEdge, type PanelSize } from './FloatingPanel'
import { getInnerHeight, getInnerWidth } from '../utils/getRootSizes'
import { Tooltip } from './Tooltip'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  settings: DisplaySettings
  /** Принимает dispatch-форму (React.Dispatch), чтобы patch мог использовать функциональное обновление. */
  onChange: React.Dispatch<React.SetStateAction<DisplaySettings>>
  onClose: () => void
  onReset: () => void
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string) => void
  objectTypeItems: CheckItem[]
  edgeTypeItems: CheckItem[]
  edgeNameItems: CheckItem[]
  islandTypeItems: CheckItem[]
  nodeNameItems: CheckItem[]
  islandNameItems: CheckItem[]
}

const Toggle = memo(function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <div className={styles.toggle} onClick={() => onChange(!checked)}>
      <span className={`${styles.switch} ${checked ? styles.switchOn : ''}`}>
        <span className={styles.knob} />
      </span>
      <span>{children}</span>
    </div>
  )
})

const Section = memo(function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen((o) => !o), [])
  return (
    <div className={styles.section}>
      <button type='button' className={styles.sectionHead} onClick={toggle}>
        {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        <span>{title}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  )
})

function setAll<K extends string>(
  items: CheckItem[],
  value: boolean,
  prev?: Record<K, boolean>,
  keys?: string[],
): Record<K, boolean> {
  const allowed = keys ? new Set(keys) : null
  const base: Record<string, boolean> = prev ? { ...prev } : {}
  for (const item of items) {
    if (!allowed || allowed.has(item.key)) base[item.key] = value
  }
  return base as Record<K, boolean>
}

function exportSettings(settings: DisplaySettings) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'graph-filters.json'
  a.click()
  URL.revokeObjectURL(url)
}

const DEFAULT_X = () => Math.max(20, getInnerWidth() - 360)
const DEFAULT_Y = 90
const DEFAULT_W = 320
const DEFAULT_H = () => Math.min(620, getInnerHeight() - 140)

const SettingsPanelBody = memo(function SettingsPanelBody(props: SettingsPanelProps) {
  const texts = useGraphTexts()
  const {
    settings,
    onChange,
    objectTypeItems,
    edgeTypeItems,
    edgeNameItems,
    islandTypeItems,
    nodeNameItems,
    islandNameItems,
  } = props
  const panelActions = useContext(FloatingPanelActionsContext)
  const importRef = useRef<HTMLInputElement>(null)

  const patch = useCallback((p: Partial<DisplaySettings>) => onChange((prev) => ({ ...prev, ...p })), [onChange])

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as Partial<DisplaySettings>
          onChange((prev) => ({ ...prev, ...parsed }))
        } catch {
          /* empty */
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [onChange],
  )

  const handleExport = useCallback(() => exportSettings(settings), [settings])
  const handleImportClick = useCallback(() => importRef.current?.click(), [])

  const onChangeObjectType = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, objectTypes: { ...s.objectTypes, [k]: v } })),
    [onChange],
  )
  const onToggleAllObjectTypes = useCallback(
    (v: boolean, keys: string[]) =>
      onChange((s) => ({ ...s, objectTypes: setAll(objectTypeItems, v, s.objectTypes, keys) })),
    [onChange, objectTypeItems],
  )

  const onChangeNodeName = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, nodeNames: { ...s.nodeNames, [k]: v } })),
    [onChange],
  )
  const onToggleAllNodeNames = useCallback(
    (v: boolean, keys: string[]) => onChange((s) => ({ ...s, nodeNames: setAll(nodeNameItems, v, s.nodeNames, keys) })),
    [onChange, nodeNameItems],
  )

  const onChangeEdgeType = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, edgeTypes: { ...s.edgeTypes, [k]: v } })),
    [onChange],
  )
  const onToggleAllEdgeTypes = useCallback(
    (v: boolean, keys: string[]) => onChange((s) => ({ ...s, edgeTypes: setAll(edgeTypeItems, v, s.edgeTypes, keys) })),
    [onChange, edgeTypeItems],
  )

  const onChangeEdgeName = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, edgeNames: { ...s.edgeNames, [k]: v } })),
    [onChange],
  )
  const onToggleAllEdgeNames = useCallback(
    (v: boolean, keys: string[]) => onChange((s) => ({ ...s, edgeNames: setAll(edgeNameItems, v, s.edgeNames, keys) })),
    [onChange, edgeNameItems],
  )

  const onChangeIslandType = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, islandTypes: { ...s.islandTypes, [k]: v } })),
    [onChange],
  )
  const onToggleAllIslandTypes = useCallback(
    (v: boolean, keys: string[]) =>
      onChange((s) => ({ ...s, islandTypes: setAll(islandTypeItems, v, s.islandTypes, keys) })),
    [onChange, islandTypeItems],
  )

  const onChangeIslandName = useCallback(
    (k: string, v: boolean) => onChange((s) => ({ ...s, islandNames: { ...s.islandNames, [k]: v } })),
    [onChange],
  )
  const onToggleAllIslandNames = useCallback(
    (v: boolean, keys: string[]) =>
      onChange((s) => ({ ...s, islandNames: setAll(islandNameItems, v, s.islandNames, keys) })),
    [onChange, islandNameItems],
  )

  const toggleIslandTypeCascade = useCallback(
    (key: string) => {
      onChange((s) => ({
        ...s,
        islandTypeCascade: {
          ...s.islandTypeCascade,
          [key]: s.islandTypeCascade[key as keyof typeof s.islandTypeCascade] === false,
        },
      }))
    },
    [onChange],
  )

  const toggleIslandNameCascade = useCallback(
    (key: string) => {
      onChange((s) => ({
        ...s,
        islandNameCascade: { ...s.islandNameCascade, [key]: s.islandNameCascade[key] === false },
      }))
    },
    [onChange],
  )

  const renderIslandTypeAction = useCallback(
    (item: CheckItem) => {
      const on = settings.islandTypeCascade[item.key as keyof typeof settings.islandTypeCascade] !== false
      return (
        <Tooltip title={on ? texts.settingsPanel.cascadeHide : texts.settingsPanel.cascadeShow}>
          <button
            type='button'
            className={`${styles.schemaBtn} ${!on ? styles.schemaBtnOff : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleIslandTypeCascade(item.key)
            }}
          >
            {on ? <IconSchema size={15} /> : <IconSchemaOff size={15} />}
          </button>
        </Tooltip>
      )
    },
    [settings.islandTypeCascade, toggleIslandTypeCascade],
  )

  const renderIslandNameAction = useCallback(
    (item: CheckItem) => {
      const on = settings.islandNameCascade[item.key] !== false
      return (
        <Tooltip title={on ? texts.settingsPanel.cascadeHide : texts.settingsPanel.cascadeShow}>
          <button
            type='button'
            className={`${styles.schemaBtn} ${!on ? styles.schemaBtnOff : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleIslandNameCascade(item.key)
            }}
          >
            {on ? <IconSchema size={15} /> : <IconSchemaOff size={15} />}
          </button>
        </Tooltip>
      )
    },
    [settings.islandNameCascade, toggleIslandNameCascade],
  )

  const onToggleOnlySelected = useCallback((v: boolean) => patch({ onlySelectedAndNeighbors: v }), [patch])
  const onToggleHideIslands = useCallback((v: boolean) => patch({ hideAllIslands: v }), [patch])
  const onToggleEdgeLabels = useCallback((v: boolean) => patch({ showEdgeLabels: v }), [patch])

  return (
    <div className={styles.settings}>
      <div className={styles.title} data-fp-handle>
        <IconGripVertical size={15} className={styles.grip} />
        <span style={{ flex: 1 }}>{texts.settingsPanel.title}</span>
        {panelActions?.controls}
        <Tooltip title={texts.settingsPanel.close}>
          <button type='button' className={styles.closeBtn} onClick={props.onClose} data-no-drag>
            <IconX size={14} />
          </button>
        </Tooltip>
      </div>

      <div className={styles.toggles}>
        <Toggle checked={settings.onlySelectedAndNeighbors} onChange={onToggleOnlySelected}>
          {texts.settingsPanel.onlySelectedNeighbors}
        </Toggle>
        <Toggle checked={settings.hideAllIslands} onChange={onToggleHideIslands}>
          {texts.settingsPanel.hideIslands}
        </Toggle>
        <Toggle checked={settings.showEdgeLabels} onChange={onToggleEdgeLabels}>
          {texts.settingsPanel.showEdgeLabels}
        </Toggle>
      </div>

      <div className={styles.sectionsScroll}>
        <Section title={texts.settingsPanel.sectionObjectType} defaultOpen>
          <CheckTree
            items={objectTypeItems}
            state={settings.objectTypes}
            onChange={onChangeObjectType}
            onToggleAll={onToggleAllObjectTypes}
            searchable
          />
        </Section>

        <Section title={texts.settingsPanel.sectionObjectName}>
          <CheckTree
            items={nodeNameItems}
            state={settings.nodeNames}
            onChange={onChangeNodeName}
            onToggleAll={onToggleAllNodeNames}
            searchable
          />
        </Section>

        <Section title={texts.settingsPanel.sectionEdgeType}>
          <CheckTree
            items={edgeTypeItems}
            state={settings.edgeTypes}
            onChange={onChangeEdgeType}
            onToggleAll={onToggleAllEdgeTypes}
            searchable
          />
        </Section>

        <Section title={texts.settingsPanel.sectionEdgeName}>
          <CheckTree
            items={edgeNameItems}
            state={settings.edgeNames}
            onChange={onChangeEdgeName}
            onToggleAll={onToggleAllEdgeNames}
            searchable
          />
        </Section>

        <Section title={texts.settingsPanel.sectionIslandType}>
          <CheckTree
            items={islandTypeItems}
            state={settings.islandTypes}
            onChange={onChangeIslandType}
            onToggleAll={onToggleAllIslandTypes}
            searchable
            renderItemAction={renderIslandTypeAction}
          />
        </Section>

        <Section title={texts.settingsPanel.sectionIslandName}>
          <CheckTree
            items={islandNameItems}
            state={settings.islandNames}
            onChange={onChangeIslandName}
            onToggleAll={onToggleAllIslandNames}
            searchable
            renderItemAction={renderIslandNameAction}
          />
        </Section>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerActions}>
          <Tooltip title={texts.settingsPanel.exportFilters}>
            <button type='button' className={styles.btn} onClick={handleExport}>
              <IconDownload size={15} /> {texts.settingsPanel.exportFilters}
            </button>
          </Tooltip>
          <Tooltip title={texts.settingsPanel.importFilters}>
            <button type='button' className={styles.btn} onClick={handleImportClick}>
              <IconUpload size={15} /> {texts.settingsPanel.importFilters}
            </button>
          </Tooltip>
        </div>
        <button type='button' className={styles.resetLink} onClick={props.onReset}>
          <IconRestore size={15} /> {texts.settingsPanel.resetFilters}
        </button>
        <input ref={importRef} type='file' accept='.json' style={{ display: 'none' }} onChange={handleImport} />
      </div>
    </div>
  )
})

export const SettingsPanel = memo(function SettingsPanel(props: SettingsPanelProps) {
  const texts = useGraphTexts()
  return (
    <FloatingPanel
      storageKey='graph-settings-panel'
      title={texts.settingsPanel.title}
      onLayout={props.onLayout}
      defaultX={DEFAULT_X()}
      defaultY={DEFAULT_Y}
      defaultWidth={DEFAULT_W}
      defaultHeight={DEFAULT_H()}
      zIndex={8}
    >
      <SettingsPanelBody {...props} />
    </FloatingPanel>
  )
})
