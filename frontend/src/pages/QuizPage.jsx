import { useState, useEffect } from 'react';
import ImagePreview from '../components/ImagePreview';
import VideoPreview from '../components/VideoPreview';
import AudioPreview from '../components/AudioPreview';
import api from '../api';

function QuizPage() {
  const [questionIds, setQuestionIds] = useState([]); // 只存储ID列表
  const [currentQuestion, setCurrentQuestion] = useState(null); // 当前题目的完整数据
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [hiddenQuestions, setHiddenQuestions] = useState(() => {
    // 从 localStorage 读取隐藏的题目
    const saved = localStorage.getItem('hiddenQuestions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHiddenManager, setShowHiddenManager] = useState(false);
  const [hiddenQuestionsCache, setHiddenQuestionsCache] = useState({}); // 缓存隐藏管理器中的题目
  // 新增：debugMode 控制题号跳转输入框
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('debugMode') === 'true');

  useEffect(() => {
    // 监听 debugMode 变化（跨标签页同步）
    const onStorage = (e) => {
      if (e.key === 'debugMode') {
        setDebugMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    // 监听自定义事件（同标签页）
    const onCustom = (e) => {
      if (e.detail && typeof e.detail.debugMode === 'boolean') {
        setDebugMode(e.detail.debugMode);
      }
    };
    window.addEventListener('debugModeChange', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('debugModeChange', onCustom);
    };
  }, []);

  useEffect(() => {
    fetchQuestionIds();
  }, []);

  // 保存隐藏的题目到 localStorage
  useEffect(() => {
    localStorage.setItem('hiddenQuestions', JSON.stringify(hiddenQuestions));
  }, [hiddenQuestions]);

  // 当索引改变时，加载当前题目
  useEffect(() => {
    if (filteredQuestionIds.length > 0 && currentIndex >= 0 && currentIndex < filteredQuestionIds.length) {
      fetchCurrentQuestion(filteredQuestionIds[currentIndex].id);
    }
  }, [currentIndex]);

  const fetchQuestionIds = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions/ids');
      setQuestionIds(response.data);
      // 加载第一题
      const filtered = response.data.filter(q => !hiddenQuestions.includes(q.id));
      if (filtered.length > 0) {
        fetchCurrentQuestion(filtered[0].id);
      }
    } catch (error) {
      console.error('获取题目列表失败:', error);
      alert('获取题目列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentQuestion = async (questionId) => {
    try {
      const response = await api.get(`/questions/${questionId}`);
      setCurrentQuestion(response.data);
    } catch (error) {
      console.error('获取题目详情失败:', error);
      alert('获取题目详情失败，请稍后重试');
    }
  };

  const filteredQuestionIds = selectedTag === 'all' 
    ? questionIds.filter(q => !hiddenQuestions.includes(q.id))
    : questionIds.filter(q => q.tag === selectedTag && !hiddenQuestions.includes(q.id));


  const handleRandomQuestion = async () => {
    if (filteredQuestionIds.length <= 1) {
      alert('题目数量不足，无法随机抽题');
      return;
    }
    
    // 记录当前题目的随机点击
    if (currentQuestion) {
      try {
        await api.post(`/track/random/${currentQuestion.id}`);
      } catch (error) {
        console.error('记录随机点击失败:', error);
      }
    }
    
    // 生成一个不同于当前题目的随机索引
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * filteredQuestionIds.length);
    } while (randomIndex === currentIndex && filteredQuestionIds.length > 1);
    
    setCurrentIndex(randomIndex);
  };

  const handleHideQuestion = async () => {
    if (confirm('确定要隐藏这道题目吗？隐藏后将不会再随机到此题。')) {
      // 记录隐藏点击
      try {
        await api.post(`/track/hide/${currentQuestion.id}`);
      } catch (error) {
        console.error('记录隐藏点击失败:', error);
      }
      
      setHiddenQuestions([...hiddenQuestions, currentQuestion.id]);
      // 如果还有题目，随机跳到另一题
      if (filteredQuestionIds.length > 1) {
        handleRandomQuestion();
      } else {
        setCurrentIndex(0);
      }
    }
  };

  const handleRestoreQuestion = (questionId) => {
    setHiddenQuestions(hiddenQuestions.filter(id => id !== questionId));
  };

  const handleRestoreAll = () => {
    if (confirm('确定要恢复所有隐藏的题目吗？')) {
      setHiddenQuestions([]);
      setCurrentIndex(0);
    }
  };

  // 在打开隐藏管理器时，按需加载隐藏的题目
  const loadHiddenQuestions = async () => {
    const uncached = hiddenQuestions.filter(id => !hiddenQuestionsCache[id]);
    if (uncached.length > 0) {
      const promises = uncached.map(id => api.get(`/questions/${id}`).catch(() => null));
      const results = await Promise.all(promises);
      const newCache = { ...hiddenQuestionsCache };
      results.forEach((res, idx) => {
        if (res) {
          newCache[uncached[idx]] = res.data;
        }
      });
      setHiddenQuestionsCache(newCache);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (questionIds.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">暂无题目</div>
      </div>
    );
  }

  if (filteredQuestionIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              筛选题目类型:
            </label>
            <select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setCurrentIndex(0);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全部题目 ({questionIds.filter(q => !hiddenQuestions.includes(q.id)).length})</option>
              <option value="concert">演唱会 ({questionIds.filter(q => q.tag === 'concert' && !hiddenQuestions.includes(q.id)).length})</option>
              <option value="vlog">Vlog ({questionIds.filter(q => q.tag === 'vlog' && !hiddenQuestions.includes(q.id)).length})</option>
              <option value="common">通用 ({questionIds.filter(q => q.tag === 'common' && !hiddenQuestions.includes(q.id)).length})</option>
            </select>
          </div>
          <button
            onClick={() => setShowHiddenManager(true)}
            className="ml-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            管理隐藏题目 ({hiddenQuestions.length})
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
          {hiddenQuestions.length > 0 ? (
            <div>
              <p className="mb-4">该类型暂无可见题目</p>
              <button
                onClick={() => setShowHiddenManager(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                查看隐藏的题目
              </button>
            </div>
          ) : (
            '该类型暂无题目'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      {/* 题目类型筛选和管理按钮 */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          筛选题目类型:
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <select
            value={selectedTag}
            onChange={(e) => {
              setSelectedTag(e.target.value);
              setCurrentIndex(0);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          >
            <option value="all">全部题目 ({questionIds.filter(q => !hiddenQuestions.includes(q.id)).length})</option>
            <option value="concert">演唱会 ({questionIds.filter(q => q.tag === 'concert' && !hiddenQuestions.includes(q.id)).length})</option>
            <option value="vlog">Vlog ({questionIds.filter(q => q.tag === 'vlog' && !hiddenQuestions.includes(q.id)).length})</option>
            <option value="common">通用 ({questionIds.filter(q => q.tag === 'common' && !hiddenQuestions.includes(q.id)).length})</option>
          </select>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={handleRandomQuestion}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
            >
              🎲 随机抽题
            </button>
            <button
              onClick={() => setShowHiddenManager(true)}
              className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              隐藏 ({hiddenQuestions.length})
            </button>
          </div>
        </div>
      </div>

      {/* 题号跳转功能，仅 debugMode 下显示 */}
      {debugMode && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="输入题号（如 0, 1, 2...）"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-40"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const idx = filteredQuestionIds.findIndex(q => q.id.toString() === e.target.value.trim());
                if (idx !== -1) {
                  setCurrentIndex(idx);
                } else {
                  alert('未找到该题号');
                }
              }
            }}
          />
          <span className="text-xs text-gray-500">回车跳转</span>
        </div>
      )}

      {/* 题目卡片 */}
      {!currentQuestion ? (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 flex justify-center items-center min-h-[200px]">
          <div className="text-xl text-gray-600">加载中...</div>
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
        <div className="mb-3 sm:mb-4 flex justify-between items-center">
          <span className="text-xs sm:text-sm text-gray-500">
            题目 {currentIndex + 1} / {filteredQuestionIds.length}
          </span>
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
            currentQuestion.tag === 'concert' ? 'bg-purple-100 text-purple-800' :
            currentQuestion.tag === 'vlog' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {currentQuestion.tag === 'concert' ? '演唱会' :
             currentQuestion.tag === 'vlog' ? 'Vlog' : '通用'}
          </span>
        </div>

        {/* 题目编号和内容 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span className="inline-block bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-md font-bold text-sm sm:text-lg min-w-[50px] sm:min-w-[60px] text-center">
              #{currentQuestion.id}
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-800 leading-tight">
            {currentQuestion.question}
          </h2>
        </div>

        {/* 资源预览区：图片/视频/音频自动识别 */}
        {currentQuestion.resources && currentQuestion.resources.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">题目资源：</h3>
            <div className="flex flex-wrap gap-4">
              {currentQuestion.resources.map((url, idx) => {
                const ext = url.split('.').pop().toLowerCase();
                return (
                  <div key={idx} className="relative w-64 min-h-[80px] flex flex-col items-center justify-center border rounded bg-white shadow-sm p-2">
                    {/(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext) ? (
                      <ImagePreview src={url} alt="图片资源" className="object-contain w-full h-40" />
                    ) : /(mp4|webm|ogg|mov|avi|mkv)$/.test(ext) ? (
                      <VideoPreview src={url} className="object-contain w-full h-40" />
                    ) : /(mp3|wav|aac|flac|m4a|ogg)$/.test(ext) ? (
                      <AudioPreview src={url} className="w-full h-16" />
                    ) : (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">资源链接</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* 操作按钮区 */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-24">
          <button
            onClick={handleRandomQuestion}
            className="bg-purple-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-md hover:bg-purple-700 transition-colors font-medium text-sm sm:text-lg"
          >
            🎲 随机抽题
          </button>
          
          <button
            onClick={handleHideQuestion}
            className="bg-orange-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-md hover:bg-orange-600 transition-colors font-medium text-sm sm:text-lg"
          >
            🗑️ 隐藏此题
          </button>
        </div>
      </div>
      )}

      {/* 隐藏题目管理模态框 */}
      {showHiddenManager && (() => {
        // 当模态框打开时，立即加载隐藏的题目
        loadHiddenQuestions();
        return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  隐藏题目管理
                </h3>
                <button
                  onClick={() => setShowHiddenManager(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <p className="text-gray-600">
                  已隐藏 <span className="font-bold text-blue-600">{hiddenQuestions.length}</span> 道题目
                </p>
                {hiddenQuestions.length > 0 && (
                  <button
                    onClick={handleRestoreAll}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    恢复全部
                  </button>
                )}
              </div>

              {hiddenQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  暂无隐藏的题目
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {hiddenQuestions.map((questionId) => {
                      const question = hiddenQuestionsCache[questionId];
                      if (!question) {
                        // 按需加载
                        if (!loading) {
                          loadHiddenQuestions();
                        }
                        return (
                          <div key={questionId} className="p-4 border border-gray-200 rounded-lg">
                            <p className="text-gray-500">加载中...</p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={questionId}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    question.tag === 'concert'
                                      ? 'bg-purple-100 text-purple-800'
                                      : question.tag === 'vlog'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {question.tag === 'concert' ? '演唱会' : question.tag === 'vlog' ? 'Vlog' : '通用'}
                                </span>
                              </div>
                              <p className="text-gray-800 font-medium mb-1">{question.question}</p>
                              <p className="text-sm text-gray-600">答案: {question.answer}</p>
                            </div>
                            <button
                              onClick={() => handleRestoreQuestion(questionId)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              恢复
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHiddenManager(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

export default QuizPage;
