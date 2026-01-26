import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Space, Card, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, MinusCircleOutlined } from '@ant-design/icons';
import api from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function RoleManager() {
  const [roles, setRoles] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('获取角色列表失败', error);
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsEdit(false);
    setEditingId(null);
    form.resetFields();
    // 设置默认值
    form.setFieldsValue({
        skillDetails: []
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setIsEdit(true);
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      skillDetails: record.skillDetails || []
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/roles/${id}`);
      message.success('删除成功');
      fetchRoles();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 确保 skillDetails 是数组，避免 null
      if (!values.skillDetails) {
          values.skillDetails = [];
      }

      // 处理图片路径，确保是完整 URL (如果只是路径的话)
      // 如果上传组件在 values 中是 Upload FileList 结构，需要提取 url
      // 这里假设 Upload 组件直接处理为 image_url 字段的值绑定（通过 getValueFromEvent）

      if (isEdit) {
        await api.put(`/roles/${editingId}`, values);
        message.success('更新成功');
      } else {
        await api.post('/roles', values);
        message.success('创建成功');
      }
      setIsModalVisible(false);
      fetchRoles();
    } catch (error) {
      console.error(error);
      message.error('操作失败');
    }
  };

  // 自定义上传处理
  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };
  
  // 图片上传属性
  const uploadProps = {
    name: 'file',
    action: '/api/upload', // 上传接口
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onChange(info) {
      if (info.file.status === 'done') {
        const url = info.file.response.url || info.file.response.filename; // 根据后端返回调整
        // 将 url 设置回表单
        // 但 Antd Upload 如果受控，需要配合 normFile 和 fileList
        // 简单处理：我们只用 Upload 组件进行上传，成功后将 url 填入一个隐藏的 Input 或者直接 state 控制
        // 这里使用 form.setFieldsValue 来设置 image_url
        form.setFieldsValue({ image_url: url });
        message.success(`${info.file.name} 上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    },
    showUploadList: false, // 不显示列表，只显示当前图片
  };


  const columns = [
    {
      title: '图片',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (url) => url ? <img src={url} alt="角色" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '50%' }} /> : '-',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
          <Space>
              <Tag color={record.color}>{text}</Tag>
          </Space>
      )
    },
    {
      title: '身份',
      dataIndex: 'identity',
      key: 'identity',
    },
    {
      title: '阵营',
      dataIndex: 'camp',
      key: 'camp',
      render: (camp) => {
          let color = 'default';
          if (camp.includes('坏人')) color = 'error';
          else if (camp.includes('神职')) color = 'gold';
          else if (camp.includes('平民')) color = 'success';
          return <Tag color={color}>{camp}</Tag>;
      }
    },
    {
      title: '技能简述',
      dataIndex: 'skill',
      key: 'skill',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个角色吗？',
            onOk: () => handleDelete(record.id),
          })}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>角色管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加角色
        </Button>
      </div>

      <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />

      <Modal
        title={isEdit ? "编辑角色" : "添加角色"}
        open={isModalVisible} // antd v5 use open, v4 visible
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical" initialValues={{ color: 'blue', skill: '-', skillDetails: [] }}>
          <div className="grid grid-cols-2 gap-4">
              <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
                <Input placeholder="如：面包雲" />
              </Form.Item>
              <Form.Item name="identity" label="身份" rules={[{ required: true }]}>
                <Input placeholder="如：村民、狼人" />
              </Form.Item>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <Form.Item name="camp" label="阵营" rules={[{ required: true }]}>
                <Select>
                    <Option value="平民阵营">平民阵营</Option>
                    <Option value="坏人阵营">坏人阵营</Option>
                    <Option value="神职阵营">神职阵营</Option>
                </Select>
              </Form.Item>
              <Form.Item name="color" label="标签颜色">
                <Select>
                    <Option value="blue">Blue (平民)</Option>
                    <Option value="red">Red (坏人)</Option>
                    <Option value="gold">Gold (神职)</Option>
                    <Option value="purple">Purple</Option>
                    <Option value="cyan">Cyan</Option>
                    <Option value="green">Green</Option>
                </Select>
              </Form.Item>
          </div>

          <Form.Item name="desc" label="角色描述" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="角色背景故事或描述" />
          </Form.Item>

          <Form.Item name="skill" label="技能简述">
            <Input placeholder="如：给你一拳, 消散" />
          </Form.Item>

           <Form.Item label="角色图片">
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Form.Item name="image_url" noStyle>
                    <Input placeholder="图片URL" style={{ flex: 1 }} />
                </Form.Item>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>上传</Button>
                </Upload>
               </div>
               {/* 预览 */}
               <Form.Item shouldUpdate={(prev, curr) => prev.image_url !== curr.image_url}>
                   {({ getFieldValue }) => {
                       const url = getFieldValue('image_url');
                       return url ? <img src={url} alt="Preview" style={{ marginTop: 10, maxWidth: 100, maxHeight: 100, borderRadius: 4 }} /> : null;
                   }}
               </Form.Item>
           </Form.Item>

          <Typography.Text strong style={{display: 'block', marginBottom: 8}}>技能详情</Typography.Text>
          <Form.List name="skillDetails">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 16, background: '#f9f9f9' }}>
                    <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'title']}
                          rules={[{ required: true, message: '请输入技能标题' }]}
                          style={{ width: '200px', marginBottom: 0 }}
                        >
                          <Input placeholder="技能名称" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                    <Form.Item
                      {...restField}
                      name={[name, 'content']}
                      rules={[{ required: true, message: '请输入技能内容' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea rows={3} placeholder="详细的技能描述" />
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加技能详情
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

export default RoleManager;
