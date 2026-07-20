export const componentGroups = [
  {
    id: 'actions',
    label: '操作组件',
    description: '触发操作与页面跳转',
    items: [
      {
        id: 'xiaoyun-button',
        name: '小云图案按钮',
        shortName: 'XiaoyunButton',
        icon: '✦',
        status: 'ready',
        version: '0.1.0',
        description: '带角色插画的轻量系统按钮，支持主题、尺寸和常用交互状态。',
        keywords: ['button', '按钮', '小云', 'action'],
      },
      {
        id: 'shengri-button',
        name: '生日庆祝按钮',
        shortName: 'ShengriButton',
        icon: '✧',
        status: 'ready',
        version: '0.1.0',
        description: '带圆形人物肖像和彩屑细节的生日、礼物与纪念日操作按钮。',
        keywords: ['button', '按钮', '生日', 'birthday', 'celebration'],
      },
    ],
  },
  {
    id: 'layout',
    label: '布局组件',
    description: '内容容器与页面结构',
    items: [
      {
        id: 'character-card',
        name: '人物留白卡片',
        shortName: 'CharacterCard',
        icon: '▱',
        status: 'ready',
        version: '0.1.0',
        description: '使用小云或生日人物作为边角、侧边和水印装饰的内容容器。',
        keywords: ['card', '卡片', '留白', 'layout', '小云', '生日'],
      },
    ],
  },
  {
    id: 'forms',
    label: '表单组件',
    description: '数据输入与选择',
    items: [
      {
        id: 'cloud-input',
        name: '云朵输入框',
        shortName: 'CloudInput',
        icon: '⌨',
        status: 'planned',
        description: '预留给后续输入类组件。',
        keywords: ['input', '输入框', 'form'],
      },
    ],
  },
  {
    id: 'feedback',
    label: '反馈组件',
    description: '操作结果与状态提示',
    items: [
      {
        id: 'magic-toast',
        name: '魔法提示',
        shortName: 'MagicToast',
        icon: '◌',
        status: 'planned',
        description: '预留给消息和操作反馈组件。',
        keywords: ['toast', 'message', '提示', 'feedback'],
      },
      {
        id: 'magic-dialog',
        name: '魔法弹窗',
        shortName: 'MagicDialog',
        icon: '▣',
        status: 'planned',
        description: '预留给确认和信息展示弹窗。',
        keywords: ['dialog', 'modal', '弹窗'],
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
