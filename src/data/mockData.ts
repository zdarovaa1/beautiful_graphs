import type { GraphNodeDef, GraphEdgeDef, IslandDef, ObjectType, EdgeType, IslandType } from '../types'

/**
 * Детерминированный генератор псевдослучайных чисел (mulberry32).
 * Одинаковый seed → одинаковые данные при каждом запуске.
 */
function mkRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mkRng(0xdeadbeef)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

// ─── словари для генерации имён ───────────────────────────────────────────────

const NODE_PREFIXES = [
  'Сервис',
  'Модуль',
  'Подсистема',
  'Шлюз',
  'Адаптер',
  'Реестр',
  'Хранилище',
  'Процессор',
  'Агент',
  'Брокер',
  'Планировщик',
  'Валидатор',
  'Координатор',
  'Диспетчер',
  'Маршрутизатор',
  'Синхронизатор',
]

const NODE_SUBJECTS = [
  'Авторизации',
  'Данных',
  'Метаданных',
  'Пользователей',
  'Отчётов',
  'Аналитики',
  'Мониторинга',
  'Конфигурации',
  'Уведомлений',
  'Интеграции',
  'Платежей',
  'Заказов',
  'Справочников',
  'Документов',
  'Аудита',
  'Доступа',
  'Безопасности',
  'Контента',
  'Событий',
  'Процессов',
  'Ресурсов',
  'Сессий',
  'Токенов',
  'Запросов',
  'Задач',
  'Правил',
  'Шаблонов',
  'Потоков',
  'Кэша',
  'Логов',
]

const NODE_SUFFIXES = ['', '', '', '', 'API', 'v2', 'Core', 'Lite', 'Hub', 'Engine']

const ISLAND_NAMES = [
  'Безопасности',
  'Данных',
  'Платформы',
  'Пользователей',
  'Аналитики',
  'Интеграции',
  'Инфраструктуры',
  'Бизнес-логики',
  'Представления',
  'Хранения',
  'Отчётности',
  'Мониторинга',
  'Обработки',
  'Управления',
  'Авторизации',
  'Заказов',
  'Платежей',
  'Конфигурации',
  'Документооборота',
  'Метаданных',
]

const EDGE_TITLES = [
  'Предоставляет данные',
  'Использует',
  'Зависит от',
  'Поставляет',
  'Читает из',
  'Записывает в',
  'Уведомляет',
  'Оркестрирует',
  'Синхронизирует',
  'Подписывается на',
  'Публикует в',
  'Делегирует',
]

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#0ea5e9',
  '#ef4444',
  '#06b6d4',
  '#f59e0b',
  '#22c55e',
  '#ec4899',
  '#f97316',
  '#a855f7',
  '#14b8a6',
  '#64748b',
]

const ISLAND_COLORS: Record<IslandType, string[]> = {
  Домен: ['#5b8def', '#3b82f6', '#1d4ed8', '#2563eb', '#7c3aed'],
  Контур: ['#22c55e', '#16a34a', '#059669', '#0d9488', '#10b981'],
  Группа: ['#f59e0b', '#d97706', '#ef4444', '#dc2626', '#b45309'],
}

const SHORT_DESCS = [
  'Основной сервис домена',
  'Вспомогательный компонент',
  'Агрегатор данных',
  'Точка интеграции',
  'Шлюз для внешних систем',
  'Хранилище основных данных',
  'Обработчик событий',
  'Оркестратор процессов',
  'Реестр конфигураций',
  'Брокер сообщений',
  'Валидатор бизнес-правил',
  'Процессор транзакций',
]

const EDGE_SHORT_DESCS = [
  'Синхронный вызов',
  'Асинхронный поток',
  'Реактивная подписка',
  'Пакетная выгрузка',
  'gRPC-интеграция',
  'REST API',
  'Kafka-топик',
]

const ISLAND_SHORT_DESCS = [
  'Ключевой домен системы',
  'Изолированный контур',
  'Функциональная группа',
  'Зона ответственности',
  'Сервисный кластер',
]

const ATTR_NAMES = ['Версия', 'Владелец', 'Статус', 'SLA', 'Порт', 'Протокол', 'Кратность', 'Окружение']
const ATTR_VALUES_MAP: Record<string, string[]> = {
  Версия: ['1.0', '2.1', '3.0-beta', '0.9'],
  Владелец: ['Команда А', 'Команда Б', 'Платформа', 'Архитектура'],
  Статус: ['Активен', 'В разработке', 'Устарел', 'Тестируется'],
  SLA: ['99.9%', '99.5%', '99%', '95%'],
  Порт: ['8080', '8443', '9000', '3000'],
  Протокол: ['gRPC', 'REST', 'GraphQL', 'Kafka'],
  Кратность: ['1..1', '1..*', '0..*', '0..1'],
  Окружение: ['PROD', 'STAGE', 'DEV', 'TEST'],
}

function randomAttrs(count: number) {
  return pickN(ATTR_NAMES, count).map((name) => ({
    name,
    value: pick(ATTR_VALUES_MAP[name] ?? ['—']),
  }))
}

// ─── генератор ───────────────────────────────────────────────────────────────

