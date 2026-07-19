import { Link, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Drawer, Typography, Spin } from 'antd';
import {
  QuestionCircleOutlined,
  PictureOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { showSuccess } from '../utils/message';
import api, { clearAuthSession, getDeduplicated } from '../api';
import { hasContentAdminAccess } from '../utils/adminAccess';

const { Header, Content } = Layout;
const { Title } = Typography;

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const hasSession = localStorage.getItem('token') || localStorage.getItem('refreshToken');
    if (!hasSession) {
      setAuthLoading(false);
      navigate('/admin/login');
      return;
    }

    let cancelled = false;
    getDeduplicated('/admin/me', { hideLoading: true, hideErrorMessage: true })
      .then((response) => {
        if (cancelled) return;
        setCurrentUser(response.data);
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('userRole', response.data.role);
        localStorage.setItem('currentUserId', String(response.data.id));
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await api.post('/admin/logout', {}, {
        hideLoading: true,
        hideErrorMessage: true,
      });
    } catch {
      // 本地会话仍需清除，服务端 Token 可能已经过期或失效。
    } finally {
      clearAuthSession();
      setLogoutLoading(false);
      showSuccess('已退出登录');
      navigate('/admin/login');
    }
  };

  const username = currentUser?.username || '';
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'super_admin';

  if (!authLoading && !currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!authLoading && !hasContentAdminAccess(currentUser)) {
    return <Navigate to="/quiz" replace />;
  }

  const menuItems = [
    {
      key: '/admin/questions',
      icon: <QuestionCircleOutlined />,
      label: <Link to="/admin/questions">题目管理</Link>,
    },
    {
      key: '/admin/stats',
      icon: <BarChartOutlined />,
      label: <Link to="/admin/stats">访问统计</Link>,
    },
    {
      key: '/admin/materials',
      icon: <PictureOutlined />,
      label: <Link to="/admin/materials">物料管理</Link>,
    },
    {
      key: '/admin/producers',
      icon: <UserOutlined />,
      label: <Link to="/admin/producers">制作人管理</Link>,
    },
    {
      key: '/admin/roles',
      icon: <TeamOutlined />,
      label: <Link to="/admin/roles">角色管理</Link>,
    },
    ...(isSuperAdmin ? [{
      key: '/quiz',
      icon: <PlayCircleOutlined />,
      label: <Link to="/quiz">现场答题</Link>,
    }, {
      key: '/admin/activities',
      icon: <CalendarOutlined />,
      label: <Link to="/admin/activities">答题活动</Link>,
    }, {
      key: '/admin/users',
      icon: <UsergroupAddOutlined />,
      label: <Link to="/admin/users">人员管理</Link>,
    }] : []),
  ];

  const currentPath = location.pathname;

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-sm flex items-center justify-between px-4 sticky top-0 z-10 border-b">
        <div className="flex items-center flex-1">
          <Title level={4} className="!mb-0 !mr-8">
            🎵 后台管理
          </Title>

          {/* 桌面端菜单 */}
          <Menu
            mode="horizontal"
            selectedKeys={[currentPath]}
            items={menuItems}
            className="flex-1 border-0 hidden md:flex"
            style={{ minWidth: 0 }}
          />
        </div>

        {/* 用户信息显示 */}
        <div className="hidden md:flex items-center gap-3 mr-4">
          <span className="text-sm text-gray-600">
            <span className="font-medium">{username}</span>
            {isSuperAdmin ? (
              <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                超级管理员
              </span>
            ) : (
              <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                题目管理员
              </span>
            )}
          </span>
        </div>

        {/* 桌面端退出按钮 */}
        <div className="hidden md:block">
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            loading={logoutLoading}
          >
            退出登录
          </Button>
        </div>

        {/* 移动端菜单按钮 */}
        <Button
          className="md:hidden"
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setDrawerVisible(true)}
        />
      </Header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title="后台管理"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="md:hidden"
      >
        {/* 移动端用户信息 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-800">{username}</div>
          <div className="text-sm mt-1">
            {isSuperAdmin ? (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                超级管理员
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                题目管理员
              </span>
            )}
          </div>
        </div>
        <Menu
          mode="vertical"
          selectedKeys={[currentPath]}
          items={menuItems}
          className="border-0"
          onClick={() => setDrawerVisible(false)}
        />
        <div className="mt-4 pt-4 border-t">
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={() => {
              setDrawerVisible(false);
              handleLogout();
            }}
            block
            loading={logoutLoading}
          >
            退出登录
          </Button>
        </div>
      </Drawer>

      <Content className="p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {authLoading ? (
            <div className="flex justify-center py-20">
              <Spin size="large" tip="正在验证登录状态..." />
            </div>
          ) : (
            <Outlet context={{ currentUser, authLoading }} />
          )}
        </div>
      </Content>
    </Layout>
  );
}

export default AdminLayout;
