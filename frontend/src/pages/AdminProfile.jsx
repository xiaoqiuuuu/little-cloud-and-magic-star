import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { App, Card, Form, Input, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import api from '../api';
import { CharacterButton, CharacterCard, Tag } from '../ui';
import './AdminProfile.css';


const { Title, Text } = Typography;


function AdminProfile() {
  const { message } = App.useApp();
  const { currentUser, onCurrentUserChange } = useOutletContext();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const displayName = currentUser?.display_name || currentUser?.username || '—';
  const roleLabel = currentUser?.role_name || currentUser?.role || '未分配角色';

  useEffect(() => {
    if (!currentUser) return;
    form.setFieldsValue({
      username: currentUser.username,
      display_name: currentUser.display_name || currentUser.username,
      profile_url: currentUser.profile_url || '',
    });
  }, [currentUser, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      const response = await api.patch('/admin/users/me/profile', {
        display_name: values.display_name,
        profile_url: values.profile_url || null,
      });
      onCurrentUserChange?.(response.data);
      form.setFieldsValue({
        display_name: response.data.display_name,
        profile_url: response.data.profile_url || '',
      });
      message.success('个人资料已更新');
    } catch (error) {
      console.error('更新个人资料失败:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-profile-page">
      <CharacterCard layout="watermark" className="admin-profile-character-card">
        <h2>{displayName}</h2>
        <div className="admin-profile-character-card__meta">
          <Tag tone="primary">{roleLabel}</Tag>
          <Tag>{currentUser?.username || '—'}</Tag>
        </div>
      </CharacterCard>

      <Card bordered={false} className="admin-profile-form-card">
        <Space align="start" className="mb-6">
          <UserOutlined className="text-2xl text-blue-600 mt-1" />
          <div>
            <Title level={2} className="!mb-1">个人资料</Title>
            <Text type="secondary">
              署名名称会显示在你绑定的题目和物料上，个人主页可供内容展示时跳转。
            </Text>
          </div>
        </Space>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="登录用户名">
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="署名名称"
            rules={[
              { required: true, message: '请输入署名名称' },
              { max: 100, message: '署名名称最多 100 个字符' },
            ]}
          >
            <Input placeholder="题目和物料中显示的名称" />
          </Form.Item>

          <Form.Item
            name="profile_url"
            label="个人主页链接"
            rules={[
              { type: 'url', warningOnly: true, message: '建议填写完整的 http(s) 链接' },
              { max: 500, message: '个人主页链接最多 500 个字符' },
            ]}
            extra="可以留空；填写后作为账号的对外主页信息。"
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <CharacterButton type="submit" loading={saving}>
            保存个人资料
          </CharacterButton>
        </Form>
      </Card>
    </div>
  );
}


export default AdminProfile;
