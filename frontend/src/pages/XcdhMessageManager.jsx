import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import api, { getLatest, isRequestCanceled } from '../api';
import { formatXcdhCreatedAt } from '../utils/xcdhTime';


const { Paragraph, Text } = Typography;
const numberFormatter = new Intl.NumberFormat('zh-CN');


function XcdhMessageManager() {
  const { message, modal } = App.useApp();
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState({ total: 0, visible: 0, hidden: 0, total_clicks: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLatest(
        'xcdh-admin-messages',
        '/admin/xcdh/messages',
        {
          params: {
            page,
            page_size: pageSize,
            keyword: keyword || undefined,
            visibility,
            sort_by: sortBy,
            sort_order: sortOrder,
          },
          hideLoading: true,
          hideErrorMessage: true,
        },
        String(refreshVersion),
      );
      setMessages(response.data.items || []);
      setTotal(response.data.total || 0);
      setSummary(response.data.summary || {});
    } catch (error) {
      if (!isRequestCanceled(error)) {
        message.error(error.response?.data?.detail || '星愿列表加载失败');
      }
    } finally {
      setLoading(false);
    }
  }, [keyword, message, page, pageSize, refreshVersion, sortBy, sortOrder, visibility]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const refresh = () => setRefreshVersion((value) => value + 1);

  const updateVisibility = (record, hidden) => {
    modal.confirm({
      title: hidden ? `隐藏星愿 #${record.id}？` : `恢复星愿 #${record.id}？`,
      content: hidden
        ? '隐藏后将立即从公开星海中消失，但数据会保留，可以随时恢复。'
        : '恢复后，这颗星愿会重新出现在公开星海中。',
      okText: hidden ? '确认隐藏' : '确认恢复',
      onOk: async () => {
        await api.patch(`/admin/xcdh/messages/${record.id}/visibility`, { hidden });
        message.success(hidden ? '星愿已隐藏' : '星愿已恢复');
        setSelectedMessage((current) => (
          current?.id === record.id ? { ...current, is_hidden: hidden } : current
        ));
        refresh();
      },
    });
  };

  const deleteMessage = (record) => {
    modal.confirm({
      title: `永久删除星愿 #${record.id}？`,
      content: '该操作会直接删除数据库记录，无法恢复。建议对普通违规内容优先使用“隐藏”。',
      okText: '永久删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.delete(`/admin/xcdh/messages/${record.id}`);
        message.success('星愿已永久删除');
        if (selectedMessage?.id === record.id) setSelectedMessage(null);
        if (messages.length === 1 && page > 1) {
          setPage((value) => value - 1);
        } else {
          refresh();
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 78,
      sorter: true,
      sortOrder: sortBy === 'id' ? `${sortOrder}end` : null,
      render: (id) => <Text strong>#{id}</Text>,
    },
    {
      title: '星愿',
      key: 'wish',
      width: 390,
      render: (_, record) => (
        <button
          type="button"
          className="w-full border-0 bg-transparent p-0 text-left cursor-pointer"
          onClick={() => setSelectedMessage(record)}
        >
          <Text strong>{record.username}</Text>
          <Paragraph className="!mb-0 !mt-1" type="secondary" ellipsis={{ rows: 2 }}>
            {record.content}
          </Paragraph>
        </button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_hidden',
      width: 100,
      render: (hidden) => hidden
        ? <Tag icon={<EyeInvisibleOutlined />} color="default">已隐藏</Tag>
        : <Tag icon={<EyeOutlined />} color="success">公开</Tag>,
    },
    {
      title: '发现次数',
      dataIndex: 'click_count',
      width: 120,
      sorter: true,
      sortOrder: sortBy === 'click_count' ? `${sortOrder}end` : null,
      render: (value) => numberFormatter.format(value || 0),
    },
    {
      title: '投递时间',
      dataIndex: 'created_at',
      width: 170,
      sorter: true,
      sortOrder: sortBy === 'created_at' ? `${sortOrder}end` : null,
      render: (value) => formatXcdhCreatedAt(value) || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedMessage(record)}>
            查看
          </Button>
          <Button
            size="small"
            icon={record.is_hidden ? <UndoOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => updateVisibility(record, !record.is_hidden)}
          >
            {record.is_hidden ? '恢复' : '隐藏'}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMessage(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">星愿管理</h1>
          <p className="mt-1 text-sm text-slate-400">审核“黄霄雲的星辰大海”中的公开留言与访问数据。</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
          <Button icon={<GlobalOutlined />} href="/xcdh" target="_blank">打开星海</Button>
        </Space>
      </header>

      <Row gutter={[12, 12]}>
        <Col xs={12} lg={6}><Card><Statistic title="全部星愿" value={summary.total || 0} prefix={<StarOutlined />} /></Card></Col>
        <Col xs={12} lg={6}><Card><Statistic title="公开展示" value={summary.visible || 0} /></Card></Col>
        <Col xs={12} lg={6}><Card><Statistic title="已隐藏" value={summary.hidden || 0} /></Card></Col>
        <Col xs={12} lg={6}><Card><Statistic title="累计发现" value={summary.total_clicks || 0} /></Card></Col>
      </Row>

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input.Search
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              if (!value) {
                setKeyword('');
                setPage(1);
              }
            }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
            allowClear
            enterButton={<SearchOutlined />}
            placeholder="搜索星愿 ID、昵称或内容"
            className="md:max-w-md"
          />
          <Select
            value={visibility}
            onChange={(value) => {
              setVisibility(value);
              setPage(1);
            }}
            className="w-full md:w-36"
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'visible', label: '仅公开' },
              { value: 'hidden', label: '仅隐藏' },
            ]}
          />
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={messages}
          loading={loading}
          scroll={{ x: 1080 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 颗星愿`,
          }}
          onChange={(pagination, _, sorter) => {
            setPage(pagination.current || 1);
            setPageSize(pagination.pageSize || 20);
            if (sorter.field && sorter.order) {
              setSortBy(sorter.field);
              setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
            }
          }}
        />
      </Card>

      <Modal
        open={Boolean(selectedMessage)}
        title={selectedMessage ? `星愿 #${selectedMessage.id}` : '星愿详情'}
        onCancel={() => setSelectedMessage(null)}
        footer={selectedMessage ? (
          <Space wrap>
            <Button onClick={() => setSelectedMessage(null)}>关闭</Button>
            <Button
              icon={selectedMessage.is_hidden ? <UndoOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => updateVisibility(selectedMessage, !selectedMessage.is_hidden)}
            >
              {selectedMessage.is_hidden ? '恢复公开' : '隐藏星愿'}
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => deleteMessage(selectedMessage)}>
              永久删除
            </Button>
          </Space>
        ) : null}
      >
        {selectedMessage && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="昵称">{selectedMessage.username}</Descriptions.Item>
            <Descriptions.Item label="内容">
              <Paragraph className="!mb-0 whitespace-pre-wrap">{selectedMessage.content}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedMessage.is_hidden ? '已隐藏' : '公开展示'}
            </Descriptions.Item>
            <Descriptions.Item label="发现次数">{selectedMessage.click_count || 0}</Descriptions.Item>
            <Descriptions.Item label="投递时间">
              {formatXcdhCreatedAt(selectedMessage.created_at) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="星空坐标">
              X {Number(selectedMessage.x).toFixed(2)}% · Y {Number(selectedMessage.y).toFixed(2)}%
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}


export default XcdhMessageManager;