export function generateMockData(nodeCount = 3000): {
  nodes: GraphNodeDef[]
  edges: GraphEdgeDef[]
  islands: IslandDef[]
} {
  const objectTypes: ObjectType[] = ['AC', 'ФП', 'Сервис', 'ИР', 'Схема', 'Таблица ФМД']
  const edgeTypes: EdgeType[] = ['Связь', 'Поток', 'Зависимость', 'Использует']
  const islandTypes: IslandType[] = ['Домен', 'Контур', 'Группа']

  // ── острова ────────────────────────────────────────────────────────────────
  const ISLAND_COUNT = Math.max(10, Math.floor(nodeCount / 50))
  const islands: IslandDef[] = Array.from({ length: ISLAND_COUNT }, (_, i) => {
    const itype = pick(islandTypes)
    const color = pick(ISLAND_COLORS[itype])
    return {
      id: `isl-${i}`,
      title: `${itype} ${pick(ISLAND_NAMES)} ${i + 1}`,
      shortDescription: pick(ISLAND_SHORT_DESCS),
      description: `Сгенерированный ${itype.toLowerCase()} «${pick(ISLAND_NAMES)}». Объединяет связанные компоненты системы.`,
      type: itype,
      attributes: randomAttrs(Math.floor(rng() * 3) + 1),
      additionalParams: { color },
    }
  })

  const islandIds = islands.map((i) => i.id)

  // ── узлы ──────────────────────────────────────────────────────────────────
  const usedTitles = new Set<string>()
  const nodes: GraphNodeDef[] = Array.from({ length: nodeCount }, (_, i) => {
    const otype = objectTypes[i % objectTypes.length]
    const color = pick(COLORS)

    let title = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const suf = pick(NODE_SUFFIXES)
      title = `${pick(NODE_PREFIXES)} ${pick(NODE_SUBJECTS)}${suf ? ' ' + suf : ''}`
      if (!usedTitles.has(title)) break
    }
    usedTitles.add(title)

    // 60% узлов — в 1 острове, 15% — в 2, 25% — без острова
    const r = rng()
    const nodeIslandIds = r < 0.6 ? [pick(islandIds)] : r < 0.75 ? pickN(islandIds, 2) : []

    // Вариативность additionalParams
    const extra: GraphNodeDef['additionalParams'] = { color }
    if (rng() < 0.15) extra.background = `${color}10`
    if (rng() < 0.1) extra.borderColor = color
    if (rng() < 0.1) extra.titleColor = color
    if (rng() < 0.08) extra.badgeColor = pick(COLORS)
    if (rng() < 0.05) extra.width = pick([180, 240, 280])
    if (rng() < 0.05) extra.height = pick([60, 90, 100])
    if (rng() < 0.07) {
      extra.links = [
        { label: 'Confluence', url: `https://wiki.example.com/${i}` },
        { label: 'Jira', url: `https://jira.example.com/${i}` },
      ]
    }

    return {
      id: `n-${i}`,
      title,
      shortDescription: rng() < 0.7 ? pick(SHORT_DESCS) : undefined,
      description: `Компонент типа «${otype}». ${pick(SHORT_DESCS)}. Является частью архитектуры системы.`,
      type: otype,
      islandIds: nodeIslandIds,
      additionalParams: extra,
      attributes: randomAttrs(Math.floor(rng() * 4)),
    }
  })

  // ── связи ─────────────────────────────────────────────────────────────────
  // Каждый узел: 1–3 исходящих связи, не более чем к узлам вокруг него (±30 индексов)
  const edgeSet = new Set<string>()
  const edges: GraphEdgeDef[] = []
  let edgeIdx = 0

  for (let i = 0; i < nodeCount; i++) {
    const fanOut = Math.floor(rng() * 3) + 1 // 1..3
    for (let k = 0; k < fanOut; k++) {
      const range = Math.floor(rng() * 60) + 1 // 1..60
      const j = (i + range) % nodeCount
      if (i === j) continue
      const key = `${i}→${j}`
      if (edgeSet.has(key)) continue
      edgeSet.add(key)

      const etype = pick(edgeTypes)
      const color = pick(COLORS)
      const extra: GraphEdgeDef['additionalParams'] = { color }
      if (rng() < 0.2) extra.strokeWidth = pick([1, 2, 3])
      if (rng() < 0.1) extra.curvature = Math.round(rng() * 6) / 10 // 0..0.6
      if (rng() < 0.3) extra.animated = true

      edges.push({
        id: `e-${edgeIdx++}`,
        source: `n-${i}`,
        target: `n-${j}`,
        title: pick(EDGE_TITLES),
        shortDescription: rng() < 0.5 ? pick(EDGE_SHORT_DESCS) : undefined,
        description: `${etype}-связь между компонентами. ${pick(EDGE_SHORT_DESCS)}.`,
        type: etype,
        attributes: randomAttrs(Math.floor(rng() * 2)),
        additionalParams: extra,
      })
    }
  }

  return { nodes, edges, islands }
}

// Количество узлов: 300 — быстрый layered-алгоритм ELK.
// Для 3000 узлов замени на generateMockData(3000) — будет использован
// rectpacking-алгоритм ELK (мгновенный), вычисление идёт в Web Worker.
const { nodes: mockNodes, edges: mockEdges, islands: mockIslands } = generateMockData(300)
export { mockNodes, mockEdges, mockIslands }
