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
import { useCloudUI } from '../ui';
import AdminThemeSwitcher from './admin/AdminThemeSwitcher';
import './AdminLayout.css';

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
  const { mode, theme, characterPack } = useCloudUI();

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
  const roleBadgeClassName = `admin-role-badge ${isSuperAdmin ? 'is-super' : 'is-admin'}`;

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
    <Layout className="cloud-admin-shell">
      <Sider
        theme={mode === 'dark' ? 'dark' : 'light'}
        width={224}
        collapsedWidth={72}
        collapsed={siderCollapsed}
        trigger={null}
        className="cloud-admin-sider hidden md:block"
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div className={`cloud-admin-brand ${siderCollapsed ? 'is-collapsed' : ''}`}>
          <span className="cloud-admin-brand__avatar" aria-hidden="true">
            <img src={characterPack.assets.buttonAvatar} alt="" draggable="false" />
          </span>
          {!siderCollapsed && (
            <span className="cloud-admin-brand__copy">
              <strong>后台管理</strong>
              <small>{theme.name} · {characterPack.name}</small>
            </span>
          )}
        </div>
        <Menu
          theme={mode === 'dark' ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          className="cloud-admin-menu"
          inlineIndent={18}
        />
      </Sider>

      <Layout className="min-w-0">
        <Header className="cloud-admin-header">
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
            <Title level={5} className="cloud-admin-header__title !mb-0 truncate">
              {currentPageTitle}
            </Title>
          </div>

          <div className="cloud-admin-header__actions">
            <AdminThemeSwitcher />
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
              <div className="cloud-admin-user hidden md:flex">
                <Button
                  type="text"
                  icon={<UserOutlined />}
                  className="cloud-admin-user__profile"
                  onClick={() => navigate('/admin/profile')}
                >
                  {displayName}
                </Button>
                <span className={roleBadgeClassName}>
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

        <Content className="cloud-admin-content">
          <div className="cloud-admin-content__inner">
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
        title={(
          <span className="cloud-admin-drawer__title">
            <span className="cloud-admin-brand__avatar" aria-hidden="true">
              <img src={characterPack.assets.buttonAvatar} alt="" draggable="false" />
            </span>
            后台管理
          </span>
        )}
        placement="left"
        width={288}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="cloud-admin-drawer md:hidden"
      >
        <div className="cloud-admin-drawer-profile">
          <strong>{displayName}</strong>
          <span className="cloud-admin-drawer-profile__username">{username}</span>
          {!authLoading && currentUser && (
            <div className="cloud-admin-drawer-profile__role">
              <span className={roleBadgeClassName}>
                {roleLabel}
              </span>
            </div>
          )}
          <Button
            className="cloud-admin-drawer-profile__edit"
            icon={<UserOutlined />}
            onClick={() => {
              setDrawerVisible(false);
              navigate('/admin/profile');
            }}
            block
          >
            编辑个人资料
          </Button>
          <div className={`cloud-admin-drawer-links ${isSuperAdmin ? 'is-double' : ''}`}>
            <Button icon={<GlobalOutlined />} href="/" target="_blank" rel="noreferrer">预览官网</Button>
            {isSuperAdmin && (
              <Button icon={<PlayCircleOutlined />} href="/quiz" target="_blank" rel="noreferrer">现场答题</Button>
            )}
          </div>
        </div>
        <div className="cloud-admin-drawer-theme">
          <AdminThemeSwitcher variant="panel" />
        </div>
        <Menu
          theme={mode === 'dark' ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          items={menuItems}
          className="cloud-admin-menu"
          inlineIndent={18}
          onClick={() => setDrawerVisible(false)}
        />
        <div className="cloud-admin-drawer-logout">
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
