import React, { useState } from 'react';
import api from '../../api';
import { getQuestionTagMeta } from '../../constants/questionTags';

const formatDateTime = (value) => {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const SearchById = ({ onEdit, onDelete }) => {
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setSearchResult(null);
      return;
    }

    try {
      const res = await api.get(`/admin/questions/${searchId.trim()}`);
      setSearchResult(res.data);
    } catch (e) {
      setSearchResult({ notFound: true });
    }
  };

  const handleClearSearch = () => {
    setSearchId('');
    setSearchResult(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">按编号精确搜索</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="输入题目编号..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          搜索
        </button>
        {searchResult && (
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* 搜索结果展示 */}
      {searchResult && (
        <div className="border-t pt-4">
          {searchResult.notFound ? (
            <div className="text-red-500 text-center py-4">未找到该编号的题目</div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-blue-800">#{searchResult.id}</span>
                <span className="text-xs text-gray-500">
                  {getQuestionTagMeta(searchResult.tag).label}
                </span>
              </div>
              <p className="font-medium text-gray-900 mb-2">{searchResult.question}</p>
              <p className="text-sm text-gray-700 mb-2">答案: {searchResult.answer}</p>
              <p className="text-xs text-gray-500 mb-3">
                出题人: {Array.isArray(searchResult.author) ? searchResult.author.join(', ') : (searchResult.author || '-')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                创建：{formatDateTime(searchResult.created_at)} · 更新：{formatDateTime(searchResult.updated_at)}
              </p>
              
              <div className="flex gap-4 text-sm mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">随机</p>
                  <p className="text-xl font-bold text-purple-600">{searchResult.random_clicks || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">隐藏</p>
                  <p className="text-xl font-bold text-orange-600">{searchResult.hide_clicks || 0}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(searchResult)}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(searchResult.id)}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchById;
