export const DEFAULT_QUESTION_TAG = 'common';

export const DEFAULT_QUESTION_TAG_OPTIONS = [
  {
    value: 'concert',
    label: '演唱会题目',
    shortLabel: '演唱会',
    color: 'purple',
    cardClass: 'bg-purple-50 text-purple-800',
  },
  {
    value: 'vlog',
    label: 'Vlog题目',
    shortLabel: 'Vlog',
    color: 'blue',
    cardClass: 'bg-blue-50 text-blue-800',
  },
  {
    value: 'common',
    label: '通用题目',
    shortLabel: '通用',
    color: 'default',
    cardClass: 'bg-gray-50 text-gray-800',
  },
  {
    value: 'music',
    label: '音乐题目',
    shortLabel: '音乐',
    color: 'magenta',
    cardClass: 'bg-pink-50 text-pink-800',
  },
  {
    value: 'daily',
    label: '日常题目',
    shortLabel: '日常',
    color: 'green',
    cardClass: 'bg-green-50 text-green-800',
  },
  {
    value: 'live',
    label: '直播题目',
    shortLabel: '直播',
    color: 'red',
    cardClass: 'bg-red-50 text-red-800',
  },
  {
    value: 'guest',
    label: '嘉宾题目',
    shortLabel: '嘉宾',
    color: 'gold',
    cardClass: 'bg-yellow-50 text-yellow-800',
  },
  {
    value: 'interaction',
    label: '互动题目',
    shortLabel: '互动',
    color: 'cyan',
    cardClass: 'bg-cyan-50 text-cyan-800',
  },
];

export function getQuestionTagMeta(value) {
  return DEFAULT_QUESTION_TAG_OPTIONS.find((option) => option.value === value) || {
    value,
    label: value || '未分类题目',
    shortLabel: value || '未分类',
    color: 'default',
    cardClass: 'bg-slate-50 text-slate-800',
  };
}

export function mergeQuestionTagOptions(values = []) {
  const options = [...DEFAULT_QUESTION_TAG_OPTIONS];
  const knownValues = new Set(options.map((option) => option.value));
  values.filter(Boolean).forEach((value) => {
    if (!knownValues.has(value)) {
      options.push(getQuestionTagMeta(value));
      knownValues.add(value);
    }
  });
  return options;
}
