import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Alert, App } from 'antd';
import api, {
  getDeduplicated,
  getLatest,
  isRequestCanceled,
} from '../api';
import { hasContentAdminAccess } from '../utils/adminAccess';

// Components
import StatsOverview from '../components/admin/StatsOverview';
import QuestionFilter from '../components/admin/QuestionFilter';
import SearchById from '../components/admin/SearchById';
import QuestionList from '../components/admin/QuestionList';
import QuestionModal from '../components/admin/QuestionModal';
import ExcelImportExport from '../components/admin/ExcelImportExport';

function AdminDashboard() {
  const { message, modal } = App.useApp();
  const { currentUser } = useOutletContext();

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
  const [filterAuthor, setFilterAuthor] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const navigate = useNavigate();
  const latestQuestionsRequest = useRef(0);
  const questionsRefreshVersion = useRef(0);

  // 判断是否是超级管理员
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManageQuestions = hasContentAdminAccess(currentUser);

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

  const fetchStats = useCallback(async () => {
    if (!canManageQuestions) return;

    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  }, [canManageQuestions]);

  const fetchQuestions = useCallback(async ({ force = true } = {}) => {
    if (!canManageQuestions) return;

    const requestId = latestQuestionsRequest.current + 1;
    latestQuestionsRequest.current = requestId;
    const requestVariant = force
      ? `refresh-${questionsRefreshVersion.current + 1}`
      : 'query';
    if (force) {
      questionsRefreshVersion.current += 1;
    }

    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize,
        sort_order: sortDesc ? 'desc' : 'asc'
      };
      if (searchKeyword) params.keyword = searchKeyword;
      if (filterTag !== 'all') params.tag = filterTag;
      if (filterAuthor) params.author = filterAuthor;

      const response = await getLatest(
        'admin-questions-list',
        '/admin/questions',
        { params },
        requestVariant,
      );

      if (latestQuestionsRequest.current !== requestId) return;
      setQuestions(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      if (!isRequestCanceled(error)) {
        console.error('获取题目失败:', error);
      }
    } finally {
      if (latestQuestionsRequest.current === requestId) {
        setLoading(false);
      }
    }
  }, [
    canManageQuestions,
    currentPage,
    filterAuthor,
    filterTag,
    pageSize,
    searchKeyword,
    sortDesc,
  ]);

  useEffect(() => {
    fetchQuestions({ force: false });
  }, [fetchQuestions]);

  useEffect(() => {
    if (!canManageQuestions) return undefined;

    let active = true;
    const supportingRequests = [
      getDeduplicated('/admin/stats'),
      getDeduplicated('/admin/producers', { params: { page_size: 1000 } }),
      isSuperAdmin
        ? getDeduplicated('/configs/COUNTDOWN_SECONDS')
        : Promise.resolve(null),
    ];

    Promise.allSettled(supportingRequests).then((results) => {
      if (!active) return;

      const [statsResult, producersResult, configResult] = results;
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      } else {
        console.error('获取统计失败:', statsResult.reason);
      }

      if (producersResult.status === 'fulfilled') {
        setProducers(producersResult.value.data.items);
      } else {
        console.error('获取制作人失败:', producersResult.reason);
      }

      if (configResult.status === 'fulfilled' && configResult.value) {
        const seconds = parseInt(configResult.value.data.value, 10);
        setCountdownSeconds(seconds);
        setTempCountdown(seconds);
      } else if (configResult.status === 'rejected') {
        console.error('获取配置失败:', configResult.reason);
      }
    });

    return () => {
      active = false;
    };
  }, [canManageQuestions, isSuperAdmin]);

  const handleSearchKeywordChange = useCallback((keyword) => {
    setSearchKeyword(keyword);
    setCurrentPage(1);
  }, []);

  const handleFilterTagChange = useCallback((tag) => {
    setFilterTag(tag);
    setCurrentPage(1);
  }, []);

  const handleFilterAuthorChange = useCallback((author) => {
    setFilterAuthor(author);
    setCurrentPage(1);
  }, []);

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
              {/* 角色标识 */}
              {isSuperAdmin ? (
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                  超级管理员
                </span>
              ) : (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  题目管理员
                </span>
              )}
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
        {isSuperAdmin && (
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message="现场答题统计已按活动独立保存"
            description="请在“答题活动”中查看每场活动的题目统计。本页点击数仅保留旧版累计和管理员调试记录，不会计入现场活动。"
          />
        )}
        {/* 题目管理员提示 */}
        {!isSuperAdmin && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              您是题目管理员，只能查看和管理自己创建的题目。
            </p>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {/* 批量导入导出仅超级管理员可用 */}
            {isSuperAdmin && (
              <ExcelImportExport
                onImportSuccess={() => {
                  fetchQuestions();
                  fetchStats();
                }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 倒计时设置仅超级管理员可用 */}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setTempCountdown(countdownSeconds);
                  setShowCountdownModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                ⏱️ 倒计时设置
              </button>
            )}
            <button
              onClick={() => navigate('/quiz')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              返回答题界面
            </button>
            {/* 全部归零仅超级管理员可用 */}
            {isSuperAdmin && (
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
            )}
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
          setSearchKeyword={handleSearchKeywordChange}
          filterTag={filterTag}
          setFilterTag={handleFilterTagChange}
          filterAuthor={filterAuthor}
          setFilterAuthor={handleFilterAuthorChange}
          total={total}
          loading={loading}
          producers={producers}
          isSuperAdmin={isSuperAdmin}
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
