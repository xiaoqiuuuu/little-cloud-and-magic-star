import axios from 'axios';
import { showError, showLoading } from './utils/message';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒超时
});

// 请求计数器（用于全局 loading）
let requestCount = 0;
let loadingInstance = null;

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    // 自动添加 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 显示全局 loading（可通过 config.hideLoading = true 禁用）
    if (!config.hideLoading) {
      requestCount++;
      if (requestCount === 1) {
        loadingInstance = showLoading('加载中...');
      }
    }

    return config;
  },
  (error) => {
    requestCount--;
    if (requestCount === 0 && loadingInstance) {
      loadingInstance();
      loadingInstance = null;
    }
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    // 关闭 loading
    requestCount--;
    if (requestCount === 0 && loadingInstance) {
      loadingInstance();
      loadingInstance = null;
    }
    return response;
  },
  (error) => {
    // 关闭 loading
    requestCount--;
    if (requestCount === 0 && loadingInstance) {
      loadingInstance();
      loadingInstance = null;
    }

    // 处理错误
    if (error.response) {
      const { status, data } = error.response;
      const errorMsg = data?.detail || data?.message || '操作失败';

      if (status === 401) {
        showError('登录已过期，请重新登录');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userRole');
          window.dispatchEvent(new Event('authChange'));
          window.location.href = '/admin/login';
        }, 1500);
      } else if (status === 403) {
        showError('没有权限执行此操作');
      } else if (status === 404) {
        showError(errorMsg);
      } else if (status >= 500) {
        showError('服务器错误，请稍后重试');
      } else if (!error.config.hideErrorMessage) {
        // 可以通过 config.hideErrorMessage = true 禁用错误提示
        showError(errorMsg);
      }
    } else if (error.request) {
      showError('网络错误，请检查网络连接');
    } else {
      showError(error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

export default api;
