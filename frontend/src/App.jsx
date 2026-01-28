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
import VisitStatsPage from './pages/VisitStatsPage';
import AdminLayout from './components/AdminLayout';
import Navbar from './components/Navbar';
import RouterProgressBar from './components/RouterProgressBar';
import { useEffect, useState } from 'react';
import 'antd/dist/reset.css'; // Ant Design 样式

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        setIsAdminLoggedIn(!!e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    // 监听自定义事件，处理当前窗口内的登录/登出变更
    const onAuthChange = (e) => {
      setIsAdminLoggedIn(!!localStorage.getItem('token'));
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
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* 首页 - 产品介绍 */}
              <Route path="/" element={<HomePage />} />
              {/* 规则介绍页面 */}
              <Route path="/rules" element={<GameRules />} />
              
              {/* 答题页面 */}
              <Route path="/quiz" element={
                <>
                  <Navbar isAdminLoggedIn={isAdminLoggedIn} />
                  <QuizPage />
                </>
              } />
              
              {/* 管理员登录 */}
              <Route path="/admin/login" element={
                <>
                  <Navbar isAdminLoggedIn={isAdminLoggedIn} />
                  <AdminLogin />
                </>
              } />

              {/* 后台管理区域，使用 AdminLayout */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="questions" replace />} />
                <Route path="questions" element={<AdminDashboard />} />
                <Route path="stats" element={<VisitStatsPage />} />
                <Route path="materials" element={<MaterialManager />} />
                <Route path="producers" element={<ProducerManager />} />
                <Route path="roles" element={<RoleManager />} />
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
