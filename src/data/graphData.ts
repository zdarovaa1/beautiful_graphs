import type { GraphEdgeDef, GraphNodeDef, IslandDef } from '../types'

/**
 * ЕДИНОЕ МЕСТО РЕДАКТИРОВАНИЯ ГРАФА.
 * Меняешь острова / узлы / связи только здесь — остальное считается само
 * (раскладка ELK, границы островов, фильтры, панель настроек).
 */

// ── Острова ───────────────────────────────────────────────────────────────
export const islands: IslandDef[] = [
  {
    id: 'ord',
    title: 'ОРД',
    shortDescription: 'Организационно-распорядительные данные',
    description: 'Остров организационно-распорядительных данных. Объединяет АС и ФП, связанные с ведением НСИ.',
    type: 'Домен',
    additionalParams: { color: '#5b8def' },
    attributes: [
      { name: 'Владелец', value: 'Архитектурный комитет' },
      { name: 'Статус', value: 'Активен' },
    ],
  },
  {
    id: 'platform',
    title: 'Платформа МЕТА',
    shortDescription: 'Сервисы платформы метаданных',
    description: 'Контур сервисов платформы метаданных. Содержит все микросервисы, обеспечивающие работу МЕТА.',
    type: 'Контур',
    additionalParams: { color: '#22c55e' },
    attributes: [{ name: 'Окружение', value: 'PROD' }],
  },
]

// ── Узлы (графы) ────────────────────────────────────────────────────────────
export const nodes: GraphNodeDef[] = [
  {
    id: 'meta',
    title: 'МЕТА',
    shortDescription: 'Корневая АС метаданных',
    description:
      'Корневая АС, описывающая метаданные инфоактивов. Является центральным реестром всех объектов платформы.',
    type: 'AC',
    islandIds: ['ord'],
    additionalParams: {
      color: '#5b8def',
      links: [
        { label: 'Confluence', url: 'https://example.com/meta' },
        { label: 'Jira', url: 'https://example.com/meta-jira' },
      ],
    },
    attributes: [
      { name: 'Имя атрибута', value: 'Значение атрибута' },
      { name: 'Имя атрибута', value: 'Значение атрибута' },
      { name: 'Имя атрибута', value: 'Значение атрибута' },
      { name: 'Имя атрибута', value: 'Значение атрибута' },
      { name: 'Имя атрибута', value: 'Значение атрибута' },
    ],
  },
  {
    id: 'infoassets',
    title: 'Инфоактивы',
    shortDescription: 'ФП учёта инфоактивов',
    description: 'Функциональная подсистема учёта инфоактивов. Хранит реестр информационных активов организации.',
    type: 'ФП',
    islandIds: ['ord'],
    additionalParams: { color: '#8b5cf6' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'omd-orm',
    title: 'ОМД ORM',
    shortDescription: 'ORM-слой метаданных',
    description: 'Сервис объектно-реляционного отображения метаданных. Обеспечивает доступ к физической модели данных.',
    type: 'Сервис',
    islandIds: ['ord', 'platform'],
    additionalParams: { color: '#22c55e' },
    attributes: [{ name: 'Порт', value: '8443' }],
  },
  {
    id: 'self-service',
    title: 'Сервис Самообслуживания',
    description: 'Портал самообслуживания пользователей.',
    type: 'Сервис',
    islandIds: ['platform'],
    additionalParams: { color: '#8b5cf6' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'concept-models',
    title: 'Концептуальные модели',
    description: 'Сервис ведения концептуальных моделей.',
    type: 'Сервис',
    islandIds: ['platform'],
    additionalParams: { color: '#22c55e' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'metrics',
    title: 'Метрики ИТЗ',
    description: 'Сбор и расчёт метрик ИТ-задач.',
    type: 'Сервис',
    islandIds: ['platform'],
    additionalParams: { color: '#f59e0b' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'fmd-check',
    title: 'Сверка ФМД БД',
    description: 'Сервис сверки физической модели данных с БД.',
    type: 'Сервис',
    islandIds: ['platform'],
    additionalParams: { color: '#22c55e' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'pd-repo',
    title: 'Репозиторий ПД',
    description: 'Репозиторий персональных данных.',
    type: 'ИР',
    islandIds: ['platform'],
    additionalParams: { color: '#ef4444' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
  {
    id: 'fmd-registry',
    title: 'Реестр ФМД',
    description: 'Реестр физических моделей данных.',
    type: 'Схема',
    islandIds: ['platform'],
    additionalParams: { color: '#06b6d4' },
    attributes: [{ name: 'Имя атрибута', value: 'Значение атрибута' }],
  },
]

// ── Связи (стрелки) ──────────────────────────────────────────────────────────
export const edges: GraphEdgeDef[] = [
  {
    id: 'e-infoassets-meta',
    source: 'infoassets',
    target: 'meta',
    title: 'Описывает',
    description: 'Инфоактивы описываются метаданными в АС МЕТА.',
    type: 'Связь',
    additionalParams: { color: '#5b8def' },
    attributes: [{ name: 'Кратность', value: '1..*' }],
  },
  {
    id: 'e-omd-infoassets',
    source: 'omd-orm',
    target: 'infoassets',
    title: 'Поставляет данные',
    description: 'ОМД ORM поставляет данные в подсистему инфоактивов.',
    type: 'Поток',
    additionalParams: { color: '#22c55e' },
    attributes: [{ name: 'Протокол', value: 'gRPC' }],
  },
  {
    id: 'e-self-omd',
    source: 'self-service',
    target: 'omd-orm',
    title: 'Использует',
    description: 'Сервис самообслуживания обращается к ОМД ORM.',
    type: 'Использует',
    additionalParams: { color: '#8b5cf6' },
    attributes: [],
  },
  {
    id: 'e-concept-omd',
    source: 'concept-models',
    target: 'omd-orm',
    title: 'Использует',
    description: 'Концептуальные модели читают метаданные через ОМД ORM.',
    type: 'Использует',
    additionalParams: { color: '#22c55e' },
    attributes: [],
  },
  {
    id: 'e-metrics-omd',
    source: 'metrics',
    target: 'omd-orm',
    title: 'Зависит',
    description: 'Метрики ИТЗ зависят от ОМД ORM.',
    type: 'Зависимость',
    additionalParams: { color: '#f59e0b' },
    attributes: [],
  },
  {
    id: 'e-fmdcheck-omd',
    source: 'fmd-check',
    target: 'omd-orm',
    title: 'Зависит',
    description: 'Сверка ФМД БД зависит от ОМД ORM.',
    type: 'Зависимость',
    additionalParams: { color: '#22c55e' },
    attributes: [],
  },
  {
    id: 'e-pd-omd',
    source: 'pd-repo',
    target: 'omd-orm',
    title: 'Связь',
    description: 'Репозиторий ПД связан с ОМД ORM.',
    type: 'Связь',
    additionalParams: { color: '#ef4444' },
    attributes: [],
  },
  {
    id: 'e-fmdreg-omd',
    source: 'fmd-registry',
    target: 'omd-orm',
    title: 'Связь',
    description: 'Реестр ФМД связан с ОМД ORM.',
    type: 'Связь',
    additionalParams: { color: '#06b6d4' },
    attributes: [],
  },
]
