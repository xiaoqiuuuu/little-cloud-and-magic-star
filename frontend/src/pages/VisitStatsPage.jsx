import { useState, useEffect } from 'react';
import api from '../api';

function VisitStatsPage() {
  const [visitStats, setVisitStats] = useState({ total: 0, daily: [], sources: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats/');
        setVisitStats(response.data);
      } catch (error) {
        console.error('获取统计失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const maxDaily = visitStats?.daily?.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">访问统计</h1>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* 累计访问 */}
          <div className="bg-green-50 p-6 rounded-xl md:col-span-1 shadow-sm border border-green-100">
            <div className="text-green-600 font-medium mb-2">累计访问量 (PV)</div>
            <div className="text-4xl font-extrabold text-green-700">
              {visitStats.total || 0}
            </div>
          </div>

          {/* 来源列表 */}
          <div className="md:col-span-3 bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-700 font-bold mb-4 flex items-center">
              <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
              热门访问来源 TOP 10
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {visitStats.sources?.map((src, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 hover:bg-gray-100 px-2 rounded transition-colors">
                  <div className="truncate text-gray-600 flex-1 mr-4" title={src.name || '直接访问'}>
                    <span className="inline-block w-5 text-gray-400 font-mono text-xs">{idx + 1}.</span>
                    {src.name || '直接访问/未知'}
                  </div>
                  <div className="font-mono font-bold text-gray-800">{src.value}</div>
                </div>
              ))}
              {(!visitStats.sources || visitStats.sources.length === 0) && (
                <div className="text-gray-400 text-sm italic py-2">暂无来源数据</div>
              )}
            </div>
          </div>
        </div>

        {/* 趋势图 */}
        <div className="pt-2">
          <div className="text-gray-700 font-bold mb-6 flex items-center">
            <span className="w-2 h-6 bg-purple-500 rounded-full mr-2"></span>
            近30天访问趋势
          </div>
          <div className="relative h-64 w-full bg-slate-50 rounded-lg p-4 border border-slate-100">
             {visitStats.daily?.length > 0 ? (
               <div className="flex items-end space-x-2 h-full w-full">
                 {visitStats.daily.map((day, idx) => (
                   <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                     <div 
                       className="w-full bg-blue-400 rounded-t hover:bg-blue-600 transition-colors min-w-[4px] shadow-sm relative"
                       style={{ height: `${Math.max((day.count / maxDaily) * 100, 2)}%` }}
                     >
                       <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                         {day.count}
                       </span>
                     </div>
                     {/* Tooltip */}
                     <div className="absolute bottom-0 mb-[-24px] text-[10px] text-gray-400 rotate-0 whitespace-nowrap hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity z-10 font-mono">
                       {day.date.slice(5)}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                 暂无历史数据
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisitStatsPage;
