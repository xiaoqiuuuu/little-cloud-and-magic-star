import { useRef, useState } from 'react';
import {
  DeleteOutlined,
  LinkOutlined,
  LoadingOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import ImagePreview from '../ImagePreview';
import VideoPreview from '../VideoPreview';
import AudioPreview from '../AudioPreview';
import {
  getResourceType,
  isSafeResourceUrl,
  parseResourceUrls,
  removeResourceUrl,
} from './questionForm';
import './QuestionModal.css';


const CUSTOM_TAG_VALUE = '__custom__';


function ResourcePreviewCard({ url, index, onRemove }) {
  const resourceType = isSafeResourceUrl(url) ? getResourceType(url) : 'invalid';
  const shortUrl = url.replace(/^https?:\/\//, '').slice(0, 48);
  let preview;

  if (resourceType === 'image') {
    preview = (
      <ImagePreview
        src={url}
        alt={`图片资源 ${index + 1}`}
        className="question-resource-card__media"
      />
    );
  } else if (resourceType === 'video') {
    preview = <VideoPreview src={url} className="question-resource-card__media" />;
  } else if (resourceType === 'audio') {
    preview = <AudioPreview src={url} className="question-resource-card__audio" />;
  } else if (resourceType === 'link') {
    preview = (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="question-resource-card__link"
      >
        <LinkOutlined />
        <span>打开资源</span>
      </a>
    );
  } else {
    preview = <span className="question-resource-card__invalid">链接格式无效</span>;
  }

  return (
    <div className="question-resource-card">
      <div className="question-resource-card__preview">{preview}</div>
      <span className="question-resource-card__name" title={url}>{shortUrl}</span>
      <button
        type="button"
        className="question-resource-card__remove"
        onClick={() => onRemove(index)}
        aria-label={`删除资源 ${index + 1}`}
        title="删除资源"
      >
        <DeleteOutlined />
      </button>
    </div>
  );
}


export default function QuestionFormFields({
  formData,
  onFieldChange,
  tagOptions = [],
  contributors = [],
  showContributors = false,
  isUploading = false,
  onUploadFiles = () => {},
  idPrefix = 'question-editor',
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const resourceUrls = parseResourceUrls(formData.resources);
  const knownTagValues = new Set(tagOptions.map((option) => option.value));
  const usesCustomTag = !knownTagValues.has(formData.tag);

  const toggleContributor = (contributorId) => {
    const selected = formData.contributor_ids.includes(contributorId);
    onFieldChange(
      'contributor_ids',
      selected
        ? formData.contributor_ids.filter((id) => id !== contributorId)
        : [...formData.contributor_ids, contributorId],
    );
  };

  return (
    <>
      <div className="question-form-field">
        <div className="question-form-label-row">
          <label htmlFor={`${idPrefix}-content`}>
            题目内容 <span aria-hidden="true">*</span>
          </label>
          <span>{formData.question.length} 字</span>
        </div>
        <textarea
          id={`${idPrefix}-content`}
          required
          value={formData.question}
          onChange={(event) => onFieldChange('question', event.target.value)}
          rows="4"
          placeholder="输入要向答题者展示的问题"
        />
      </div>

      <div className="question-form-field">
        <div className="question-form-label-row">
          <label htmlFor={`${idPrefix}-answer`}>
            答案 <span aria-hidden="true">*</span>
          </label>
          <span>{formData.answer.length} 字</span>
        </div>
        <textarea
          id={`${idPrefix}-answer`}
          required
          value={formData.answer}
          onChange={(event) => onFieldChange('answer', event.target.value)}
          rows="2"
          placeholder="输入正确答案"
        />
      </div>

      <div className="question-form-field">
        <label htmlFor={`${idPrefix}-tag`}>题目类型</label>
        <select
          id={`${idPrefix}-tag`}
          value={usesCustomTag ? CUSTOM_TAG_VALUE : formData.tag}
          onChange={(event) => onFieldChange(
            'tag',
            event.target.value === CUSTOM_TAG_VALUE ? '' : event.target.value,
          )}
        >
          {tagOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
          <option value={CUSTOM_TAG_VALUE}>自定义类型…</option>
        </select>
        {usesCustomTag && (
          <input
            type="text"
            value={formData.tag}
            onChange={(event) => onFieldChange('tag', event.target.value)}
            placeholder="输入自定义类型"
            maxLength="50"
            aria-label="自定义题目类型"
          />
        )}
      </div>

      {showContributors && (
        <fieldset className="question-form-field">
          <legend>贡献账号（可多选）</legend>
          <div className="question-contributor-list">
            {contributors.map((contributor) => (
              <label
                key={contributor.id}
                className={`question-contributor-option ${
                  formData.contributor_ids.includes(contributor.id) ? 'is-selected' : ''
                } ${!contributor.is_active ? 'is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.contributor_ids.includes(contributor.id)}
                  disabled={!contributor.is_active}
                  onChange={() => toggleContributor(contributor.id)}
                />
                <span>
                  <strong>{contributor.display_name}</strong>
                  <small>@{contributor.username}{!contributor.is_active ? ' · 已停用' : ''}</small>
                </span>
              </label>
            ))}
          </div>
          <p className="question-form-help">直接点选账号，无需按住 Ctrl 或 Command。</p>
        </fieldset>
      )}

      <section
        className="question-form-field question-resource-section"
        aria-labelledby={`${idPrefix}-resources-label`}
      >
        <div className="question-form-label-row">
          <h3 id={`${idPrefix}-resources-label`}>图片、视频或音频</h3>
          <span>{resourceUrls.length} 个资源</span>
        </div>

        <button
          type="button"
          className={`question-upload-zone ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            onUploadFiles(event.dataTransfer.files);
          }}
          disabled={isUploading}
        >
          {isUploading ? <LoadingOutlined spin /> : <UploadOutlined />}
          <span>
            <strong>{isUploading ? '正在上传资源…' : '从手机或电脑选择文件'}</strong>
            <small>支持相册、拍照、视频和音频，单个文件不超过 10MB</small>
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="question-file-input"
          onChange={(event) => {
            onUploadFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <details className="question-resource-links">
          <summary><LinkOutlined /> 手动粘贴资源链接</summary>
          <textarea
            value={formData.resources}
            onChange={(event) => onFieldChange('resources', event.target.value)}
            rows="3"
            placeholder="每行一个链接，例如 https://example.com/image.jpg"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        </details>

        {resourceUrls.length > 0 ? (
          <div className="question-resource-grid">
            {resourceUrls.map((url, index) => (
              <ResourcePreviewCard
                key={`${url}-${index}`}
                url={url}
                index={index}
                onRemove={(resourceIndex) => onFieldChange(
                  'resources',
                  removeResourceUrl(formData.resources, resourceIndex),
                )}
              />
            ))}
          </div>
        ) : (
          <p className="question-resource-empty">资源为可选项，可以稍后再添加。</p>
        )}
      </section>
    </>
  );
}
