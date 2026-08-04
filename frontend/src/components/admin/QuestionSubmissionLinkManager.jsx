import { useEffect, useState } from 'react';
import {
  CopyOutlined,
  DeleteOutlined,
  ExportOutlined,
  LinkOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { App, Modal } from 'antd';

import api from '../../api';
import './QuestionSubmissionLinkManager.css';


function formatDateTime(value) {
  if (!value) return '暂无提交';
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


export default function QuestionSubmissionLinkManager({ open, onClose }) {
  const { message, modal } = App.useApp();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const submissionUrl = link
    ? `${window.location.origin}/submit-question#${link.token}`
    : '';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/admin/question-submission-link', { hideLoading: true })
      .then((response) => setLink(response.data))
      .catch(() => setLink(null))
      .finally(() => setLoading(false));
  }, [open]);

  const rotateLink = async () => {
    setSaving(true);
    try {
      const response = await api.post(
        '/admin/question-submission-link',
        {},
        { hideLoading: true },
      );
      setLink(response.data);
      message.success(link ? '已生成新链接，旧链接已失效' : '出题链接已生成');
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
      title: '重新生成出题链接？',
      content: '旧链接会立即失效，已经打开旧问卷但尚未提交的人也无法继续提交。',
      okText: '生成新链接',
      cancelText: '取消',
      onOk: rotateLink,
    });
  };

  const revokeLink = () => {
    modal.confirm({
      title: '停用出题链接？',
      content: '停用后无法再通过当前链接提交题目，以后仍可重新生成。',
      okText: '确认停用',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await api.delete('/admin/question-submission-link', { hideLoading: true });
        setLink(null);
        message.success('出题链接已停用');
      },
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '题目征集问卷',
          text: '欢迎通过这个问卷提交题目，提交后会直接加入题库。',
          url: submissionUrl,
        });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await copyText(submissionUrl);
    message.success('链接已复制');
  };

  return (
    <Modal
      open={open}
      title={<span><LinkOutlined /> 出题问卷链接</span>}
      onCancel={onClose}
      footer={null}
      width={620}
      centered
    >
      <div className="question-link-manager">
        <div className="question-link-manager__notice">
          将链接分享给可信任的出题者。对方无需后台账号，提交后题目会直接进入题库并归属当前账号。
        </div>

        {loading ? (
          <div className="question-link-manager__empty">正在读取链接…</div>
        ) : !link ? (
          <div className="question-link-manager__empty">
            <LinkOutlined />
            <strong>还没有启用出题问卷</strong>
            <span>生成后即可复制或通过手机系统分享。</span>
            <button type="button" onClick={confirmRotate} disabled={saving}>
              {saving ? '生成中…' : '生成出题链接'}
            </button>
          </div>
        ) : (
          <>
            <label className="question-link-manager__url">
              <span>公开问卷地址</span>
              <div>
                <input value={submissionUrl} readOnly />
                <button
                  type="button"
                  onClick={async () => {
                    await copyText(submissionUrl);
                    message.success('链接已复制');
                  }}
                  title="复制链接"
                >
                  <CopyOutlined />
                </button>
              </div>
            </label>

            <div className="question-link-manager__stats">
              <div><span>已收集题目</span><strong>{link.submission_count}</strong></div>
              <div><span>最近提交</span><strong>{formatDateTime(link.last_submitted_at)}</strong></div>
            </div>

            <div className="question-link-manager__actions">
              <button type="button" className="is-primary" onClick={shareLink}>
                <ShareAltOutlined /> 分享链接
              </button>
              <button
                type="button"
                onClick={() => window.open(submissionUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExportOutlined /> 打开问卷
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
  );
}
