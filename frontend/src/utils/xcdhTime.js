const xcdhTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const formatXcdhCreatedAt = (value) => {
  if (!value) return '';
  const timestamp = String(value).trim();
  if (!timestamp) return '';
  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasTimeZone ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return '';

  const parts = Object.fromEntries(
    xcdhTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};
