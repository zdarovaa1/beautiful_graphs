export interface GraphTexts {
  toolbar: {
    settings: string
    zoomIn: string
    zoomOut: string
    fitView: string
    handMode: string
    selectMode: string
    editOn: string
    editOff: string
    resetPositions: string
    positionsMenu: string
    exportPositions: string
    importPositions: string
    elkPrepare: string
    elkFileError: string
    fileReadError: string
    fullscreen: string
    exitFullscreen: string
    statsNodes: string
    statsEdges: string
    statsIslands: string
  }
  detailPanel: {
    title: string
    emptyTitle: string
    emptyHint: string
    close: string
    whereLocated: string
    neighbors: string
    islandMembers: string
    edgeEndpoints: string
    noIslands: string
    noNeighbors: string
    noMembers: string
    noAttributes: string
    nodesNotFound: string
    downloadAttributes: string
    source: string
    target: string
    unknownNode: string
    showByName: string
    showByType: string
    hideWithNodes: string
    usefulLinks: string
    neighborOutgoing: string
    neighborIncoming: string
    nodeTypeLabel: string
  }
  detailMarkdown: {
    entityKind: string
    type: string
    brief: string
    description: string
    attributesHeading: string
    noAttributes: string
    islandsHeading: string
    noIslands: string
    neighborsHeading: string
    noNeighbors: string
    islandMembersHeading: string
    noMembers: string
    edgeEndpointsHeading: string
    sourceLine: string
    targetLine: string
    unknownType: string
    neighborOutgoing: string
    neighborIncoming: string
  }
  settingsPanel: {
    title: string
    close: string
    onlySelectedNeighbors: string
    hideIslands: string
    showEdgeLabels: string
    sectionObjectType: string
    sectionObjectName: string
    sectionEdgeType: string
    sectionEdgeName: string
    sectionIslandType: string
    sectionIslandName: string
    resetFilters: string
    exportFilters: string
    importFilters: string
    pin: string
    unpin: string
    collapse: string
    expand: string
    defaultPanelTitle: string
    cascadeHide: string
    cascadeShow: string
  }
  selectionToolbar: {
    alignH: string
    alignV: string
    elkLayout: string
    screenshot: string
  }
  screenshotModal: {
    title: string
    close: string
    hintNodes: string
    hintIslands: string
    hintEdges: string
    transparentBg: string
    cancel: string
    savePng: string
    saveJpeg: string
    saveWebp: string
    saving: string
  }
  checkTree: {
    all: string
    searchPlaceholder: string
  }
}

export const defaultTexts: GraphTexts = {
  toolbar: {
    settings: 'Настройки отображения',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    fitView: 'Центрировать',
    handMode: 'Режим руки — перемещение',
    selectMode: 'Режим выделения',
    editOn: 'Редактирование включено',
    editOff: 'Редактирование выключено',
    resetPositions: 'Сбросить сохранённые позиции',
    positionsMenu: 'Экспорт / импорт позиций',
    exportPositions: 'Экспорт позиций',
    importPositions: 'Импорт позиций',
    elkPrepare: 'Загрузить GraphData → ELK → скачать файл для S3',
    elkFileError: 'Не удалось обработать файл',
    fileReadError: 'Не удалось прочитать файл',
    fullscreen: 'На весь экран',
    exitFullscreen: 'Выйти из полного экрана',
    statsNodes: 'Вершины',
    statsEdges: 'Связи',
    statsIslands: 'Острова',
  },
  detailPanel: {
    title: 'Детали',
    emptyTitle: 'Выберите элемент для просмотра информации',
    emptyHint: 'Кликните на узел, связь или остров на графе',
    close: 'Закрыть',
    whereLocated: 'Где расположен',
    neighbors: 'Ближайшие соседи',
    islandMembers: 'Вершины в острове',
    edgeEndpoints: 'Концы связи',
    noIslands: 'Нет островов',
    noNeighbors: 'Нет связей',
    noMembers: 'Нет вершин',
    noAttributes: 'Нет атрибутов',
    nodesNotFound: 'Вершины не найдены',
    downloadAttributes: 'Атрибуты',
    source: 'Источник',
    target: 'Цель',
    unknownNode: 'Неизвестная вершина',
    showByName: 'Показывать по имени',
    showByType: 'Показывать по типу',
    hideWithNodes: 'Скрыть вместе с вершинами',
    usefulLinks: 'Полезные ссылки',
    neighborOutgoing: '→ Исходящая',
    neighborIncoming: '← Входящая',
    nodeTypeLabel: 'Тип узла',
  },
  detailMarkdown: {
    entityKind: 'Тип сущности',
    type: 'Тип',
    brief: 'Кратко',
    description: 'Описание',
    attributesHeading: 'Атрибуты',
    noAttributes: 'Нет атрибутов',
    islandsHeading: 'Острова',
    noIslands: 'Нет островов',
    neighborsHeading: 'Ближайшие связи',
    noNeighbors: 'Нет связей',
    islandMembersHeading: 'Вершины в острове',
    noMembers: 'Нет вершин',
    edgeEndpointsHeading: 'Концы связи',
    sourceLine: 'Источник',
    targetLine: 'Цель',
    unknownType: '—',
    neighborOutgoing: '→ исходящая',
    neighborIncoming: '← входящая',
  },
  settingsPanel: {
    title: 'Настройки отображения',
    close: 'Закрыть',
    onlySelectedNeighbors: 'Только выбранный объект и ближайшие соседи',
    hideIslands: 'Скрыть все острова',
    showEdgeLabels: 'Показывать подписи связей',
    sectionObjectType: 'Тип объекта',
    sectionObjectName: 'Имя объекта',
    sectionEdgeType: 'Тип связи',
    sectionEdgeName: 'Имя связи',
    sectionIslandType: 'Тип острова',
    sectionIslandName: 'Имя острова',
    resetFilters: 'Сбросить фильтры',
    exportFilters: 'Экспорт фильтров',
    importFilters: 'Импорт фильтров',
    pin: 'Закрепить на стороне',
    unpin: 'Открепить',
    collapse: 'Свернуть',
    expand: 'Развернуть',
    defaultPanelTitle: 'Панель',
    cascadeHide: 'Скрыть вместе с вершинами',
    cascadeShow: 'Показать вершины',
  },
  selectionToolbar: {
    alignH: 'Выровнять по горизонтали',
    alignV: 'Выровнять по вертикали',
    elkLayout: 'Автоукладка ELK',
    screenshot: 'Предпросмотр скриншота',
  },
  screenshotModal: {
    title: 'Предпросмотр скриншота',
    close: 'Закрыть',
    hintNodes: 'узл.',
    hintIslands: 'остр.',
    hintEdges: 'связ.',
    transparentBg: 'Без фона',
    cancel: 'Отмена',
    savePng: 'PNG',
    saveJpeg: 'JPEG',
    saveWebp: 'WebP',
    saving: 'Сохранение…',
  },
  checkTree: {
    all: 'Все',
    searchPlaceholder: 'Поиск по имени',
  },
}

export type PartialGraphTexts = {
  [K in keyof GraphTexts]?: Partial<GraphTexts[K]>
}
