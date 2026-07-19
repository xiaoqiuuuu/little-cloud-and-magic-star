import React from 'react';
import { mergeQuestionTagOptions } from '../../constants/questionTags';

const StatsOverview = ({ stats }) => {
  const byTag = stats.by_tag || {};
  const alwaysVisible = new Set(['concert', 'vlog', 'common']);
  const tagOptions = mergeQuestionTagOptions(Object.keys(byTag)).filter(
    (option) => alwaysVisible.has(option.value) || (byTag[option.value] || 0) > 0,
  );

  return (
    <div className="mb-6 sm:mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="text-gray-600 text-xs sm:text-sm">总题目数</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.total}</div>
        </div>
        {tagOptions.map((option) => (
          <div key={option.value} className={`${option.cardClass} p-4 sm:p-6 rounded-lg shadow`}>
            <div className="text-xs sm:text-sm opacity-75">{option.label}</div>
            <div className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
              {byTag[option.value] || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsOverview;
