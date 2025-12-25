import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import QuizPage from './pages/QuizPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import MaterialManager from './pages/MaterialManager';
import ProducerManager from './pages/ProducerManager';
import AdminLayout from './components/AdminLayout';
import Navbar from './components/Navbar';
import { useEffect, useState } from 'react';

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
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* 公开页面，带有顶部导航 */}
          <Route path="/" element={
            <>
              <Navbar isAdminLoggedIn={isAdminLoggedIn} />
              <QuizPage />
            </>
          } />
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
            <Route path="materials" element={<MaterialManager />} />
            <Route path="producers" element={<ProducerManager />} />
            {/* 兼容旧路由 */}
            <Route path="dashboard" element={<Navigate to="questions" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
