import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import api from '../api';

// Components
import StatsOverview from '../components/admin/StatsOverview';
import QuestionFilter from '../components/admin/QuestionFilter';
import SearchById from '../components/admin/SearchById';
import QuestionList from '../components/admin/QuestionList';
import QuestionModal from '../components/admin/QuestionModal';
import ExcelImportExport from '../components/admin/ExcelImportExport';

function AdminDashboard() {
  const { message, modal } = App.useApp();
  
  // 答题/调试模式
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('debugMode') === 'true');
  
  // Data State
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, concert: 0, vlog: 0, common: 0 });
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortDesc, setSortDesc] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const navigate = useNavigate();

  // Debug Mode Sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'debugMode') {
        setDebugMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleToggleMode = () => {
    const next = !debugMode;
    setDebugMode(next);
    localStorage.setItem('debugMode', next);
    window.dispatchEvent(new CustomEvent('debugModeChange', { detail: { debugMode: next } }));
  };

  // Initial Data Fetch
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchQuestions();
    fetchStats();
  }, [navigate, currentPage, pageSize, searchKeyword, filterTag, sortDesc]);

  // Fetch Producers
  useEffect(() => {
    const fetchProducers = async () => {
      try {
        const res = await api.get('/admin/producers', { params: { page_size: 1000 } });
        setProducers(res.data.items);
      } catch (error) {
        console.error('获取制作人失败:', error);
      }
    };
    fetchProducers();
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterTag]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
        sort_order: sortDesc ? 'desc' : 'asc'
      };
      if (searchKeyword) params.keyword = searchKeyword;
      if (filterTag !== 'all') params.tag = filterTag;

      const response = await api.get('/admin/questions', { params });
      setQuestions(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('获取题目失败:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (question = null) => {
    setEditingQuestion(question);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    modal.confirm({
      title: '确定要删除这道题目吗?',
      onOk: async () => {
        try {
          await api.delete(`/admin/questions/${id}`);
          message.success('删除成功!');
          fetchQuestions();
          fetchStats();
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败，请稍后重试');
        }
      }
    });
  };

  const handleResetStats = async (id) => {
    modal.confirm({
      title: '确定要将该题的"随机/隐藏"统计归零吗？',
      onOk: async () => {
        try {
          await api.post(`/admin/questions/${id}/reset_stats`);
          message.success('该题统计已归零');
          fetchQuestions();
        } catch (e) {
          message.error('归零失败');
        }
      }
    });
  };

  const handleBatchDelete = async (ids) => {
    try {
      const deletePromises = ids.map(id => api.delete(`/admin/questions/${id}`));
      await Promise.all(deletePromises);
      message.success(`成功删除 ${ids.length} 个题目`);
      fetchQuestions();
      fetchStats();
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败，请稍后重试');
    }
  };

  const handleBatchResetStats = async (ids) => {
    try {
      const resetPromises = ids.map(id => api.post(`/admin/questions/${id}/reset_stats`));
      await Promise.all(resetPromises);
      message.success(`成功归零 ${ids.length} 个题目的统计数据`);
      fetchQuestions();
    } catch (error) {
      console.error('批量归零失败:', error);
      message.error('批量归零失败，请稍后重试');
    }
  };

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    if (size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1); // 改变每页数量时重置到第一页
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-800">题目管理</h1>
              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                <button
                  onClick={handleToggleMode}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    !debugMode ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  答题模式
                </button>
                <button
                  onClick={handleToggleMode}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    debugMode ? 'bg-red-100 text-red-600 shadow' : 'text-gray-500'
                  }`}
                >
                  调试模式
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {/* Header Actions */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            <ExcelImportExport 
              onImportSuccess={() => {
                fetchQuestions();
                fetchStats();
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/quiz')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              返回答题界面
            </button>
            <button
              onClick={() => {
                modal.confirm({
                  title: '确定要将所有题目的"随机/隐藏"统计全部归零吗？',
                  onOk: async () => {
                    try {
                      await api.post('/admin/questions/reset_stats_all');
                      message.success('全部题目统计已归零');
                      fetchQuestions();
                    } catch (e) {
                      message.error('归零失败');
                    }
                  }
                });
              }}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors font-medium text-sm"
            >
              全部统计归零
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
            >
              + 新建题目
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsOverview stats={stats} />

        {/* Search By ID */}
        <SearchById onEdit={handleOpenModal} onDelete={handleDelete} />

        {/* Filter */}
        <QuestionFilter 
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          total={total}
          loading={loading}
        />

        {/* Question List */}
        <QuestionList 
          questions={questions}
          loading={loading}
          searchKeyword={searchKeyword}
          filterTag={filterTag}
          sortDesc={sortDesc}
          setSortDesc={setSortDesc}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          onResetStats={handleResetStats}
          onBatchDelete={handleBatchDelete}
          onBatchResetStats={handleBatchResetStats}
          currentPage={currentPage}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Modal */}
      <QuestionModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchQuestions();
          fetchStats();
        }}
        editingQuestion={editingQuestion}
        producers={producers}
      />
    </div>
  );
}

export default AdminDashboard;
