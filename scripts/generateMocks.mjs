/**
 * Генератор mock-данных с ELK-раскладкой.
 * Запуск: node scripts/generateMocks.mjs
 *
 * Результат пишется в src/data/mock/data.json.
 * После этого раскомментируй "Вариант 2" в src/GraphView.tsx.
 */

import ELK from "elkjs";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../src/data/mock/data.json");

const NODE_COUNT = 3000; // ← менять количество узлов здесь

// ─── детерминированный RNG (mulberry32) ──────────────────────────────────────
function mkRng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mkRng(0xdeadbeef);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ─── словари ─────────────────────────────────────────────────────────────────
const NODE_PREFIXES = [
  "Сервис",
  "Модуль",
  "Подсистема",
  "Шлюз",
  "Адаптер",
  "Реестр",
  "Хранилище",
  "Процессор",
  "Агент",
  "Брокер",
  "Планировщик",
  "Валидатор",
  "Координатор",
  "Диспетчер",
  "Маршрутизатор",
  "Синхронизатор",
];
const NODE_SUBJECTS = [
  "Авторизации",
  "Данных",
  "Метаданных",
  "Пользователей",
  "Отчётов",
  "Аналитики",
  "Мониторинга",
  "Конфигурации",
  "Уведомлений",
  "Интеграции",
  "Платежей",
  "Заказов",
  "Справочников",
  "Документов",
  "Аудита",
  "Доступа",
  "Безопасности",
  "Контента",
  "Событий",
  "Процессов",
  "Ресурсов",
  "Сессий",
  "Токенов",
  "Запросов",
  "Задач",
  "Правил",
  "Шаблонов",
  "Потоков",
  "Кэша",
  "Логов",
];
const NODE_SUFFIXES = [
  "",
  "",
  "",
  "",
  "API",
  "v2",
  "Core",
  "Lite",
  "Hub",
  "Engine",
];
const ISLAND_NAMES = [
  "Безопасности",
  "Данных",
  "Платформы",
  "Пользователей",
  "Аналитики",
  "Интеграции",
  "Инфраструктуры",
  "Бизнес-логики",
  "Представления",
  "Хранения",
  "Отчётности",
  "Мониторинга",
  "Обработки",
  "Управления",
  "Авторизации",
  "Заказов",
  "Платежей",
  "Конфигурации",
  "Документооборота",
  "Метаданных",
];
const EDGE_TITLES = [
  "Предоставляет данные",
  "Использует",
  "Зависит от",
  "Поставляет",
  "Читает из",
  "Записывает в",
  "Уведомляет",
  "Оркестрирует",
  "Синхронизирует",
  "Подписывается на",
  "Публикует в",
  "Делегирует",
];
const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#0ea5e9",
  "#ef4444",
  "#06b6d4",
  "#f59e0b",
  "#22c55e",
  "#ec4899",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#64748b",
];
const ISLAND_COLORS = {
  Домен: ["#5b8def", "#3b82f6", "#1d4ed8", "#2563eb", "#7c3aed"],
  Контур: ["#22c55e", "#16a34a", "#059669", "#0d9488", "#10b981"],
  Группа: ["#f59e0b", "#d97706", "#ef4444", "#dc2626", "#b45309"],
};
const OBJECT_TYPES = ["AC", "ФП", "Сервис", "ИР", "Схема", "Таблица ФМД"];
const EDGE_TYPES = ["Связь", "Поток", "Зависимость", "Использует"];
const ISLAND_TYPES = ["Домен", "Контур", "Группа"];
const SHORT_DESCS = [
  "Основной сервис домена",
  "Вспомогательный компонент",
  "Агрегатор данных",
  "Точка интеграции",
  "Шлюз для внешних систем",
  "Хранилище основных данных",
  "Обработчик событий",
  "Оркестратор процессов",
  "Реестр конфигураций",
  "Брокер сообщений",
  "Валидатор бизнес-правил",
  "Процессор транзакций",
];
const EDGE_SHORT_DESCS = [
  "Синхронный вызов",
  "Асинхронный поток",
  "Реактивная подписка",
  "Пакетная выгрузка",
  "gRPC-интеграция",
  "REST API",
  "Kafka-топик",
];
const ISLAND_SHORT_DESCS = [
  "Ключевой домен системы",
  "Изолированный контур",
  "Функциональная группа",
  "Зона ответственности",
  "Сервисный кластер",
];
const ATTR_NAMES = [
  "Версия",
  "Владелец",
  "Статус",
  "SLA",
  "Порт",
  "Протокол",
  "Кратность",
  "Окружение",
];
const ATTR_VALUES = {
  Версия: ["1.0", "2.1", "3.0-beta", "0.9"],
  Владелец: ["Команда А", "Команда Б", "Платформа", "Архитектура"],
  Статус: ["Активен", "В разработке", "Устарел", "Тестируется"],
  SLA: ["99.9%", "99.5%", "99%", "95%"],
  Порт: ["8080", "8443", "9000", "3000"],
  Протокол: ["gRPC", "REST", "GraphQL", "Kafka"],
  Кратность: ["1..1", "1..*", "0..*", "0..1"],
  Окружение: ["PROD", "STAGE", "DEV", "TEST"],
};

function randomAttrs(count) {
  return pickN(ATTR_NAMES, count).map((name) => ({
    name,
    value: pick(ATTR_VALUES[name] ?? ["—"]),
  }));
}

// ─── генерация данных ─────────────────────────────────────────────────────────
console.log(`Генерация ${NODE_COUNT} узлов…`);

