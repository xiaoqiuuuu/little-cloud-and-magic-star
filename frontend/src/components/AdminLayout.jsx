import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Drawer, Typography } from 'antd';
import {
  QuestionCircleOutlined,
  PictureOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { showSuccess } from '../utils/message';

const { Header, Content } = Layout;
const { Title } = Typography;

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('authChange', { detail: { token: null } }));
    showSuccess('已退出登录');
    navigate('/admin/login');
  };

  const menuItems = [
    {
      key: '/admin/questions',
      icon: <QuestionCircleOutlined />,
      label: <Link to="/admin/questions">题目管理</Link>,
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

        {/* 桌面端退出按钮 */}
        <div className="hidden md:block">
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
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
          >
            退出登录
          </Button>
        </div>
      </Drawer>

      <Content className="p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}

export default AdminLayout;
