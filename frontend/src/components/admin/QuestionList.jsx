import React, { useState } from 'react';
import { Table, Tag, Button, Space, App } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { getQuestionTagMeta } from '../../constants/questionTags';

const formatDateTime = (value) => {
  if (!value) return '-';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
};

const QuestionList = ({ 
  questions, 
  loading, 
  searchKeyword, 
  filterTag, 
  sortDesc, 
  setSortDesc, 
  onEdit, 
  onDelete,
  onResetStats,
  onBatchDelete,
  onBatchResetStats,
  currentPage,
  pageSize,
  total,
  onPageChange
}) => {
  const { modal, message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的题目');
      return;
    }
    
    modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个题目吗？此操作不可恢复！`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (onBatchDelete) {
          await onBatchDelete(selectedRowKeys);
          setSelectedRowKeys([]);
        }
      },
    });
  };

  const handleBatchResetStats = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要归零的题目');
      return;
    }
    
    modal.confirm({
      title: '批量归零确认',
      content: `确定要归零选中的 ${selectedRowKeys.length} 个题目的统计数据吗？`,
      okText: '确定归零',
      cancelText: '取消',
      onOk: async () => {
        if (onBatchResetStats) {
          await onBatchResetStats(selectedRowKeys);
          setSelectedRowKeys([]);
        }
      },
    });
  };

  const handleBatchExport = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的题目');
      return;
    }

    try {
      // 筛选选中的题目
      const selectedQuestions = questions.filter(q => selectedRowKeys.includes(q.id));

      // 转换数据为 Excel 格式
      const excelData = selectedQuestions.map(q => ({
        'ID': q.id,
        '题目': q.question,
        '答案': q.answer,
        '资源链接（多个用|分隔）': q.resources?.join('|') || '',
        '标签': q.tag,
        '出题人（多个用|分隔）': Array.isArray(q.author) ? q.author.join('|') : (q.author || ''),
        '创建时间': q.created_at || '',
        '更新时间': q.updated_at || '',
        '随机点击数': q.random_clicks || 0,
        '隐藏点击数': q.hide_clicks || 0,
      }));

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '题目列表');

      // 设置列宽
      const colWidths = [
        { wch: 10 },  // ID
        { wch: 40 },  // 题目
        { wch: 30 },  // 答案
        { wch: 50 },  // 资源链接
        { wch: 20 },  // 标签
        { wch: 30 },  // 出题人
        { wch: 22 },  // 创建时间
        { wch: 22 },  // 更新时间
        { wch: 12 },  // 随机点击数
        { wch: 12 },  // 隐藏点击数
      ];
      worksheet['!cols'] = colWidths;

      // 导出文件
      const fileName = `批量导出_${selectedRowKeys.length}题_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success(`成功导出 ${selectedRowKeys.length} 道题目`);
    } catch (error) {
      console.error('批量导出失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id) => <span className="text-blue-600 font-medium">#{id}</span>,
    },
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      render: (text) => (
        <div className="text-sm" title={text}>
          {text}
        </div>
      ),
    },
    {
      title: '答案',
      dataIndex: 'answer',
      key: 'answer',
      width: 150,
      render: (answer, record) => {
        const isExpanded = expandedRowKeys.includes(record.id);
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              type="link"
              size="small"
              icon={isExpanded ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => {
                setExpandedRowKeys(prev => 
                  isExpanded ? prev.filter(key => key !== record.id) : [...prev, record.id]
                );
              }}
            >
              {isExpanded ? '隐藏答案' : '查看答案'}
            </Button>
            {isExpanded && (
              <div className="p-2 bg-green-50 rounded border border-green-200 text-xs break-all">
                {answer}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'tag',
      key: 'tag',
      width: 100,
      render: (tag) => {
        const tagMeta = getQuestionTagMeta(tag);
        return <Tag color={tagMeta.color}>{tagMeta.shortLabel}</Tag>;
      },
    },
    {
      title: '出题人',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      ellipsis: true,
      render: (author) => {
        const authorText = Array.isArray(author) ? author.join(', ') : (author || '-');
        return <span title={authorText}>{authorText}</span>;
      },
    },
    {
      title: '资源数',
      dataIndex: 'resources',
      key: 'resources',
      width: 100,
      align: 'center',
      render: (resources) => (
        <span>{resources && resources.length > 0 ? `${resources.length} 个` : '无'}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      responsive: ['xl'],
      render: formatDateTime,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      responsive: ['lg'],
      render: formatDateTime,
    },
    {
      title: '历史/调试统计',
      key: 'stats',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="text-purple-600 text-xs">随机: {record.random_clicks || 0}</span>
          <span className="text-orange-600 text-xs">隐藏: {record.hide_clicks || 0}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => onResetStats(record.id)}
            title="归零统计数据"
          >
            归零
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {selectedRowKeys.length > 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            已选择 <span className="font-semibold text-blue-600">{selectedRowKeys.length}</span> 个题目
          </span>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleBatchExport}
              type="primary"
            >
              批量导出
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleBatchResetStats}
            >
              批量归零
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
            <Button
              onClick={() => setSelectedRowKeys([])}
            >
              取消选择
            </Button>
          </Space>
        </div>
      )}
      
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={questions}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个题目`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, size) => {
            onPageChange(page, size);
          },
        }}
        scroll={{ x: 1500 }}
        locale={{
          emptyText: searchKeyword || filterTag !== 'all' ? '没有找到匹配的题目' : '暂无题目，请添加题目',
        }}
      />
    </div>
  );
};

export default QuestionList;
