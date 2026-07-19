import axios from 'axios';
import { showError, showLoading } from './utils/message';
import {
  createLatestRequestCoordinator,
  createRequestDeduper,
} from './utils/requestControl';


const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let requestCount = 0;
let loadingInstance = null;
let refreshPromise = null;
let sessionExpirationHandled = false;
const deduplicateRequest = createRequestDeduper();
const coordinateLatestRequest = createLatestRequestCoordinator();


const getSessionRequestScope = () => (
  localStorage.getItem('token')
  || localStorage.getItem('refreshToken')
  || 'anonymous'
);


const getRequestKey = (url, config) => api.getUri({
  ...config,
  method: 'get',
  url,
});


export const getDeduplicated = (url, config = {}) => {
  const requestKey = `${getSessionRequestScope()}:${getRequestKey(url, config)}`;
  return deduplicateRequest(requestKey, () => api.get(url, config));
};


export const getLatest = (scope, url, config = {}, requestVariant = '') => {
  const sessionScope = getSessionRequestScope();
  const requestKey = `${sessionScope}:${getRequestKey(url, config)}:${requestVariant}`;
  return coordinateLatestRequest(
    scope,
    requestKey,
    (signal) => api.get(url, { ...config, signal }),
  );
};


export const isRequestCanceled = (error) => axios.isCancel(error);


export const saveTokenPair = (tokenData) => {
  localStorage.setItem('token', tokenData.access_token);
  localStorage.setItem('refreshToken', tokenData.refresh_token);
  sessionExpirationHandled = false;
};


export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUserId');
  window.dispatchEvent(new CustomEvent('authChange', { detail: { token: null } }));
};


const finishLoading = (config) => {
  if (!config?.usesGlobalLoading) {
    return;
  }

  requestCount = Math.max(0, requestCount - 1);
  config.usesGlobalLoading = false;
  if (requestCount === 0 && loadingInstance) {
    loadingInstance();
    loadingInstance = null;
  }
};


const refreshSession = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('缺少 Refresh Token');
  }

  try {
    const response = await axios.post('/api/admin/refresh', {
      refresh_token: refreshToken,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    saveTokenPair(response.data);
    return response.data.access_token;
  } catch (error) {
    // 另一个浏览器标签页可能已完成 Refresh Token 轮换。
    const latestRefreshToken = localStorage.getItem('refreshToken');
    const latestAccessToken = localStorage.getItem('token');
    if (latestRefreshToken && latestRefreshToken !== refreshToken && latestAccessToken) {
      return latestAccessToken;
    }
    throw error;
  }
};


const expireSession = () => {
  if (sessionExpirationHandled) {
    return;
  }
  sessionExpirationHandled = true;
  clearAuthSession();
  showError('登录已过期，请重新登录');
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
  }
};


api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (!config.hideLoading) {
      requestCount += 1;
      config.usesGlobalLoading = true;
      if (requestCount === 1) {
        loadingInstance = showLoading('加载中...');
      }
    }

    return config;
  },
  (error) => {
    finishLoading(error.config);
    return Promise.reject(error);
  },
);


api.interceptors.response.use(
  (response) => {
    finishLoading(response.config);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    finishLoading(originalRequest);

    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !originalRequest.skipAuthRefresh
      && localStorage.getItem('refreshToken')
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (!originalRequest.skipAuthRedirect) {
          expireSession();
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      const errorMsg = data?.detail || data?.message || '操作失败';

      if (status === 401) {
        if (!originalRequest?.skipAuthRedirect) {
          expireSession();
        }
      } else if (status === 403) {
        if (!originalRequest?.hideErrorMessage) {
          showError(errorMsg || '没有权限执行此操作');
        }
      } else if (status === 404) {
        if (!originalRequest?.hideErrorMessage) {
          showError(errorMsg);
        }
      } else if (status >= 500) {
        if (!originalRequest?.hideErrorMessage) {
          showError('服务器错误，请稍后重试');
        }
      } else if (!originalRequest?.hideErrorMessage) {
        showError(errorMsg);
      }
    } else if (error.request) {
      if (!originalRequest?.hideErrorMessage) {
        showError('网络错误，请检查网络连接');
      }
    } else if (!originalRequest?.hideErrorMessage) {
      showError(error.message || '操作失败');
    }

    return Promise.reject(error);
  },
);


export default api;
