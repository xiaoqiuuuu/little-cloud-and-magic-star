import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import api, { clearAuthSession } from '../api';
import { showSuccess } from '../utils/message';
import './Navbar.css';


function Navbar({
  isAdminLoggedIn,
  userRole = '',
  brandText = '肥音卤果答题活动',
  homePath = '/quiz',
}) {
  const navigate = useNavigate();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const isQuizOperator = isAdminLoggedIn && userRole === 'quiz_operator';

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await api.post('/admin/logout', {}, {
        hideLoading: true,
        hideErrorMessage: true,
      });
    } catch {
      // 无论服务端状态如何，都清理本地现场账号会话。
    } finally {
      clearAuthSession();
      setLogoutLoading(false);
      showSuccess('已退出登录');
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <nav className="cloud-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={homePath} className="cloud-navbar__brand text-xl font-bold transition-colors">
              🎵 {brandText}
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button type="text" icon={<HomeOutlined />}>
                <span className="hidden sm:inline">回到主页</span>
              </Button>
            </Link>
            {isQuizOperator ? (
              <Button
                danger
                icon={<LogoutOutlined />}
                loading={logoutLoading}
                onClick={handleLogout}
              >
                <span className="hidden sm:inline">退出答题账号</span>
                <span className="sm:hidden">退出</span>
              </Button>
            ) : (
              <Link to={isAdminLoggedIn ? '/admin/questions' : '/admin/login'}>
                <Button
                  type={isAdminLoggedIn ? 'primary' : 'default'}
                  icon={isAdminLoggedIn ? <DashboardOutlined /> : <LoginOutlined />}
                >
                  {isAdminLoggedIn ? (
                    <>
                      <span className="hidden sm:inline">后台管理</span>
                      <span className="sm:hidden">管理</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">账号登录</span>
                      <span className="sm:hidden">登录</span>
                    </>
                  )}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


export default Navbar;
