import {
  BugOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import { Pagination, Spin, Tag } from 'antd';

import { getQuestionTagMeta } from '../../constants/questionTags';
import { CharacterButton, CharacterEmptyState } from '../../ui';


function formatMobileDate(value) {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}


function QuestionMobileCard({
  question,
  selected,
  answerExpanded,
  onSelect,
  onToggleAnswer,
  onDebug,
  onEdit,
  onResetStats,
  onDelete,
}) {
  const tagMeta = getQuestionTagMeta(question.tag);
  const author = Array.isArray(question.author)
    ? question.author.join('、')
    : question.author || '未署名';
  const resourceCount = question.resources?.length || 0;

  return (
    <article className={`question-mobile-card ${selected ? 'is-selected' : ''}`}>
      <div className="question-mobile-card__topline">
        <label className="question-mobile-card__selector">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
            aria-label={`选择题目 ${question.id}`}
          />
          <strong>#{question.id}</strong>
        </label>
        <div className="question-mobile-card__badges">
          <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>
          <span>{resourceCount ? `${resourceCount} 个资源` : '无资源'}</span>
        </div>
      </div>

      <h3 className="question-mobile-card__question">{question.question}</h3>

      <div className="question-mobile-card__meta">
        <span title={author}>出题人：{author}</span>
        <span>更新：{formatMobileDate(question.updated_at || question.created_at)}</span>
      </div>

      <button
        type="button"
        className="question-mobile-card__answer-toggle"
        onClick={onToggleAnswer}
        aria-expanded={answerExpanded}
      >
        {answerExpanded ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        {answerExpanded ? '收起答案' : '查看答案'}
      </button>
      {answerExpanded && (
        <div className="question-mobile-card__answer">
          <span>正确答案</span>
          <p>{question.answer}</p>
        </div>
      )}

      <div className="question-mobile-card__stats" aria-label="历史和调试统计">
        <span>随机 {question.random_clicks || 0}</span>
        <span>隐藏 {question.hide_clicks || 0}</span>
      </div>

      <div className="question-mobile-card__actions">
        <button type="button" onClick={() => onDebug(question.id)}>
          <BugOutlined /> 调试
        </button>
        <button type="button" onClick={() => onEdit(question)}>
          <EditOutlined /> 编辑
        </button>
        <button type="button" onClick={() => onResetStats(question.id)}>
          <ReloadOutlined /> 归零
        </button>
        <button type="button" className="is-danger" onClick={() => onDelete(question.id)}>
          <DeleteOutlined /> 删除
        </button>
      </div>
    </article>
  );
}


export default function QuestionMobileList({
  questions,
  loading,
  selectedRowKeys,
  onSelectedRowKeysChange,
  expandedRowKeys,
  onToggleAnswer,
  sortDesc,
  onToggleSort,
  onDebug,
  onEdit,
  onDelete,
  onResetStats,
  currentPage,
  pageSize,
  total,
  onPageChange,
  hasActiveFilters,
  onCreate,
}) {
  const currentIds = questions.map((question) => question.id);
  const allCurrentSelected = currentIds.length > 0
    && currentIds.every((id) => selectedRowKeys.includes(id));

  const toggleCurrentPage = (checked) => {
    if (checked) {
      onSelectedRowKeysChange([...new Set([...selectedRowKeys, ...currentIds])]);
    } else {
      onSelectedRowKeysChange(
        selectedRowKeys.filter((id) => !currentIds.includes(id)),
      );
    }
  };

  return (
    <div className="question-mobile-list">
      <div className="question-mobile-list__toolbar">
        <label>
          <input
            type="checkbox"
            checked={allCurrentSelected}
            onChange={(event) => toggleCurrentPage(event.target.checked)}
            disabled={questions.length === 0}
          />
          全选本页
        </label>
        <span>共 {total} 道</span>
        <button type="button" onClick={onToggleSort}>
          {sortDesc ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
          {sortDesc ? '最新优先' : '最早优先'}
        </button>
      </div>

      <div className="question-mobile-list__content" aria-busy={loading}>
        {loading && (
          <div className="question-mobile-list__loading">
            <Spin />
            <span>正在加载题目…</span>
          </div>
        )}

        {!loading && questions.length === 0 ? (
          <CharacterEmptyState
            size="small"
            title={hasActiveFilters ? '没有找到匹配的题目' : '暂无题目，请添加题目'}
            action={!hasActiveFilters && onCreate ? (
              <CharacterButton size="small" onClick={onCreate}>新建题目</CharacterButton>
            ) : undefined}
          />
        ) : (
          questions.map((question) => (
            <QuestionMobileCard
              key={question.id}
              question={question}
              selected={selectedRowKeys.includes(question.id)}
              answerExpanded={expandedRowKeys.includes(question.id)}
              onSelect={(checked) => onSelectedRowKeysChange(
                checked
                  ? [...selectedRowKeys, question.id]
                  : selectedRowKeys.filter((id) => id !== question.id),
              )}
              onToggleAnswer={() => onToggleAnswer(question.id)}
              onDebug={onDebug}
              onEdit={onEdit}
              onDelete={onDelete}
              onResetStats={onResetStats}
            />
          ))
        )}
      </div>

      {total > 0 && (
        <div className="question-mobile-list__pagination">
          <Pagination
            simple
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={(page) => onPageChange(page, pageSize)}
          />
          <label>
            每页
            <select
              value={pageSize}
              onChange={(event) => onPageChange(1, Number(event.target.value))}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            道
          </label>
        </div>
      )}
    </div>
  );
}
