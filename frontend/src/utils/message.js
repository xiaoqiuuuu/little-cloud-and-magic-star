/**
 * 全局消息通知工具
 * 基于 Ant Design 的 message 和 notification
 */

import { message, notification } from 'antd';

// 配置 message 全局属性
message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
});

// 配置 notification 全局属性
notification.config({
  placement: 'topRight',
  duration: 4.5,
  top: 80,
});

/**
 * 显示成功消息
 */
export const showSuccess = (content, duration = 3) => {
  message.success(content, duration);
};

/**
 * 显示错误消息
 */
export const showError = (content, duration = 3) => {
  message.error(content, duration);
};

/**
 * 显示警告消息
 */
export const showWarning = (content, duration = 3) => {
  message.warning(content, duration);
};

/**
 * 显示普通消息
 */
export const showInfo = (content, duration = 3) => {
  message.info(content, duration);
};

/**
 * 显示加载中消息
 */
export const showLoading = (content = '加载中...') => {
  return message.loading(content, 0); // 0 表示不自动关闭
};

/**
 * 显示成功通知
 */
export const notifySuccess = (title, description) => {
  notification.success({
    message: title,
    description: description,
  });
};

/**
 * 显示错误通知
 */
export const notifyError = (title, description) => {
  notification.error({
    message: title,
    description: description,
  });
};

/**
 * 显示警告通知
 */
export const notifyWarning = (title, description) => {
  notification.warning({
    message: title,
    description: description,
  });
};

/**
 * 显示普通通知
 */
export const notifyInfo = (title, description) => {
  notification.info({
    message: title,
    description: description,
  });
};

/**
 * 处理 API 错误
 */
export const handleApiError = (error, defaultMessage = '操作失败') => {
  if (error.response) {
    // 服务器返回错误
    const { status, data } = error.response;
    const errorMsg = data?.detail || data?.message || defaultMessage;
    
    if (status === 401) {
      showError('登录已过期，请重新登录');
      // 清除 token 并跳转到登录页
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
      showError('请求的资源不存在');
    } else if (status >= 500) {
      showError('服务器错误，请稍后重试');
    } else {
      showError(errorMsg);
    }
  } else if (error.request) {
    // 请求已发出但没有收到响应
    showError('网络错误，请检查网络连接');
  } else {
    // 其他错误
    showError(error.message || defaultMessage);
  }
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  handleApiError,
};
