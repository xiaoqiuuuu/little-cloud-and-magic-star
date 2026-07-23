import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { App } from 'antd';
import { useNavigate } from 'react-router-dom';
import ImagePreview from '../components/ImagePreview';
import VideoPreview from '../components/VideoPreview';
import AudioPreview from '../components/AudioPreview';
import Countdown from '../components/Countdown';
import api from '../api';
import { getQuestionTagMeta, mergeQuestionTagOptions } from '../constants/questionTags';
import {
  Button,
  Card,
  CharacterButton,
  CharacterCard,
  CharacterEmptyState,
  Input,
  Modal,
  Select,
  Tag,
  useCloudUI,
} from '../ui';
import './QuizPage.css';

function QuizPage({ activityMode = false, initialQuestionId = null }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { theme, characterPack, characterPacks } = useCloudUI();
  const userRole = localStorage.getItem('userRole') || '';
  const usesActiveActivity = activityMode || userRole === 'quiz_operator';
  const activeActivityIdRef = useRef(undefined);
  const activityGenerationRef = useRef(0);
  const [questionIds, setQuestionIds] = useState([]); // 只存储ID列表
  const [currentQuestion, setCurrentQuestion] = useState(null); // 当前题目的完整数据
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [activeActivity, setActiveActivity] = useState(null);
  const [requestedQuestionMissing, setRequestedQuestionMissing] = useState(false);
  const [hiddenQuestions, setHiddenQuestions] = useState(() => {
    if (usesActiveActivity) return [];
    // 从 localStorage 读取隐藏的题目
    const saved = localStorage.getItem('hiddenQuestions');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((id) => String(id) !== String(initialQuestionId))
        : [];
    } catch {
      localStorage.removeItem('hiddenQuestions');
      return [];
    }
  });
  const [showHiddenManager, setShowHiddenManager] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hiddenQuestionsCache, setHiddenQuestionsCache] = useState({}); // 缓存隐藏管理器中的题目
  // 新增：debugMode 控制题号跳转输入框
  const [debugMode, setDebugMode] = useState(
    () => !usesActiveActivity && localStorage.getItem('debugMode') === 'true',
  );
  
  // 倒计时功能相关状态
  const [quizStarted, setQuizStarted] = useState(() => !usesActiveActivity);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [showCountdown, setShowCountdown] = useState(false); // 是否显示倒计时
  const [isTimeUp, setIsTimeUp] = useState(false); // 是否时间到

  useEffect(() => {
    // 监听 debugMode 变化（跨标签页同步）
    const onStorage = (e) => {
      if (!usesActiveActivity && e.key === 'debugMode') {
        setDebugMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    // 监听自定义事件（同标签页）
    const onCustom = (e) => {
      if (!usesActiveActivity && e.detail && typeof e.detail.debugMode === 'boolean') {
        setDebugMode(e.detail.debugMode);
      }
      if (e.detail && e.detail.countdownSeconds) {
        setCountdownSeconds(parseInt(e.detail.countdownSeconds, 10));
      }
    };
    window.addEventListener('debugModeChange', onCustom);
    window.addEventListener('countdownChange', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('debugModeChange', onCustom);
      window.removeEventListener('countdownChange', onCustom);
    };
  }, []);
  
  // 处理调试模式 - 自动开始且无倒计时
  useEffect(() => {
    if (debugMode || !usesActiveActivity) {
      setQuizStarted(true);
      setShowCountdown(false);
      setIsTimeUp(false);
    }
  }, [debugMode]);

  useEffect(() => {
    fetchConfig();
    if (!usesActiveActivity) {
      fetchQuestionIds();
      return undefined;
    }

    refreshActiveActivity();
    const timer = window.setInterval(refreshActiveActivity, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/configs/COUNTDOWN_SECONDS');
      const seconds = parseInt(res.data.value, 10);
      if (!isNaN(seconds)) {
        setCountdownSeconds(seconds);
      }
    } catch (error) {
       console.log('Failed to load countdown config', error); 
    }
  };

  // 保存隐藏的题目到 localStorage
  useEffect(() => {
    if (usesActiveActivity) {
      if (activeActivity?.id) {
        localStorage.setItem(
          `hiddenQuestions:activity:${activeActivity.id}`,
          JSON.stringify(hiddenQuestions),
        );
      }
      return;
    }
    localStorage.setItem('hiddenQuestions', JSON.stringify(hiddenQuestions));
  }, [hiddenQuestions, activeActivity?.id]);

  // 当索引改变时，加载当前题目
  useEffect(() => {
    if (filteredQuestionIds.length > 0 && currentIndex >= 0 && currentIndex < filteredQuestionIds.length) {
      fetchCurrentQuestion(
        filteredQuestionIds[currentIndex].id,
        activityGenerationRef.current,
        activeActivityIdRef.current,
      );
    }
  }, [currentIndex]);

  const fetchQuestionIds = async (
    hiddenIds = hiddenQuestions,
    generation = activityGenerationRef.current,
    activityId = activeActivityIdRef.current,
  ) => {
    try {
      setLoading(true);
      const response = await api.get(
        usesActiveActivity ? '/quiz/questions/ids' : '/questions/ids',
        usesActiveActivity ? { params: { activity_id: activityId } } : undefined,
      );
      if (usesActiveActivity && generation !== activityGenerationRef.current) return;
      setQuestionIds(response.data);
      const filtered = response.data.filter(q => !hiddenIds.includes(q.id));
      const requestedIndex = initialQuestionId === null || initialQuestionId === undefined
        ? -1
        : filtered.findIndex((question) => String(question.id) === String(initialQuestionId));

      if (initialQuestionId !== null && initialQuestionId !== undefined && requestedIndex === -1) {
        setRequestedQuestionMissing(true);
        setCurrentQuestion(null);
        return;
      }

      setRequestedQuestionMissing(false);
      if (filtered.length > 0) {
        const nextIndex = requestedIndex >= 0 ? requestedIndex : 0;
        if (nextIndex !== currentIndex) {
          setCurrentIndex(nextIndex);
        } else {
          fetchCurrentQuestion(filtered[nextIndex].id, generation, activityId);
        }
      } else {
        setCurrentQuestion(null);
      }
    } catch (error) {
      if (usesActiveActivity && generation !== activityGenerationRef.current) return;
      console.error('获取题目列表失败:', error);
      message.error('获取题目列表失败，请稍后重试');
    } finally {
      if (!usesActiveActivity || generation === activityGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const refreshActiveActivity = async () => {
    try {
      const response = await api.get('/quiz/active-activity', {
        hideLoading: true,
        hideErrorMessage: true,
      });
      const nextActivity = response.data || null;
      const nextActivityId = nextActivity?.id || null;

      if (activeActivityIdRef.current === nextActivityId) {
        setActiveActivity(nextActivity);
        return;
      }

      const generation = activityGenerationRef.current + 1;
      activityGenerationRef.current = generation;
      activeActivityIdRef.current = nextActivityId;
      setActiveActivity(nextActivity);
      setQuestionIds([]);
      setCurrentQuestion(null);
      setCurrentIndex(0);
      setSelectedTag('all');
      setHiddenQuestionsCache({});
      setQuizStarted(false);
      setShowCountdown(false);
      setIsTimeUp(false);

      if (nextActivity) {
        const storageKey = `hiddenQuestions:activity:${nextActivity.id}`;
        const saved = localStorage.getItem(storageKey);
        let hiddenIds = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            hiddenIds = Array.isArray(parsed) ? parsed : [];
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
        setHiddenQuestions(hiddenIds);
        await fetchQuestionIds(hiddenIds, generation, nextActivity.id);
      } else {
        setHiddenQuestions([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('获取当前答题活动失败:', error);
      setLoading(false);
    }
  };

  const fetchCurrentQuestion = async (
    questionId,
    generation = activityGenerationRef.current,
    activityId = activeActivityIdRef.current,
  ) => {
    try {
      const response = await api.get(
        usesActiveActivity
          ? `/quiz/questions/${questionId}`
          : `/questions/${questionId}`,
        usesActiveActivity ? { params: { activity_id: activityId } } : undefined,
      );
      if (usesActiveActivity && generation !== activityGenerationRef.current) return;
      setCurrentQuestion(response.data);
    } catch (error) {
      if (usesActiveActivity && generation !== activityGenerationRef.current) return;
      console.error('获取题目详情失败:', error);
      message.error('获取题目详情失败，请稍后重试');
    }
  };

  const filteredQuestionIds = selectedTag === 'all' 
    ? questionIds.filter(q => !hiddenQuestions.includes(q.id))
    : questionIds.filter(q => q.tag === selectedTag && !hiddenQuestions.includes(q.id));

  const questionTagOptions = useMemo(() => {
    const values = [...new Set(questionIds.map((question) => question.tag).filter(Boolean))];
    return mergeQuestionTagOptions(values).filter((option) => values.includes(option.value));
  }, [questionIds]);

  const currentTagMeta = getQuestionTagMeta(currentQuestion?.tag);
  const questionTextLength = currentQuestion?.question?.trim().length || 0;
  const questionLengthClass = questionTextLength > 140
    ? 'is-very-long'
    : questionTextLength > 80
      ? 'is-long'
      : '';
  const currentCharacterIndex = Math.max(
    0,
    theme.characterPackIds.indexOf(characterPack.id),
  );
  const characterFor = (offset = 0) => theme.characterPackIds[
    (currentCharacterIndex + offset) % theme.characterPackIds.length
  ];
  const characterPackFor = (offset = 0) => characterPacks[characterFor(offset)];
  const filterOptions = [
    {
      value: 'all',
      label: `全部题目 (${questionIds.filter((question) => !hiddenQuestions.includes(question.id)).length})`,
    },
    ...questionTagOptions.map((option) => ({
      value: option.value,
      label: `${option.shortLabel} (${questionIds.filter(
        (question) => question.tag === option.value && !hiddenQuestions.includes(question.id),
      ).length})`,
    })),
  ];


  const handleRandomQuestion = async () => {
    if (filteredQuestionIds.length <= 1) {
      message.warning('题目数量不足，无法随机抽题');
      return;
    }
    
    // 记录当前题目的随机点击
    if (currentQuestion) {
      try {
        await api.post(`/track/random/${currentQuestion.id}`, null, {
          params: usesActiveActivity && activeActivity
            ? { activity_id: activeActivity.id }
            : undefined,
        });
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
    
    // 重置答题状态
    setIsTimeUp(false);
    if (debugMode || !usesActiveActivity) {
      // 调试或题目预览模式直接显示下一题，不进入准备界面，不倒计时。
      setQuizStarted(true);
      setShowCountdown(false);
    } else {
      // 正常模式回到准备界面
      setQuizStarted(false);
      setShowCountdown(false);
    }
  };

  const handleHideQuestion = () => {
    setConfirmAction('hide');
  };

  const handleRestoreQuestion = (questionId) => {
    setHiddenQuestions(hiddenQuestions.filter(id => id !== questionId));
  };

  const handleRestoreAll = () => {
    setConfirmAction('restore-all');
  };

  const handleConfirmAction = async () => {
    if (confirmAction === 'restore-all') {
      setHiddenQuestions([]);
      setCurrentIndex(0);
      setConfirmAction(null);
      return;
    }

    if (confirmAction !== 'hide' || !currentQuestion) return;

    try {
      await api.post(`/track/hide/${currentQuestion.id}`, null, {
        params: usesActiveActivity && activeActivity
          ? { activity_id: activeActivity.id }
          : undefined,
      });
    } catch (error) {
      console.error('记录隐藏点击失败:', error);
    }

    setHiddenQuestions([...hiddenQuestions, currentQuestion.id]);
    setConfirmAction(null);
    if (filteredQuestionIds.length > 1) {
      handleRandomQuestion();
      return;
    }

    setCurrentIndex(0);
    setIsTimeUp(false);
    if (debugMode || !usesActiveActivity) {
      setQuizStarted(true);
      setShowCountdown(false);
    } else {
      setQuizStarted(false);
      setShowCountdown(false);
    }
  };

  // 开始答题
  const handleStartQuiz = () => {
    // 随机抽一题
    if (filteredQuestionIds.length > 1) {
       let randomIndex;
       do {
         randomIndex = Math.floor(Math.random() * filteredQuestionIds.length);
       } while (randomIndex === currentIndex);
       setCurrentIndex(randomIndex);
    }
    setQuizStarted(true);
    setShowCountdown(true);
    setIsTimeUp(false);
  };
  
  // 倒计时结束处理
  const handleCountdownComplete = useCallback(() => {
    setIsTimeUp(true);
  }, []);

  // 在打开隐藏管理器时，按需加载隐藏的题目
  const loadHiddenQuestions = async () => {
    const generation = activityGenerationRef.current;
    const uncached = hiddenQuestions.filter(id => !hiddenQuestionsCache[id]);
    if (uncached.length > 0) {
      const promises = uncached.map((id) => api.get(
        usesActiveActivity ? `/quiz/questions/${id}` : `/questions/${id}`,
        usesActiveActivity
          ? { params: { activity_id: activeActivityIdRef.current } }
          : undefined,
      ).catch(() => null));
      const results = await Promise.all(promises);
      if (usesActiveActivity && generation !== activityGenerationRef.current) return;
      const newCache = { ...hiddenQuestionsCache };
      results.forEach((res, idx) => {
        if (res) {
          newCache[uncached[idx]] = res.data;
        }
      });
      setHiddenQuestionsCache(newCache);
    }
  };

  useEffect(() => {
    if (showHiddenManager) {
      loadHiddenQuestions();
    }
  }, [showHiddenManager, hiddenQuestions]);

  if (loading) {
    return (
      <div className="quiz-character-page quiz-character-page--centered">
        <CharacterEmptyState
          character={characterFor(0)}
          className="quiz-character-state"
          title="加载中..."
        />
      </div>
    );
  }

  if (usesActiveActivity && !activeActivity) {
    return (
      <div className="quiz-character-page quiz-character-page--centered">
        <CharacterEmptyState
          character={characterFor(1)}
          className="quiz-character-state"
          title="等待活动开始"
          description="当前没有进行中的答题活动。管理员开始或切换活动后，本页面会自动更新。"
        />
      </div>
    );
  }

  if (questionIds.length === 0) {
    return (
      <div className="quiz-character-page quiz-character-page--centered">
        <CharacterEmptyState
          character={characterFor(2)}
          className="quiz-character-state"
          title={usesActiveActivity ? '当前活动暂无题目' : '暂无可调试题目'}
        />
      </div>
    );
  }

  if (requestedQuestionMissing) {
    return (
      <div className="quiz-character-page quiz-character-page--centered">
        <CharacterEmptyState
          character={characterFor(1)}
          className="quiz-character-state"
          title="无法调试该题目"
          description={`题目 #${initialQuestionId} 不存在，或当前账号没有查看权限。`}
          action={(
            <Button variant="secondary" onClick={() => navigate('/admin/quiz')}>
              返回全部题目调试
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="quiz-character-page">
      <div className="quiz-character-page__inner">
        {!usesActiveActivity && (
          <Card variant="soft" padding="small" className="quiz-character-status-card">
            <div className="quiz-character-status-card__content">
              <strong>题目调试：</strong>
              <span>
                {userRole === 'question_admin'
                  ? '这里仅展示你创建的题目，可按标签筛选、随机查看或按题号跳转。'
                  : '这里可调试全部题目；现场答题请从“答题活动”进入。'}
              </span>
            </div>
          </Card>
        )}

        {usesActiveActivity && activeActivity && (
          <Card variant="soft" padding="small" className="quiz-character-status-card">
            <div className="quiz-character-status-card__content">
              <strong>当前活动：</strong>
              <span>{activeActivity.name}</span>
              <Tag tone="success">{activeActivity.question_count} 道题</Tag>
            </div>
          </Card>
        )}

        {filteredQuestionIds.length === 0 ? (
          <div className="quiz-character-empty-layout">
            <Card variant="soft" padding="medium" className="quiz-character-control-card">
              <div className="quiz-character-filter-row quiz-character-filter-row--empty">
                <Select
                  label="筛选题目类型:"
                  value={selectedTag}
                  onChange={(event) => {
                    setSelectedTag(event.target.value);
                    setCurrentIndex(0);
                  }}
                  options={filterOptions}
                />
                <Button
                  variant="secondary"
                  onClick={() => setShowHiddenManager(true)}
                >
                  管理隐藏题目 ({hiddenQuestions.length})
                </Button>
              </div>
            </Card>
            <CharacterEmptyState
              character={characterFor(1)}
              title={hiddenQuestions.length > 0 ? '该类型暂无可见题目' : '该类型暂无题目'}
              action={hiddenQuestions.length > 0 ? (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowHiddenManager(true)}
                >
                  查看隐藏的题目
                </Button>
              ) : undefined}
            />
          </div>
        ) : !quizStarted ? (
          <div className="quiz-character-ready-wrap">
            <CharacterCard
              character={characterFor(0)}
              layout="corner"
              size="large"
              className="quiz-character-ready-card"
            >
              <h1>准备答题</h1>
              <p>
                答题时间：<strong>{Math.floor(countdownSeconds / 60)}分{countdownSeconds % 60}秒</strong>
              </p>
              <p>点击下方按钮开始答题，系统将随机抽取一道题目</p>
              <CharacterButton
                character={characterFor(1)}
                size="large"
                onClick={handleStartQuiz}
              >
                开始答题
              </CharacterButton>
              <small>请确保网络连接稳定，答题过程中倒计时将持续进行</small>
            </CharacterCard>
          </div>
      ) : (
        <>
          <Card variant="soft" padding="medium" className="quiz-character-control-card">
            <div className="quiz-character-filter-row">
              <Select
                label="筛选题目类型:"
                value={selectedTag}
                onChange={(event) => {
                  setSelectedTag(event.target.value);
                  setCurrentIndex(0);
                }}
                options={filterOptions}
              />
              {!usesActiveActivity && (
                <Select
                  block={false}
                  label="题号"
                  value={currentIndex}
                  onChange={(event) => setCurrentIndex(Number(event.target.value))}
                  aria-label="快速选择预览题目"
                  options={filteredQuestionIds.map((question, index) => ({
                    value: index,
                    label: `#${question.id}`,
                  }))}
                />
              )}
              <div className="quiz-character-control-actions">
                <Button variant="secondary" onClick={handleRandomQuestion}>
                  随机抽题
                </Button>
                <Button variant="secondary" onClick={() => setShowHiddenManager(true)}>
                  隐藏 ({hiddenQuestions.length})
                </Button>
              </div>
            </div>
          </Card>

          {debugMode && (
            <Card variant="outlined" padding="medium" className="quiz-character-debug-card">
              <Input
                label="按题号跳转"
                type="text"
                placeholder="输入题号（如 0, 1, 2...）"
                helperText="回车跳转"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    const index = filteredQuestionIds.findIndex(
                      (question) => question.id.toString() === event.target.value.trim(),
                    );
                    if (index !== -1) {
                      setCurrentIndex(index);
                    } else {
                      message.warning('未找到该题号');
                    }
                  }
                }}
              />
            </Card>
          )}

          {!currentQuestion ? (
            <CharacterEmptyState
              character={characterFor(0)}
              className="quiz-character-state"
              title="加载中..."
            />
          ) : (
            <CharacterCard
              character={characterFor(0)}
              layout="watermark"
              size="large"
              className="quiz-character-question-card"
            >
              {isTimeUp && (
                <div className="quiz-character-time-up">
                  <img src={characterPackFor(1).assets.cardCorner} alt="" draggable="false" />
                  <h2>时间到！<br />说出你的答案</h2>
                  <p>请大声回答，争取正确！</p>
                  <CharacterButton
                    character={characterFor(2)}
                    size="large"
                    onClick={() => setIsTimeUp(false)}
                  >
                    继续答题 / 查看题目
                  </CharacterButton>
                </div>
              )}

              <div className="quiz-character-question-head">
                <div className="quiz-character-question-meta">
                  <span>题目 {currentIndex + 1} / {filteredQuestionIds.length}</span>
                  <span className="quiz-character-question-avatar" aria-hidden="true">
                    <img src={characterPackFor(1).assets.buttonAvatar} alt="" draggable="false" />
                  </span>
                  <Tag tone="primary">{currentTagMeta.shortLabel}</Tag>
                </div>
                {showCountdown && (
                  <Card variant="soft" padding="small" className="quiz-character-countdown-card">
                    <Countdown
                      compact
                      initialSeconds={countdownSeconds}
                      onComplete={handleCountdownComplete}
                    />
                  </Card>
                )}
              </div>

              <div className="quiz-character-question-copy">
                <Tag tone="primary" variant="solid">#{currentQuestion.id}</Tag>
                <h2 className={questionLengthClass}>{currentQuestion.question}</h2>
              </div>

              {currentQuestion.resources && currentQuestion.resources.length > 0 && (
                <div className="quiz-character-resources">
                  <h3>题目资源：</h3>
                  <div className="quiz-character-resource-grid">
                    {currentQuestion.resources.map((url, index) => {
                      const extension = url.split('.').pop().toLowerCase();
                      return (
                        <div className="quiz-character-resource" key={url}>
                          {/(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(extension) ? (
                            <ImagePreview
                              src={url}
                              alt="图片资源"
                              className="quiz-character-resource__visual"
                              themedClose
                            />
                          ) : /(mp4|webm|ogg|mov|avi|mkv)$/.test(extension) ? (
                            <VideoPreview
                              src={url}
                              className="quiz-character-resource__visual"
                              themedClose
                            />
                          ) : /(mp3|wav|aac|flac|m4a|ogg)$/.test(extension) ? (
                            <AudioPreview
                              src={url}
                              className="quiz-character-resource__audio"
                              themedClose
                            />
                          ) : (
                            <a href={url} target="_blank" rel="noopener noreferrer">资源链接</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="quiz-character-question-actions">
                <Button
                  variant="primary"
                  size="large"
                  block
                  onClick={handleRandomQuestion}
                >
                  随机抽题
                </Button>
                <Button
                  variant="secondary"
                  size="large"
                  block
                  onClick={handleHideQuestion}
                >
                  隐藏此题
                </Button>
              </div>
            </CharacterCard>
          )}
        </>
      )}

      </div>

      <Modal
        open={showHiddenManager}
        onClose={() => setShowHiddenManager(false)}
        title="隐藏题目管理"
        width="large"
        showClose={false}
        className="quiz-character-modal"
        footer={(
          <Button variant="secondary" onClick={() => setShowHiddenManager(false)}>
            关闭
          </Button>
        )}
      >
        <Card variant="soft" padding="medium" className="quiz-character-hidden-summary">
          <p>已隐藏 <strong>{hiddenQuestions.length}</strong> 道题目</p>
          {hiddenQuestions.length > 0 && (
            <Button variant="secondary" size="small" onClick={handleRestoreAll}>
              恢复全部
            </Button>
          )}
        </Card>

        {hiddenQuestions.length === 0 ? (
          <CharacterEmptyState character={characterFor(2)} size="small" title="暂无隐藏的题目" />
        ) : (
          <div className="quiz-character-hidden-list">
            {hiddenQuestions.map((questionId) => {
              const question = hiddenQuestionsCache[questionId];
              if (!question) {
                return (
                  <Card
                    key={questionId}
                    variant="outlined"
                    padding="medium"
                    className="quiz-character-hidden-card"
                  >
                    <p>加载中...</p>
                  </Card>
                );
              }
              return (
                <Card
                  key={questionId}
                  variant="outlined"
                  padding="medium"
                  className="quiz-character-hidden-card"
                >
                  <div className="quiz-character-hidden-card__copy">
                    <Tag>{getQuestionTagMeta(question.tag).shortLabel}</Tag>
                    <strong>{question.question}</strong>
                    <span>答案: {question.answer}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleRestoreQuestion(questionId)}
                  >
                    恢复
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'hide' ? '确定要隐藏这道题目吗？' : '确定要恢复所有隐藏的题目吗？'}
        width="small"
        showClose={false}
        className="quiz-character-modal"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmAction}>
              确定
            </Button>
          </>
        )}
      >
        <Card variant="soft" padding="medium" className="quiz-character-confirm-card">
          {confirmAction === 'hide' ? (
            <>
              <strong>{currentQuestion?.question}</strong>
              <p>隐藏后将不会再随机到此题。</p>
            </>
          ) : (
            <p>已隐藏 {hiddenQuestions.length} 道题目</p>
          )}
        </Card>
      </Modal>
    </div>
  );
}

export default QuizPage;
