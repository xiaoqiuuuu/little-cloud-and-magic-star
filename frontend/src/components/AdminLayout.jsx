import { Link, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Drawer, Typography, Spin } from 'antd';
import {
  QuestionCircleOutlined,
  PictureOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  GlobalOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { showSuccess } from '../utils/message';
import api, { clearAuthSession, getDeduplicated } from '../api';
import { hasContentAdminAccess } from '../utils/adminAccess';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const PAGE_TITLES = {
  '/admin/questions': '题目管理',
  '/admin/quiz': '题目调试',
  '/admin/materials': '物料管理',
  '/admin/roles': '内容角色',
  '/admin/site-events': '官网活动',
  '/admin/activities': '答题活动',
  '/admin/stats': '访问分析',
  '/admin/users': '账号与权限',
  '/admin/profile': '个人资料',
};

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [siderCollapsed, setSiderCollapsed] = useState(false);
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
  const displayName = currentUser?.display_name || username;
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'super_admin';
  const roleLabel = isSuperAdmin ? '超级管理员' : '题目管理员';
  const roleBadgeClassName = isSuperAdmin
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';

  if (!authLoading && !currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!authLoading && !hasContentAdminAccess(currentUser)) {
    return <Navigate to="/quiz" replace />;
  }

  const menuItems = [
    {
      type: 'group',
      key: 'content-group',
      label: '内容中心',
      children: [
        {
          key: '/admin/questions',
          icon: <QuestionCircleOutlined />,
          label: <Link to="/admin/questions">题目</Link>,
        },
        {
          key: '/admin/materials',
          icon: <PictureOutlined />,
          label: <Link to="/admin/materials">物料</Link>,
        },
        {
          key: '/admin/roles',
          icon: <TeamOutlined />,
          label: <Link to="/admin/roles">内容角色</Link>,
        },
      ],
    },
    ...(isSuperAdmin ? [{
      type: 'group',
      key: 'activity-group',
      label: '活动运营',
      children: [
        {
          key: '/admin/site-events',
          icon: <GlobalOutlined />,
          label: <Link to="/admin/site-events">官网活动</Link>,
        },
        {
          key: '/admin/activities',
          icon: <CalendarOutlined />,
          label: <Link to="/admin/activities">答题活动</Link>,
        },
      ],
    }] : []),
    {
      type: 'group',
      key: 'analytics-group',
      label: '数据分析',
      children: [
        {
          key: '/admin/stats',
          icon: <BarChartOutlined />,
          label: <Link to="/admin/stats">访问分析</Link>,
        },
      ],
    },
    ...(isSuperAdmin ? [{
      type: 'group',
      key: 'system-group',
      label: '系统设置',
      children: [
        {
          key: '/admin/users',
          icon: <UsergroupAddOutlined />,
          label: <Link to="/admin/users">账号与权限</Link>,
        },
      ],
    }] : []),
  ];

  const currentPath = location.pathname;
  const selectedMenuKey = currentPath.startsWith('/admin/quiz')
    ? '/admin/questions'
    : currentPath;
  const currentPageTitle = currentPath.startsWith('/admin/quiz')
    ? PAGE_TITLES['/admin/quiz']
    : PAGE_TITLES[selectedMenuKey] || '后台管理';

  return (
    <Layout className="min-h-screen">
      <Sider
        theme="light"
        width={224}
        collapsedWidth={72}
        collapsed={siderCollapsed}
        trigger={null}
        className="hidden md:block border-r border-gray-200"
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div className={`h-16 flex items-center border-b border-gray-100 ${siderCollapsed ? 'justify-center' : 'px-5'}`}>
          <span className="text-xl" aria-hidden="true">🎵</span>
          {!siderCollapsed && (
            <span className="ml-3 font-semibold text-gray-800 whitespace-nowrap">后台管理</span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          className="border-0 py-3"
          inlineIndent={18}
        />
      </Sider>

      <Layout className="min-w-0">
        <Header className="bg-white flex items-center justify-between !px-4 md:!px-6 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
          <div className="flex items-center min-w-0">
            <Button
              className="hidden md:inline-flex mr-3"
              type="text"
              icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setSiderCollapsed((collapsed) => !collapsed)}
              aria-label={siderCollapsed ? '展开导航' : '收起导航'}
            />
            <Button
              className="md:hidden mr-2"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              aria-label="打开导航"
            />
            <Title level={5} className="!mb-0 truncate">
              {currentPageTitle}
            </Title>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              className="hidden lg:inline-flex"
              type="text"
              icon={<GlobalOutlined />}
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              预览官网
            </Button>
            {isSuperAdmin && (
              <Button
                className="hidden lg:inline-flex"
                type="text"
                icon={<PlayCircleOutlined />}
                href="/quiz"
                target="_blank"
                rel="noreferrer"
              >
                现场答题
              </Button>
            )}
            {!authLoading && currentUser && (
              <div className="hidden md:flex items-center ml-1 mr-1">
                <Button
                  type="text"
                  icon={<UserOutlined />}
                  onClick={() => navigate('/admin/profile')}
                >
                  {displayName}
                </Button>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${roleBadgeClassName}`}>
                  {roleLabel}
                </span>
              </div>
            )}
            <Button
              className="hidden md:inline-flex"
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              loading={logoutLoading}
            >
              退出
            </Button>
          </div>
        </Header>

        <Content className="p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {authLoading ? (
              <div className="flex justify-center py-20">
                <Spin size="large" tip="正在验证登录状态..." />
              </div>
            ) : (
              <Outlet
                context={{
                  currentUser,
                  authLoading,
                  onCurrentUserChange: setCurrentUser,
                }}
              />
            )}
          </div>
        </Content>
      </Layout>

      <Drawer
        title={<span><span className="mr-2" aria-hidden="true">🎵</span>后台管理</span>}
        placement="left"
        width={288}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="md:hidden"
      >
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-800">{displayName}</div>
          <div className="text-xs text-gray-500 mt-0.5">{username}</div>
          {!authLoading && currentUser && (
            <div className="mt-1">
              <span className={`px-2 py-0.5 rounded text-xs ${roleBadgeClassName}`}>
                {roleLabel}
              </span>
            </div>
          )}
          <Button
            className="mt-4"
            icon={<UserOutlined />}
            onClick={() => {
              setDrawerVisible(false);
              navigate('/admin/profile');
            }}
            block
          >
            编辑个人资料
          </Button>
          <div className={`grid gap-2 mt-4 ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button icon={<GlobalOutlined />} href="/" target="_blank" rel="noreferrer">预览官网</Button>
            {isSuperAdmin && (
              <Button icon={<PlayCircleOutlined />} href="/quiz" target="_blank" rel="noreferrer">现场答题</Button>
            )}
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          className="border-0"
          inlineIndent={18}
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
    </Layout>
  );
}

export default AdminLayout;
