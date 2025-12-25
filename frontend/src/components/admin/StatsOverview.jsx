import React from 'react';

const StatsOverview = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="text-gray-600 text-xs sm:text-sm">总题目数</div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">{stats.total}</div>
      </div>
      <div className="bg-purple-50 p-4 sm:p-6 rounded-lg shadow">
        <div className="text-purple-600 text-xs sm:text-sm">演唱会题目</div>
        <div className="text-2xl sm:text-3xl font-bold text-purple-800 mt-1 sm:mt-2">
          {stats.concert}
        </div>
      </div>
      <div className="bg-blue-50 p-4 sm:p-6 rounded-lg shadow">
        <div className="text-blue-600 text-xs sm:text-sm">Vlog题目</div>
        <div className="text-2xl sm:text-3xl font-bold text-blue-800 mt-1 sm:mt-2">
          {stats.vlog}
        </div>
      </div>
      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg shadow">
        <div className="text-gray-600 text-xs sm:text-sm">通用题目</div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 sm:mt-2">
          {stats.common}
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
