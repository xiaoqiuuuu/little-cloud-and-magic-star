import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import api from '../api';


const { Title, Text } = Typography;
const { TextArea } = Input;

const statusMeta = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '往期', color: 'warning' },
};

const themeOptions = [
  { value: 'aurora', label: '极光（蓝粉）' },
  { value: 'sunset', label: '日落（橙粉）' },
  { value: 'ocean', label: '海洋（青蓝）' },
  { value: 'mint', label: '薄荷（绿青）' },
];

const materialColorOptions = [
  { value: 'rose', label: '玫瑰' },
  { value: 'pink', label: '粉色' },
  { value: 'yellow', label: '黄色' },
  { value: 'blue', label: '蓝色' },
  { value: 'indigo', label: '靛蓝' },
  { value: 'purple', label: '紫色' },
];


function blankEvent() {
  return {
    name: '',
    slug: '',
    date_label: '',
    location: '',
    content: {
      eyebrow: '',
      title: '',
      intro_title: '',
      intro: '',
      theme: 'aurora',
      rules: {
        enabled: true,
        title: '活动玩法与规则',
        description: '',
        link: '/rules',
        link_label: '点击查看',
        icons: ['🌙', '☀️', '🎭'],
      },
      materials_title: '精彩物料一览',
      materials: [],
      cta: { title: '🎉 获取方式', description: '' },
      footer: { title: '', copyright: '', note: '' },
    },
  };
}


function formatDateTime(value) {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}


