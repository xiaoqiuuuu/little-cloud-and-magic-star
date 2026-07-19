import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import GameRules from './pages/GameRules';
import QuizPage from './pages/QuizPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import MaterialManager from './pages/MaterialManager';
import ProducerManager from './pages/ProducerManager';
import RoleManager from './pages/RoleManager';
import AdminUserManager from './pages/AdminUserManager';
import QuizActivityManager from './pages/QuizActivityManager';
import SiteEventManager from './pages/SiteEventManager';
import AdminLayout from './components/AdminLayout';
import RequireSuperAdmin from './components/RequireSuperAdmin';
import Navbar from './components/Navbar';
import RouterProgressBar from './components/RouterProgressBar';
import AnalyticsTracker from './components/AnalyticsTracker';
import { lazy, Suspense, useEffect, useState } from 'react';
import 'antd/dist/reset.css'; // Ant Design 样式


const VisitStatsPage = lazy(() => import('./pages/VisitStatsPage'));

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        setIsAdminLoggedIn(!!e.newValue);
      }
      if (e.key === 'userRole') {
        setUserRole(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    // 监听自定义事件，处理当前窗口内的登录/登出变更
    const onAuthChange = (e) => {
      setIsAdminLoggedIn(!!localStorage.getItem('token'));
      setUserRole(localStorage.getItem('userRole') || '');
    };
    window.addEventListener('authChange', onAuthChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      // 清理自定义事件监听
      window.removeEventListener('authChange', onAuthChange);
    };
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouterProgressBar />
          <AnalyticsTracker />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* 首页 - 产品介绍 */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:slug" element={<HomePage />} />
              {/* 规则介绍页面 */}
              <Route path="/rules" element={<GameRules />} />
              
              {/* 答题页面 */}
              <Route path="/quiz" element={
                <>
                  <Navbar isAdminLoggedIn={isAdminLoggedIn} userRole={userRole} />
                  <QuizPage />
                </>
              } />
              
              {/* 管理员登录 */}
              <Route path="/admin/login" element={
                isAdminLoggedIn ? (
                  <Navigate
                    to={userRole === 'quiz_operator' ? '/quiz' : '/admin/questions'}
                    replace
                  />
                ) : (
                  <>
                    <Navbar isAdminLoggedIn={isAdminLoggedIn} userRole={userRole} />
                    <AdminLogin />
                  </>
                )
              } />

              {/* 后台管理区域，使用 AdminLayout */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="questions" replace />} />
                <Route path="questions" element={<AdminDashboard />} />
                <Route path="stats" element={
                  <Suspense fallback={<div className="py-20 text-center text-gray-400">正在加载统计图表...</div>}>
                    <VisitStatsPage />
                  </Suspense>
                } />
                <Route path="materials" element={<MaterialManager />} />
                <Route path="producers" element={<ProducerManager />} />
                <Route path="roles" element={<RoleManager />} />
                <Route path="users" element={
                  <RequireSuperAdmin>
                    <AdminUserManager />
                  </RequireSuperAdmin>
                } />
                <Route path="activities" element={
                  <RequireSuperAdmin>
                    <QuizActivityManager />
                  </RequireSuperAdmin>
                } />
                <Route path="site-events" element={
                  <RequireSuperAdmin>
                    <SiteEventManager />
                  </RequireSuperAdmin>
                } />
                {/* 兼容旧路由 */}
                <Route path="dashboard" element={<Navigate to="questions" replace />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
