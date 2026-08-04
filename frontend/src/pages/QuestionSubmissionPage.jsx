import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircleFilled,
  LoadingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import { useLocation } from 'react-router-dom';

import api from '../api';
import QuestionFormFields from '../components/admin/QuestionFormFields';
import {
  MAX_RESOURCE_FILE_SIZE,
  appendResourceUrls,
  clearQuestionDraft,
  createEmptyQuestionForm,
  loadQuestionDraft,
  parseResourceUrls,
  saveQuestionDraft,
} from '../components/admin/questionForm';
import { mergeQuestionTagOptions } from '../constants/questionTags';
import './QuestionSubmissionPage.css';


const PUBLIC_REQUEST_CONFIG = {
  hideLoading: true,
  hideErrorMessage: true,
  skipAuthRedirect: true,
  skipAuthRefresh: true,
};


function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}


export default function QuestionSubmissionPage() {
  const location = useLocation();
  const token = location.hash.replace(/^#/, '');
  const { message } = App.useApp();
  const storage = getBrowserStorage();
  const draftKey = `public-question-draft:${token}`;
  const [formInfo, setFormInfo] = useState(null);
  const [formData, setFormData] = useState(createEmptyQuestionForm);
  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuestionId, setSubmittedQuestionId] = useState(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const tagOptions = mergeQuestionTagOptions(formInfo?.tag_options || []);
  const isBusy = isUploading || isSubmitting;
  const requestConfig = {
    ...PUBLIC_REQUEST_CONFIG,
    headers: { 'X-Question-Submission-Token': token },
  };

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInvalidLink(false);
    if (!token) {
      setInvalidLink(true);
      setLoading(false);
      return undefined;
    }
    api.get('/question-submissions', requestConfig)
      .then((response) => {
        if (cancelled) return;
        setFormInfo(response.data);
        const draft = loadQuestionDraft(storage, draftKey);
        setFormData(draft || createEmptyQuestionForm());
        setDraftRestored(Boolean(draft));
      })
      .catch(() => {
        if (!cancelled) setInvalidLink(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey, storage, token]);

  useEffect(() => {
    if (!formInfo || submittedQuestionId) return undefined;
    const saveTimer = window.setTimeout(() => {
      saveQuestionDraft(storage, draftKey, formData);
    }, 250);
    return () => window.clearTimeout(saveTimer);
  }, [draftKey, formData, formInfo, storage, submittedQuestionId]);

  useEffect(() => {
    if (!formInfo || submittedQuestionId) return undefined;
    const saveBeforeLeaving = () => {
      saveQuestionDraft(storage, draftKey, formDataRef.current);
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => window.removeEventListener('pagehide', saveBeforeLeaving);
  }, [draftKey, formInfo, storage, submittedQuestionId]);

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
          const response = await api.post(
            '/question-submissions/upload',
            uploadData,
            {
              ...requestConfig,
              headers: {
                ...requestConfig.headers,
                'Content-Type': 'multipart/form-data',
              },
            },
          );
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
        message.error(`${failedFiles.join('、')} 上传失败，请检查链接后重试`);
      }
    } finally {
      setIsUploading(false);
    }
  }, [message, token]);

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

    setIsSubmitting(true);
    try {
      const response = await api.post(
        '/question-submissions',
        {
          question,
          answer,
          tag,
          resources: parseResourceUrls(formData.resources),
        },
        requestConfig,
      );
      clearQuestionDraft(storage, draftKey);
      setSubmittedQuestionId(response.data.question_id);
      setDraftRestored(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (error.response?.status === 404) setInvalidLink(true);
      message.error(typeof detail === 'string' ? detail : '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnotherQuestion = () => {
    setFormData(createEmptyQuestionForm());
    setSubmittedQuestionId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <main className="question-submission-page question-submission-page--centered">
        <div className="question-submission-status"><LoadingOutlined spin /> 正在打开出题问卷…</div>
      </main>
    );
  }

  if (invalidLink) {
    return (
      <main className="question-submission-page question-submission-page--centered">
        <section className="question-submission-state-card">
          <SafetyCertificateOutlined />
          <h1>出题链接已失效</h1>
          <p>链接可能已被重新生成、撤销，或所属账号已停用。请联系链接提供者获取新地址。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="question-submission-page">
      <section className="question-submission-shell">
        <header className="question-submission-header">
          <p>题目征集问卷</p>
          <h1>{formInfo.owner_name} 邀请你出题</h1>
          <span>提交后题目会直接进入题库，请确认题目和答案准确。</span>
        </header>

        {submittedQuestionId ? (
          <div className="question-submission-success" role="status">
            <CheckCircleFilled />
            <h2>题目已加入题库</h2>
            <p>新题号为 <strong>#{submittedQuestionId}</strong>，感谢你的贡献。</p>
            <button type="button" onClick={startAnotherQuestion}>继续出一道题</button>
          </div>
        ) : (
          <form className="question-submission-form" onSubmit={handleSubmit}>
            <div className="question-submission-body">
              {draftRestored && (
                <div className="question-draft-notice" role="status">
                  <div>
                    <strong>已恢复未提交的内容</strong>
                    <span>可以接着上次继续填写。</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearQuestionDraft(storage, draftKey);
                      setFormData(createEmptyQuestionForm());
                      setDraftRestored(false);
                    }}
                  >
                    重新开始
                  </button>
                </div>
              )}
              <QuestionFormFields
                formData={formData}
                onFieldChange={updateField}
                tagOptions={tagOptions}
                isUploading={isUploading}
                onUploadFiles={uploadFiles}
                idPrefix="public-question"
              />
            </div>
            <footer className="question-submission-footer">
              <span><SafetyCertificateOutlined /> 仅持有此链接的人可以提交</span>
              <button type="submit" disabled={isBusy}>
                {isSubmitting && <LoadingOutlined spin />}
                {isSubmitting ? '正在加入题库…' : '提交并加入题库'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </main>
  );
}
