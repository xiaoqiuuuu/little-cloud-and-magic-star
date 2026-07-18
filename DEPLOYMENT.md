# 生产部署

项目使用 GitHub Actions 自动部署：代码合并到 `main` 后，CI 检查后端、构建前端，并通过 SSH 发布到生产服务器。

## 持久化数据

以下内容只保存在服务器，不进入 Git，也不会被 `git reset` 覆盖：

- `backend/.env`：生产环境变量
- `backend/quiz.db`：指向服务器持久化生产 SQLite 数据库的符号链接
- `backend/uploads/`：指向服务器持久化上传目录的符号链接
- `backend/backups/`：发布前自动生成的数据库备份，保留最近 10 份

本地开发默认使用仓库目录下的 `backend/quiz.db`。生产环境应在 `.env` 中用绝对路径明确指定：

```dotenv
ENVIRONMENT=production
SECRET_KEY=请使用足够长的随机值
DATABASE_FILE=/www/wwwroot/dati/backend/quiz.db
HOST=127.0.0.1
PORT=8100
```

## GitHub production secrets

GitHub 仓库需要配置以下 Actions secrets：

- `SERVER_HOST`：生产服务器 IP 或主机名
- `SERVER_PORT`：SSH 端口
- `SERVER_USER`：专用部署用户
- `SSH_PRIVATE_KEY`：专用部署用户的 SSH 私钥
- `SERVER_FINGERPRINT`：服务器 SSH Host Key 的 SHA256 指纹
- `DEPLOY_PATH`：服务器代码目录，当前为 `/www/wwwroot/little-cloud-and-magic-star`

## 服务器运行方式

systemd 配置模板位于 `ops/little-cloud.service`，生产服务以服务器现有的 `www` 用户运行，监听 `127.0.0.1:8100`，由 Nginx 对外提供 HTTPS。GitHub Actions 使用独立的 `littlecloud` 用户部署，该用户只能免密重启本项目的 systemd 服务。旧宝塔目录中的数据库和上传文件通过符号链接挂载到新代码目录，代码发布不会覆盖生产数据。

每次自动发布会：

1. 在 GitHub Actions 中检查后端并构建前端。
2. 将前端构建产物上传到服务器临时目录。
3. 使用 SQLite 在线备份生产数据库。
4. 将服务器代码切换到触发发布的 `main` 提交。
5. 更新 Python 依赖并原子替换前端构建目录。
6. 重启 `little-cloud.service`。
7. 请求 `http://127.0.0.1:8100/api/health`；失败时回滚代码和前端。

## 手动发布

自动流水线不可用时，可由部署用户在服务器运行：

```bash
cd /www/wwwroot/little-cloud-and-magic-star
./deploy.sh
```

服务器没有 Node.js 时，手动脚本会继续使用上一次由 GitHub Actions 上传的前端构建。

生产服务器安装 Python 依赖时默认使用阿里云 PyPI 镜像，以避免中国区服务器访问官方 PyPI CDN 过慢。手动部署可通过 `PIP_INDEX_URL` 覆盖该地址。
