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
  for (let fontSize = 68; fontSize >= 38; fontSize -= 2) {
    context.font = `700 ${fontSize}px ${context.font.split('px ')[1]}`;
    const lines = wrapCharacters(context, text, maxWidth);
    if (lines.length <= maxLines) return { fontSize, lines };
  }
  context.font = `700 38px ${context.font.split('px ')[1]}`;
  const lines = wrapCharacters(context, text, maxWidth);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[maxLines - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[maxLines - 1] = `${lastLine}…`;
  }
  return { fontSize: 38, lines: visibleLines };
}


export default function QuestionAnswerInvitePosterModal({
  open,
  onClose,
  question,
  inviteUrl,
}) {
  const { message } = App.useApp();
  const { characterPack, tokens } = useCloudUI();
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

      context.fillStyle = tokens.colorSurfaceMuted;
      context.fillRect(0, 0, width, height);

      context.fillStyle = characterPack.accentSoft;
      context.fillRect(0, 0, width, 232);
      context.fillStyle = characterPack.accent;
      context.fillRect(0, 0, 22, height);
      context.fillRect(58, 196, 660, 8);

      context.fillStyle = tokens.colorText;
      context.font = '800 38px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText('肥音卤果 · 邀请答题', 72, 92);
      context.fillStyle = tokens.colorTextMuted;
      context.font = '600 25px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(`${characterPack.name}陪你一起想答案`, 72, 143);
      drawImageContain(context, characterImage, 790, 24, 235, 210);

      context.save();
      context.shadowColor = 'rgba(27, 42, 67, 0.12)';
      context.shadowBlur = 28;
      context.shadowOffsetY = 12;
      roundedRect(context, 62, 278, 956, 650, 34);
      context.fillStyle = tokens.colorSurfaceRaised;
      context.fill();
      context.restore();

      const tagMeta = getQuestionTagMeta(question.tag);
      roundedRect(context, 104, 326, 210, 56, 28);
      context.fillStyle = characterPack.accentSoft;
      context.fill();
      context.fillStyle = characterPack.accentDeep;
      context.font = '700 24px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(`#${question.id} · ${tagMeta.shortLabel}`, 132, 363);

      context.fillStyle = tokens.colorTextMuted;
      context.font = '700 25px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText('请回答下面这道题', 104, 438);

      const fontFamily = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
      context.font = `700 68px ${fontFamily}`;
      const fitted = fitQuestionLines(context, question.question, 820, 7);
      context.font = `700 ${fitted.fontSize}px ${fontFamily}`;
      context.fillStyle = tokens.colorText;
      const lineHeight = fitted.fontSize * 1.55;
      const textBlockHeight = fitted.lines.length * lineHeight;
      const firstLineY = 624 - (textBlockHeight / 2) + lineHeight;
      fitted.lines.forEach((line, index) => {
        context.fillText(line, 104, firstLineY + (index * lineHeight));
      });

      context.strokeStyle = tokens.colorBorder;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(104, 858);
      context.lineTo(976, 858);
      context.stroke();
      context.fillStyle = tokens.colorTextMuted;
      context.font = `500 23px ${fontFamily}`;
      context.fillText('先想一想，再扫码进入页面查看答案', 104, 895);

      roundedRect(context, 62, 972, 956, 390, 34);
      context.fillStyle = characterPack.accentSoft;
      context.fill();
      roundedRect(context, 696, 1012, 286, 286, 22);
      context.fillStyle = '#ffffff';
      context.fill();
      context.drawImage(qrImage, 713, 1029, 252, 252);

      context.fillStyle = characterPack.accentDeep;
      context.font = `800 42px ${fontFamily}`;
      context.fillText('扫码查看答案', 104, 1080);
      context.fillStyle = tokens.colorText;
      context.font = `650 27px ${fontFamily}`;
      context.fillText('打开专属答题页', 104, 1142);
      context.fillText('点击按钮后揭晓正确答案', 104, 1188);
      context.fillStyle = tokens.colorTextMuted;
      context.font = `500 21px ${fontFamily}`;
      context.fillText('随机安全链接 · 可由邀请人随时停用', 104, 1274);

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
  }, [characterPack, inviteUrl, message, open, question, tokens]);

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
        <p>海报包含完整题目和专属二维码，答案不会直接出现在图片中。</p>
        <button type="button" onClick={downloadPoster} disabled={rendering}>
          <DownloadOutlined /> 下载 PNG 海报
        </button>
      </div>
    </Modal>
  );
}
