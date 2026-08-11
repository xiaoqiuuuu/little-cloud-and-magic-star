import { useEffect, useMemo, useRef, useState } from 'react';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { App, Modal } from 'antd';
import QRCode from 'qrcode';

import { getQuestionTagMeta } from '../../constants/questionTags';
import { useCloudUI } from '../../ui';
import {
  POSTER_TEMPLATES,
  renderQuestionInvitePoster,
} from './questionInvitePosterTemplates';


function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
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
  const [templateId, setTemplateId] = useState(POSTER_TEMPLATES[0].id);
  const selectedTemplate = useMemo(
    () => POSTER_TEMPLATES.find((template) => template.id === templateId) || POSTER_TEMPLATES[0],
    [templateId],
  );

  useEffect(() => {
    if (!open || !question || !inviteUrl) return undefined;
    let cancelled = false;
    setRendering(true);

    const renderPoster = async () => {
      const [characterImage, qrImage] = await Promise.all([
        loadImage(characterPack.assets.cardCorner),
        QRCode.toDataURL(inviteUrl, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#111827', light: '#ffffff' },
        }).then(loadImage),
      ]);
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const width = 1080;
      const height = 1440;
      canvas.width = width;
      canvas.height = height;
      const tagMeta = getQuestionTagMeta(question.tag);
      renderQuestionInvitePoster({
        context,
        width,
        height,
        question,
        qrImage,
        characterImage,
        tagLabel: tagMeta.shortLabel,
        characterPack,
        templateId,
      });
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
  }, [characterPack, inviteUrl, message, open, question, templateId]);

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
      anchor.download = `邀请答题_${question.id}_${selectedTemplate.name}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success(`“${selectedTemplate.name}”海报已下载`);
    }, 'image/png');
  };

  return (
    <Modal
      open={open}
      title="邀请答题海报"
      onCancel={onClose}
      footer={null}
      width={760}
      centered
      zIndex={1200}
    >
      <div className="question-invite-poster">
        <div className="question-invite-poster__styles" role="list" aria-label="海报款式">
          {POSTER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className={template.id === templateId ? 'is-active' : ''}
              onClick={() => setTemplateId(template.id)}
              aria-pressed={template.id === templateId}
            >
              <span style={{ background: template.swatch }} aria-hidden="true" />
              <strong>{template.name}</strong>
              <small>{template.caption}</small>
            </button>
          ))}
        </div>
        <div className="question-invite-poster__preview" aria-busy={rendering}>
          <canvas ref={canvasRef} aria-label={`${selectedTemplate.name}邀请答题海报预览`} />
          {rendering && (
            <div><LoadingOutlined spin /> 正在生成“{selectedTemplate.name}”…</div>
          )}
        </div>
        <button type="button" onClick={downloadPoster} disabled={rendering}>
          <DownloadOutlined /> 下载“{selectedTemplate.name}”PNG 海报
        </button>
      </div>
    </Modal>
  );
}
