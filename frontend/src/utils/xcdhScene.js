export const seededValue = (index, salt = 0) => {
  const value = Math.sin((index + 1) * 9283.31 + salt * 77.17) * 43758.5453;
  return value - Math.floor(value);
};

const getEffectBounds = ({ worldWidth, worldHeight, overscan }) => ({
  minX: -overscan,
  maxX: worldWidth + overscan,
  minY: -overscan,
  maxY: worldHeight + overscan,
});

const getGridPosition = ({
  index,
  columns,
  rows,
  bounds,
  saltX,
  saltY,
  insetStart,
  insetRange,
}) => {
  const column = index % columns;
  const row = Math.floor(index / columns) % rows;
  const cellWidth = (bounds.maxX - bounds.minX) / columns;
  const cellHeight = (bounds.maxY - bounds.minY) / rows;
  return {
    x: bounds.minX + (column + insetStart + seededValue(index, saltX) * insetRange) * cellWidth,
    y: bounds.minY + (row + insetStart + seededValue(index, saltY) * insetRange) * cellHeight,
  };
};

export const createBackgroundStars = ({
  worldWidth,
  worldHeight,
  overscan,
  columns = 20,
  rows = 18,
}) => {
  const bounds = getEffectBounds({ worldWidth, worldHeight, overscan });
  return Array.from({ length: columns * rows }, (_, index) => {
    const position = getGridPosition({
      index,
      columns,
      rows,
      bounds,
      saltX: 1,
      saltY: 2,
      insetStart: 0.12,
      insetRange: 0.76,
    });
    return {
      id: `background-star-${index}`,
      ...position,
      depth: -320 + seededValue(index, 8) * 520,
      size: 0.6 + seededValue(index, 3) * 2.8,
      opacity: 0.22 + seededValue(index, 4) * 0.75,
      duration: 2.2 + seededValue(index, 5) * 5.5,
      delay: seededValue(index, 6) * -7,
      twinkles: index % 4 === 0,
      color: seededValue(index, 7) > 0.88
        ? '#fef3c7'
        : seededValue(index, 7) > 0.68 ? '#bfdbfe' : '#ffffff',
    };
  });
};

export const createMeteors = ({
  worldWidth,
  worldHeight,
  overscan,
  columns = 4,
  rows = 3,
}) => {
  const bounds = getEffectBounds({ worldWidth, worldHeight, overscan });
  return Array.from({ length: columns * rows }, (_, index) => {
    const angle = 18 + seededValue(index, 16) * 17;
    const distance = 520 + seededValue(index, 17) * 420;
    const radians = angle * (Math.PI / 180);
    const position = getGridPosition({
      index,
      columns,
      rows,
      bounds,
      saltX: 11,
      saltY: 12,
      insetStart: 0.38,
      insetRange: 0.24,
    });
    return {
      id: `meteor-${index}`,
      ...position,
      length: 120 + seededValue(index, 13) * 180,
      duration: 7 + seededValue(index, 14) * 10,
      delay: seededValue(index, 15) * -24,
      angle,
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      depth: -80 + seededValue(index, 18) * 220,
    };
  });
};
