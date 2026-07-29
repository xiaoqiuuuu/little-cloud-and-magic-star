const normalizeSearchTerm = (value) => String(value ?? '').trim().toLocaleLowerCase('zh-CN');

const getSearchScore = (message, normalizedQuery) => {
  const id = String(message.id ?? '');
  const queryId = normalizedQuery.replace(/^#/, '');
  const hasQueryId = queryId.length > 0;
  const username = normalizeSearchTerm(message.username);
  const content = normalizeSearchTerm(message.content);

  if (hasQueryId && id === queryId) return 100;
  if (username === normalizedQuery) return 80;
  if (username.startsWith(normalizedQuery)) return 60;
  if (username.includes(normalizedQuery)) return 45;
  if (content.includes(normalizedQuery)) return 30;
  if (hasQueryId && id.includes(queryId)) return 20;
  return 0;
};

export const searchXcdhMessages = (messages, query, limit = 6) => {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return [];

  return messages
    .map((message) => ({ message, score: getSearchScore(message, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => (
      right.score - left.score
      || (right.message.click_count || 0) - (left.message.click_count || 0)
      || Number(right.message.id || 0) - Number(left.message.id || 0)
    ))
    .slice(0, limit)
    .map(({ message }) => message);
};

export const getWishDiscoveryTheme = (clickCount) => {
  const discoveries = Math.max(0, Number(clickCount) || 0);
  if (discoveries >= 30) return 'legendary';
  if (discoveries >= 10) return 'radiant';
  if (discoveries >= 3) return 'glowing';
  return 'new';
};
