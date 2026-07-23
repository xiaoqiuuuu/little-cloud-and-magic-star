import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api, { clearAuthSession, saveTokenPair } from '../api';
import { showSuccess, showError } from '../utils/message';
import { getDefaultAccessPath, storeUserAccess } from '../utils/adminAccess';
import { Card, CharacterButton, Input, useCloudUI } from '../ui';
import AdminThemeSwitcher from '../components/admin/AdminThemeSwitcher';
import './AdminLogin.css';

const { Title, Text } = Typography;

function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { characterPack } = useCloudUI();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/admin/login', {
        username: values.username,
        password: values.password
      }, {
        hideLoading: true, // 使用按钮的 loading，不显示全局 loading
        hideErrorMessage: true, // 手动处理错误消息
        skipAuthRedirect: true, // 登录失败时不要按“登录过期”处理
        skipAuthRefresh: true,
      });

      saveTokenPair(response.data);

      // 获取用户角色信息
      const userRes = await api.get('/admin/me', { hideLoading: true });
      storeUserAccess(userRes.data);
      localStorage.setItem('username', userRes.data.username);
      localStorage.setItem('currentUserId', String(userRes.data.id));

      // 通知当前窗口的登录状态变化
      window.dispatchEvent(new CustomEvent('authChange', {
        detail: { token: response.data.access_token }
      }));

      showSuccess('登录成功！');
      navigate(getDefaultAccessPath(userRes.data), { replace: true });
    } catch (error) {
      console.error('登录失败:', error);
      clearAuthSession();
      if (error.response?.status === 401) {
        showError('用户名或密码错误');
      } else {
        showError('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cloud-admin-login">
      <div className="cloud-admin-login__theme">
        <AdminThemeSwitcher />
      </div>
      <div className="cloud-admin-login__stage">
        <div className="cloud-admin-login__character" aria-hidden="true">
          <img src={characterPack.assets.cardCorner} alt="" draggable="false" />
        </div>
        <Card className="cloud-admin-login__card" variant="elevated" padding="large">
        <Space direction="vertical" size="large" className="w-full">
          <div className="cloud-admin-login__heading">
            <Title level={2} className="!mb-2">
              账号登录
            </Title>
            <Text type="secondary">
              请使用后台管理或现场答题账号登录
            </Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input
                type="password"
                prefix={<LockOutlined />}
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item className="!mb-0">
              <CharacterButton
                type="submit"
                loading={loading}
                block
                size="large"
                className="cloud-admin-login__submit"
              >
                登录
              </CharacterButton>
            </Form.Item>
          </Form>
        </Space>
        </Card>
      </div>
    </div>
  );
}

export default AdminLogin;
