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
        version: '0.1.0',
        description: '统一管理颜色模式、语义 Token、Ant Design 主题和人物资源包。',
        keywords: ['theme', '主题', 'token', 'provider', 'dark'],
      },
    ],
  },
  {
    id: 'general',
    label: '基础组件',
    description: '不依赖人物素材的通用组件',
    items: [
      {
        id: 'button',
        name: '按钮',
        shortName: 'Button',
        icon: '⌁',
        status: 'ready',
        version: '0.1.0',
        description: '主按钮、次按钮、柔和按钮、幽灵按钮和危险操作。',
        keywords: ['button', '按钮', 'action', 'loading'],
      },
      {
        id: 'input',
        name: '输入框',
        shortName: 'Input',
        icon: '⌨',
        status: 'ready',
        version: '0.1.0',
        description: '包含标签、辅助文字、前后缀和校验状态的输入控件。',
        keywords: ['input', '输入框', 'form', '表单'],
      },
      {
        id: 'card',
        name: '卡片',
        shortName: 'Card',
        icon: '▱',
        status: 'ready',
        version: '0.1.0',
        description: '支持描边、浮层、柔和背景以及可点击状态的内容容器。',
        keywords: ['card', '卡片', 'container', 'layout'],
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
        shortName: 'CharacterButton / CharacterCard',
        icon: '✦',
        status: 'ready',
        version: '0.1.0',
        description: '同一套 API 自动适配小云公主或生日女孩人物资源。',
        keywords: ['character', '人物', 'button', 'card', '小云', '生日'],
      },
    ],
  },
  {
    id: 'roadmap',
    label: '后续组件',
    description: '基础体系稳定后继续补充',
    items: [
      {
        id: 'feedback-components',
        name: '反馈组件',
        shortName: 'Modal / Toast / Empty',
        icon: '◌',
        status: 'planned',
        description: '弹窗、消息、空状态和加载反馈。',
        keywords: ['modal', 'toast', 'empty', '反馈'],
      },
      {
        id: 'selection-components',
        name: '选择组件',
        shortName: 'Select / Checkbox / Switch',
        icon: '✓',
        status: 'planned',
        description: '选择器、复选框、单选框和开关。',
        keywords: ['select', 'checkbox', 'switch', '选择'],
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