const ISLAND_COUNT = Math.max(10, Math.floor(NODE_COUNT / 50));
const islands = Array.from({ length: ISLAND_COUNT }, (_, i) => {
  const itype = pick(ISLAND_TYPES);
  const color = pick(ISLAND_COLORS[itype]);
  return {
    id: `isl-${i}`,
    title: `${itype} ${pick(ISLAND_NAMES)} ${i + 1}`,
    shortDescription: pick(ISLAND_SHORT_DESCS),
    description: `Сгенерированный ${itype.toLowerCase()} «${pick(ISLAND_NAMES)}». Объединяет связанные компоненты.`,
    type: itype,
    attributes: randomAttrs(Math.floor(rng() * 3) + 1),
    additionalParams: { color },
  };
});

const islandIds = islands.map((i) => i.id);
const usedTitles = new Set();

const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
  const otype = OBJECT_TYPES[i % OBJECT_TYPES.length];
  const color = pick(COLORS);

  let title = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suf = pick(NODE_SUFFIXES);
    title = `${pick(NODE_PREFIXES)} ${pick(NODE_SUBJECTS)}${suf ? " " + suf : ""}`;
    if (!usedTitles.has(title)) break;
  }
  usedTitles.add(title);

  const r = rng();
  const nodeIslandIds =
    r < 0.6 ? [pick(islandIds)] : r < 0.75 ? pickN(islandIds, 2) : [];

  const extra = { color };
  if (rng() < 0.15) extra.background = `${color}10`;
  if (rng() < 0.1) extra.borderColor = color;
  if (rng() < 0.1) extra.titleColor = color;
  if (rng() < 0.08) extra.badgeColor = pick(COLORS);
  if (rng() < 0.05) extra.width = pick([180, 240, 280]);
  if (rng() < 0.05) extra.height = pick([60, 90, 100]);
  if (rng() < 0.07) {
    extra.links = [
      { label: "Confluence", url: `https://wiki.example.com/${i}` },
      { label: "Jira", url: `https://jira.example.com/${i}` },
    ];
  }

  return {
    id: `n-${i}`,
    title,
    shortDescription: rng() < 0.7 ? pick(SHORT_DESCS) : undefined,
    description: `Компонент типа «${otype}». ${pick(SHORT_DESCS)}.`,
    type: otype,
    islandIds: nodeIslandIds,
    additionalParams: extra,
    attributes: randomAttrs(Math.floor(rng() * 4)),
  };
});

const edgeSet = new Set();
const edges = [];
let edgeIdx = 0;
for (let i = 0; i < NODE_COUNT; i++) {
  const fanOut = Math.floor(rng() * 3) + 1;
  for (let k = 0; k < fanOut; k++) {
    const range = Math.floor(rng() * 60) + 1;
    const j = (i + range) % NODE_COUNT;
    if (i === j) continue;
    const key = `${i}→${j}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    const etype = pick(EDGE_TYPES);
    const color = pick(COLORS);
    const extra = { color };
    if (rng() < 0.2) extra.strokeWidth = pick([1, 2, 3]);
    if (rng() < 0.1) extra.curvature = Math.round(rng() * 6) / 10;
    if (rng() < 0.3) extra.animated = true;

    edges.push({
      id: `e-${edgeIdx++}`,
      source: `n-${i}`,
      target: `n-${j}`,
      title: pick(EDGE_TITLES),
      shortDescription: rng() < 0.5 ? pick(EDGE_SHORT_DESCS) : undefined,
      description: `${etype}-связь. ${pick(EDGE_SHORT_DESCS)}.`,
      type: etype,
      attributes: randomAttrs(Math.floor(rng() * 2)),
      additionalParams: extra,
    });
  }
}

console.log(
  `Узлов: ${nodes.length}, рёбер: ${edges.length}, островов: ${islands.length}`,
);

// ─── ELK раскладка ────────────────────────────────────────────────────────────
const algName = NODE_COUNT <= 300 ? "layered" : "rectpacking";
console.log(`Запуск ELK (${algName})…`);

const DEFAULT_W = 200;
const DEFAULT_H = 70;

const elk = new ELK();

// layered — красивый иерархический, но O(n²) → медленный для 1000+ узлов.
// rectpacking — упаковка без перекрытий, O(n log n) → мгновенный даже для 3000.
const layoutOptions =
  NODE_COUNT <= 300
    ? {
        "elk.algorithm": "layered",
        "elk.direction": "LEFT",
        "elk.layered.spacing.nodeNodeBetweenLayers": "120",
        "elk.spacing.nodeNode": "40",
      }
    : {
        "elk.algorithm": "rectpacking",
        "elk.spacing.nodeNode": "60",
        "elk.rectpacking.optimizationGoal": "MAX_SCALE_DRIVEN",
      };

const elkGraph = {
  id: "root",
  layoutOptions,
  children: nodes.map((n) => ({
    id: n.id,
    width: n.additionalParams.width ?? DEFAULT_W,
    height: n.additionalParams.height ?? DEFAULT_H,
  })),
  edges: edges
    .filter((e) => e.source && e.target && e.source !== e.target)
    .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
};

const result = await elk.layout(elkGraph);

const positions = {};
for (const child of result.children ?? []) {
  if (child.id) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  }
}
console.log(`Позиций получено: ${Object.keys(positions).length}`);

// ─── запись файла ─────────────────────────────────────────────────────────────
mkdirSync(dirname(OUT_PATH), { recursive: true });
const payload = JSON.stringify({ nodes, edges, islands, positions });
writeFileSync(OUT_PATH, payload, "utf8");

const kb = Math.round(payload.length / 1024);
console.log(`✓ Файл записан: ${OUT_PATH} (${kb} KB)`);
console.log("");
console.log(
  'Теперь в src/GraphView.tsx раскомментируй "Вариант 2" и закомментируй "Вариант 1".',
);
