# 答题系统

一个前后端分离的答题活动系统，支持普通用户答题和管理员题目管理功能。

## 技术栈

### 后端
- **FastAPI** - 现代化的 Python Web 框架
- **SQLite** - 轻量级数据库
- **JWT** - 管理员身份认证

### 前端
- **React** - 用户界面库
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Vite** - 快速的前端构建工具
- **React Router** - 路由管理

## 功能特性

### 普通用户功能（无需登录）
- ✅ 浏览所有题目
- ✅ 按类型筛选题目（演唱会/Vlog/通用）
- ✅ 在线答题并即时查看结果
- ✅ 查看参考资源链接
- ✅ 题目导航（上一题/下一题）

### 管理员功能（需要登录）
- ✅ 管理员登录认证
- ✅ 查看题目统计信息
- ✅ 创建新题目
- ✅ 编辑现有题目
- ✅ 删除题目
- ✅ 完整的 CRUD 操作
- ✅ **Excel 批量导入导出** - 支持批量创建、更新题目（详见 [EXCEL_FORMAT.md](EXCEL_FORMAT.md)）

## 项目结构

```
feiyinluguo2/
├── backend/                 # 后端目录
│   ├── main.py             # FastAPI 主应用
│   ├── models.py           # Pydantic 数据模型
│   ├── database.py         # 数据库操作
│   ├── auth.py             # JWT 认证
│   ├── questions.json      # 题目数据（可选）
│   ├── requirements.txt    # Python 依赖
│   └── quiz.db            # SQLite 数据库（自动生成）
│
└── frontend/               # 前端目录
    ├── src/
    │   ├── pages/
    │   │   ├── QuizPage.jsx          # 答题页面
    │   │   ├── AdminLogin.jsx        # 管理员登录
    │   │   └── AdminDashboard.jsx    # 管理员控制台
    │   ├── App.jsx                   # 主应用组件
    │   ├── api.js                    # API 请求封装
    │   ├── main.jsx                  # 入口文件
    │   └── index.css                 # 全局样式
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## 快速开始

### 环境要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 后端启动

1. 进入后端目录：
```bash
cd backend
```

2. 安装 Python 依赖：
```bash
pip install -r requirements.txt
```

3. 启动后端服务：
```bash
python main.py
```

后端将在 `http://localhost:8000` 运行

### 前端启动

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

前端将在 `http://localhost:3000` 运行

## 默认管理员账号

- **用户名**: admin
- **密码**: admin123

> ⚠️ 生产环境请务必修改默认密码！

## API 接口文档

### 公开接口

#### 获取所有题目（不含答案）
```
GET /api/questions
```

#### 获取单个题目（不含答案）
```
GET /api/questions/{question_id}
```

#### 提交答案
```
POST /api/answer
Body: {
  "question_id": "string",
  "answer": "string"
}
```

### 管理员接口（需要 Bearer Token）

#### 管理员登录
```
POST /api/admin/login
Body: {
  "username": "string",
  "password": "string"
}
```

#### 获取所有题目（含答案）
```
GET /api/admin/questions
```

#### 创建题目
```
POST /api/admin/questions
Body: {
  "question": "string",
  "answer": "string",
  "resources": ["url1", "url2"],
  "tag": "concert" | "vlog" | "common"
}
```

#### 更新题目
```
PUT /api/admin/questions/{question_id}
Body: {
  "question": "string",
  "answer": "string",
  "resources": ["url1", "url2"],
  "tag": "concert" | "vlog" | "common"
}
```

#### 删除题目
```
DELETE /api/admin/questions/{question_id}
```

## 题目数据格式

```json
{
  "id": "unique_question_id",
  "question": "题目内容",
  "answer": "正确答案",
  "resources": ["参考资源URL1", "参考资源URL2"],
  "tag": "concert" | "vlog" | "common"
}
```

## 数据导入

如果 `backend/questions.json` 文件存在，系统会在首次启动时自动导入题目数据到数据库。

## 生产部署建议

1. **修改 JWT 密钥**: 在 `backend/auth.py` 中修改 `SECRET_KEY`
2. **修改默认管理员密码**: 在数据库中更新或通过代码修改
3. **配置 CORS**: 在 `backend/main.py` 中指定允许的前端域名
4. **使用环境变量**: 将敏感配置移至环境变量
5. **使用生产级数据库**: 考虑使用 PostgreSQL 或 MySQL
6. **使用反向代理**: 配置 Nginx 作为反向代理

## 开发说明

### 添加新功能
- 后端：在 `main.py` 中添加新的路由
- 前端：在 `src/pages` 中创建新页面组件

### 修改样式
项目使用 Tailwind CSS，直接在组件中使用 utility classes。

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue。
