import { Link } from 'react-router-dom';

function Navbar({ isAdminLoggedIn }) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              肥音卤果答题活动
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              开始答题
            </Link>
            <Link
              to={isAdminLoggedIn ? '/admin/questions' : '/admin/login'}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
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
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
