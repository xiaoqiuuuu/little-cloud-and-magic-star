import React from 'react';

const QuestionFilter = ({ 
  searchKeyword, 
  setSearchKeyword, 
  filterTag, 
  setFilterTag, 
  total, 
  loading 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">题目筛选</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 模糊搜索 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            搜索题目（题目内容、答案、编号）
          </label>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
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
            <option value="concert">演唱会</option>
            <option value="vlog">Vlog</option>
            <option value="common">通用</option>
          </select>
        </div>
      </div>

      {/* 搜索结果统计 */}
      <div className="mt-4 text-sm text-gray-600 flex items-center">
        <span>找到 <span className="font-bold text-blue-600">{total}</span> 条结果</span>
        {loading && <span className="ml-3 text-gray-500 flex items-center"><span className="animate-spin mr-1">⟳</span> 加载中...</span>}
        {searchKeyword && (
          <button
            onClick={() => setSearchKeyword('')}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            清除搜索
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionFilter;
