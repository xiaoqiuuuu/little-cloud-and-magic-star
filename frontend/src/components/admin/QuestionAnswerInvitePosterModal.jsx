import { useEffect, useRef, useState } from 'react';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { App, Modal } from 'antd';
import QRCode from 'qrcode';

import { getQuestionTagMeta } from '../../constants/questionTags';
import { useCloudUI } from '../../ui';


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


function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
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
  Array.from(text.trim()).forEach((character) => {
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


function fitQuestionLines(context, text, maxWidth, maxLines) {
  for (let fontSize = 76; fontSize >= 40; fontSize -= 2) {
    context.font = `800 ${fontSize}px ${context.font.split('px ')[1]}`;
    const lines = wrapCharacters(context, text, maxWidth);
    if (lines.length <= maxLines) return { fontSize, lines };
  }
  context.font = `800 40px ${context.font.split('px ')[1]}`;
  const lines = wrapCharacters(context, text, maxWidth);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[maxLines - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[maxLines - 1] = `${lastLine}…`;
  }
  return { fontSize: 40, lines: visibleLines };
}


export default function QuestionAnswerInvitePosterModal({
  open,
  onClose,
  question,
  inviteUrl,
}) {
  const { message } = App.useApp();
  const { characterPack } = useCloudUI();
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !question || !inviteUrl) return undefined;
    let cancelled = false;
    setRendering(true);

    const renderPoster = async () => {
      const [characterImage, qrImage] = await Promise.all([
        loadImage(characterPack.assets.cardCorner),
        QRCode.toDataURL(inviteUrl, {
          width: 340,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#172033', light: '#ffffff' },
        }).then(loadImage),
      ]);
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const width = 1080;
      const height = 1440;
      canvas.width = width;
      canvas.height = height;
      const fontFamily = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      const palette = {
        ink: '#172033',
        muted: '#667085',
        paper: '#f5f7fa',
        white: '#ffffff',
        line: '#d8dee8',
      };

      context.fillStyle = palette.paper;
      context.fillRect(0, 0, width, height);

      context.fillStyle = palette.ink;
      context.fillRect(0, 0, width, 252);
      context.fillStyle = characterPack.accent;
      context.fillRect(0, 0, 18, height);

      context.fillStyle = palette.white;
      context.font = `700 28px ${fontFamily}`;
      context.fillText('肥音卤果', 72, 78);
      context.font = `800 58px ${fontFamily}`;
      context.fillText('邀请答题', 72, 158);
      context.fillStyle = characterPack.accent;
      context.fillRect(72, 190, 104, 8);
      drawImageContain(context, characterImage, 760, 14, 270, 224);

      context.fillStyle = palette.white;
      context.fillRect(18, 252, width - 18, 782);

      const tagMeta = getQuestionTagMeta(question.tag);
      const badgeText = `#${question.id}  ${tagMeta.shortLabel}`;
      context.font = `700 24px ${fontFamily}`;
      const badgeWidth = context.measureText(badgeText).width + 50;
      roundedRect(context, 72, 316, badgeWidth, 54, 10);
      context.fillStyle = characterPack.accentSoft;
      context.fill();
      context.fillStyle = characterPack.accentDeep;
      context.fillText(badgeText, 97, 352);

      context.fillStyle = palette.muted;
      context.font = `700 24px ${fontFamily}`;
      context.fillText('题目', 72, 428);

      context.font = `800 76px ${fontFamily}`;
      const fitted = fitQuestionLines(context, question.question, 900, 8);
      context.font = `800 ${fitted.fontSize}px ${fontFamily}`;
      context.fillStyle = palette.ink;
      const lineHeight = fitted.fontSize * 1.45;
      const textBlockHeight = fitted.lines.length * lineHeight;
      const firstLineY = 680 - (textBlockHeight / 2) + fitted.fontSize;
      fitted.lines.forEach((line, index) => {
        context.fillText(line, 72, firstLineY + (index * lineHeight));
      });

      context.strokeStyle = palette.line;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(72, 964);
      context.lineTo(1008, 964);
      context.stroke();

      roundedRect(context, 62, 1040, 956, 330, 28);
      context.fillStyle = palette.ink;
      context.fill();
      context.fillStyle = characterPack.accent;
      context.fillRect(104, 1092, 86, 8);
      context.fillStyle = palette.white;
      context.font = `800 48px ${fontFamily}`;
      context.fillText('扫码作答', 104, 1180);
      context.fillStyle = '#c7ced9';
      context.font = `600 25px ${fontFamily}`;
      context.fillText('想好后揭晓答案', 104, 1234);

      roundedRect(context, 714, 1078, 268, 268, 18);
      context.fillStyle = palette.white;
      context.fill();
      context.drawImage(qrImage, 728, 1092, 240, 240);

      setRendering(false);
    };

    renderPoster().catch(() => {
      if (!cancelled) {
        setRendering(false);
        message.error('海报生成失败，请稍后重试');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [characterPack, inviteUrl, message, open, question]);

  const downloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        message.error('海报导出失败');
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `邀请答题_${question.id}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success('海报已下载');
    }, 'image/png');
  };

  return (
    <Modal
      open={open}
      title="邀请答题海报"
      onCancel={onClose}
      footer={null}
      width={620}
      centered
      zIndex={1200}
    >
      <div className="question-invite-poster">
        <div className="question-invite-poster__preview" aria-busy={rendering}>
          <canvas ref={canvasRef} aria-label="邀请答题海报预览" />
          {rendering && (
            <div><LoadingOutlined spin /> 正在生成海报…</div>
          )}
        </div>
        <button type="button" onClick={downloadPoster} disabled={rendering}>
          <DownloadOutlined /> 下载 PNG 海报
        </button>
      </div>
    </Modal>
  );
}
