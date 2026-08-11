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
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  PlusOutlined,
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
      highlights: [
        { value: '12 位', label: '特色角色' },
        { value: '6–12 人', label: '灵活组局' },
        { value: '2 种', label: '获取方式' },
      ],
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
      material_ids: [],
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


function getMaterialCover(material) {
  return material?.resources?.find((url) => /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(url));
}


function SiteEventManager() {
  const { message, modal } = App.useApp();
  const [events, setEvents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form] = Form.useForm();
  const selectedMaterialIds = Form.useWatch(['content', 'material_ids'], form) || [];

  const currentEvent = useMemo(
    () => events.find((event) => event.is_current) || null,
    [events],
  );

  const materialsById = useMemo(
    () => new Map(materials.map((material) => [String(material.id), material])),
    [materials],
  );

  const materialOptions = useMemo(
    () => materials.map((material) => ({
      value: String(material.id),
      label: `#${material.id} ${material.name}`,
      searchText: [material.id, material.name, material.description, ...(material.creator || [])]
        .join(' ')
        .toLowerCase(),
    })),
    [materials],
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

  const fetchMaterials = async () => {
    setMaterialsLoading(true);
    try {
      const response = await api.get('/admin/site-events/material-options');
      setMaterials(response.data);
    } catch (error) {
      console.error('获取首页可选物料失败:', error);
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchMaterials();
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
    const payload = {
      ...values,
      content: { ...values.content },
    };
    delete payload.content.materials;
    try {
      setSaving(true);
      if (editingEvent) {
        await api.put(`/admin/site-events/${editingEvent.id}`, payload);
        message.success('官网活动已保存');
      } else {
        await api.post('/admin/site-events', payload);
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

      <Row gutter={[12, 12]} className="mb-5">
        <Col xs={12} lg={6}>
          <Card size="small"><Statistic title="全部活动" value={events.length} suffix="场" /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="已发布 / 往期" value={events.filter((item) => item.status !== 'draft').length} suffix="场" />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small"><Statistic title="物料库" value={materials.length} suffix="项" /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small">
            <Statistic title="当前主页" value={currentEvent ? '已就绪' : '待设置'} />
          </Card>
        </Col>
      </Row>

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

          <Divider orientation="left">活动亮点</Divider>
          <Alert
            className="mb-4"
            type="info"
            showIcon
            message="用 2～4 个短数据快速说明这场活动最值得关注的地方"
            description="亮点会展示在首页头图下方，例如角色数量、适合人数、限定款式或领取场次。"
          />
          <Form.List name={['content', 'highlights']}>
            {(fields, { add, remove }) => (
              <Row gutter={[12, 12]}>
                {fields.map((field) => (
                  <Col xs={24} md={12} key={field.key}>
                    <Card
                      size="small"
                      extra={<Button type="text" danger onClick={() => remove(field.name)}>移除</Button>}
                    >
                      <Row gutter={12}>
                        <Col span={10}>
                          <Form.Item name={[field.name, 'value']} label="醒目数值" rules={[{ required: true }]}>
                            <Input placeholder="例如：12 位" />
                          </Form.Item>
                        </Col>
                        <Col span={14}>
                          <Form.Item name={[field.name, 'label']} label="说明" rules={[{ required: true }]}>
                            <Input placeholder="例如：特色角色" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
                {fields.length < 6 && (
                  <Col xs={24} md={12}>
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ value: '', label: '' })}>
                      添加亮点
                    </Button>
                  </Col>
                )}
              </Row>
            )}
          </Form.List>

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
          <Alert
            className="mb-4"
            type="success"
            showIcon
            message="首页物料已与“物料管理”联动"
            description="这里只选择物料，不再重复上传。名称、介绍、署名和资源更新后，首页会自动读取最新内容。"
          />
          <Form.Item
            name={['content', 'material_ids']}
            label="选择首页物料"
            extra="选择顺序就是首页展示顺序；可输入物料编号、名称、介绍或署名搜索。"
          >
            <Select
              mode="multiple"
              allowClear
              showSearch
              loading={materialsLoading}
              placeholder="从物料管理中选择"
              options={materialOptions}
              filterOption={(input, option) => String(option?.searchText || option?.label || '')
                .toLowerCase()
                .includes(input.toLowerCase())}
              maxTagCount="responsive"
            />
          </Form.Item>
          {selectedMaterialIds.length > 0 ? (
            <Row gutter={[12, 12]}>
              {selectedMaterialIds.map((materialId, index) => {
                const material = materialsById.get(String(materialId));
                const cover = getMaterialCover(material);
                return (
                  <Col xs={24} md={12} key={`${materialId}-${index}`}>
                    <Card size="small" title={`${index + 1}. ${material?.name || `物料 #${materialId}`}`}>
                      <div className="flex gap-3">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                          {cover ? (
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <AppstoreOutlined className="text-2xl text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Text className="block" type="secondary" ellipsis>
                            {material?.description || '暂无介绍'}
                          </Text>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Tag>#{materialId}</Tag>
                            <Tag color="blue">{material?.resources?.length || 0} 个资源</Tag>
                            {(material?.creator || []).slice(0, 2).map((creator) => <Tag key={creator}>{creator}</Tag>)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              暂未选择物料；保存后首页将隐藏物料区。
            </div>
          )}

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
