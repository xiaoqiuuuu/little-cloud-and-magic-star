import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api, { clearAuthSession } from '../api';
import AccessRoleManager from '../components/admin/AccessRoleManager';


const { Title, Text } = Typography;

function formatDateTime(value) {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}


function AdminUserManager() {
  const { message, modal } = App.useApp();
  const { currentUser } = useOutletContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const roleOptions = roles.map((role) => ({ value: role.key, label: role.name }));

  const fetchAccessData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse, permissionsResponse] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/access/roles'),
        api.get('/admin/access/permissions'),
      ]);
      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
      setPermissions(permissionsResponse.data);
    } catch (error) {
      console.error('获取账号与权限数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    accountForm.resetFields();
    accountForm.setFieldsValue({
      roles: [
        roles.some((role) => role.key === 'question_admin')
          ? 'question_admin'
          : roles[0]?.key,
      ].filter(Boolean),
      is_active: true,
      display_name: '',
      profile_url: '',
    });
    setAccountModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    accountForm.setFieldsValue({
      username: user.username,
      roles: user.role_keys || user.roles?.map((role) => role.key) || [user.role],
      is_active: user.is_active,
      display_name: user.display_name,
      profile_url: user.profile_url || '',
    });
    setAccountModalOpen(true);
  };

  const submitAccount = async () => {
    const values = await accountForm.validateFields();
    try {
      setSaving(true);
      if (editingUser) {
        await api.patch(`/admin/users/${editingUser.id}`, {
          username: values.username,
          roles: values.roles,
          is_active: values.is_active,
          display_name: values.display_name,
          profile_url: values.profile_url || null,
        });
        message.success('账号信息已更新');
      } else {
        await api.post('/admin/users', {
          username: values.username,
          password: values.password,
          roles: values.roles,
          display_name: values.display_name,
          profile_url: values.profile_url || null,
        });
        message.success('账号创建成功');
      }
      setAccountModalOpen(false);
      await fetchAccessData();
    } catch (error) {
      console.error('保存账号失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const openPasswordModal = (user) => {
    setPasswordUser(user);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const submitPassword = async () => {
    const values = await passwordForm.validateFields();
    try {
      setSaving(true);
      await api.put(`/admin/users/${passwordUser.id}/password`, {
        password: values.password,
      });
      const isCurrentUser = passwordUser.id === currentUser.id;
      message.success(isCurrentUser
        ? '密码已更新，请使用新密码重新登录'
        : '密码已重置，该账号的现有登录状态已失效');
      setPasswordModalOpen(false);
      if (isCurrentUser) {
        clearAuthSession();
        navigate('/admin/login', { replace: true });
      }
    } catch (error) {
      console.error('重置密码失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = (user) => {
    modal.confirm({
      title: `确定删除账号“${user.username}”吗？`,
      content: '如果账号已绑定题目或物料，系统会阻止删除并提示改为停用。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/admin/users/${user.id}`);
          message.success('账号已删除');
          await fetchAccessData();
        } catch (error) {
          console.error('删除账号失败:', error);
        }
      },
    });
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username, record) => (
        <Space>
          <Text strong>{username}</Text>
          {record.id === currentUser.id && <Tag color="blue">当前账号</Tag>}
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (_, record) => (
        <div>
          <Space wrap size={[2, 4]}>
            {(record.roles || []).map((role) => (
              <Tag
                key={role.key}
                color={role.key === 'super_admin' ? 'purple' : 'cyan'}
              >
                {role.name}
              </Tag>
            ))}
          </Space>
          <div className="mt-1 text-xs text-gray-500">
            {(record.permissions || []).length} 项权限
          </div>
        </div>
      ),
    },
    {
      title: '账号名片',
      key: 'profile',
      render: (_, record) => (
        <div>
          <div className="font-medium text-gray-800">{record.display_name}</div>
          {record.profile_url && (
            <a
              href={record.profile_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600"
            >
              查看主页
            </a>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => isActive
        ? <Tag color="success">启用</Tag>
        : <Tag>停用</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      responsive: ['md'],
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_, record) => {
        const isCurrentUser = record.id === currentUser.id;
        return (
          <Space wrap>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={isCurrentUser}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
            <Button
              size="small"
              icon={<KeyOutlined />}
              onClick={() => openPasswordModal(record)}
            >
              重置密码
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={isCurrentUser}
              onClick={() => deleteUser(record)}
            >
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Card bordered={false}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Title level={2} className="!mb-1">账号与权限</Title>
          <Text type="secondary">
            管理登录账号并为账号分配权限角色。只有拥有账号与权限管理权限的角色才能进入本页。
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          创建账号
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 980 }}
      />

      <Modal
        title={editingUser ? '编辑账号' : '创建账号'}
        open={accountModalOpen}
        onOk={submitAccount}
        onCancel={() => setAccountModalOpen(false)}
        confirmLoading={saving}
        okText={editingUser ? '保存' : '创建'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={accountForm} layout="vertical" className="pt-3">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 50, message: '用户名长度应为 2–50 个字符' },
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 8, max: 128, message: '密码长度应为 8–128 个字符' },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}

          <Form.Item
            name="roles"
            label="角色（可多选）"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
          >
            <Select
              mode="multiple"
              options={roleOptions}
              placeholder="选择一个或多个角色"
            />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="后台及内容署名中显示的名称" />
          </Form.Item>

          <Form.Item name="profile_url" label="个人主页">
            <Input placeholder="https://..." />
          </Form.Item>

          {editingUser && (
            <Form.Item name="is_active" label="账号状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={`重置“${passwordUser?.username || ''}”的密码`}
        open={passwordModalOpen}
        onOk={submitPassword}
        onCancel={() => setPasswordModalOpen(false)}
        confirmLoading={saving}
        okText="重置密码"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical" className="pt-3">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, max: 128, message: '密码长度应为 8–128 个字符' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <AccessRoleManager
        roles={roles}
        permissions={permissions}
        loading={loading}
        onRefresh={fetchAccessData}
      />
    </Card>
  );
}


export default AdminUserManager;
