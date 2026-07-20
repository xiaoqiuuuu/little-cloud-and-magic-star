import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Transfer,
  Typography,
} from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import api from '../api';
import { getQuestionTagMeta, mergeQuestionTagOptions } from '../constants/questionTags';


const { Title, Text } = Typography;
const { TextArea } = Input;

const statusMeta = {
  draft: { label: '草稿', color: 'default' },
  active: { label: '进行中', color: 'success' },
  paused: { label: '已暂停', color: 'warning' },
  ended: { label: '已结束', color: 'red' },
};


function formatDateTime(value) {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}


function getDatePart(value) {
  return value ? value.slice(0, 10) : '';
}


function QuizActivityManager() {
  const { message, modal } = App.useApp();
  const [activities, setActivities] = useState([]);
  const [questionOptions, setQuestionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsActivity, setStatsActivity] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [countdownDraft, setCountdownDraft] = useState(60);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownSaving, setCountdownSaving] = useState(false);
  const [questionTagFilter, setQuestionTagFilter] = useState('all');
  const [questionDateField, setQuestionDateField] = useState('updated_at');
  const [questionDateStart, setQuestionDateStart] = useState('');
  const [questionDateEnd, setQuestionDateEnd] = useState('');
  const [form] = Form.useForm();

  const activeActivity = useMemo(
    () => activities.find((activity) => activity.status === 'active') || null,
    [activities],
  );

  const questionTagOptions = useMemo(
    () => mergeQuestionTagOptions(questionOptions.map((question) => question.tag)),
    [questionOptions],
  );

  const visibleQuestionOptions = useMemo(() => {
    const selectedIds = new Set(selectedQuestionIds);
    return questionOptions.filter((question) => {
      if (selectedIds.has(question.key)) return true;
      if (questionTagFilter !== 'all' && question.tag !== questionTagFilter) return false;
      const questionDate = getDatePart(question[questionDateField]);
      if (questionDateStart && (!questionDate || questionDate < questionDateStart)) return false;
      if (questionDateEnd && (!questionDate || questionDate > questionDateEnd)) return false;
      return true;
    });
  }, [
    questionOptions,
    selectedQuestionIds,
    questionTagFilter,
    questionDateField,
    questionDateStart,
    questionDateEnd,
  ]);

  const resetQuestionFilters = () => {
    setQuestionTagFilter('all');
    setQuestionDateField('updated_at');
    setQuestionDateStart('');
    setQuestionDateEnd('');
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/activities');
      setActivities(response.data);
    } catch (error) {
      console.error('获取活动列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionOptions = async () => {
    if (questionOptions.length > 0) return questionOptions;
    try {
      setQuestionsLoading(true);
      const response = await api.get('/admin/questions', {
        params: { page: 1, page_size: 0, sort_order: 'asc' },
      });
      const options = response.data.items.map((question) => ({
        key: question.id,
        title: `#${question.id} ${question.question}`,
        tag: question.tag,
        author: question.author || [],
        created_at: question.created_at,
        updated_at: question.updated_at,
        searchText: [
          question.id,
          question.question,
          question.tag,
          ...(question.author || []),
        ].join(' ').toLowerCase(),
      }));
      setQuestionOptions(options);
      return options;
    } catch (error) {
      console.error('获取题目选项失败:', error);
      return [];
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchCountdown();
  }, []);

  const fetchCountdown = async () => {
    try {
      const response = await api.get('/configs/COUNTDOWN_SECONDS');
      const seconds = parseInt(response.data.value, 10);
      if (!Number.isNaN(seconds)) {
        setCountdownSeconds(seconds);
        setCountdownDraft(seconds);
      }
    } catch (error) {
      console.error('获取倒计时设置失败:', error);
    }
  };

  const saveCountdown = async () => {
    if (!countdownDraft || countdownDraft < 10 || countdownDraft > 3600) {
      message.warning('倒计时时长必须在 10 到 3600 秒之间');
      return;
    }
    try {
      setCountdownSaving(true);
      await api.put('/configs', {
        key: 'COUNTDOWN_SECONDS',
        value: String(countdownDraft),
      });
      setCountdownSeconds(countdownDraft);
      window.dispatchEvent(new CustomEvent('countdownChange', {
        detail: { countdownSeconds: countdownDraft },
      }));
      setCountdownOpen(false);
      message.success('现场答题倒计时已更新');
    } catch (error) {
      console.error('保存倒计时设置失败:', error);
    } finally {
      setCountdownSaving(false);
    }
  };

  const openCreate = async () => {
    await fetchQuestionOptions();
    setEditingActivity(null);
    setSelectedQuestionIds([]);
    resetQuestionFilters();
    form.resetFields();
    form.setFieldsValue({ description: '' });
    setEditorOpen(true);
  };

  const openEdit = async (activity) => {
    try {
      setSaving(true);
      const options = await fetchQuestionOptions();
      const response = await api.get(`/admin/activities/${activity.id}`);
      const availableIds = new Set(options.map((item) => item.key));
      const availableSelectedIds = response.data.question_ids.filter(
        (questionId) => availableIds.has(questionId),
      );
      if (availableSelectedIds.length !== response.data.question_ids.length) {
        message.warning('活动中有题目已被删除，保存时会自动移除');
      }
      setEditingActivity(response.data);
      setSelectedQuestionIds(availableSelectedIds);
      resetQuestionFilters();
      form.setFieldsValue({
        name: response.data.name,
        description: response.data.description,
      });
      setEditorOpen(true);
    } catch (error) {
      console.error('获取活动详情失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const submitActivity = async () => {
    const values = await form.validateFields();
    if (selectedQuestionIds.length === 0) {
      message.warning('请至少选择一道题目');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: values.name,
        description: values.description || '',
        question_ids: selectedQuestionIds,
      };
      if (editingActivity) {
        await api.put(`/admin/activities/${editingActivity.id}`, payload);
        message.success('活动已更新');
      } else {
        await api.post('/admin/activities', payload);
        message.success('活动已创建');
      }
      setEditorOpen(false);
      await fetchActivities();
    } catch (error) {
      console.error('保存活动失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const startOrSwitchActivity = (activity) => {
    const switching = activeActivity && activeActivity.id !== activity.id;
    modal.confirm({
      title: switching ? `切换到“${activity.name}”？` : `开始“${activity.name}”？`,
      content: switching
        ? `当前活动“${activeActivity.name}”会自动暂停，已有统计将被保留。`
        : '活动开始后，现场答题人员只会看到本活动选择的题目。',
      okText: switching ? '确认切换' : '开始活动',
      onOk: async () => {
        try {
          await api.post(`/admin/activities/${activity.id}/start`);
          message.success(switching ? '活动已切换' : '活动已开始');
          await fetchActivities();
        } catch (error) {
          console.error('开始活动失败:', error);
        }
      },
    });
  };

  const pauseActivity = async (activity) => {
    try {
      await api.post(`/admin/activities/${activity.id}/pause`);
      message.success('活动已暂停，统计已保留');
      await fetchActivities();
    } catch (error) {
      console.error('暂停活动失败:', error);
    }
  };

  const endActivity = (activity) => {
    modal.confirm({
      title: `结束“${activity.name}”？`,
      content: '结束后不能重新开始或修改题目，活动统计会永久保留。',
      okText: '结束活动',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.post(`/admin/activities/${activity.id}/end`);
          message.success('活动已结束');
          await fetchActivities();
        } catch (error) {
          console.error('结束活动失败:', error);
        }
      },
    });
  };

  const removeActivity = (activity) => {
    modal.confirm({
      title: `删除草稿“${activity.name}”？`,
      content: '该操作无法撤销。',
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/admin/activities/${activity.id}`);
          message.success('草稿活动已删除');
          await fetchActivities();
        } catch (error) {
          console.error('删除活动失败:', error);
        }
      },
    });
  };

  const showStats = async (activity) => {
    try {
      setStatsOpen(true);
      setStatsLoading(true);
      const response = await api.get(`/admin/activities/${activity.id}`);
      setStatsActivity(response.data);
    } catch (error) {
      console.error('获取活动统计失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const columns = [
    {
      title: '活动',
      key: 'activity',
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          {record.description && (
            <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMeta[status]?.color}>{statusMeta[status]?.label || status}</Tag>
      ),
    },
    {
      title: '题目',
      dataIndex: 'question_count',
      key: 'question_count',
      render: (count) => `${count} 道`,
    },
    {
      title: '统计',
      key: 'stats',
      responsive: ['md'],
      render: (_, record) => (
        <span className="text-sm text-gray-600">
          随机 {record.total_random_clicks} / 隐藏 {record.total_hide_clicks}
        </span>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      responsive: ['lg'],
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 360,
      render: (_, record) => (
        <Space wrap>
          {record.status === 'draft' && (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {['draft', 'paused'].includes(record.status) && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => startOrSwitchActivity(record)}
            >
              {activeActivity ? '切换/开始' : '开始'}
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => pauseActivity(record)}
            >
              暂停
            </Button>
          )}
          {['active', 'paused'].includes(record.status) && (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => endActivity(record)}>
              结束
            </Button>
          )}
          <Button size="small" icon={<BarChartOutlined />} onClick={() => showStats(record)}>
            统计
          </Button>
          {record.status === 'draft' && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeActivity(record)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const statsColumns = [
    { title: '题号', dataIndex: 'question_id', key: 'question_id', width: 80 },
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
      render: (question, record) => (
        <Space>
          <span>{question}</span>
          {!record.question_exists && <Tag color="red">原题已删除</Tag>}
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      width: 110,
      render: (tag) => {
        const tagMeta = getQuestionTagMeta(tag);
        return <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>;
      },
    },
    { title: '随机次数', dataIndex: 'random_clicks', key: 'random_clicks', width: 100 },
    { title: '隐藏次数', dataIndex: 'hide_clicks', key: 'hide_clicks', width: 100 },
  ];

  return (
    <Card bordered={false}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Title level={2} className="!mb-1">答题活动</Title>
          <Text type="secondary">
            每个活动独立选择题目并统计。切换活动会暂停当前活动，不会清空已有数据。
          </Text>
        </div>
        <Space wrap>
          <Link to="/quiz">
            <Button icon={<PlayCircleOutlined />}>进入现场答题</Button>
          </Link>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={() => {
              setCountdownDraft(countdownSeconds);
              setCountdownOpen(true);
            }}
          >
            倒计时：{countdownSeconds} 秒
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            创建活动
          </Button>
        </Space>
      </div>

      {activeActivity ? (
        <Alert
          className="mb-5"
          type="success"
          showIcon
          message={`当前进行中：${activeActivity.name}`}
          description={`现场答题页可见 ${activeActivity.question_count} 道题目，超级管理员也可以直接进入。`}
        />
      ) : (
        <Alert
          className="mb-5"
          type="warning"
          showIcon
          message="当前没有进行中的答题活动"
          description="进入现场答题页后会看到等待活动开始的提示。"
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={activities}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 980 }}
        rowClassName={(record) => record.status === 'active' ? 'bg-green-50' : ''}
      />

      <Modal
        title="现场答题倒计时设置"
        open={countdownOpen}
        onOk={saveCountdown}
        onCancel={() => setCountdownOpen(false)}
        confirmLoading={countdownSaving}
        okText="保存设置"
        cancelText="取消"
      >
        <div className="py-4">
          <Text type="secondary">
            该设置会应用到现场答题页，建议设置为 60～300 秒。
          </Text>
          <div className="mt-4 flex items-center gap-3">
            <InputNumber
              min={10}
              max={3600}
              value={countdownDraft}
              onChange={(value) => setCountdownDraft(value || 0)}
              className="w-48"
              addonAfter="秒"
            />
            <Text>
              约 {Math.floor(countdownDraft / 60)} 分 {countdownDraft % 60} 秒
            </Text>
          </div>
        </div>
      </Modal>

      <Modal
        title={editingActivity ? '编辑答题活动' : '创建答题活动'}
        open={editorOpen}
        onOk={submitActivity}
        onCancel={() => setEditorOpen(false)}
        confirmLoading={saving}
        okText={editingActivity ? '保存' : '创建'}
        cancelText="取消"
        width={960}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="pt-3">
          <Form.Item
            name="name"
            label="活动名称"
            rules={[
              { required: true, message: '请输入活动名称' },
              { max: 100, message: '活动名称最多 100 个字符' },
            ]}
          >
            <Input placeholder="例如：2026 夏日现场答题第一场" />
          </Form.Item>
          <Form.Item name="description" label="活动说明">
            <TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="选题筛选">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <Text className="block mb-1 text-xs" type="secondary">题目标签</Text>
                  <select
                    value={questionTagFilter}
                    onChange={(event) => setQuestionTagFilter(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="all">全部标签</option>
                    {questionTagOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Text className="block mb-1 text-xs" type="secondary">时间类型</Text>
                  <select
                    value={questionDateField}
                    onChange={(event) => setQuestionDateField(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="updated_at">更新时间</option>
                    <option value="created_at">创建时间</option>
                  </select>
                </div>
                <div>
                  <Text className="block mb-1 text-xs" type="secondary">开始日期</Text>
                  <input
                    type="date"
                    value={questionDateStart}
                    onChange={(event) => setQuestionDateStart(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <Text className="block mb-1 text-xs" type="secondary">结束日期</Text>
                  <input
                    type="date"
                    value={questionDateEnd}
                    onChange={(event) => setQuestionDateEnd(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  当前筛选后可选 {visibleQuestionOptions.filter(
                    (question) => !selectedQuestionIds.includes(question.key),
                  ).length} 道，已选择题目始终保留在右侧。
                </span>
                <Button type="link" size="small" onClick={resetQuestionFilters}>清除筛选</Button>
              </div>
            </div>
          </Form.Item>
          <Form.Item label={`选择题目（已选择 ${selectedQuestionIds.length} 道）`} required>
            <Transfer
              dataSource={visibleQuestionOptions}
              targetKeys={selectedQuestionIds}
              onChange={(keys) => setSelectedQuestionIds(keys)}
              render={(item) => {
                const tagMeta = getQuestionTagMeta(item.tag);
                return (
                  <div className="py-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{item.title}</span>
                      <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      创建 {formatDateTime(item.created_at)} · 更新 {formatDateTime(item.updated_at)}
                    </div>
                  </div>
                );
              }}
              titles={['可选题目', '本次活动题目']}
              showSearch
              filterOption={(inputValue, item) => item.searchText.includes(inputValue.toLowerCase())}
              listStyle={{ width: 410, height: 360 }}
              disabled={questionsLoading}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={statsActivity ? `活动统计：${statsActivity.name}` : '活动统计'}
        open={statsOpen}
        onCancel={() => setStatsOpen(false)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <Row gutter={16} className="mb-5 pt-2">
          <Col span={8}>
            <Statistic title="活动题目" value={statsActivity?.question_count || 0} suffix="道" />
          </Col>
          <Col span={8}>
            <Statistic title="随机次数" value={statsActivity?.total_random_clicks || 0} />
          </Col>
          <Col span={8}>
            <Statistic title="隐藏次数" value={statsActivity?.total_hide_clicks || 0} />
          </Col>
        </Row>
        <Table
          rowKey="question_id"
          columns={statsColumns}
          dataSource={statsActivity?.questions || []}
          loading={statsLoading}
          pagination={false}
          scroll={{ x: 700, y: 460 }}
        />
      </Modal>
    </Card>
  );
}


export default QuizActivityManager;
