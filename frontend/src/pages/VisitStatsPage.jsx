import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Select, Spin } from 'antd';
import {
  EyeOutlined,
  ReloadOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../api';
import AnalyticsChart from '../components/AnalyticsChart';


const numberFormatter = new Intl.NumberFormat('zh-CN');
const palette = ['#4f46e5', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];


const formatNumber = (value) => numberFormatter.format(value || 0);


function MetricCard({ title, value, hint, icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'from-indigo-50 to-white border-indigo-100 text-indigo-600',
    cyan: 'from-cyan-50 to-white border-cyan-100 text-cyan-600',
    amber: 'from-amber-50 to-white border-amber-100 text-amber-600',
    pink: 'from-pink-50 to-white border-pink-100 text-pink-600',
    emerald: 'from-emerald-50 to-white border-emerald-100 text-emerald-600',
    violet: 'from-violet-50 to-white border-violet-100 text-violet-600',
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-800">{value}</div>
      <div className="mt-2 min-h-5 text-xs text-slate-400">{hint}</div>
    </div>
  );
}


function ChartPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}


const comparisonHint = (value, days) => {
  if (value === null || value === undefined) return `暂无前 ${days} 天对比数据`;
  if (value === 0) return `与前 ${days} 天持平`;
  return `较前 ${days} 天${value > 0 ? '增长' : '下降'} ${Math.abs(value)}%`;
};


function VisitStatsPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/stats/', {
      params: { days },
      signal: controller.signal,
      hideLoading: true,
      hideErrorMessage: true,
    })
      .then((response) => setStats(response.data))
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.detail || '访问统计加载失败，请稍后重试');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, refreshKey]);

  const chartOptions = useMemo(() => {
    if (!stats) return {};
    const axisStyle = { color: '#94a3b8', fontSize: 11 };
    const splitLine = { lineStyle: { color: '#eef2f7' } };
    const tooltip = { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.92)', borderWidth: 0, textStyle: { color: '#fff' } };
    return {
      trend: {
        color: palette,
        tooltip,
        legend: { top: 0, textStyle: axisStyle },
        grid: { left: 20, right: 18, top: 45, bottom: 18, containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: stats.daily.map((item) => item.date.slice(5)),
          axisLabel: axisStyle,
          axisLine: { lineStyle: { color: '#e2e8f0' } },
        },
        yAxis: { type: 'value', minInterval: 1, axisLabel: axisStyle, splitLine },
        series: [
          { name: '浏览量 PV', type: 'line', smooth: true, symbol: 'none', areaStyle: { opacity: 0.08 }, data: stats.daily.map((item) => item.pv) },
          { name: '访客 UV', type: 'line', smooth: true, symbol: 'none', data: stats.daily.map((item) => item.uv) },
          { name: '会话数', type: 'line', smooth: true, symbol: 'none', data: stats.daily.map((item) => item.sessions) },
        ],
      },
      hourly: {
        color: ['#06b6d4'],
        tooltip,
        grid: { left: 18, right: 12, top: 12, bottom: 18, containLabel: true },
        xAxis: { type: 'category', data: stats.hourly.map((item) => `${item.hour}时`), axisLabel: axisStyle, axisLine: { lineStyle: { color: '#e2e8f0' } } },
        yAxis: { type: 'value', minInterval: 1, axisLabel: axisStyle, splitLine },
        series: [{ name: 'PV', type: 'bar', barMaxWidth: 18, data: stats.hourly.map((item) => item.pv), itemStyle: { borderRadius: [5, 5, 0, 0] } }],
      },
      pages: {
        color: ['#4f46e5', '#a5b4fc'],
        tooltip,
        legend: { top: 0, textStyle: axisStyle },
        grid: { left: 18, right: 16, top: 42, bottom: 12, containLabel: true },
        xAxis: { type: 'value', minInterval: 1, axisLabel: axisStyle, splitLine },
        yAxis: { type: 'category', inverse: true, data: stats.pages.map((item) => item.name), axisLabel: { ...axisStyle, width: 110, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
        series: [
          { name: 'PV', type: 'bar', data: stats.pages.map((item) => item.pv), barMaxWidth: 16, itemStyle: { borderRadius: [0, 4, 4, 0] } },
          { name: 'UV', type: 'bar', data: stats.pages.map((item) => item.uv), barMaxWidth: 16, itemStyle: { borderRadius: [0, 4, 4, 0] } },
        ],
      },
      sources: {
        color: palette,
        tooltip: { trigger: 'item', formatter: '{b}<br/>PV：{c}（{d}%）' },
        legend: { type: 'scroll', bottom: 0, textStyle: axisStyle },
        series: [{ name: '访问来源', type: 'pie', radius: ['42%', '68%'], center: ['50%', '43%'], avoidLabelOverlap: true, itemStyle: { borderColor: '#fff', borderWidth: 3 }, label: { formatter: '{b}\n{d}%', color: '#64748b' }, data: stats.sources.map((item) => ({ name: item.name, value: item.pv })) }],
      },
      devices: {
        color: palette,
        tooltip: { trigger: 'item', formatter: '{b}<br/>PV：{c}（{d}%）' },
        legend: { bottom: 0, textStyle: axisStyle },
        series: [{ name: '设备类型', type: 'pie', radius: ['45%', '70%'], center: ['50%', '43%'], itemStyle: { borderColor: '#fff', borderWidth: 3 }, label: { formatter: '{b}\n{d}%', color: '#64748b' }, data: stats.devices.map((item) => ({ name: item.name, value: item.pv })) }],
      },
      browsers: {
        color: palette.slice().reverse(),
        tooltip: { trigger: 'item', formatter: '{b}<br/>PV：{c}（{d}%）' },
        legend: { type: 'scroll', bottom: 0, textStyle: axisStyle },
        series: [{ name: '浏览器', type: 'pie', roseType: 'radius', radius: ['28%', '68%'], center: ['50%', '43%'], itemStyle: { borderColor: '#fff', borderWidth: 3 }, label: { formatter: '{b}\n{d}%', color: '#64748b' }, data: stats.browsers.map((item) => ({ name: item.name, value: item.pv })) }],
      },
    };
  }, [stats]);

  const summary = stats?.summary || {};
  const hasVisits = (summary.period_pv || 0) > 0;

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">访问数据分析</h1>
          <p className="mt-1 text-sm text-slate-400">统计时间按北京时间（UTC+8）计算，后台页面不计入访问量。</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={days}
            onChange={setDays}
            options={[7, 30, 90].map((value) => ({ value, label: `近 ${value} 天` }))}
            className="w-28"
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRefreshKey((value) => value + 1)}>
            刷新
          </Button>
        </div>
      </header>

      {error && <Alert type="error" showIcon message={error} />}

      {loading && !stats ? (
        <div className="flex min-h-96 items-center justify-center rounded-2xl bg-white">
          <Spin size="large" tip="正在汇总访问数据..." />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="今日浏览量（PV）" value={formatNumber(summary.today_pv)} hint={`累计 ${formatNumber(summary.total_pv)} 次浏览`} icon={<EyeOutlined />} tone="indigo" />
            <MetricCard title="今日访客（UV）" value={formatNumber(summary.today_uv)} hint={`累计 ${formatNumber(summary.total_uv)} 位访客`} icon={<TeamOutlined />} tone="cyan" />
            <MetricCard title={`近 ${days} 天浏览量`} value={formatNumber(summary.period_pv)} hint={comparisonHint(summary.pv_change_percent, days)} icon={<ThunderboltOutlined />} tone="amber" />
            <MetricCard title={`近 ${days} 天访客`} value={formatNumber(summary.period_uv)} hint={comparisonHint(summary.uv_change_percent, days)} icon={<TeamOutlined />} tone="pink" />
            <MetricCard title={`近 ${days} 天会话`} value={formatNumber(summary.period_sessions)} hint="同一浏览器标签页的一次连续访问" icon={<EyeOutlined />} tone="emerald" />
            <MetricCard title="平均访问深度" value={summary.pages_per_session || 0} hint="平均每个会话浏览的页面数" icon={<ThunderboltOutlined />} tone="violet" />
          </div>

          {!hasVisits ? (
            <div className="rounded-2xl border border-slate-100 bg-white py-20 shadow-sm">
              <Empty description={`近 ${days} 天暂无访问数据`} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="xl:col-span-2">
                <ChartPanel title="PV / UV / 会话趋势" subtitle={`最近 ${days} 个自然日的变化趋势`}>
                  <AnalyticsChart option={chartOptions.trend} height={380} />
                </ChartPanel>
              </div>
              <ChartPanel title="今日访问时段" subtitle="帮助判断访客最活跃的时间段">
                <AnalyticsChart option={chartOptions.hourly} />
              </ChartPanel>
              <ChartPanel title="热门页面 TOP 10" subtitle="比较各公开页面的浏览量和访客数">
                <AnalyticsChart option={chartOptions.pages} />
              </ChartPanel>
              <ChartPanel title="访问来源" subtitle="来源 URL 已按站点和平台归一化">
                <AnalyticsChart option={chartOptions.sources} />
              </ChartPanel>
              <ChartPanel title="设备类型" subtitle="按访问量统计手机、电脑、平板和爬虫">
                <AnalyticsChart option={chartOptions.devices} />
              </ChartPanel>
              <div className="xl:col-span-2">
                <ChartPanel title="浏览器分布" subtitle="用于发现浏览器兼容性测试重点">
                  <AnalyticsChart option={chartOptions.browsers} />
                </ChartPanel>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}


export default VisitStatsPage;
