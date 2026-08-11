const SANS_FONT = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
const SERIF_FONT = '"Songti SC", "STSong", "SimSun", serif';


export const POSTER_TEMPLATES = [
  {
    id: 'editorial',
    name: '编辑部黑白',
    caption: '杂志封面式大留白与强标题',
    swatch: 'linear-gradient(135deg, #f1eee6 0 62%, #111827 62%)',
  },
  {
    id: 'aurora',
    name: '流体极光',
    caption: '柔光渐变与玻璃拟态卡片',
    swatch: 'linear-gradient(135deg, #7357ff, #ff78b8 48%, #5be7d7)',
  },
  {
    id: 'neon',
    name: '霓虹夜航',
    caption: '赛博网格与电光色对撞',
    swatch: 'linear-gradient(135deg, #05060a, #122a44 55%, #ff2ea6)',
  },
  {
    id: 'pop',
    name: '撞色波普',
    caption: '大胆几何与年轻潮流排版',
    swatch: 'linear-gradient(135deg, #ffd84d 0 48%, #ff5d58 48% 72%, #3155d9 72%)',
  },
  {
    id: 'zen',
    name: '东方留白',
    caption: '宋体气质与自然有机形态',
    swatch: 'linear-gradient(135deg, #f5f0e5, #d9e3cf 58%, #263c36)',
  },
];


function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}


function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}


