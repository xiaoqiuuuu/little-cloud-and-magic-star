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
import { Button as CloudButton, useCloudUI } from '../ui';
import './Navbar.css';


function Navbar({
  isAdminLoggedIn,
  quizOnlyAccount = false,
  adminPath = '/admin',
  brandText = '肥音卤果答题活动',
  mobileBrandText = '',
  homePath = '/quiz',
  characterActions = false,
}) {
  const navigate = useNavigate();
  const { characterPack } = useCloudUI();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const isQuizOperator = isAdminLoggedIn && quizOnlyAccount;

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
      <div className="cloud-navbar__container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="cloud-navbar__row flex justify-between h-16">
          <div className="cloud-navbar__brand-wrap flex items-center">
            <Link to={homePath} className="cloud-navbar__brand text-xl font-bold transition-colors">
              {characterActions && (
                <span className="cloud-navbar__character" aria-hidden="true">
                  <img src={characterPack.assets.buttonAvatar} alt="" draggable="false" />
                </span>
              )}
              <span className={mobileBrandText ? 'cloud-navbar__brand-text hidden sm:inline' : 'cloud-navbar__brand-text'}>
                {brandText}
              </span>
              {mobileBrandText && (
                <span className="cloud-navbar__brand-text sm:hidden">{mobileBrandText}</span>
              )}
            </Link>
          </div>
          <div className="cloud-navbar__actions flex items-center space-x-3">
            {characterActions ? (
              <>
                <CloudButton
                  variant="ghost"
                  size="small"
                  prefix={<HomeOutlined />}
                  onClick={() => navigate('/')}
                >
                  <span className="hidden sm:inline">回到主页</span>
                  <span className="sm:hidden">主页</span>
                </CloudButton>
                {isQuizOperator ? (
                  <CloudButton
                    variant="ghost"
                    size="small"
                    prefix={<LogoutOutlined />}
                    loading={logoutLoading}
                    onClick={handleLogout}
                  >
                    <span className="hidden sm:inline">退出答题账号</span>
                    <span className="sm:hidden">退出</span>
                  </CloudButton>
                ) : (
                  <CloudButton
                    variant="secondary"
                    size="small"
                    prefix={isAdminLoggedIn ? <DashboardOutlined /> : <LoginOutlined />}
                    onClick={() => navigate(isAdminLoggedIn ? adminPath : '/admin/login')}
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
                  </CloudButton>
                )}
              </>
            ) : (
              <>
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
                  <Link to={isAdminLoggedIn ? adminPath : '/admin/login'}>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


export default Navbar;
