import React, { useRef } from 'react';
import { App } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api from '../../api';

const ExcelImportExport = ({ onImportSuccess }) => {
  const { message, modal } = App.useApp();
  const fileInputRef = useRef(null);

  // 导出为 Excel
  const handleExport = async () => {
    try {
      // 获取所有题目（不分页）
      const response = await api.get('/admin/questions', { 
        params: { page: 1, page_size: 10000 } 
      });
      const questions = response.data.items;

      if (!questions || questions.length === 0) {
        message.warning('没有题目可导出');
        return;
      }

      // 转换数据为 Excel 格式
      const excelData = questions.map(q => ({
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
      const fileName = `题目导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success(`成功导出 ${questions.length} 道题目`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  // 导出模板
  const handleExportTemplate = () => {
    const templateData = [
      {
        'ID': '（空=新建，有值=更新）',
        '题目': '示例题目：霄雲是哪一年出生的？',
        '答案': '1998年',
        '资源链接（多个用|分隔）': 'https://example.com/image1.jpg|https://example.com/video.mp4',
        '标签': 'common',
        '出题人（多个用|分隔）': '制作人A|制作人B',
        '随机点击数': '（导入时可留空）',
        '隐藏点击数': '（导入时可留空）',
      },
      {
        'ID': '',
        '题目': '这是一道新题目',
        '答案': '示例答案',
        '资源链接（多个用|分隔）': '',
        '标签': 'vlog',
        '出题人（多个用|分隔）': '小云',
        '随机点击数': '',
        '隐藏点击数': '',
      },
      {
        'ID': '1',
        '题目': '这是更新ID为1的题目',
        '答案': '新答案',
        '资源链接（多个用|分隔）': '',
        '标签': 'concert',
        '出题人（多个用|分隔）': '魔法星',
        '随机点击数': '',
        '隐藏点击数': '',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '题目模板');

    // 设置列宽
    const colWidths = [
      { wch: 20 },  // ID
      { wch: 40 },  // 题目
      { wch: 30 },  // 答案
      { wch: 50 },  // 资源链接
      { wch: 30 },  // 标签
      { wch: 30 },  // 出题人
      { wch: 18 },  // 随机点击数
      { wch: 18 },  // 隐藏点击数
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, '题目导入模板.xlsx');
    message.success('模板下载成功！');
  };

  // 从 Excel 导入
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      message.error('请选择 Excel 文件（.xlsx 或 .xls）');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          message.warning('Excel 文件中没有数据');
          return;
        }

        // 转换数据格式
        const questions = jsonData.map(row => {
          const id = row['ID'] ? String(row['ID']).trim() : '';
          const question = row['题目'] ? String(row['题目']).trim() : '';
          const answer = row['答案'] ? String(row['答案']).trim() : '';
          const resourcesStr = row['资源链接（多个用|分隔）'] || '';
          const resources = resourcesStr 
            ? String(resourcesStr).split('|').map(r => r.trim()).filter(r => r)
            : [];
          const rawTag = row['标签'] ?? row['标签（concert/vlog/common）'] ?? 'common';
          const tag = String(rawTag).trim() || 'common';
          const authorStr = row['出题人（多个用|分隔）'] || '';
          const author = authorStr
            ? String(authorStr).split('|').map(a => a.trim()).filter(a => a)
            : [];

          return {
            id: id || undefined,
            question,
            answer,
            resources,
            tag,
            author,
          };
        });

        // 验证必填字段
        const invalidRows = [];
        questions.forEach((q, idx) => {
          if (!q.question || !q.answer) {
            invalidRows.push(idx + 2); // Excel 行号（第1行是标题）
          }
        });

        if (invalidRows.length > 0) {
          message.error(`第 ${invalidRows.join(', ')} 行的题目或答案为空，请检查后重新导入`);
          return;
        }

        // 确认导入
        modal.confirm({
          title: '确认导入',
          content: `即将导入 ${questions.length} 道题目，是否继续？`,
          onOk: async () => {
            try {
              // 调用批量导入接口
              const response = await api.post('/admin/questions/batch_import', {
                questions: questions
              });

              // 重置文件选择器
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }

              // 显示结果
              const { success_count, fail_count, errors } = response.data;
              
              if (fail_count === 0) {
                message.success(`成功导入 ${success_count} 道题目`);
              } else {
                modal.warning({
                  title: '导入完成',
                  content: (
                    <div>
                      <p>成功：{success_count} 道</p>
                      <p>失败：{fail_count} 道</p>
                      {errors.length > 0 && (
                        <div className="mt-2 max-h-60 overflow-y-auto text-xs">
                          <p className="font-semibold">错误详情：</p>
                          {errors.map((err, idx) => (
                            <p key={idx} className="text-red-600">
                              第 {err.index + 2} 行{err.id ? ` (ID: ${err.id})` : ''}: {err.error}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                  width: 600,
                });
              }

              // 通知父组件刷新
              if (onImportSuccess) {
                onImportSuccess();
              }
            } catch (error) {
              console.error('导入失败:', error);
              message.error(`导入失败: ${error.response?.data?.detail || error.message}`);
            }
          },
        });
      } catch (error) {
        console.error('解析 Excel 失败:', error);
        message.error('解析 Excel 文件失败，请检查文件格式');
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleExport}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        <DownloadOutlined />
        导出全部题目
      </button>
      
      <button
        onClick={handleExportTemplate}
        className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium text-sm"
      >
        <DownloadOutlined />
        下载导入模板
      </button>
      
      <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm cursor-pointer">
        <UploadOutlined />
        批量导入题目
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImport}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default ExcelImportExport;
