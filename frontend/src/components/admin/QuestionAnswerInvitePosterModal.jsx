import { useEffect, useRef, useState } from 'react';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { App, Modal } from 'antd';
import QRCode from 'qrcode';

import { getQuestionTagMeta } from '../../constants/questionTags';
import { useCloudUI } from '../../ui';


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


function fitQuestionLines(context, text, maxWidth, maxLines) {
  for (let fontSize = 82; fontSize >= 40; fontSize -= 2) {
    context.font = `800 ${fontSize}px ${context.font.split('px ')[1]}`;
    const lines = wrapCharacters(context, text, maxWidth);
    if (lines.length <= maxLines) {
      return {
        fontSize,
        lines: balanceWrappedLines(context, lines, maxWidth),
      };
    }
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
        ink: '#151821',
        muted: '#626979',
        paper: '#f4f6fa',
        white: '#ffffff',
        signal: '#ffdc5d',
        line: '#cbd2de',
      };

      context.fillStyle = palette.paper;
      context.fillRect(0, 0, width, height);

      context.fillStyle = characterPack.accent;
      context.fillRect(0, 0, 18, height);

      context.fillStyle = palette.ink;
      context.fillRect(18, 0, 682, 238);
      context.fillStyle = characterPack.accentSoft;
      context.fillRect(700, 0, 380, 348);

      context.fillStyle = palette.white;
      context.font = `700 27px ${fontFamily}`;
      context.fillText('肥音卤果', 64, 68);
      context.font = `900 64px ${fontFamily}`;
      context.fillText('邀请答题', 64, 153);
      context.fillStyle = palette.signal;
      context.fillRect(64, 188, 116, 10);

      context.fillStyle = palette.ink;
      context.fillRect(766, 48, 242, 242);
      context.fillStyle = palette.signal;
      context.fillRect(750, 32, 242, 242);
      drawImageContain(context, characterImage, 770, 40, 202, 226);

      context.fillStyle = characterPack.accentDeep;
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          context.fillRect(718 + (column * 17), 292 + (row * 17), 5, 5);
        }
      }

      const tagMeta = getQuestionTagMeta(question.tag);
      const badgeText = `#${question.id}  /  ${tagMeta.shortLabel}`;
      context.font = `800 25px ${fontFamily}`;
      const badgeWidth = context.measureText(badgeText).width + 48;
      context.fillStyle = palette.signal;
      context.fillRect(64, 302, badgeWidth, 58);
      context.fillStyle = palette.ink;
      context.fillText(badgeText, 88, 340);

      context.fillStyle = palette.muted;
      context.font = `800 22px ${fontFamily}`;
      context.fillText('题目', 64, 424);

      context.fillStyle = characterPack.accentSoft;
      context.font = `900 360px ${fontFamily}`;
      context.fillText('?', 796, 934);

      context.font = `800 82px ${fontFamily}`;
      const fitted = fitQuestionLines(context, question.question, 900, 8);
      context.font = `800 ${fitted.fontSize}px ${fontFamily}`;
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

      context.fillStyle = characterPack.accent;
      context.fillRect(80, 1074, 936, 294);

      context.fillStyle = palette.white;
      context.fillRect(64, 1058, 936, 294);
      context.strokeStyle = palette.ink;
      context.lineWidth = 4;
      context.strokeRect(64, 1058, 936, 294);

      context.fillStyle = palette.ink;
      context.font = `800 22px ${fontFamily}`;
      context.fillText('答案入口', 106, 1124);
      context.font = `900 52px ${fontFamily}`;
      context.fillText('扫码查看答案', 106, 1208);
      context.fillStyle = characterPack.accentDeep;
      context.font = `900 62px ${fontFamily}`;
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

      context.fillStyle = palette.white;
      context.fillRect(738, 1084, 242, 242);
      context.drawImage(qrImage, 748, 1094, 222, 222);

      context.fillStyle = palette.paper;
      context.beginPath();
      context.arc(64, 1205, 18, 0, Math.PI * 2);
      context.arc(1000, 1205, 18, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = palette.ink;
      context.fillRect(18, 1404, 1062, 36);

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
