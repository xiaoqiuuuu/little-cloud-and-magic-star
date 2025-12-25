import React, { useState } from 'react';

const QuestionList = ({ 
  questions, 
  loading, 
  searchKeyword, 
  filterTag, 
  sortDesc, 
  setSortDesc, 
  onEdit, 
  onDelete,
  onResetStats 
}) => {
  const [viewingAnswer, setViewingAnswer] = useState(null);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        {searchKeyword || filterTag !== 'all' ? '没有找到匹配的题目' : '暂无题目，请添加题目'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden md:grid md:grid-cols-[80px_2fr_1fr_100px_120px_100px_120px_150px] bg-gray-50 border-b border-gray-200 font-medium text-gray-500 text-xs uppercase tracking-wider">
        <div 
          className="px-6 py-3 cursor-pointer select-none flex items-center hover:bg-gray-100 transition-colors" 
          onClick={() => setSortDesc(v => !v)}
        >
          编号
          <span className="ml-1 text-xs">{sortDesc ? '▼' : '▲'}</span>
        </div>
        <div className="px-6 py-3 flex items-center">题目</div>
        <div className="px-6 py-3 flex items-center">答案</div>
        <div className="px-6 py-3 flex items-center">类型</div>
        <div className="px-6 py-3 flex items-center">出题人</div>
        <div className="px-6 py-3 flex items-center">资源数</div>
        <div className="px-6 py-3 flex items-center">点击统计</div>
        <div className="px-6 py-3 flex items-center justify-end">操作</div>
      </div>

      {/* Desktop List Items */}
      <div className="hidden md:block divide-y divide-gray-200">
        {questions.map((question) => (
          <div 
            key={question.id} 
            className="grid grid-cols-[80px_2fr_1fr_100px_120px_100px_120px_150px] hover:bg-gray-50 transition-colors"
          >
            {/* ID */}
            <div className="px-6 py-4 flex items-center">
              <span className="text-sm font-medium text-blue-600">#{question.id}</span>
            </div>

            {/* Question */}
            <div className="px-6 py-4 flex items-center">
              <div className="text-sm text-gray-900 line-clamp-2" title={question.question}>
                {question.question}
              </div>
            </div>

            {/* Answer */}
            <div className="px-6 py-4 flex flex-col justify-center">
              <button
                onClick={() => setViewingAnswer(viewingAnswer === question.id ? null : question.id)}
                className="text-blue-600 hover:text-blue-800 underline text-sm text-left"
              >
                {viewingAnswer === question.id ? '隐藏答案' : '查看答案'}
              </button>
              {viewingAnswer === question.id && (
                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-xs break-all">
                  {question.answer}
                </div>
              )}
            </div>

            {/* Type */}
            <div className="px-6 py-4 flex items-center">
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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

            {/* Author */}
            <div className="px-6 py-4 flex items-center">
              <span className="text-sm text-gray-500 truncate block w-full" title={Array.isArray(question.author) ? question.author.join(', ') : (question.author || '-')}>
                {Array.isArray(question.author) ? question.author.join(', ') : (question.author || '-')}
              </span>
            </div>

            {/* Resources */}
            <div className="px-6 py-4 flex items-center">
              <span className="text-sm text-gray-500">
                {question.resources && question.resources.length > 0 ? `${question.resources.length} 个` : '无'}
              </span>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 flex flex-col justify-center gap-1">
              <span className="text-purple-600 text-xs">随机: {question.random_clicks || 0}</span>
              <span className="text-orange-600 text-xs">隐藏: {question.hide_clicks || 0}</span>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => onEdit(question)}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                编辑
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                删除
              </button>
              <button
                onClick={() => onResetStats(question.id)}
                className="text-orange-500 hover:text-orange-700 text-sm font-medium"
                title="归零统计数据"
              >
                归零
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile List Items (Card View) */}
      <div className="md:hidden divide-y divide-gray-200 bg-gray-50">
        {questions.map((question) => (
          <div key={question.id} className="p-4 bg-white mb-2 shadow-sm">
            {/* Header: ID & Type */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  #{question.id}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
              <div className="text-xs text-gray-400">
                {question.resources && question.resources.length > 0 ? `${question.resources.length} 资源` : '无资源'}
              </div>
            </div>

            {/* Question Body */}
            <div className="mb-3">
              <h3 className="text-base font-medium text-gray-900 mb-1 line-clamp-3">
                {question.question}
              </h3>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>出题人: {Array.isArray(question.author) ? question.author.join(', ') : (question.author || '-')}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 mb-3 text-xs bg-gray-50 p-2 rounded">
              <span className="text-purple-600 font-medium">🎲 随机: {question.random_clicks || 0}</span>
              <span className="text-orange-600 font-medium">👁️ 隐藏: {question.hide_clicks || 0}</span>
            </div>

            {/* Answer Section */}
            <div className="mb-4">
              <button
                onClick={() => setViewingAnswer(viewingAnswer === question.id ? null : question.id)}
                className="text-blue-600 text-sm font-medium flex items-center gap-1"
              >
                {viewingAnswer === question.id ? '收起答案' : '查看答案'}
                <span className="text-xs">{viewingAnswer === question.id ? '▲' : '▼'}</span>
              </button>
              {viewingAnswer === question.id && (
                <div className="mt-2 p-3 bg-green-50 rounded border border-green-100 text-sm text-gray-800 break-all animate-fadeIn">
                  {question.answer}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <button
                onClick={() => onEdit(question)}
                className="flex items-center justify-center py-2 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100"
              >
                编辑
              </button>
              <button
                onClick={() => onResetStats(question.id)}
                className="flex items-center justify-center py-2 bg-orange-50 text-orange-600 rounded text-sm font-medium hover:bg-orange-100"
              >
                归零
              </button>
              <button
                onClick={() => onDelete(question.id)}
                className="flex items-center justify-center py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionList;