function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 2) {
  roundedRect(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}


function drawImageContain(context, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}


function wrapCharacters(context, text, maxWidth) {
  const lines = [];
  let currentLine = '';
  Array.from(String(text || '').trim()).forEach((character) => {
    const candidate = `${currentLine}${character}`;
    if (currentLine && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = candidate;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}


function balanceWrappedLines(context, lines, maxWidth) {
  const balanced = [...lines];
  for (let index = balanced.length - 1; index > 0; index -= 1) {
    const previous = Array.from(balanced[index - 1]);
    const current = Array.from(balanced[index]);
    while (previous.length - current.length > 1) {
      const moved = previous.pop();
      const candidate = [moved, ...current].join('');
      if (context.measureText(candidate).width > maxWidth) break;
      current.unshift(moved);
    }
    balanced[index - 1] = previous.join('');
    balanced[index] = current.join('');
  }
  return balanced;
}


function fitQuestion(context, text, options) {
  const {
    maxWidth,
    maxLines,
    maxFontSize,
    minFontSize,
    fontFamily = SANS_FONT,
    weight = 800,
  } = options;
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    context.font = `${weight} ${fontSize}px ${fontFamily}`;
    const lines = wrapCharacters(context, text, maxWidth);
    if (lines.length <= maxLines) {
      return {
        fontSize,
        lines: balanceWrappedLines(context, lines, maxWidth),
        fontFamily,
        weight,
      };
    }
  }
  context.font = `${weight} ${minFontSize}px ${fontFamily}`;
  const allLines = wrapCharacters(context, text, maxWidth);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && lines.length) {
    let lastLine = lines[lines.length - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${lastLine}…`;
  }
  return { fontSize: minFontSize, lines, fontFamily, weight };
}


function drawQuestionLines(context, questionText, options) {
  const fitted = fitQuestion(context, questionText, options);
  const {
    x,
    y,
    lineHeight = 1.35,
    color,
    align = 'left',
    maxWidth,
  } = options;
  context.save();
  context.font = `${fitted.weight} ${fitted.fontSize}px ${fitted.fontFamily}`;
  context.fillStyle = color;
  context.textAlign = align;
  const drawX = align === 'center' ? x + (maxWidth / 2) : x;
  fitted.lines.forEach((line, index) => {
    context.fillText(line, drawX, y + (index * fitted.fontSize * lineHeight));
  });
  context.restore();
  return fitted;
}


function drawQr(context, qrImage, x, y, size, options = {}) {
  const {
    background = '#ffffff',
    radius = 24,
    padding = 18,
    border = null,
  } = options;
  fillRoundedRect(context, x, y, size, size, radius, background);
  if (border) strokeRoundedRect(context, x, y, size, size, radius, border, 3);
  context.drawImage(qrImage, x + padding, y + padding, size - (padding * 2), size - (padding * 2));
}


function drawEditorial({
  context,
  width,
  height,
  question,
  qrImage,
  characterImage,
  tagLabel,
  accent,
  accentDeep,
  accentSoft,
}) {
  const palette = {
    ink: '#151821',
    muted: '#626979',
    paper: '#f4f6fa',
    white: '#ffffff',
    signal: '#ffdc5d',
    line: '#cbd2de',
  };
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 18, height);
  context.fillStyle = palette.ink;
  context.fillRect(18, 0, 682, 238);
  context.fillStyle = accentSoft;
  context.fillRect(700, 0, 380, 348);

  context.fillStyle = palette.white;
  context.font = `700 27px ${SANS_FONT}`;
  context.fillText('肥音卤果', 64, 68);
  context.font = `900 64px ${SANS_FONT}`;
  context.fillText('邀请答题', 64, 153);
  context.fillStyle = palette.signal;
  context.fillRect(64, 188, 116, 10);

  context.fillStyle = palette.ink;
  context.fillRect(766, 48, 242, 242);
  context.fillStyle = palette.signal;
  context.fillRect(750, 32, 242, 242);
  drawImageContain(context, characterImage, 770, 40, 202, 226);

  context.fillStyle = accentDeep;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      context.fillRect(718 + (column * 17), 292 + (row * 17), 5, 5);
    }
  }

  const badgeText = `#${question.id}  /  ${tagLabel}`;
  context.font = `800 25px ${SANS_FONT}`;
  const badgeWidth = context.measureText(badgeText).width + 48;
  context.fillStyle = palette.signal;
  context.fillRect(64, 302, badgeWidth, 58);
  context.fillStyle = palette.ink;
  context.fillText(badgeText, 88, 340);
  context.fillStyle = palette.muted;
  context.font = `800 22px ${SANS_FONT}`;
  context.fillText('题目', 64, 424);

  context.fillStyle = accentSoft;
  context.font = `900 360px ${SANS_FONT}`;
  context.fillText('?', 796, 934);

  const fitted = fitQuestion(context, question.question, {
    maxWidth: 900,
    maxLines: 8,
    maxFontSize: 82,
    minFontSize: 40,
  });
  context.font = `800 ${fitted.fontSize}px ${SANS_FONT}`;
  context.fillStyle = palette.ink;
  const lineHeight = fitted.fontSize * 1.42;
  const textBlockHeight = fitted.lines.length * lineHeight;
  const firstLineY = 690 - (textBlockHeight / 2) + fitted.fontSize;
  fitted.lines.forEach((line, index) => {
    context.fillText(line, 64, firstLineY + (index * lineHeight));
  });

  context.strokeStyle = palette.line;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(64, 976);
  context.lineTo(1016, 976);
  context.stroke();

  context.fillStyle = accent;
  context.fillRect(80, 1074, 936, 294);
  context.fillStyle = palette.white;
  context.fillRect(64, 1058, 936, 294);
  context.strokeStyle = palette.ink;
  context.lineWidth = 4;
  context.strokeRect(64, 1058, 936, 294);

  context.fillStyle = palette.ink;
  context.font = `800 22px ${SANS_FONT}`;
  context.fillText('答案入口', 106, 1124);
  context.font = `900 52px ${SANS_FONT}`;
  context.fillText('扫码查看答案', 106, 1208);
  context.fillStyle = accentDeep;
  context.font = `900 62px ${SANS_FONT}`;
  context.fillText('→', 106, 1300);

  context.save();
  context.setLineDash([12, 12]);
  context.strokeStyle = palette.line;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(700, 1088);
  context.lineTo(700, 1322);
  context.stroke();
  context.restore();
  drawQr(context, qrImage, 738, 1084, 242, { radius: 0, padding: 10 });

  context.fillStyle = palette.paper;
  context.beginPath();
  context.arc(64, 1205, 18, 0, Math.PI * 2);
  context.arc(1000, 1205, 18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.ink;
  context.fillRect(18, 1404, 1062, 36);
}


function drawAurora({ context, width, height, question, qrImage, characterImage, tagLabel, accent }) {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#6656ef');
  background.addColorStop(0.42, '#e672bd');
  background.addColorStop(0.76, '#ffb58b');
  background.addColorStop(1, '#63ddd0');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(190, 220, 20, 190, 220, 360);
  glow.addColorStop(0, 'rgba(255,255,255,0.72)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 620, 650);
  context.fillStyle = 'rgba(51, 29, 117, 0.22)';
  context.beginPath();
  context.arc(1000, 110, 330, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(255, 255, 255, 0.15)';
  context.beginPath();
  context.arc(70, 1290, 300, 0, Math.PI * 2);
  context.fill();

  fillRoundedRect(context, 58, 58, 964, 1324, 44, 'rgba(255,255,255,0.22)');
  strokeRoundedRect(context, 58, 58, 964, 1324, 44, 'rgba(255,255,255,0.52)', 2);
  context.fillStyle = '#ffffff';
  context.font = `800 26px ${SANS_FONT}`;
  context.fillText('肥音卤果 · 邀请答题', 112, 130);
  fillRoundedRect(context, 112, 180, 250, 54, 27, 'rgba(255,255,255,0.26)');
  context.font = `700 23px ${SANS_FONT}`;
  context.fillText(`#${question.id}  ${tagLabel}`, 137, 216);

  drawImageContain(context, characterImage, 690, 92, 270, 250);
  fillRoundedRect(context, 92, 330, 896, 646, 38, 'rgba(255,255,255,0.86)');
  context.fillStyle = '#6e4ed6';
  context.font = `800 21px ${SANS_FONT}`;
  context.fillText('TODAY’S QUESTION', 140, 405);
  context.fillStyle = accent || '#6e4ed6';
  context.fillRect(140, 438, 92, 8);
  drawQuestionLines(context, question.question, {
    x: 140,
    y: 548,
    maxWidth: 800,
    maxLines: 6,
    maxFontSize: 72,
    minFontSize: 40,
    lineHeight: 1.4,
    color: '#201b3d',
  });

  fillRoundedRect(context, 92, 1014, 896, 312, 38, 'rgba(35,27,74,0.9)');
  context.fillStyle = '#ffffff';
  context.font = `800 43px ${SANS_FONT}`;
  context.fillText('扫一扫，开始作答', 140, 1120);
  context.fillStyle = 'rgba(255,255,255,0.68)';
  context.font = `600 22px ${SANS_FONT}`;
  context.fillText('答案就在下一步，先相信你的直觉', 140, 1172);
  drawQr(context, qrImage, 710, 1038, 264, { radius: 24, padding: 16 });
}


function drawNeon({ context, width, height, question, qrImage, characterImage, tagLabel }) {
  context.fillStyle = '#05070d';
  context.fillRect(0, 0, width, height);
  const horizon = 885;
  context.strokeStyle = 'rgba(61, 236, 255, 0.17)';
  context.lineWidth = 2;
  for (let x = -300; x < width + 300; x += 90) {
    context.beginPath();
    context.moveTo(width / 2, horizon);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = horizon; y < height; y += 62) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  const neonGlow = context.createRadialGradient(800, 240, 20, 800, 240, 420);
  neonGlow.addColorStop(0, 'rgba(255,46,166,0.34)');
  neonGlow.addColorStop(1, 'rgba(255,46,166,0)');
  context.fillStyle = neonGlow;
  context.fillRect(360, 0, 720, 720);

  context.shadowBlur = 20;
  context.shadowColor = '#3decff';
  context.strokeStyle = '#3decff';
  context.lineWidth = 3;
  context.strokeRect(58, 58, 964, 1324);
  context.shadowBlur = 0;
  context.fillStyle = '#3decff';
  context.font = `800 23px ${SANS_FONT}`;
  context.fillText('QUIZ SIGNAL / ONLINE', 100, 124);
  context.fillStyle = '#ff2ea6';
  context.font = `900 116px ${SANS_FONT}`;
  context.fillText(`#${question.id}`, 94, 274);
  context.font = `800 23px ${SANS_FONT}`;
  context.fillText(tagLabel.toUpperCase(), 100, 332);

  context.save();
  context.globalAlpha = 0.92;
  context.shadowBlur = 34;
  context.shadowColor = '#ff2ea6';
  drawImageContain(context, characterImage, 720, 90, 260, 300);
  context.restore();

  strokeRoundedRect(context, 92, 390, 896, 560, 18, '#ff2ea6', 3);
  context.fillStyle = 'rgba(8,14,25,0.88)';
  roundedRect(context, 92, 390, 896, 560, 18);
  context.fill();
  context.fillStyle = '#9aa8b8';
  context.font = `700 21px ${SANS_FONT}`;
  context.fillText('INCOMING QUESTION', 136, 456);
  drawQuestionLines(context, question.question, {
    x: 136,
    y: 560,
    maxWidth: 808,
    maxLines: 6,
    maxFontSize: 68,
    minFontSize: 38,
    lineHeight: 1.42,
    color: '#ffffff',
  });

  fillRoundedRect(context, 92, 1000, 896, 310, 18, '#121b2a');
  context.fillStyle = '#b6ff45';
  context.font = `900 45px ${SANS_FONT}`;
  context.fillText('SCAN / ANSWER', 134, 1112);
  context.fillStyle = '#8ca0b5';
  context.font = `600 22px ${SANS_FONT}`;
  context.fillText('答案揭晓前，锁定你的选择', 134, 1164);
  drawQr(context, qrImage, 724, 1018, 270, { radius: 8, padding: 16, border: '#b6ff45' });
  context.fillStyle = '#3decff';
  context.fillRect(94, 1350, 340, 5);
  context.fillStyle = '#ff2ea6';
  context.fillRect(434, 1350, 552, 5);
}


function drawPop({ context, width, height, question, qrImage, characterImage, tagLabel }) {
  context.fillStyle = '#ffd94f';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#3155d9';
  context.fillRect(0, 0, 420, 350);
  context.fillStyle = '#ff5d58';
  context.beginPath();
  context.arc(948, 182, 240, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#111111';
  context.lineWidth = 6;
  for (let x = 760; x < 1120; x += 36) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - 230, 360);
    context.stroke();
  }

  context.fillStyle = '#ffffff';
  context.font = `900 28px ${SANS_FONT}`;
  context.fillText('肥音卤果', 66, 84);
  context.font = `900 82px ${SANS_FONT}`;
  context.fillText('答题', 62, 180);
  context.fillText('派对', 62, 272);
  fillRoundedRect(context, 456, 62, 300, 58, 0, '#111111');
  context.fillStyle = '#ffffff';
  context.font = `800 22px ${SANS_FONT}`;
  context.fillText(`#${question.id} · ${tagLabel}`, 484, 100);

  context.save();
  context.translate(92, 394);
  context.rotate(-0.025);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 896, 610);
  context.strokeStyle = '#111111';
  context.lineWidth = 7;
  context.strokeRect(0, 0, 896, 610);
  context.fillStyle = '#ff5d58';
  context.font = `900 24px ${SANS_FONT}`;
  context.fillText('QUESTION!', 48, 72);
  drawQuestionLines(context, question.question, {
    x: 48,
    y: 182,
    maxWidth: 800,
    maxLines: 6,
    maxFontSize: 70,
    minFontSize: 40,
    lineHeight: 1.38,
    color: '#111111',
  });
  context.restore();

  fillRoundedRect(context, 62, 1040, 470, 350, 0, '#3155d9');
  context.fillStyle = '#ffffff';
  context.font = `900 42px ${SANS_FONT}`;
  context.fillText('扫码开答', 96, 1142);
  context.font = `700 21px ${SANS_FONT}`;
  context.fillText('先大胆猜！', 96, 1190);
  drawQr(context, qrImage, 310, 1165, 210, { radius: 0, padding: 12, border: '#111111' });
  context.fillStyle = '#ff5d58';
  context.beginPath();
  context.arc(750, 1205, 210, 0, Math.PI * 2);
  context.fill();
  drawImageContain(context, characterImage, 548, 1000, 430, 380);
}


function drawZen({ context, width, height, question, qrImage, characterImage, tagLabel }) {
  context.fillStyle = '#f5f0e5';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#d9e3cf';
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(420, 110, 470, 420, 300, 650);
  context.bezierCurveTo(180, 810, 90, 840, 0, 870);
  context.closePath();
  context.fill();
  context.fillStyle = '#d86f52';
  context.beginPath();
  context.arc(868, 182, 98, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#263c36';
  context.font = `600 24px ${SERIF_FONT}`;
  context.fillText('肥音卤果 · 邀请作答', 92, 104);
  context.fillStyle = '#6e7c72';
  context.font = `500 20px ${SANS_FONT}`;
  context.fillText(`题号 ${question.id}  ·  ${tagLabel}`, 92, 154);
  context.strokeStyle = '#9da99e';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(92, 198);
  context.lineTo(988, 198);
  context.stroke();

  context.fillStyle = '#263c36';
  context.font = `600 34px ${SERIF_FONT}`;
  context.fillText('今日一问', 92, 292);
  drawQuestionLines(context, question.question, {
    x: 160,
    y: 430,
    maxWidth: 760,
    maxLines: 7,
    maxFontSize: 70,
    minFontSize: 40,
    fontFamily: SERIF_FONT,
    weight: 600,
    lineHeight: 1.5,
    color: '#1f332e',
    align: 'center',
  });

  context.strokeStyle = '#b4bdb4';
  context.beginPath();
  context.moveTo(210, 950);
  context.lineTo(870, 950);
  context.stroke();
  drawImageContain(context, characterImage, 90, 970, 260, 250);
  context.fillStyle = '#263c36';
  context.font = `600 34px ${SERIF_FONT}`;
  context.fillText('扫码作答', 400, 1048);
  context.fillStyle = '#6e7c72';
  context.font = `500 21px ${SANS_FONT}`;
  context.fillText('静下心来，答案会慢慢浮现', 400, 1090);
  drawQr(context, qrImage, 688, 1000, 278, { radius: 36, padding: 20, background: '#ffffff' });
  context.fillStyle = '#263c36';
  context.font = `500 18px ${SANS_FONT}`;
  context.fillText('KEEP CURIOUS · KEEP SHINING', 92, 1350);
}


const RENDERERS = {
  editorial: drawEditorial,
  aurora: drawAurora,
  neon: drawNeon,
  pop: drawPop,
  zen: drawZen,
};


export function renderQuestionInvitePoster({
  context,
  width,
  height,
  question,
  qrImage,
  characterImage,
  tagLabel,
  characterPack,
  templateId,
}) {
  context.clearRect(0, 0, width, height);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  const renderer = RENDERERS[templateId] || RENDERERS.editorial;
  renderer({
    context,
    width,
    height,
    question,
    qrImage,
    characterImage,
    tagLabel,
    accent: characterPack.accent,
    accentDeep: characterPack.accentDeep,
    accentSoft: characterPack.accentSoft,
  });
}
