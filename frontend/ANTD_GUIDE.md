# Ant Design 消息系统使用说明

## 已完成的配置

### 1. 安装的依赖
- `antd`: Ant Design UI 组件库
- `@ant-design/icons`: Ant Design 图标库

### 2. 全局配置
在 `App.jsx` 中配置了：
- **ConfigProvider**: 全局配置（中文语言包、主题色等）
- **App 组件**: 提供全局的 message、notification、modal 等静态方法

### 3. 消息工具 (utils/message.js)
提供了统一的消息提示方法：

```javascript
import { showSuccess, showError, showWarning, showInfo, showLoading } from '@/utils/message';

// 成功消息
showSuccess('操作成功');

// 错误消息
showError('操作失败');

// 警告消息
showWarning('请注意');

// 普通消息
showInfo('提示信息');

// 加载中（需要手动关闭）
const hide = showLoading('加载中...');
// ... 执行操作后
hide();
```

### 4. 通知功能
```javascript
import { notifySuccess, notifyError, notifyWarning, notifyInfo } from '@/utils/message';

// 成功通知
notifySuccess('操作成功', '您的数据已保存');

// 错误通知
notifyError('操作失败', '网络连接异常，请重试');

// 警告通知
notifyWarning('警告', '您即将删除重要数据');

// 普通通知
notifyInfo('提示', '有新消息');
```

### 5. API 自动错误处理
在 `api.js` 中已配置：
- ✅ 自动显示 loading
- ✅ 自动处理错误并显示消息
- ✅ 401 错误自动跳转登录
- ✅ 网络错误提示

可以通过配置禁用自动处理：
```javascript
api.post('/api/xxx', data, {
  hideLoading: true,        // 不显示全局 loading
  hideErrorMessage: true,   // 不自动显示错误消息
});
```

## 在组件中使用 Ant Design

### 表单示例
```jsx
import { Form, Input, Button } from 'antd';
import { showSuccess } from '@/utils/message';

function MyForm() {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log(values);
    showSuccess('提交成功');
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Form.Item name="username" rules={[{ required: true }]}>
        <Input placeholder="用户名" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          提交
        </Button>
      </Form.Item>
    </Form>
  );
}
```

### 表格示例
```jsx
import { Table, Button } from 'antd';
import { showSuccess } from '@/utils/message';

function MyTable() {
  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => handleDelete(record.id)}>
          删除
        </Button>
      ),
    },
  ];

  const handleDelete = (id) => {
    // 删除操作
    showSuccess('删除成功');
  };

  return <Table columns={columns} dataSource={data} />;
}
```

### Modal 对话框
```jsx
import { Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

const { confirm } = Modal;

function showDeleteConfirm() {
  confirm({
    title: '确定要删除吗？',
    icon: <ExclamationCircleFilled />,
    content: '删除后无法恢复',
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      // 执行删除
      showSuccess('删除成功');
    },
  });
}
```

## 常用组件

### 按钮
```jsx
<Button type="primary">主按钮</Button>
<Button>默认按钮</Button>
<Button type="dashed">虚线按钮</Button>
<Button type="text">文本按钮</Button>
<Button type="link">链接按钮</Button>
<Button danger>危险按钮</Button>
<Button loading>加载中</Button>
<Button icon={<SearchOutlined />}>带图标</Button>
```

### 输入框
```jsx
<Input placeholder="普通输入框" />
<Input.Password placeholder="密码输入框" />
<Input.Search placeholder="搜索框" onSearch={handleSearch} />
<Input.TextArea rows={4} placeholder="多行文本" />
```

### 选择器
```jsx
<Select placeholder="请选择">
  <Select.Option value="1">选项1</Select.Option>
  <Select.Option value="2">选项2</Select.Option>
</Select>
```

### 日期选择
```jsx
<DatePicker placeholder="选择日期" />
<RangePicker placeholder={['开始日期', '结束日期']} />
```

## 主题定制

在 `App.jsx` 的 ConfigProvider 中修改：
```jsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#1890ff',  // 主色
      borderRadius: 6,          // 圆角
      colorSuccess: '#52c41a',  // 成功色
      colorWarning: '#faad14',  // 警告色
      colorError: '#ff4d4f',    // 错误色
    },
  }}
>
```

## 图标使用

```jsx
import {
  UserOutlined,
  LockOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

<Button icon={<PlusOutlined />}>添加</Button>
```

## 更多资源
- [Ant Design 官方文档](https://ant.design/components/overview-cn)
- [图标列表](https://ant.design/components/icon-cn)
