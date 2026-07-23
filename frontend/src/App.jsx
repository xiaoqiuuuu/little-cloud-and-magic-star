import { BrowserRouter as Router, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import GameRules from './pages/GameRules';
import QuizPage from './pages/QuizPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import MaterialManager from './pages/MaterialManager';
import AdminProfile from './pages/AdminProfile';
import RoleManager from './pages/RoleManager';
import AdminUserManager from './pages/AdminUserManager';
import QuizActivityManager from './pages/QuizActivityManager';
import AdminQuizPage from './pages/AdminQuizPage';
import SiteEventManager from './pages/SiteEventManager';
import AdminLayout from './components/AdminLayout';
import RequirePermission from './components/RequirePermission';
import Navbar from './components/Navbar';
import RouterProgressBar from './components/RouterProgressBar';
import AnalyticsTracker from './components/AnalyticsTracker';
import { CloudUIProvider, useCloudUI } from './ui';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  PERMISSIONS,
  canAccessBackend,
  getDefaultAccessPath,
  readStoredPermissions,
} from './utils/adminAccess';
import 'antd/dist/reset.css'; // Ant Design 样式


const VisitStatsPage = lazy(() => import('./pages/VisitStatsPage'));
const ComponentLibraryPage = lazy(() => import('./pages/ComponentLibraryPage'));


function AdminIndexRedirect() {
  const { currentUser } = useOutletContext();
  return <Navigate to={getDefaultAccessPath(currentUser)} replace />;
}

