import React, { useState, useEffect } from 'react';
import { App } from 'antd';
import ImagePreview from '../ImagePreview';
import VideoPreview from '../VideoPreview';
import AudioPreview from '../AudioPreview';
import api from '../../api';
import { DEFAULT_QUESTION_TAG } from '../../constants/questionTags';

const QuestionModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingQuestion, 
  contributors,
  currentUser,
  isSuperAdmin,
  tagOptions = [],
}) => {
  const { message } = App.useApp();
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    resources: '',
    tag: DEFAULT_QUESTION_TAG,
    contributor_ids: [],
  });

  useEffect(() => {
    if (isOpen) {
      if (editingQuestion) {
        setFormData({
          question: editingQuestion.question,
          answer: editingQuestion.answer,
          resources: editingQuestion.resources.join('\n'),
          tag: editingQuestion.tag,
          contributor_ids: editingQuestion.contributors?.map((item) => item.id) || [],
        });
      } else {
        setFormData({
          question: '',
          answer: '',
          resources: '',
          tag: DEFAULT_QUESTION_TAG,
          contributor_ids: currentUser?.id ? [currentUser.id] : [],
        });
      }
    }
  }, [isOpen, editingQuestion, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      question: formData.question,
      answer: formData.answer,
      resources: formData.resources
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url),
      tag: formData.tag,
      contributor_ids: formData.contributor_ids || [],
    };

    try {
      if (editingQuestion) {
        await api.put(`/admin/questions/${editingQuestion.id}`, data);
        message.success('更新成功!');
      } else {
        await api.post('/admin/questions', data);
        message.success('创建成功!');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请稍后重试');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
      <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-4">
        <div className="mt-3">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingQuestion ? '编辑题目' : '新建题目'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                题目内容 *
              </label>
              <textarea
                required
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                答案 *
              </label>
              <input
                type="text"
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                题目类型
              </label>
              <input
                required
                list="question-tag-options"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="选择或输入自定义标签"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <datalist id="question-tag-options">
                {tagOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">
                可使用内置标签，也可以直接输入新的标签名称，最多 50 个字符。
              </p>
            </div>

            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  贡献账号（可多选）
                </label>
                <div className="space-y-2">
                  <select
                    multiple
                    value={formData.contributor_ids.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => Number(option.value),
                      );
                      setFormData({ ...formData, contributor_ids: selected });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    size="5"
                  >
                    {contributors.map((contributor) => (
                      <option
                        key={contributor.id}
                        value={contributor.id}
                        disabled={!contributor.is_active}
                      >
                        {contributor.display_name}（{contributor.username}）
                        {!contributor.is_active ? '（已停用）' : ''}
                      </option>
                    ))}
                  </select>
                  {formData.contributor_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.contributor_ids.map((contributorId) => {
                        const contributor = contributors.find((item) => item.id === contributorId);
                        return contributor ? (
                          <span key={contributorId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {contributor.display_name}（{contributor.username}）
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                contributor_ids: formData.contributor_ids.filter((id) => id !== contributorId),
                              })}
                              className="text-blue-600 hover:text-blue-800 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  按住 Ctrl/Cmd 可选择多个账号；新题默认绑定当前账号。
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                资源链接（每行一个，支持图片/视频/音频）
              </label>
              {/* 拖拽上传区域 */}
              <div
                className="w-full min-h-[60px] border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center p-2 mb-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async e => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  if (!files.length) return;
                  let urls = [];
                  for (const file of files) {
                    if (file.size > 10 * 1024 * 1024) {
                      message.warning(`${file.name} 超过10M，已跳过`);
                      continue;
                    }
                    const form = new FormData();
                    form.append('file', file);
                    try {
                      const res = await api.post('/upload', form, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      urls.push(res.data.url);
                    } catch (err) {
                      message.error(`${file.name} 上传失败`);
                    }
                  }
                  setFormData((prev) => ({
                    ...prev,
                    resources: prev.resources
                      ? prev.resources + '\n' + urls.join('\n')
                      : urls.join('\n'),
                  }));
                }}
                title="拖拽文件到此上传"
              >
                <span className="text-gray-400 text-xs">拖拽文件到此上传，或点击下方按钮选择</span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
                onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  if (!files.length) return;
                  let urls = [];
                  for (const file of files) {
                    if (file.size > 10 * 1024 * 1024) {
                      message.warning(`${file.name} 超过10M，已跳过`);
                      continue;
                    }
                    const form = new FormData();
                    form.append('file', file);
                    try {
                      const res = await api.post('/upload', form, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      urls.push(res.data.url);
                    } catch (err) {
                      message.error(`${file.name} 上传失败`);
                    }
                  }
                  setFormData((prev) => ({
                    ...prev,
                    resources: prev.resources
                      ? prev.resources + '\n' + urls.join('\n')
                      : urls.join('\n'),
                  }));
                }}
              />
              <textarea
                value={formData.resources}
                onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base font-mono"
                rows="4"
                placeholder="https://example.com/image.jpg"
              />
              {/* 资源预览区 */}
              <div className="mt-2 flex flex-wrap gap-3">
                {formData.resources
                  ? formData.resources.split('\n').filter(Boolean).map((url, idx) => {
                      const ext = url.split('.').pop().toLowerCase();
                      if (/(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext)) {
                        return (
                          <div key={idx} className="relative w-28 h-28 flex flex-col items-center justify-center border rounded bg-white shadow-sm p-1">
                            <ImagePreview src={url} alt="图片资源" className="object-contain w-full h-full" />
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="删除"
                              onClick={() => {
                                const arr = formData.resources.split('\n').filter(Boolean);
                                arr.splice(idx, 1);
                                setFormData(prev => ({ ...prev, resources: arr.join('\n') }));
                              }}
                            >×</button>
                          </div>
                        );
                      } else if (/(mp4|webm|ogg|mov|avi|mkv)$/.test(ext)) {
                        return (
                          <div key={idx} className="relative w-28 h-28 flex flex-col items-center justify-center border rounded bg-white shadow-sm p-1">
                            <VideoPreview src={url} className="object-contain w-full h-full" />
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="删除"
                              onClick={() => {
                                const arr = formData.resources.split('\n').filter(Boolean);
                                arr.splice(idx, 1);
                                setFormData(prev => ({ ...prev, resources: arr.join('\n') }));
                              }}
                            >×</button>
                          </div>
                        );
                      } else if (/(mp3|wav|aac|flac|m4a|ogg)$/.test(ext)) {
                        return (
                          <div key={idx} className="relative w-28 h-28 flex flex-col items-center justify-center border rounded bg-white shadow-sm p-1">
                            <AudioPreview src={url} className="w-full" />
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="删除"
                              onClick={() => {
                                const arr = formData.resources.split('\n').filter(Boolean);
                                arr.splice(idx, 1);
                                setFormData(prev => ({ ...prev, resources: arr.join('\n') }));
                              }}
                            >×</button>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="relative w-28 h-28 flex flex-col items-center justify-center border rounded bg-white shadow-sm p-1">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">资源链接</a>
                            <button
                              type="button"
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                              title="删除"
                              onClick={() => {
                                const arr = formData.resources.split('\n').filter(Boolean);
                                arr.splice(idx, 1);
                                setFormData(prev => ({ ...prev, resources: arr.join('\n') }));
                              }}
                            >×</button>
                          </div>
                        );
                      }
                    })
                  : <span className="text-xs text-gray-400">暂无资源</span>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingQuestion ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
