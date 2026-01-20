import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import api from '../api';
import { showSuccess, showError } from '../utils/message';

const { Title, Text } = Typography;

function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/admin/login', {
        username: values.username,
        password: values.password
      }, {
        hideLoading: true, // 使用按钮的 loading，不显示全局 loading
        hideErrorMessage: true, // 手动处理错误消息
      });
      
      localStorage.setItem('token', response.data.access_token);
      
      // 通知当前窗口的登录状态变化
      window.dispatchEvent(new CustomEvent('authChange', { 
        detail: { token: response.data.access_token } 
      }));
      
      showSuccess('登录成功！');
      setTimeout(() => {
        navigate('/admin/questions');
      }, 500);
    } catch (error) {
      console.error('登录失败:', error);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card 
        className="w-full max-w-md shadow-2xl"
        bordered={false}
      >
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Title level={2} className="!mb-2">
              管理员登录
            </Title>
            <Text type="secondary">
              默认账号: admin / CloudStar@2026!
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
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item className="!mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<LoginOutlined />}
                block
                size="large"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default AdminLogin;
