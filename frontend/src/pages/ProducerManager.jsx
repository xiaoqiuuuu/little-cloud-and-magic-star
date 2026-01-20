import { useState, useEffect } from 'react';
import { App } from 'antd';
import api from '../api';

function ProducerManager() {
  const { message, modal } = App.useApp();
  
  const [producers, setProducers] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProducer, setEditingProducer] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    profile_url: '',
  });

  useEffect(() => {
    fetchProducers();
  }, [currentPage, pageSize]);

  const fetchProducers = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, page_size: pageSize };
      const response = await api.get('/admin/producers', { params });
      setProducers(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('获取制作人失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (producer = null) => {
    if (producer) {
      setEditingProducer(producer);
      setFormData({
        name: producer.name,
        profile_url: producer.profile_url || '',
      });
    } else {
      setEditingProducer(null);
      setFormData({
        name: '',
        profile_url: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducer(null);
    setFormData({
      name: '',
      profile_url: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      profile_url: formData.profile_url || null,
    };

    try {
      if (editingProducer) {
        await api.put(`/admin/producers/${editingProducer.id}`, data);
        message.success('更新成功!');
      } else {
        await api.post('/admin/producers', data);
        message.success('创建成功!');
      }
      handleCloseModal();
      fetchProducers();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败，请稍后重试');
    }
  };

  const handleDelete = async (id) => {
    modal.confirm({
      title: '确定要删除这个制作人吗?',
      onOk: async () => {
        try {
          await api.delete(`/admin/producers/${id}`);
          message.success('删除成功!');
          fetchProducers();
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请稍后重试');
        }
      }
    });
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">制作人管理 (共 {total} 人)</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
        >
          + 新建制作人
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {producers.map((producer) => (
          <div key={producer.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{producer.name}</h3>
              {producer.profile_url ? (
                <a href={producer.profile_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block max-w-[200px]">
                  {producer.profile_url}
                </a>
              ) : (
                <span className="text-sm text-gray-400">无主页链接</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(producer)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(producer.id)}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {producers.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            暂无制作人，请添加
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {producers.length > 0 && (
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
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
            <span className="ml-2">
              共 {total} 条，第 {currentPage} / {Math.ceil(total / pageSize) || 1} 页
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / pageSize), prev + 1))}
              disabled={currentPage === Math.ceil(total / pageSize)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 编辑/创建模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingProducer ? '编辑制作人' : '新建制作人'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 *
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
                    个人主页链接
                  </label>
                  <input
                    type="url"
                    value={formData.profile_url}
                    onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    {editingProducer ? '更新' : '创建'}
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

export default ProducerManager;
