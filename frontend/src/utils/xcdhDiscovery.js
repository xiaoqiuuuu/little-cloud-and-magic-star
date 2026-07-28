export const isRectVisible = (rect, viewportRect) => (
  rect.right > viewportRect.left
  && rect.left < viewportRect.right
  && rect.bottom > viewportRect.top
  && rect.top < viewportRect.bottom
);

export const selectOffscreenMessage = (
  messages,
  visibleMessageIds,
  excludedMessageId,
  random = Math.random,
) => {
  const excludedId = excludedMessageId === null || excludedMessageId === undefined
    ? null
    : String(excludedMessageId);
  const candidates = messages.filter((message) => {
    const messageId = String(message.id);
    return messageId !== excludedId && !visibleMessageIds.has(messageId);
  });
  if (candidates.length === 0) return null;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
};
