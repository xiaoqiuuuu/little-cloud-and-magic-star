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


const { Title, Text } = Typography;

const roleOptions = [
  { value: 'question_admin', label: '题目管理员' },
  { value: 'quiz_operator', label: '答题人员' },
  { value: 'super_admin', label: '超级管理员' },
];


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
  const [legacyProducers, setLegacyProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [accountForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const selectedRole = Form.useWatch('role', accountForm);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersResponse, producersResponse] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/producers', { params: { page_size: 1000 } }),
      ]);
      setUsers(usersResponse.data);
      setLegacyProducers(producersResponse.data.items);
    } catch (error) {
      console.error('获取人员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    accountForm.resetFields();
    accountForm.setFieldsValue({
      role: 'question_admin',
      is_active: true,
      display_name: '',
      profile_url: '',
      legacy_producer_id: null,
    });
    setAccountModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    accountForm.setFieldsValue({
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      display_name: user.display_name,
      profile_url: user.profile_url || '',
      legacy_producer_id: user.legacy_producer_id || null,
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
          role: values.role,
          is_active: values.is_active,
          display_name: values.display_name,
          profile_url: values.profile_url || null,
          ...(!editingUser.legacy_producer_id && values.legacy_producer_id
            ? { legacy_producer_id: values.legacy_producer_id }
            : {}),
        });
        message.success('账号信息已更新');
      } else {
        await api.post('/admin/users', {
          username: values.username,
          password: values.password,
          role: values.role,
          display_name: values.display_name,
          profile_url: values.profile_url || null,
          legacy_producer_id: values.legacy_producer_id || null,
        });
        message.success('账号创建成功');
      }
      setAccountModalOpen(false);
      await fetchUsers();
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
          await fetchUsers();
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
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        if (role === 'super_admin') return <Tag color="purple">超级管理员</Tag>;
        if (role === 'quiz_operator') return <Tag color="green">答题人员</Tag>;
        return <Tag color="cyan">题目管理员</Tag>;
      },
    },
    {
      title: '账号名片',
      key: 'profile',
      render: (_, record) => record.role === 'quiz_operator' ? '-' : (
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
          {record.legacy_producer_id && <Tag className="ml-1">历史制作人已认领</Tag>}
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
            管理登录账号及其署名名片。题目和物料直接绑定账号，制作人只用于历史认领。
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

          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>

          {selectedRole !== 'quiz_operator' && (
            <>
              <Form.Item
                name="legacy_producer_id"
                label="认领历史制作人"
                extra={editingUser?.legacy_producer_id
                  ? '历史制作人已认领；为保护现有题目和物料归属，不能在此直接更换。'
                  : '认领后，该制作人名下的历史题目和物料会新增账号关系，原署名不会被改写。'}
              >
                <Select
                  allowClear
                  placeholder="可选：从现有制作人创建账号名片"
                  disabled={Boolean(editingUser?.legacy_producer_id)}
                  onChange={(producerId) => {
                    const producer = legacyProducers.find((item) => item.id === producerId);
                    if (!producer) return;
                    accountForm.setFieldsValue({
                      display_name: producer.name,
                      profile_url: producer.profile_url || '',
                    });
                  }}
                  options={legacyProducers.map((producer) => ({
                    value: producer.id,
                    label: producer.bound_admin_id
                      ? `${producer.name}（已绑定 ${producer.bound_username}）`
                      : producer.name,
                    disabled: Boolean(
                      producer.bound_admin_id
                      && producer.bound_admin_id !== editingUser?.id
                    ),
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="display_name"
                label="署名名称"
                rules={[{ required: true, message: '请输入署名名称' }]}
              >
                <Input placeholder="题目和物料中对外显示的名称" />
              </Form.Item>

              <Form.Item name="profile_url" label="个人主页">
                <Input placeholder="https://..." />
              </Form.Item>
            </>
          )}

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
    </Card>
  );
}


export default AdminUserManager;
