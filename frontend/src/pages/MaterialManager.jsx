import { useState, useEffect } from 'react';
import { App } from 'antd';
import { useOutletContext } from 'react-router-dom';
import api from '../api';
import ImagePreview from '../components/ImagePreview';
import VideoPreview from '../components/VideoPreview';
import AudioPreview from '../components/AudioPreview';

function MaterialManager() {
  const { message, modal } = App.useApp();
  const { currentUser } = useOutletContext();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  
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
      const response = await api.get('/admin/users/contributors');
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
      if (editingMaterial) {
        await api.put(`/admin/materials/${editingMaterial.id}`, data);
        message.success('更新成功!');
      } else {
        await api.post('/admin/materials', data);
        message.success('创建成功!');
      }
      handleCloseModal();
      fetchMaterials();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请稍后重试');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">物料列表 (共 {total} 条)</h2>
          {loading && <span className="text-sm text-gray-500 animate-pulse">加载中...</span>}
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
        >
          + 新建物料
        </button>
      </div>

      {isSuperAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            按贡献账号筛选
          </label>
          <select
            value={filterContributorId || ''}
            onChange={(event) => {
              setFilterContributorId(event.target.value ? Number(event.target.value) : null);
              setCurrentPage(1);
            }}
            className="w-full sm:max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部账号</option>
            {contributors.map((contributor) => (
              <option key={contributor.id} value={contributor.id}>
                {contributor.display_name}（{contributor.username}）
                {!contributor.is_active ? '（已停用）' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material) => {
          const coverImage = material.resources?.find(url => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url));
          
          return (
            <div key={material.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col">
              {coverImage && (
                <div className="h-48 w-full bg-gray-100 relative border-b border-gray-100">
                  <img src={coverImage} alt={material.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{material.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded h-fit">#{material.id}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{material.description || '暂无介绍'}</p>
                <p className="text-xs text-gray-500 mb-3">署名: {Array.isArray(material.creator) ? material.creator.join(', ') : (material.creator || '未知')}</p>
                
                <div className="mb-3 text-gray-700 text-sm mt-auto">
                  {material.resources && material.resources.length > 0 ? `${material.resources.length} 个资源` : '无资源'}
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleOpenModal(material)}
                    className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {materials.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            暂无物料，请添加
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {materials.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={6}>6条</option>
              <option value={12}>12条</option>
              <option value={18}>18条</option>
              <option value={24}>24条</option>
              <option value={30}>30条</option>
              <option value={60}>60条</option>
            </select>
            <span className="ml-2">
              共 {total} 条，第 {currentPage} / {totalPages || 1} 页
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            <div className="hidden sm:flex gap-1">
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
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              末页
            </button>
          </div>
        </div>
      )}

      {/* 编辑/创建模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-4">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingMaterial ? '编辑物料' : '新建物料'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    介绍
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

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
                      <div className="flex flex-wrap gap-2">
                        {formData.contributor_ids.map((contributorId) => {
                          const contributor = contributors.find((item) => item.id === contributorId);
                          return contributor ? (
                            <span key={contributorId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {contributor.display_name}（{contributor.username}）
                              {isSuperAdmin && (
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
                              )}
                            </span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingMaterial ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialManager;
