import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { HomeOutlined, LoginOutlined, DashboardOutlined } from '@ant-design/icons';

function Navbar({ isAdminLoggedIn }) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/quiz" className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
              🎵 肥音卤果答题活动
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/">
              <Button type="text" icon={<HomeOutlined />}>
                <span className="hidden sm:inline">回到主页</span>
              </Button>
            </Link>
            <Link to={isAdminLoggedIn ? '/admin/questions' : '/admin/login'}>
              <Button 
                type={isAdminLoggedIn ? "primary" : "default"}
                icon={isAdminLoggedIn ? <DashboardOutlined /> : <LoginOutlined />}
              >
                {isAdminLoggedIn ? (
                  <>
                    <span className="hidden sm:inline">后台管理</span>
                    <span className="sm:hidden">管理</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">管理员登录</span>
                    <span className="sm:hidden">登录</span>
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