function EventImageInput({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const upload = async ({ file, onSuccess, onError }) => {
    const data = new FormData();
    data.append('file', file);
    setUploading(true);
    try {
      const response = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange?.(response.data.url);
      onSuccess(response.data);
    } catch (error) {
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Space.Compact block>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder="图片网址或 /uploads/..." />
      <Upload accept="image/*" showUploadList={false} customRequest={upload}>
        <Button icon={<UploadOutlined />} loading={uploading}>上传</Button>
      </Upload>
    </Space.Compact>
  );
}


function SiteEventManager() {
  const { message, modal } = App.useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form] = Form.useForm();

  const currentEvent = useMemo(
    () => events.find((event) => event.is_current) || null,
    [events],
  );

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/site-events');
      setEvents(response.data);
    } catch (error) {
      console.error('获取官网活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreate = () => {
    setEditingEvent(null);
    form.resetFields();
    form.setFieldsValue(blankEvent());
    setEditorOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    form.resetFields();
    form.setFieldsValue(event);
    setEditorOpen(true);
  };

  const saveEvent = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      if (editingEvent) {
        await api.put(`/admin/site-events/${editingEvent.id}`, values);
        message.success('官网活动已保存');
      } else {
        await api.post('/admin/site-events', values);
        message.success('官网活动草稿已创建');
      }
      setEditorOpen(false);
      await fetchEvents();
    } catch (error) {
      console.error('保存官网活动失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const activateEvent = (event) => {
    modal.confirm({
      title: `将“${event.name}”设为主页？`,
      content: currentEvent
        ? `根路径 / 将立即切换到该活动；“${currentEvent.name}”仍会保留固定链接。`
        : '根路径 / 将立即展示该活动。',
      okText: '确认切换',
      onOk: async () => {
        await api.post(`/admin/site-events/${event.id}/activate`);
        message.success('主页活动已切换');
        await fetchEvents();
      },
    });
  };

  const duplicateEvent = async (event) => {
    try {
      const response = await api.post(`/admin/site-events/${event.id}/duplicate`);
      message.success('已复制为新草稿，请修改名称和网址标识');
      await fetchEvents();
      openEdit(response.data);
    } catch (error) {
      console.error('复制官网活动失败:', error);
    }
  };

  const archiveEvent = async (event) => {
    await api.post(`/admin/site-events/${event.id}/archive`);
    message.success('活动已归入往期，固定链接仍可访问');
    await fetchEvents();
  };

  const deleteEvent = async (event) => {
    await api.delete(`/admin/site-events/${event.id}`);
    message.success('草稿已删除');
    await fetchEvents();
  };

  const columns = [
    {
      title: '官网活动',
      key: 'event',
      render: (_, record) => (
        <div>
          <Space wrap>
            <Text strong>{record.name}</Text>
            {record.is_current && <Tag color="blue">当前主页</Tag>}
          </Space>
          <div className="text-xs text-gray-500 mt-1">/events/{record.slug}</div>
          {(record.date_label || record.location) && (
            <div className="text-xs text-gray-500 mt-1">
              {[record.date_label, record.location].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => <Tag color={statusMeta[status]?.color}>{statusMeta[status]?.label}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      responsive: ['lg'],
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 440,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            href={record.status === 'draft'
              ? `/?preview=${record.id}`
              : record.is_current ? '/' : `/events/${record.slug}`}
            target="_blank"
          >
            预览
          </Button>
          {!record.is_current && (
            <Button size="small" type="primary" icon={<GlobalOutlined />} onClick={() => activateEvent(record)}>
              设为主页
            </Button>
          )}
          <Button size="small" icon={<CopyOutlined />} onClick={() => duplicateEvent(record)}>复制</Button>
          {record.status === 'published' && !record.is_current && (
            <Popconfirm
              title="归入往期活动？"
              description="活动仍可通过固定链接和首页切换器访问。"
              onConfirm={() => archiveEvent(record)}
            >
              <Button size="small">归档</Button>
            </Popconfirm>
          )}
          {record.status === 'draft' && (
            <Popconfirm title="删除这个草稿？" onConfirm={() => deleteEvent(record)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Title level={2} className="!mb-1">官网活动</Title>
          <Text type="secondary">每场活动保留固定网址；复制旧活动、修改内容后即可一键切换主页。</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>创建空白活动</Button>
      </div>

      <Alert
        className="mb-5"
        type={currentEvent ? 'success' : 'warning'}
        showIcon
        message={currentEvent ? `当前主页：${currentEvent.name}` : '当前没有主页活动'}
        description={currentEvent
          ? '切换主页不会删除旧活动，已有活动链接可以继续分享和访问。'
          : '请从列表中选择一场活动并设为主页。'}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={events}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 980 }}
        rowClassName={(record) => record.is_current ? 'bg-blue-50' : ''}
      />

      <Modal
        title={editingEvent ? `编辑：${editingEvent.name}` : '创建官网活动'}
        open={editorOpen}
        onOk={saveEvent}
        onCancel={() => setEditorOpen(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={1000}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="pt-3">
          <Divider orientation="left">活动与网址</Divider>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="活动名称" rules={[{ required: true }, { max: 100 }]}>
                <Input placeholder="例如：2026 夏日见面会" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="slug"
                label="固定网址标识"
                extra={editingEvent?.status === 'draft' || !editingEvent
                  ? '发布后地址为 /events/网址标识；建议使用年份、城市和活动英文简称。'
                  : '活动已经发布，为保证旧分享链接有效，网址标识不能再修改。'}
                rules={[
                  { required: true, message: '请输入网址标识' },
                  { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '只能使用小写字母、数字和短横线' },
                ]}
              >
                <Input
                  addonBefore="/events/"
                  placeholder="summer-shenzhen-2026"
                  disabled={editingEvent?.status !== 'draft' && Boolean(editingEvent)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="date_label" label="日期文案"><Input placeholder="例如：2026 年 8 月 8 日" /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="location" label="地点"><Input placeholder="例如：深圳" /></Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">首页头图文案</Divider>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name={['content', 'eyebrow']} label="眉标"><Input placeholder="主标题上方的小字" /></Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['content', 'theme']} label="配色主题" rules={[{ required: true }]}>
                <Select options={themeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['content', 'title']} label="主标题" rules={[{ required: true, message: '请输入主标题' }]}>
            <TextArea rows={3} placeholder="支持换行" />
          </Form.Item>
          <Form.Item name={['content', 'intro_title']} label="介绍标题"><Input /></Form.Item>
          <Form.Item name={['content', 'intro']} label="活动介绍"><TextArea rows={5} showCount maxLength={3000} /></Form.Item>

          <Divider orientation="left">规则入口</Divider>
          <Form.Item name={['content', 'rules', 'enabled']} label="显示规则入口" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name={['content', 'rules', 'title']} label="入口标题"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['content', 'rules', 'link']} label="规则链接"><Input placeholder="/rules 或完整网址" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name={['content', 'rules', 'description']} label="规则简介"><TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name={['content', 'rules', 'link_label']} label="按钮文案"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name={['content', 'rules', 'icons']}
                label="装饰图标"
                getValueFromEvent={(e) => e.target.value.split(' ').filter(Boolean)}
                getValueProps={(value) => ({ value: (value || []).join(' ') })}
              >
                <Input placeholder="🌙 ☀️ 🎭" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">物料展示</Divider>
          <Form.Item name={['content', 'materials_title']} label="物料区标题"><Input /></Form.Item>
          <Form.List name={['content', 'materials']}>
            {(fields, { add, remove }) => (
              <Space direction="vertical" size="middle" className="w-full">
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`物料 ${index + 1}`}
                    extra={<Button type="text" danger onClick={() => remove(field.name)}>移除</Button>}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item name={[field.name, 'title']} label="名称" rules={[{ required: true }]}><Input /></Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item name={[field.name, 'icon']} label="无图图标"><Input /></Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item name={[field.name, 'color']} label="背景色"><Select options={materialColorOptions} /></Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name={[field.name, 'description']} label="介绍"><TextArea rows={3} /></Form.Item>
                    <Form.Item name={[field.name, 'image']} label="图片"><EventImageInput /></Form.Item>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ title: '', description: '', image: '', icon: '✨', color: 'blue' })}
                >
                  添加物料
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider orientation="left">获取方式与页脚</Divider>
          <Form.Item name={['content', 'cta', 'title']} label="获取方式标题"><Input /></Form.Item>
          <Form.Item name={['content', 'cta', 'description']} label="获取方式说明"><TextArea rows={5} /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name={['content', 'footer', 'title']} label="页脚标题"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['content', 'footer', 'copyright']} label="版权文案"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name={['content', 'footer', 'note']} label="页脚备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}


export default SiteEventManager;
