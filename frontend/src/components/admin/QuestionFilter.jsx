import React, { useState, useEffect } from 'react';

const QuestionFilter = ({
  searchKeyword,
  setSearchKeyword,
  filterTag,
  setFilterTag,
  filterAuthor,
  setFilterAuthor,
  total,
  loading,
  producers,
  isSuperAdmin = true,
  tagOptions = [],
}) => {
  const [inputValue, setInputValue] = useState(searchKeyword);

  // Debounce: 用户停止输入 500ms 后才更新搜索关键词
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeyword(inputValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, setSearchKeyword]);

  // 同步外部 searchKeyword 变化（例如清除按钮）
  useEffect(() => {
    setInputValue(searchKeyword);
  }, [searchKeyword]);

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">题目筛选</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 模糊搜索 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索题目（题目内容、答案、编号）
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入关键词进行模糊搜索..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 标签筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            题目类型
          </label>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部类型</option>
            {tagOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* 出题人筛选 - 仅超级管理员可见 */}
        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出题人
            </label>
            <select
              value={filterAuthor || ''}
              onChange={(e) => setFilterAuthor(e.target.value || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部出题人</option>
              {producers && producers.map((producer) => (
                <option key={producer.id} value={producer.name}>
                  {producer.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 搜索结果统计 */}
      <div className="mt-4 text-sm text-gray-600 flex items-center flex-wrap gap-2">
        <span>找到 <span className="font-bold text-blue-600">{total}</span> 条结果</span>
        {loading && <span className="text-gray-500 flex items-center"><span className="animate-spin mr-1">⟳</span> 加载中...</span>}
        {(searchKeyword || filterTag !== 'all' || filterAuthor) && (
          <button
            onClick={() => {
              setSearchKeyword('');
              setInputValue('');
              setFilterTag('all');
              setFilterAuthor(null);
            }}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionFilter;
