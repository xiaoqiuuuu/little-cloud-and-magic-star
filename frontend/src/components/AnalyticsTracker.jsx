import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';


const memoryIds = {};
let lastReportKey = '';
let lastReportAt = 0;


const randomId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};


const persistentId = (storage, key) => {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = randomId();
    storage.setItem(key, created);
    return created;
  } catch {
    memoryIds[key] ||= randomId();
    return memoryIds[key];
  }
};


function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || '/';
    if (path.startsWith('/admin')) return;

    const now = Date.now();
    if (lastReportKey === path && now - lastReportAt < 2000) return;
    lastReportKey = path;
    lastReportAt = now;

    api.post('/stats/visit', {
      path,
      referrer: document.referrer,
      visitor_id: persistentId(window.localStorage, 'analyticsVisitorId'),
      session_id: persistentId(window.sessionStorage, 'analyticsSessionId'),
    }, {
      hideLoading: true,
      hideErrorMessage: true,
      skipAuthRefresh: true,
      skipAuthRedirect: true,
    }).catch(() => {
      // 统计失败不能影响正常页面访问。
    });
  }, [location.pathname]);

  return null;
}


export default AnalyticsTracker;
