import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// 配置 NProgress
NProgress.configure({
  showSpinner: false, // 不显示加载旋转器
  speed: 400, // 动画速度
  minimum: 0.08, // 最小百分比
  easing: 'ease', // 缓动动画
  trickleSpeed: 200, // 自动递增间隔
});

function RouterProgressBar() {
  const location = useLocation();

  useEffect(() => {
    // 路由开始切换时启动进度条
    NProgress.start();

    // 设置一个最大等待时间（5秒），防止进度条永远不结束
    const maxTimeout = setTimeout(() => {
      NProgress.done();
    }, 5000);

    // 使用 requestAnimationFrame 等待页面真正渲染完成
    const checkPageReady = () => {
      // 检查文档是否加载完成
      if (document.readyState === 'complete') {
        // 再等待一小段时间确保 React 组件渲染完成
        setTimeout(() => {
          NProgress.done();
        }, 100);
      } else {
        // 如果还没完成，继续检查
        requestAnimationFrame(checkPageReady);
      }
    };

    // 开始检查
    requestAnimationFrame(checkPageReady);

    return () => {
      clearTimeout(maxTimeout);
      NProgress.done();
    };
  }, [location.pathname]);

  return null;
}

export default RouterProgressBar;
