import { useState, useEffect } from 'react';
import { App } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import api from '../api';
import { hasRole } from '../utils/adminAccess';
import ImagePreview from '../components/ImagePreview';
import VideoPreview from '../components/VideoPreview';
import AudioPreview from '../components/AudioPreview';
import {
  Button,
  Card,
  CharacterButton,
  CharacterEmptyState,
  Input,
  Modal,
  Select,
  Tag,
} from '../ui';
import './AdminResourceManager.css';

function MaterialManager() {
  const { message, modal } = App.useApp();
  const { currentUser } = useOutletContext();
  const isSuperAdmin = hasRole(currentUser, 'super_admin');
  
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contributor_ids: [],
    resources: '',
  });
  const [contributors, setContributors] = useState([]);
  const [filterContributorId, setFilterContributorId] = useState(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // 默认12，是3和6的倍数

  useEffect(() => {
    fetchMaterials();
  }, [currentPage, pageSize, filterContributorId]);

  useEffect(() => {
    fetchContributors();
  }, []);

  const fetchContributors = async () => {
    try {
      const response = await api.get('/admin/users/contributors', {
        params: { scope: 'materials' },
      });
      setContributors(response.data);
    } catch (error) {
      console.error('获取贡献账号失败:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, page_size: pageSize };
      if (filterContributorId) params.contributor_id = filterContributorId;
      const response = await api.get('/admin/materials', { params });
      setMaterials(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('获取物料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (material = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        description: material.description,
        contributor_ids: material.contributors?.map((item) => item.id) || [],
        resources: material.resources.join('\n'),
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        name: '',
        description: '',
        contributor_ids: currentUser?.id ? [currentUser.id] : [],
        resources: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingMaterial(null);
    setFormData({
      name: '',
      description: '',
      contributor_ids: [],
      resources: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      description: formData.description,
      contributor_ids: formData.contributor_ids,
      resources: formData.resources
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url),
    };

    try {
      setSubmitting(true);
      if (editingMaterial) {
        await api.put(`/admin/materials/${editingMaterial.id}`, data);
        message.success('更新成功!');
      } else {
        await api.post('/admin/materials', data);
        message.success('创建成功!');
      }
      setShowModal(false);
      setEditingMaterial(null);
      setFormData({ name: '', description: '', contributor_ids: [], resources: '' });
      fetchMaterials();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    modal.confirm({
      title: '确定要删除这个物料吗?',
      onOk: async () => {
        try {
          await api.delete(`/admin/materials/${id}`);
          message.success('删除成功!');
          fetchMaterials();
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请稍后重试');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / pageSize);
  
  return (
    <div className="admin-resource-page">
      <div className="admin-resource-page__header">
        <div>
          <h2>物料列表 (共 {total} 条)</h2>
          {loading && <span className="admin-resource-page__loading-copy">加载中...</span>}
        </div>
        <CharacterButton onClick={() => handleOpenModal()}>
          新建物料
        </CharacterButton>
      </div>

      {isSuperAdmin && (
        <Card variant="outlined" padding="small" className="admin-resource-filter-card">
          <Select
            label="按贡献账号筛选"
            value={filterContributorId || ''}
            onChange={(event) => {
              setFilterContributorId(event.target.value ? Number(event.target.value) : null);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: '全部账号' },
              ...contributors.map((contributor) => ({
                value: contributor.id,
                label: `${contributor.display_name}（${contributor.username}）${contributor.is_active ? '' : '（已停用）'}`,
              })),
            ]}
          />
        </Card>
      )}

      <div className="admin-resource-grid">
        {materials.map((material) => {
          const coverImage = material.resources?.find(url => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url));
          
          return (
            <Card key={material.id} variant="elevated" padding="none" className="admin-material-card">
              {coverImage && (
                <div className="admin-material-card__cover">
                  <img src={coverImage} alt={material.name} />
                </div>
              )}
              {!coverImage && (
                <div className="admin-material-card__cover admin-material-card__cover--empty" aria-hidden="true">
                  <span>☁</span>
                </div>
              )}
              <div className="admin-material-card__content">
                <div className="admin-material-card__heading">
                  <h3>{material.name}</h3>
                  <Tag>#{material.id}</Tag>
                </div>
                <p className="admin-material-card__description">{material.description || '暂无介绍'}</p>
                <p className="admin-material-card__creator">署名：{Array.isArray(material.creator) ? material.creator.join(', ') : (material.creator || '未知')}</p>
                
                <div className="admin-material-card__resource-count">
                  {material.resources && material.resources.length > 0 ? `${material.resources.length} 个资源` : '无资源'}
                </div>

                <div className="admin-material-card__actions">
                  <Button block size="small" variant="soft" prefix={<EditOutlined />} onClick={() => handleOpenModal(material)}>
                    编辑
                  </Button>
                  <Button block size="small" variant="ghost" prefix={<DeleteOutlined />} className="admin-danger-ghost" onClick={() => handleDelete(material.id)}>
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && materials.length === 0 && (
        <CharacterEmptyState
          title="暂无物料，请添加"
          action={<CharacterButton size="small" onClick={() => handleOpenModal()}>新建物料</CharacterButton>}
        />
      )}

      {/* 分页控件 */}
      {materials.length > 0 && (
        <Card variant="outlined" padding="small" className="admin-pagination-card">
          <div className="admin-pagination-card__summary">
            <span>每页显示</span>
            <Select
              size="small"
              block={false}
              value={pageSize}
              aria-label="每页显示数量"
              className="admin-pagination-card__select"
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: 6, label: '6 条' },
                { value: 12, label: '12 条' },
                { value: 18, label: '18 条' },
                { value: 24, label: '24 条' },
                { value: 30, label: '30 条' },
                { value: 60, label: '60 条' },
              ]}
            />
            <span>
              共 {total} 条，第 {currentPage} / {totalPages || 1} 页
            </span>
          </div>

          <div className="admin-pagination-card__actions">
            <Button size="small" variant="secondary" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
              首页
            </Button>
            <Button size="small" variant="secondary" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              上一页
            </Button>
            
            <div className="admin-pagination-card__pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    size="small"
                    variant={currentPage === pageNum ? 'primary' : 'secondary'}
                    onClick={() => setCurrentPage(pageNum)}
                    className="admin-pagination-card__page"
                    aria-label={`第 ${pageNum} 页`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button size="small" variant="secondary" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
              下一页
            </Button>
            <Button size="small" variant="secondary" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
              末页
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={handleCloseModal}
        title={editingMaterial ? '编辑物料' : '新建物料'}
        width="large"
        closeOnOverlay={!submitting}
        closeOnEscape={!submitting}
        showClose={!submitting}
        footer={(
          <>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>取消</Button>
            <Button type="submit" form="material-form" loading={submitting}>
              {editingMaterial ? '更新' : '创建'}
            </Button>
          </>
        )}
      >
        <form id="material-form" onSubmit={handleSubmit} className="admin-resource-form admin-resource-form--material">
                <Input
                  label="名称 *"
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />

                <div>
                  <label className="admin-resource-form__label" htmlFor="material-description">
                    介绍
                  </label>
                  <textarea
                    id="material-description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="admin-resource-form__textarea"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="admin-resource-form__label" htmlFor="material-contributors">
                    贡献账号（可多选）
                  </label>
                  <div className="space-y-2">
                    <select
                      id="material-contributors"
                      multiple
                      value={formData.contributor_ids.map(String)}
                      onChange={(e) => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          (option) => Number(option.value),
                        );
                        setFormData({ ...formData, contributor_ids: selected });
                      }}
                      disabled={!isSuperAdmin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="admin-resource-form__tags">
                        {formData.contributor_ids.map((contributorId) => {
                          const contributor = contributors.find((item) => item.id === contributorId);
                          return contributor ? (
                            <Tag
                              key={contributorId}
                              tone="primary"
                              closable={isSuperAdmin}
                              onClose={() => setFormData({
                                ...formData,
                                contributor_ids: formData.contributor_ids.filter((id) => id !== contributorId),
                              })}
                            >
                              {contributor.display_name}（{contributor.username}）
                            </Tag>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isSuperAdmin
                      ? '按住 Ctrl/Cmd 可选择多个账号；新物料默认绑定当前账号。'
                      : '题目管理员新建物料时默认绑定自己。'}
                  </p>
                </div>

                <div>
                  <label className="admin-resource-form__label">
                    上传资源（图片/视频/音频，支持拖拽/多选，最大10M）
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

        </form>
      </Modal>
    </div>
  );
}

export default MaterialManager;
