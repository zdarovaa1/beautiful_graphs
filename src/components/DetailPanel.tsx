import { memo, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconHelpCircle,
  IconGripVertical,
  IconX,
} from '@tabler/icons-react'
import type {
  GraphEdgeDef,
  GraphNodeDef,
  SelectedEntity,
  DisplaySettings,
} from '../types'
import { FALLBACK_BADGE } from '../theme'
import type { GraphTexts } from '../texts/defaultTexts'
import { useGraphTexts } from '../texts/GraphTextsContext'
import { getGraphEdges, getGraphIslands, getGraphNodes } from '../utils/graphRegistry'
import { PANEL_STORAGE_KEYS } from '../utils/graphStorage'
import { withAlpha } from '../utils/normalizeGraphColors'
import { FloatingPanel, FloatingPanelActionsContext, type SnapEdge, type PanelSize } from './FloatingPanel'
import { getInnerHeight, getInnerWidth } from '../utils/getRootSizes'
import { Tooltip } from 'antd'
import styles from './DetailPanel.module.css'

interface DetailPanelProps {
  selected: SelectedEntity | null
  settings: DisplaySettings
  graphId: string
  onChange: React.Dispatch<React.SetStateAction<DisplaySettings>>
  onClose: () => void
  onSelectEntity: (entity: SelectedEntity) => void
  onLayout?: (snap: SnapEdge, size: PanelSize | null, key: string, pinned?: boolean) => void
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

function accentFor(selected: SelectedEntity): string {
  const p = selected.data.additionalParams
  return selected.kind === 'edge' ? p.color! : p.badgeColor!
}

const PANEL_RIGHT_OFFSET = 360
const PANEL_DEFAULT_Y = 90
const PANEL_DEFAULT_WIDTH = 320
const PANEL_BOTTOM_OFFSET = 140
const PANEL_MAX_HEIGHT = 520
const PANEL_MIN_LEFT = 20

const DEFAULT_X = () => Math.max(PANEL_MIN_LEFT, getInnerWidth() - PANEL_RIGHT_OFFSET)
const DEFAULT_Y = PANEL_DEFAULT_Y
const DEFAULT_W = PANEL_DEFAULT_WIDTH
const DEFAULT_H = () => Math.min(PANEL_MAX_HEIGHT, getInnerHeight() - PANEL_BOTTOM_OFFSET)

const ContextCard = memo(function ContextCard({
  title,
  meta,
  metaColor,
  lines,
  onClick,
}: {
  title: string
  meta?: string
  metaColor?: string
  lines?: string[]
  onClick: () => void
}) {
  const badgeColor = metaColor ?? FALLBACK_BADGE
  return (
    <button type='button' className={styles.contextCard} onClick={onClick} data-no-drag>
      <div className={styles.contextHead}>
        <div className={styles.contextName}>{title}</div>
        {meta && (
          <div className={styles.contextMeta} style={{ color: badgeColor, background: withAlpha(badgeColor, 0.12) }}>
            {meta}
          </div>
        )}
      </div>
      {lines?.map((line, i) => (
        <div key={i} className={styles.contextText}>
          {line}
        </div>
      ))}
    </button>
  )
})

function neighborLines(
  edge: GraphEdgeDef,
  other: GraphNodeDef | undefined,
  nodeId: string,
  t: GraphTexts['detailPanel'],
): string[] {
  const direction = edge.source === nodeId ? t.neighborOutgoing : t.neighborIncoming
  const lines = [`${direction} · ${edge.title}`]
  if (other) {
    lines.push(`${t.nodeTypeLabel}: ${other.type}`)
    if (other.shortDescription) lines.push(other.shortDescription)
  }
  return lines
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function entityMarkdown(selected: SelectedEntity, md: GraphTexts['detailMarkdown']): string {
  const nodes = getGraphNodes()
  const edges = getGraphEdges()
  const islands = getGraphIslands()
  const d = selected.data
  const lines = [
    `# ${d.title}`,
    '',
    `${md.entityKind}: ${selected.kind}`,
    `${md.type}: ${d.type}`,
    '',
    d.shortDescription ? `${md.brief}: ${d.shortDescription}` : '',
    d.description ? `${md.description}: ${d.description}` : '',
    '',
    `## ${md.attributesHeading}`,
    ...(d.attributes.length ? d.attributes.map((a) => `- ${a.name}: ${a.value}`) : [`- ${md.noAttributes}`]),
  ].filter(Boolean)

  if (selected.kind === 'node') {
    const nodeIslands = selected.data.islandIds.map((id) => islands.find((is) => is.id === id)).filter(Boolean)
    const nodeEdges = edges.filter((e) => e.source === d.id || e.target === d.id)
    lines.push(
      '',
      `## ${md.islandsHeading}`,
      ...(nodeIslands.length ? nodeIslands.map((is) => `- ${is?.title} (${is?.type})`) : [`- ${md.noIslands}`]),
    )
    lines.push(
      '',
      `## ${md.neighborsHeading}`,
      ...(nodeEdges.length
        ? nodeEdges.map((e) => {
            const otherId = e.source === d.id ? e.target : e.source
            const other = nodes.find((n) => n.id === otherId)
            const dir = e.source === d.id ? md.neighborOutgoing : md.neighborIncoming
            return `- ${dir} · ${e.title} → ${other?.title ?? otherId} (${other?.type ?? md.unknownType})`
          })
        : [`- ${md.noNeighbors}`]),
    )
  }

  if (selected.kind === 'island') {
    const members = nodes.filter((n) => n.islandIds.includes(d.id))
    lines.push(
      '',
      `## ${md.islandMembersHeading}`,
      ...(members.length ? members.map((n) => `- ${n.title} (${n.type})`) : [`- ${md.noMembers}`]),
    )
  }

  if (selected.kind === 'edge') {
    const edge = selected.data
    const source = nodes.find((n) => n.id === edge.source)
    const target = nodes.find((n) => n.id === edge.target)
    lines.push('', `## ${md.edgeEndpointsHeading}`)
    lines.push(`- ${md.sourceLine}: ${source?.title ?? edge.source} (${source?.type ?? md.unknownType})`)
    lines.push(`- ${md.targetLine}: ${target?.title ?? edge.target} (${target?.type ?? md.unknownType})`)
  }

  return `${lines.join('\n')}\n`
}

const DetailPanelBody = memo(function DetailPanelBody({
  selected,
  settings,
  graphId,
  onChange,
  onClose,
  onSelectEntity,
}: Omit<DetailPanelProps, 'onLayout'>) {
  const texts = useGraphTexts()
  const panelActions = useContext(FloatingPanelActionsContext)

  const [linksOpen, setLinksOpen] = useState(false)
  useEffect(() => setLinksOpen(false), [selected?.data.id])

  const accent = useMemo(() => (selected ? accentFor(selected) : ''), [selected])

  const links = useMemo(
    () => (selected?.data.additionalParams.links as { label: string; url: string }[] | undefined) ?? [],
    [selected?.data.additionalParams.links],
  )

  const nodeIslands = useMemo(() => {
    if (selected?.kind !== 'node') return []
    const islands = getGraphIslands()
    return selected.data.islandIds.map((iid) => islands.find((is) => is.id === iid)).filter(Boolean)
  }, [selected, graphId])

  const nodeNeighbors = useMemo(() => {
    if (selected?.kind !== 'node') return []
    const edges = getGraphEdges()
    const nodes = getGraphNodes()
    return edges
      .filter((e) => e.source === selected.data.id || e.target === selected.data.id)
      .map((e) => {
        const otherId = e.source === selected.data.id ? e.target : e.source
        const other = nodes.find((n) => n.id === otherId)
        return { edge: e, other }
      })
  }, [selected, graphId])

  const islandMembers = useMemo(() => {
    if (selected?.kind !== 'island') return []
    return getGraphNodes().filter((n) => n.islandIds.includes(selected.data.id))
  }, [selected, graphId])

  const edgeEndpoints = useMemo(() => {
    if (selected?.kind !== 'edge') return null
    const nodes = getGraphNodes()
    const { source, target } = selected.data
    return {
      source: nodes.find((n) => n.id === source),
      target: nodes.find((n) => n.id === target),
    }
  }, [selected, graphId])

  const selectNode = useCallback(
    (id: string) => {
      const def = getGraphNodes().find((n) => n.id === id)
      if (def) onSelectEntity({ kind: 'node', data: def })
    },
    [onSelectEntity],
  )

  const selectIsland = useCallback(
    (id: string) => {
      const def = getGraphIslands().find((is) => is.id === id)
      if (def) onSelectEntity({ kind: 'island', data: def })
    },
    [onSelectEntity],
  )

  const setVisible = useCallback(
    (patch: Partial<DisplaySettings>) => {
      onChange((s) => ({ ...s, ...patch }))
    },
    [onChange],
  )

  const handleLinksToggle = useCallback(() => setLinksOpen((o) => !o), [])
  const handleDownload = useCallback(() => {
    if (!selected) return
    downloadText(`${selected.data.id}-details.md`, entityMarkdown(selected, texts.detailMarkdown))
  }, [selected, texts.detailMarkdown])

  if (!selected) {
    return (
      <aside className={styles.detail}>
        <header className={styles.header} data-fp-handle>
          <IconGripVertical size={15} className={styles.grip} />
          <div className={styles.titleRow}>
            <h2 className={`${styles.title} ${styles.placeholderTitle}`}>{texts.detailPanel.emptyTitle}</h2>
            <div className={styles.titleActions}>
              {panelActions?.controls}
              <Tooltip title={texts.detailPanel.close}>
                <button type='button' className={styles.closeBtn} onClick={onClose} data-no-drag>
                  <IconX size={16} />
                </button>
              </Tooltip>
            </div>
          </div>
        </header>
        <div className={styles.emptyState}>{texts.detailPanel.emptyHint}</div>
      </aside>
    )
  }

  const d = selected.data
  const isNode = selected.kind === 'node'
  const isEdge = selected.kind === 'edge'
  const isIsland = selected.kind === 'island'

  return (
    <aside className={styles.detail}>
      <header className={styles.header} data-fp-handle>
        <IconGripVertical size={15} className={styles.grip} />
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{d.title}</h2>
          <span className={styles.badge} style={{ color: accent, background: withAlpha(accent, 0.12) }}>
            {d.type}
          </span>
          <div className={styles.titleActions}>
            {panelActions?.controls}
            <Tooltip title={texts.detailPanel.close}>
              <button type='button' className={styles.closeBtn} onClick={onClose} data-no-drag>
                <IconX size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
        {'shortDescription' in d && d.shortDescription && (
          <p className={styles.shortDesc}>{d.shortDescription as string}</p>
        )}
        <p className={styles.desc}>{d.description}</p>
      </header>

      <div className={styles.attrs}>
        {d.attributes.map((a, i) => (
          <div key={i}>
            <div className={styles.attrName}>{a.name}</div>
            <div className={styles.attrValue}>{a.value}</div>
          </div>
        ))}
        {d.attributes.length === 0 && <div className={styles.empty}>{texts.detailPanel.noAttributes}</div>}
        {isNode && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>{texts.detailPanel.whereLocated}</div>
              {nodeIslands.length > 0 ? (
                nodeIslands.map(
                  (is) =>
                    is && (
                      <ContextCard
                        key={is.id}
                        title={is.title}
                        meta={is.type}
                        metaColor={is.additionalParams.badgeColor}
                        lines={is.shortDescription ? [is.shortDescription] : undefined}
                        onClick={() => selectIsland(is.id)}
                      />
                    ),
                )
              ) : (
                <div className={styles.empty}>{texts.detailPanel.noIslands}</div>
              )}
            </div>
            <div>
              <div className={styles.contextTitle}>{texts.detailPanel.neighbors}</div>
              {nodeNeighbors.length > 0 ? (
                nodeNeighbors.map(({ edge, other }) => (
                  <ContextCard
                    key={edge.id}
                    title={other?.title ?? texts.detailPanel.unknownNode}
                    meta={edge.type}
                    metaColor={edge.additionalParams.color}
                    lines={neighborLines(edge, other, selected.data.id, texts.detailPanel)}
                    onClick={() => other && selectNode(other.id)}
                  />
                ))
              ) : (
                <div className={styles.empty}>{texts.detailPanel.noNeighbors}</div>
              )}
            </div>
          </div>
        )}
        {isIsland && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>{texts.detailPanel.islandMembers}</div>
              {islandMembers.length > 0 ? (
                islandMembers.map((n) => (
                  <ContextCard
                    key={n.id}
                    title={n.title}
                    meta={n.type}
                    metaColor={n.additionalParams.badgeColor}
                    lines={n.shortDescription ? [n.shortDescription] : undefined}
                    onClick={() => selectNode(n.id)}
                  />
                ))
              ) : (
                <div className={styles.empty}>{texts.detailPanel.noMembers}</div>
              )}
            </div>
          </div>
        )}
        {isEdge && edgeEndpoints && (
          <div className={styles.contextBlock}>
            <div className={styles.divider} />
            <div>
              <div className={styles.contextTitle}>{texts.detailPanel.edgeEndpoints}</div>
              {edgeEndpoints.source && (
                <ContextCard
                  title={edgeEndpoints.source.title}
                  meta={edgeEndpoints.source.type}
                  metaColor={edgeEndpoints.source.additionalParams.badgeColor}
                  lines={[
                    `${texts.detailPanel.source}`,
                    ...(edgeEndpoints.source.shortDescription ? [edgeEndpoints.source.shortDescription] : []),
                  ]}
                  onClick={() => selectNode(edgeEndpoints.source!.id)}
                />
              )}
              {edgeEndpoints.target && (
                <ContextCard
                  title={edgeEndpoints.target.title}
                  meta={edgeEndpoints.target.type}
                  metaColor={edgeEndpoints.target.additionalParams.badgeColor}
                  lines={[
                    `${texts.detailPanel.target}`,
                    ...(edgeEndpoints.target.shortDescription ? [edgeEndpoints.target.shortDescription] : []),
                  ]}
                  onClick={() => selectNode(edgeEndpoints.target!.id)}
                />
              )}
              {!edgeEndpoints.source && !edgeEndpoints.target && (
                <div className={styles.empty}>{texts.detailPanel.nodesNotFound}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {links.length > 0 && (
        <div className={styles.links}>
          <button type='button' className={styles.linksHead} onClick={handleLinksToggle}>
            {linksOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            <span>
              {texts.detailPanel.usefulLinks} {links.length}
            </span>
            <IconHelpCircle size={15} className={styles.help} />
          </button>
          {linksOpen && (
            <ul className={styles.linkList}>
              {links.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target='_blank' rel='noreferrer'>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.togglesSection}>
        {isNode && (
          <>
            <Toggle
              checked={settings.nodeNames[d.id] !== false}
              onChange={(v) => setVisible({ nodeNames: { ...settings.nodeNames, [d.id]: v } })}
            >
              {texts.detailPanel.showByName}
            </Toggle>
            <Toggle
              checked={settings.objectTypes[d.type] !== false}
              onChange={(v) => setVisible({ objectTypes: { ...settings.objectTypes, [d.type]: v } })}
            >
              {texts.detailPanel.showByType}
            </Toggle>
          </>
        )}
        {isEdge && (
          <>
            <Toggle
              checked={settings.edgeNames[d.id] !== false}
              onChange={(v) => setVisible({ edgeNames: { ...settings.edgeNames, [d.id]: v } })}
            >
              {texts.detailPanel.showByName}
            </Toggle>
            <Toggle
              checked={settings.edgeTypes[d.type] !== false}
              onChange={(v) => setVisible({ edgeTypes: { ...settings.edgeTypes, [d.type]: v } })}
            >
              {texts.detailPanel.showByType}
            </Toggle>
          </>
        )}
        {isIsland && (
          <>
            <Toggle
              checked={settings.islandNames[d.id] !== false}
              onChange={(v) => setVisible({ islandNames: { ...settings.islandNames, [d.id]: v } })}
            >
              {texts.detailPanel.showByName}
            </Toggle>
            <Toggle
              checked={settings.islandTypes[d.type] !== false}
              onChange={(v) => setVisible({ islandTypes: { ...settings.islandTypes, [d.type]: v } })}
            >
              {texts.detailPanel.showByType}
            </Toggle>
            <Toggle
              checked={settings.islandNameCascade[d.id] !== false}
              onChange={(v) => setVisible({ islandNameCascade: { ...settings.islandNameCascade, [d.id]: v } })}
            >
              {texts.detailPanel.hideWithNodes}
            </Toggle>
          </>
        )}
      </div>

      <footer className={styles.footer}>
        <button type='button' className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleDownload}>
          <IconDownload size={16} /> {texts.detailPanel.downloadAttributes}
        </button>
      </footer>
    </aside>
  )
})

export const DetailPanel = memo(function DetailPanel(props: DetailPanelProps) {
  const texts = useGraphTexts()
  return (
    <FloatingPanel
      storageKey={PANEL_STORAGE_KEYS.detail}
      title={texts.detailPanel.title}
      onLayout={props.onLayout}
      defaultX={DEFAULT_X()}
      defaultY={DEFAULT_Y}
      defaultWidth={DEFAULT_W}
      defaultHeight={DEFAULT_H()}
      zIndex={7}
    >
      <DetailPanelBody {...props} />
    </FloatingPanel>
  )
})