function AppContent() {
  const { mode, tokens } = useCloudUI();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [userPermissions, setUserPermissions] = useState(readStoredPermissions);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        setIsAdminLoggedIn(!!e.newValue);
      }
      if (e.key === 'userRole') {
        setUserRole(e.newValue || '');
      }
      if (e.key === 'userPermissions') {
        setUserPermissions(readStoredPermissions());
      }
    };
    window.addEventListener('storage', onStorage);
    // 监听自定义事件，处理当前窗口内的登录/登出变更
    const onAuthChange = (e) => {
      setIsAdminLoggedIn(!!localStorage.getItem('token'));
      setUserRole(localStorage.getItem('userRole') || '');
      setUserPermissions(readStoredPermissions());
    };
    const onAccessChange = () => {
      setUserRole(localStorage.getItem('userRole') || '');
      setUserPermissions(readStoredPermissions());
    };
    window.addEventListener('authChange', onAuthChange);
    window.addEventListener('accessChange', onAccessChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      // 清理自定义事件监听
      window.removeEventListener('authChange', onAuthChange);
      window.removeEventListener('accessChange', onAccessChange);
    };
  }, []);

  const storedUser = { role: userRole, permissions: userPermissions };
  const canOperateQuiz = userPermissions.includes(PERMISSIONS.QUIZ_OPERATE);
  const hasBackendAccess = canAccessBackend(storedUser);
  const quizOnlyAccount = canOperateQuiz && !hasBackendAccess;
  const defaultAccessPath = userPermissions.length > 0
    ? getDefaultAccessPath(storedUser)
    : '/admin';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: tokens.colorPrimary,
          colorInfo: tokens.colorInfo,
          colorSuccess: tokens.colorSuccess,
          colorWarning: tokens.colorWarning,
          colorError: tokens.colorDanger,
          colorBgBase: tokens.colorSurface,
          colorBgContainer: tokens.colorSurfaceRaised,
          colorBgLayout: tokens.colorSurfaceMuted,
          colorBgElevated: tokens.colorSurfaceRaised,
          colorText: tokens.colorText,
          colorTextSecondary: tokens.colorTextMuted,
          colorBorder: tokens.colorBorder,
          colorBorderSecondary: tokens.colorBorder,
          colorSplit: tokens.colorBorder,
          colorLink: tokens.colorPrimary,
          borderRadius: Number.parseFloat(tokens.radiusMedium),
          borderRadiusLG: Number.parseFloat(tokens.radiusLarge),
          boxShadow: tokens.shadowCard,
          boxShadowSecondary: tokens.shadowFloating,
        },
        components: {
          Layout: {
            bodyBg: tokens.colorSurfaceMuted,
            headerBg: tokens.colorSurfaceRaised,
            siderBg: tokens.colorSurfaceRaised,
            triggerBg: tokens.colorSurfaceRaised,
          },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemColor: tokens.colorTextMuted,
            itemHoverColor: tokens.colorPrimary,
            itemHoverBg: tokens.colorPrimarySoft,
            itemSelectedColor: tokens.colorPrimary,
            itemSelectedBg: tokens.colorPrimarySoft,
            groupTitleColor: tokens.colorTextMuted,
          },
          Button: {
            primaryShadow: `0 6px 14px color-mix(in srgb, ${tokens.colorPrimary} 24%, transparent)`,
          },
          Card: {
            headerBg: tokens.colorSurfaceRaised,
          },
          Table: {
            headerBg: tokens.colorSurfaceMuted,
            headerColor: tokens.colorText,
            rowHoverBg: tokens.colorPrimarySoft,
            borderColor: tokens.colorBorder,
          },
          Modal: {
            contentBg: tokens.colorSurfaceRaised,
            headerBg: tokens.colorSurfaceRaised,
          },
          Form: {
            labelColor: tokens.colorText,
          },
          Input: {
            activeBorderColor: tokens.colorPrimary,
            hoverBorderColor: tokens.colorPrimary,
          },
          Select: {
            optionActiveBg: tokens.colorSurfaceMuted,
            optionSelectedBg: tokens.colorPrimarySoft,
          },
        },
      }}
    >
      <AntApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouterProgressBar />
          <AnalyticsTracker />
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* 首页 - 产品介绍 */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:slug" element={<HomePage />} />
              <Route path="/components" element={(
                <Suspense fallback={<div className="py-20 text-center text-gray-400">正在加载组件库...</div>}>
                  <ComponentLibraryPage />
                </Suspense>
              )} />
              <Route path="/components/:componentId" element={(
                <Suspense fallback={<div className="py-20 text-center text-gray-400">正在加载组件文档...</div>}>
                  <ComponentLibraryPage />
                </Suspense>
              )} />
              <Route
                path="/xiaoyun-buttons"
                element={<Navigate to="/components/character-components" replace />}
              />
              {/* 规则介绍页面 */}
              <Route path="/rules" element={<GameRules />} />
              
              {/* 活动现场答题页面，仅允许拥有现场答题权限的账号进入。 */}
              <Route path="/quiz" element={
                isAdminLoggedIn && !canOperateQuiz ? (
                  <Navigate to={defaultAccessPath} replace />
                ) : (
                  <>
                    <Navbar
                      isAdminLoggedIn={isAdminLoggedIn}
                      quizOnlyAccount={quizOnlyAccount}
                      adminPath={defaultAccessPath}
                      brandText="肥音卤果现场答题"
                      mobileBrandText="现场答题"
                      homePath="/quiz"
                      characterActions
                    />
                    <QuizPage activityMode />
                  </>
                )
              } />

              {/* 兼容旧的现场答题地址。 */}
              <Route path="/quiz/live" element={<Navigate to="/quiz" replace />} />
              
              {/* 管理员登录 */}
              <Route path="/admin/login" element={
                isAdminLoggedIn ? (
                  <Navigate to={defaultAccessPath} replace />
                ) : (
                  <>
                    <Navbar isAdminLoggedIn={isAdminLoggedIn} />
                    <AdminLogin />
                  </>
                )
              } />

              {/* 后台管理区域，使用 AdminLayout */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminIndexRedirect />} />
                <Route path="questions" element={(
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <AdminDashboard />
                  </RequirePermission>
                )} />
                <Route path="quiz" element={(
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <AdminQuizPage />
                  </RequirePermission>
                )} />
                <Route path="quiz/:questionId" element={(
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <AdminQuizPage />
                  </RequirePermission>
                )} />
                <Route path="stats" element={
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <Suspense fallback={<div className="py-20 text-center text-gray-400">正在加载统计图表...</div>}>
                      <VisitStatsPage />
                    </Suspense>
                  </RequirePermission>
                } />
                <Route path="materials" element={(
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <MaterialManager />
                  </RequirePermission>
                )} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="roles" element={(
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <RoleManager />
                  </RequirePermission>
                )} />
                <Route path="users" element={
                  <RequirePermission permission={PERMISSIONS.ACCOUNTS_MANAGE}>
                    <AdminUserManager />
                  </RequirePermission>
                } />
                <Route path="activities" element={
                  <RequirePermission permission={PERMISSIONS.QUESTIONS_MANAGE}>
                    <QuizActivityManager />
                  </RequirePermission>
                } />
                <Route path="site-events" element={
                  <RequirePermission permission={PERMISSIONS.HOMEPAGE_MANAGE}>
                    <SiteEventManager />
                  </RequirePermission>
                } />
                {/* 兼容旧路由 */}
                <Route path="dashboard" element={<Navigate to="questions" replace />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}


function App() {
  return (
    <CloudUIProvider>
      <AppContent />
    </CloudUIProvider>
  );
}


export default App;
