export const isRectVisible = (rect, viewportRect) => (
  rect.right > viewportRect.left
  && rect.left < viewportRect.right
  && rect.bottom > viewportRect.top
  && rect.top < viewportRect.bottom
);

export const isRectFullyVisible = (rect, viewportRect) => (
  rect.left >= viewportRect.left
  && rect.right <= viewportRect.right
  && rect.top >= viewportRect.top
  && rect.bottom <= viewportRect.bottom
);

export const getViewportFocusCorrection = (rect, viewportRect, safeMargin) => {
  const viewportWidth = viewportRect.right - viewportRect.left;
  const viewportHeight = viewportRect.bottom - viewportRect.top;
  const horizontalMargin = Math.min(safeMargin, viewportWidth / 2);
  const verticalMargin = Math.min(safeMargin, viewportHeight / 2);
  const centerX = rect.left + (rect.right - rect.left) / 2;
  const centerY = rect.top + (rect.bottom - rect.top) / 2;
  const safeX = Math.min(
    Math.max(centerX, viewportRect.left + horizontalMargin),
    viewportRect.right - horizontalMargin,
  );
  const safeY = Math.min(
    Math.max(centerY, viewportRect.top + verticalMargin),
    viewportRect.bottom - verticalMargin,
  );
  return { x: safeX - centerX, y: safeY - centerY };
};

export const clampUniverseOffset = (
  offset,
  { viewportWidth, viewportHeight, worldWidth, worldHeight, overscan = 0 },
) => ({
  x: Math.min(
    Math.max(offset.x, Math.min(0, viewportWidth - worldWidth) - overscan),
    overscan,
  ),
  y: Math.min(
    Math.max(offset.y, Math.min(0, viewportHeight - worldHeight) - overscan),
    overscan,
  ),
});

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
