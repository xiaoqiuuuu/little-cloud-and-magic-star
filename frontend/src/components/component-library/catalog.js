export const componentGroups = [
  {
    id: 'foundation',
    label: '设计基础',
    description: '主题、Token 与人物资源包',
    items: [
      {
        id: 'theme-system',
        name: '全局主题',
        shortName: 'CloudUIProvider',
        icon: '◐',
        status: 'ready',
        version: '0.2.0',
        description: '两套视觉主题、六个人物资源包、亮暗模式和 Ant Design 同步。',
        keywords: ['theme', '主题', 'token', 'provider', 'dark', '角色'],
      },
    ],
  },
  {
    id: 'general',
    label: '通用组件',
    description: '页面中的基础操作与容器',
    items: [
      {
        id: 'button',
        name: '按钮',
        shortName: 'Button',
        icon: '⌁',
        status: 'ready',
        version: '0.2.0',
        description: '主按钮、次按钮、柔和按钮、幽灵按钮和危险操作。',
        keywords: ['button', '按钮', 'action', 'loading'],
      },
      {
        id: 'card',
        name: '卡片',
        shortName: 'Card',
        icon: '▱',
        status: 'ready',
        version: '0.2.0',
        description: '支持描边、浮层、柔和背景以及可点击状态的内容容器。',
        keywords: ['card', '卡片', 'container', 'layout'],
      },
    ],
  },
  {
    id: 'data-entry',
    label: '数据录入',
    description: '表单输入、选择和状态控制',
    items: [
      {
        id: 'input',
        name: '输入框',
        shortName: 'Input',
        icon: '⌨',
        status: 'ready',
        version: '0.2.0',
        description: '包含标签、辅助文字、前后缀和校验状态的输入控件。',
        keywords: ['input', '输入框', 'form', '表单'],
      },
      {
        id: 'selection-controls',
        name: '选择与开关',
        shortName: 'Select / Switch',
        icon: '✓',
        status: 'ready',
        version: '0.2.0',
        description: '覆盖项目中的下拉选择、状态切换和活动设置。',
        keywords: ['select', 'switch', '选择', '开关', '表单'],
      },
    ],
  },
  {
    id: 'data-display',
    label: '数据展示',
    description: '状态标签与关键指标',
    items: [
      {
        id: 'status-display',
        name: '标签与统计',
        shortName: 'Tag / Statistic',
        icon: '◇',
        status: 'ready',
        version: '0.2.0',
        description: '用于活动状态、账号角色、统计指标和趋势说明。',
        keywords: ['tag', 'statistic', '标签', '统计', 'status'],
      },
    ],
  },
  {
    id: 'feedback',
    label: '反馈组件',
    description: '结果提示与内容状态',
    items: [
      {
        id: 'feedback-components',
        name: '提示与空状态',
        shortName: 'Alert / EmptyState',
        icon: '◌',
        status: 'ready',
        version: '0.2.0',
        description: '保存结果、风险提示、空数据以及人物版空状态。',
        keywords: ['alert', 'empty', '提示', '空状态', '反馈'],
      },
    ],
  },
  {
    id: 'character',
    label: '人物组件',
    description: '由全局人物资源包驱动',
    items: [
      {
        id: 'character-components',
        name: '人物组件',
        shortName: 'Button / Card / Empty',
        icon: '✦',
        status: 'ready',
        version: '0.2.0',
        description: '同一套 API 自动适配两套主题中的六个角色。',
        keywords: ['character', '人物', 'button', 'card', 'empty', '小云', '生日'],
      },
    ],
  },
  {
    id: 'roadmap',
    label: '后续组件',
    description: '继续由 Ant Design 承担的复杂交互',
    items: [
      {
        id: 'complex-components',
        name: '复杂业务组件',
        shortName: 'Table / Modal / Upload',
        icon: '▦',
        status: 'planned',
        description: '先统一主题 Token，再按真实业务差异封装复杂组件。',
        keywords: ['table', 'modal', 'upload', 'form', '复杂组件'],
      },
    ],
  },
];


export const componentCatalog = componentGroups.flatMap((group) => (
  group.items.map((item) => ({ ...item, groupId: group.id, groupLabel: group.label }))
));


export function getComponentById(componentId) {
  return componentCatalog.find((item) => item.id === componentId);
}
