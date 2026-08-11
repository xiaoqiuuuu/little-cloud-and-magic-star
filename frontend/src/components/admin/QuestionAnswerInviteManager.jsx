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
  const [questionIdDraft, setQuestionIdDraft] = useState('');
  const inviteUrl = link
    ? `${window.location.origin}/answer-invite#${link.token}`
    : '';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPosterOpen(false);
    setQuestionIdDraft('');
    api.get('/admin/question-answer-invites', { hideLoading: true })
      .then((response) => setLink(response.data))
      .catch(() => setLink(null))
      .finally(() => setLoading(false));
  }, [open]);

  const rotateLink = async (questionId = '') => {
    setSaving(true);
    try {
      const response = await api.post(
        '/admin/question-answer-invites',
        questionId ? { question_id: questionId } : {},
        { hideLoading: true },
      );
      setLink(response.data);
      setQuestionIdDraft('');
      message.success(
        questionId
          ? `已为题目 #${questionId} 生成链接`
          : link ? '已随机生成新链接，旧链接已失效' : '随机邀请答题链接已生成',
      );
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
      onOk: () => rotateLink(),
    });
  };

  const confirmSpecificQuestion = () => {
    const questionId = questionIdDraft.trim();
    if (!questionId) {
      message.warning('请输入要生成链接的题号');
      return;
    }
    if (!link) {
      rotateLink(questionId);
      return;
    }
    modal.confirm({
      title: `为题目 #${questionId} 生成新链接？`,
      content: '当前链接和海报二维码会立即失效，答题统计也会从零开始。',
      okText: '生成指定题目链接',
      cancelText: '取消',
      onOk: () => rotateLink(questionId),
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
                <strong>当前题目 #{link.question_id}</strong>
                <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>
              </div>
              <p>{link.question}</p>
            </div>
          )}

          {loading ? (
            <div className="question-invite-manager__empty">正在读取链接…</div>
          ) : !link ? (
            <div className="question-invite-manager__empty">
              <QrcodeOutlined />
              <strong>还没有答题链接</strong>
              <span>可以输入题号精准生成，也可以交给系统随机抽题。</span>
              <div className="question-invite-manager__generator is-empty">
                <label htmlFor="question-invite-id">指定题号</label>
                <div>
                  <input
                    id="question-invite-id"
                    value={questionIdDraft}
                    onChange={(event) => setQuestionIdDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') confirmSpecificQuestion();
                    }}
                    placeholder="例如：12"
                  />
                  <button type="button" onClick={confirmSpecificQuestion} disabled={saving}>
                    指定生成
                  </button>
                </div>
                <button type="button" className="is-random" onClick={confirmRotate} disabled={saving}>
                  {saving ? '正在生成…' : '随机一题并生成链接'}
                </button>
              </div>
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
                <div><span>答题人数</span><strong>{link.participant_count}</strong></div>
                <div><span>最近答题</span><strong>{formatDateTime(link.last_revealed_at)}</strong></div>
              </div>

              <div className="question-invite-manager__generator">
                <div>
                  <strong>指定题号重新生成</strong>
                  <span>只能选择你有权管理的题目</span>
                </div>
                <div>
                  <input
                    value={questionIdDraft}
                    onChange={(event) => setQuestionIdDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') confirmSpecificQuestion();
                    }}
                    aria-label="指定题号"
                    placeholder="输入题号，例如 12"
                  />
                  <button type="button" onClick={confirmSpecificQuestion} disabled={saving}>
                    指定生成
                  </button>
                </div>
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
                  <ReloadOutlined /> 随机换题
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
