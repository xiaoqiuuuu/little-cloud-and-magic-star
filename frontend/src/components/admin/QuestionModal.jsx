import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import api from '../../api';
import {
  MAX_RESOURCE_FILE_SIZE,
  appendResourceUrls,
  clearQuestionDraft,
  createEmptyQuestionForm,
  hasQuestionDraftContent,
  loadQuestionDraft,
  parseResourceUrls,
  saveQuestionDraft,
} from './questionForm';
import QuestionFormFields from './QuestionFormFields';
import './QuestionModal.css';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const QuestionModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingQuestion,
  contributors = [],
  canManageAllQuestions,
  tagOptions = [],
  draftKey = 'admin-question-draft',
}) => {
  const { message } = App.useApp();
  const dialogRef = useRef(null);
  const requestCloseRef = useRef(null);
  const [formData, setFormData] = useState(createEmptyQuestionForm);
  const [formReady, setFormReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const storage = getBrowserStorage();

  const isEditing = Boolean(editingQuestion);
  const isBusy = isSubmitting || isUploading;
  const hasDraft = !isEditing && hasQuestionDraftContent(formData);

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    if (!isOpen) {
      setFormReady(false);
      return;
    }

    setFormReady(false);
    setIsSubmitting(false);
    setIsUploading(false);

    if (editingQuestion) {
      setFormData({
        question: editingQuestion.question || '',
        answer: editingQuestion.answer || '',
        resources: Array.isArray(editingQuestion.resources)
          ? editingQuestion.resources.join('\n')
          : editingQuestion.resources || '',
        tag: editingQuestion.tag || '',
        contributor_ids: editingQuestion.contributors?.map((item) => item.id) || [],
      });
      setDraftRestored(false);
    } else {
      const savedDraft = loadQuestionDraft(storage, draftKey);
      setFormData(savedDraft || createEmptyQuestionForm());
      setDraftRestored(Boolean(savedDraft));
    }

    setFormReady(true);
  }, [draftKey, editingQuestion, isOpen, storage]);

  useEffect(() => {
    if (!isOpen || isEditing || !formReady) return;
    const saveTimer = window.setTimeout(() => {
      saveQuestionDraft(storage, draftKey, formData);
    }, 250);
    return () => window.clearTimeout(saveTimer);
  }, [draftKey, formData, formReady, isEditing, isOpen, storage]);

  const requestClose = useCallback(() => {
    if (isBusy) {
      message.info(isUploading ? '资源正在上传，请稍候' : '题目正在保存，请稍候');
      return;
    }
    if (!isEditing) saveQuestionDraft(storage, draftKey, formData);
    onClose();
  }, [draftKey, formData, isBusy, isEditing, isUploading, message, onClose, storage]);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !document.querySelector('.media-preview-overlay')) {
        requestCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleClearDraft = () => {
    clearQuestionDraft(storage, draftKey);
    setFormData(createEmptyQuestionForm());
    setDraftRestored(false);
  };

  const uploadFiles = useCallback(async (fileList) => {
    const selectedFiles = Array.from(fileList || []);
    if (!selectedFiles.length) return;

    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_RESOURCE_FILE_SIZE);
    const uploadableFiles = selectedFiles.filter((file) => file.size <= MAX_RESOURCE_FILE_SIZE);

    if (oversizedFiles.length) {
      message.warning(`${oversizedFiles.map((file) => file.name).join('、')} 超过 10MB，已跳过`);
    }
    if (!uploadableFiles.length) return;

    setIsUploading(true);
    try {
      const results = await Promise.all(uploadableFiles.map(async (file) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
          const response = await api.post('/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return { file, url: response.data.url };
        } catch (error) {
          return { file, error };
        }
      }));

      const uploadedUrls = results.map((result) => result.url).filter(Boolean);
      const failedFiles = results.filter((result) => result.error).map((result) => result.file.name);

      if (uploadedUrls.length) {
        setFormData((previous) => ({
          ...previous,
          resources: appendResourceUrls(previous.resources, uploadedUrls),
        }));
        message.success(`已添加 ${uploadedUrls.length} 个资源`);
      }
      if (failedFiles.length) {
        message.error(`${failedFiles.join('、')} 上传失败，请重试`);
      }
    } finally {
      setIsUploading(false);
    }
  }, [message]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;

    const question = formData.question.trim();
    const answer = formData.answer.trim();
    const tag = formData.tag.trim();

    if (!question || !answer) {
      message.warning('请填写题目内容和答案');
      return;
    }
    if (!tag) {
      message.warning('请选择或填写题目类型');
      return;
    }
    if (tag.length > 50) {
      message.warning('题目类型最多 50 个字符');
      return;
    }
    if (isEditing && canManageAllQuestions && formData.contributor_ids.length === 0) {
      message.warning('请至少选择一个贡献账号');
      return;
    }

    const data = {
      question,
      answer,
      resources: parseResourceUrls(formData.resources),
      tag,
    };
    if (isEditing) data.contributor_ids = formData.contributor_ids || [];

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/admin/questions/${editingQuestion.id}`, data);
        message.success('题目已更新');
      } else {
        await api.post('/admin/questions', data);
        clearQuestionDraft(storage, draftKey);
        message.success('题目已创建');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('操作失败:', error);
      const detail = error.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '操作失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="question-modal-overlay">
      <section
        ref={dialogRef}
        className="question-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-modal-title"
        tabIndex={-1}
      >
        <header className="question-modal-header">
          <div>
            <p className="question-modal-eyebrow">题目录入</p>
            <h2 id="question-modal-title">
              {isEditing ? `编辑题目 #${editingQuestion.id}` : '新建题目'}
            </h2>
            {!isEditing && <p className="question-modal-subtitle">未提交内容会自动保存在当前设备</p>}
          </div>
          <button
            type="button"
            className="question-modal-close"
            onClick={requestClose}
            disabled={isBusy}
            aria-label={hasDraft ? '暂存并关闭' : '关闭'}
          >
            <CloseOutlined />
          </button>
        </header>

        {formReady ? (
          <form id="question-editor-form" className="question-modal-form" onSubmit={handleSubmit}>
            <div className="question-modal-body">
              {draftRestored && (
                <div className="question-draft-notice" role="status">
                  <div>
                    <strong>已恢复未提交的草稿</strong>
                    <span>可以接着上次的内容继续出题。</span>
                  </div>
                  <button type="button" onClick={handleClearDraft}>重新开始</button>
                </div>
              )}

              <QuestionFormFields
                formData={formData}
                onFieldChange={updateField}
                tagOptions={tagOptions}
                contributors={contributors}
                showContributors={canManageAllQuestions && isEditing}
                isUploading={isUploading}
                onUploadFiles={uploadFiles}
              />
            </div>

            <footer className="question-modal-footer">
              <button
                type="button"
                className="question-modal-button question-modal-button--secondary"
                onClick={requestClose}
                disabled={isBusy}
              >
                {hasDraft ? '暂存退出' : '取消'}
              </button>
              <button
                type="submit"
                className="question-modal-button question-modal-button--primary"
                disabled={isBusy}
              >
                {isSubmitting && <LoadingOutlined spin />}
                {isSubmitting ? '保存中…' : isEditing ? '保存修改' : '创建题目'}
              </button>
            </footer>
          </form>
        ) : (
          <div className="question-modal-loading"><LoadingOutlined spin /> 正在准备表单…</div>
        )}
      </section>
    </div>
  );
};

export default QuestionModal;
