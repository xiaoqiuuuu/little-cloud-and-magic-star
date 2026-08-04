import { useEffect, useState } from 'react';
import {
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  FileImageOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { App, Modal, Tag } from 'antd';

import api from '../../api';
import { getQuestionTagMeta } from '../../constants/questionTags';
import QuestionAnswerInvitePosterModal from './QuestionAnswerInvitePosterModal';
import './QuestionAnswerInviteManager.css';


function formatDateTime(value) {
  if (!value) return '尚未查看';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}


async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}


export default function QuestionAnswerInviteManager({ open, onClose }) {
  const { message, modal } = App.useApp();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const inviteUrl = link
    ? `${window.location.origin}/answer-invite#${link.token}`
    : '';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPosterOpen(false);
    api.get('/admin/question-answer-invites', { hideLoading: true })
      .then((response) => setLink(response.data))
      .catch(() => setLink(null))
      .finally(() => setLoading(false));
  }, [open]);

  const rotateLink = async () => {
    setSaving(true);
    try {
      const response = await api.post(
        '/admin/question-answer-invites',
        {},
        { hideLoading: true },
      );
      setLink(response.data);
      message.success(link ? '已生成新链接，旧链接已失效' : '邀请答题链接已生成');
    } catch {
      // 全局请求拦截器已经展示错误信息。
    } finally {
      setSaving(false);
    }
  };

  const confirmRotate = () => {
    if (!link) {
      rotateLink();
      return;
    }
    modal.confirm({
      title: '重新随机一道题？',
      content: '系统会重新随机题目，旧链接和旧海报中的二维码会立即失效。',
      okText: '生成新链接',
      cancelText: '取消',
      onOk: rotateLink,
    });
  };

  const revokeLink = () => {
    modal.confirm({
      title: '停用邀请答题链接？',
      content: '停用后，当前链接和海报二维码都无法再打开题目。',
      okText: '确认停用',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await api.delete(
          '/admin/question-answer-invites',
          { hideLoading: true },
        );
        setLink(null);
        setPosterOpen(false);
        message.success('邀请答题链接已停用');
      },
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `邀请回答题目 #${link.question_id}`,
          text: link.question,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await copyText(inviteUrl);
    message.success('链接已复制');
  };

  const tagMeta = link ? getQuestionTagMeta(link.tag) : null;
  const selectedQuestion = link ? {
    id: link.question_id,
    question: link.question,
    tag: link.tag,
  } : null;

  return (
    <>
      <Modal
        open={open}
        title={<span><QrcodeOutlined /> 邀请答题</span>}
        onCancel={onClose}
        footer={null}
        width={660}
        centered
      >
        <div className="question-invite-manager">
          {link && (
            <div className="question-invite-manager__question">
              <div>
                <strong>随机题目 #{link.question_id}</strong>
                <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>
              </div>
              <p>{link.question}</p>
            </div>
          )}

          <div className="question-invite-manager__notice">
            系统会从你有权管理的题库中随机抽取一道题，并生成不可猜测的随机链接。访问者主动点击后才会获取答案。
          </div>

          {loading ? (
            <div className="question-invite-manager__empty">正在读取链接…</div>
          ) : !link ? (
            <div className="question-invite-manager__empty">
              <QrcodeOutlined />
              <strong>还没有启用随机邀请答题</strong>
              <span>生成后可以分享链接，也可以制作带二维码的题目海报。</span>
              <button type="button" onClick={confirmRotate} disabled={saving}>
                {saving ? '随机抽题中…' : '随机一题并生成链接'}
              </button>
            </div>
          ) : (
            <>
              <label className="question-invite-manager__url">
                <span>专属答题地址</span>
                <div>
                  <input value={inviteUrl} readOnly />
                  <button
                    type="button"
                    onClick={async () => {
                      await copyText(inviteUrl);
                      message.success('链接已复制');
                    }}
                    title="复制链接"
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </label>

              <div className="question-invite-manager__stats">
                <div><span>答案查看次数</span><strong>{link.reveal_count}</strong></div>
                <div><span>最近查看答案</span><strong>{formatDateTime(link.last_revealed_at)}</strong></div>
              </div>

              <div className="question-invite-manager__actions">
                <button type="button" className="is-primary" onClick={shareLink}>
                  <ShareAltOutlined /> 分享链接
                </button>
                <button type="button" className="is-poster" onClick={() => setPosterOpen(true)}>
                  <FileImageOutlined /> 生成海报
                </button>
                <button
                  type="button"
                  onClick={() => window.open(inviteUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExportOutlined /> 打开页面
                </button>
                <button type="button" onClick={confirmRotate} disabled={saving}>
                  <ReloadOutlined /> 重新生成
                </button>
                <button type="button" className="is-danger" onClick={revokeLink}>
                  <DeleteOutlined /> 停用链接
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <QuestionAnswerInvitePosterModal
        open={posterOpen}
        onClose={() => setPosterOpen(false)}
        question={selectedQuestion}
        inviteUrl={inviteUrl}
      />
    </>
  );
}
