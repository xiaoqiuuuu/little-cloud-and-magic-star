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
  
  // 倒计时设置
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [tempCountdown, setTempCountdown] = useState(countdownSeconds);
  
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

  const handleSaveCountdown = async () => {
    if (tempCountdown < 10 || tempCountdown > 3600) {
      message.error('倒计时时间必须在10秒到3600秒之间');
      return;
    }
    
    try {
      await api.put('/configs', {
        key: 'COUNTDOWN_SECONDS',
        value: tempCountdown.toString()
      });
      setCountdownSeconds(tempCountdown);
      // 同时触发本地事件，以便立即更新（如果是同一浏览器）
      window.dispatchEvent(new CustomEvent('countdownChange', { detail: { countdownSeconds: tempCountdown } }));
      message.success('倒计时设置已保存');
      setShowCountdownModal(false);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
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
    fetchConfig();
  }, [navigate, currentPage, pageSize, searchKeyword, filterTag, sortDesc]);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/configs/COUNTDOWN_SECONDS');
      const seconds = parseInt(res.data.value, 10);
      setCountdownSeconds(seconds);
      setTempCountdown(seconds);
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  };

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
              onClick={() => {
                setTempCountdown(countdownSeconds);
                setShowCountdownModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              ⏱️ 倒计时设置
            </button>
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

      {/* 倒计时设置模态框 */}
      {showCountdownModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ⏱️ 答题倒计时设置
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                倒计时时长（秒）
              </label>
              <input
                type="number"
                value={tempCountdown}
                onChange={(e) => setTempCountdown(parseInt(e.target.value, 10) || 0)}
                min="10"
                max="3600"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                建议：60秒（1分钟）~ 300秒（5分钟）
              </p>
              <p className="text-sm text-gray-600 mt-2">
                当前设置：<span className="font-bold text-blue-600">{Math.floor(tempCountdown / 60)}分{tempCountdown % 60}秒</span>
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowCountdownModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCountdown}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
