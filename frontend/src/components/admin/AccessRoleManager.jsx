import { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api';


const { Text, Title } = Typography;


function AccessRoleManager({ roles, permissions, loading, onRefresh }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editingRole, setEditingRole] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const permissionMap = new Map(permissions.map((permission) => [permission.key, permission]));

  const openCreate = () => {
    setEditingRole(null);
    form.setFieldsValue({ name: '', description: '', permissions: [] });
    setModalOpen(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setModalOpen(true);
  };

  const submitRole = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      const payload = {
        name: values.name,
        description: values.description || '',
        permissions: values.permissions || [],
      };
      if (editingRole) {
        await api.patch(`/admin/access/roles/${editingRole.key}`, payload);
        message.success('角色权限已更新');
      } else {
        await api.post('/admin/access/roles', payload);
        message.success('权限角色已创建');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (error) {
      console.error('保存权限角色失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (role) => {
    try {
      await api.delete(`/admin/access/roles/${role.key}`);
      message.success('权限角色已删除');
      await onRefresh();
    } catch (error) {
      console.error('删除权限角色失败:', error);
    }
  };

  const columns = [
    {
      title: '角色',
      key: 'role',
      render: (_, role) => (
        <div>
          <Space>
            <Text strong>{role.name}</Text>
            {role.is_system && <Tag>系统角色</Tag>}
            {role.is_locked && <Tag color="purple">权限锁定</Tag>}
          </Space>
          {role.description && (
            <div className="mt-1 text-xs text-gray-500">{role.description}</div>
          )}
        </div>
      ),
    },
    {
      title: '拥有权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissionKeys) => (
        <Space wrap size={[4, 6]}>
          {permissionKeys.length > 0 ? permissionKeys.map((key) => (
            <Tag color="blue" key={key}>{permissionMap.get(key)?.name || key}</Tag>
          )) : <Text type="secondary">无后台权限</Text>}
        </Space>
      ),
    },
    {
      title: '账号数',
      dataIndex: 'user_count',
      key: 'user_count',
      width: 90,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, role) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(role)}>
            编辑
          </Button>
          <Popconfirm
            title="删除这个权限角色？"
            description="仅未被账号使用的自定义角色可以删除。"
            onConfirm={() => deleteRole(role)}
            disabled={role.is_system}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={role.is_system}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false} className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Title level={3} className="!mb-1">角色权限</Title>
          <Text type="secondary">
            账号通过角色获得权限。修改角色后，该角色下账号需要重新登录。
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建角色
        </Button>
      </div>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={roles}
        loading={loading}
        pagination={false}
        scroll={{ x: 860 }}
      />

      <Modal
        title={editingRole ? `编辑角色：${editingRole.name}` : '新建权限角色'}
        open={modalOpen}
        onOk={submitRole}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editingRole ? '保存' : '创建'}
        cancelText="取消"
        destroyOnHidden
        width={680}
      >
        <Form form={form} layout="vertical" className="pt-3">
          {editingRole?.is_locked && (
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message="超级管理员是系统恢复入口，始终拥有全部权限。"
            />
          )}
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="description" label="角色说明">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="permissions" label="权限">
            <Checkbox.Group className="w-full" disabled={editingRole?.is_locked}>
              <div className="grid gap-3 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <Checkbox value={permission.key} className="mt-0.5" />
                    <span>
                      <strong className="block text-sm">{permission.name}</strong>
                      <span className="block mt-1 text-xs text-gray-500 leading-5">
                        {permission.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}


export default AccessRoleManager;
