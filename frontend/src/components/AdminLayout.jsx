import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // 路由变化时关闭菜单
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('authChange', { detail: { token: null } }));
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="text-xl font-bold text-gray-800 mr-8">
                后台管理
              </div>
              {/* 桌面端导航链接 */}
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/admin/questions"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin/questions')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  题目管理
                </Link>
                <Link
                  to="/admin/materials"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin/materials')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  物料管理
                </Link>
                <Link
                  to="/admin/producers"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin/producers')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  制作人管理
                </Link>
              </div>
            </div>
            
            {/* 桌面端退出按钮 */}
            <div className="hidden md:flex items-center">
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                退出登录
              </button>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">打开菜单</span>
                {/* 汉堡菜单图标 */}
                {!isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/admin/questions"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/admin/questions')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                题目管理
              </Link>
              <Link
                to="/admin/materials"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/admin/materials')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                物料管理
              </Link>
              <Link
                to="/admin/producers"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/admin/producers')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                制作人管理
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50"
              >
                退出登录
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
