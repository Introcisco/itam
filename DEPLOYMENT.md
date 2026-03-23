# ITAM 项目部署指南

该指南将帮助你在服务器上部署 ITAM (IT 资产管理) 系统。项目现在使用静态 React 前端和 Node.js 后端，数据存储在 MySQL 数据库中。

## 1. 准备工作

请确保你的服务器已经安装了以下环境：
- **Node.js**: (推荐 v18 或以上版本)
- **MySQL 服务器**: (已有)
- **Nginx**: 用于提供前端静态文件服务和配置 API 的反向代理。

### 获取代码
将当前修改后的项目代码上传或者拉取到你的服务器上的某个目录。例如 `/var/www/itam`

## 2. 部署后端服务

后端服务存放在项目的 `server` 文件夹中。

1. **进入后端目录并安装依赖**
   ```bash
   cd /var/www/itam/server
   npm install
   ```

2. **配置环境变量**
   在 `server` 目录下找到 `.env` 文件。修改其中的内容为你服务器上的真实 MySQL 配置：
   ```env
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=你的真实数据库密码
   DB_NAME=itam_db
   PORT=3001
   ```
   *注意：如果你的数据库账户具备创建数据库的权限，代码会自动创建 `itam_db` 数据库和相关表。为保障安全，初次部署时系统将自动生成带有 bcrypt 哈希加密的默认账号（如：admin）。*

3. **使用 PM2 在后台运行后端服务**
   为了防止关闭终端后服务停止，建议使用 PM2 守护进程管理工具。
   ```bash
   # 全局安装 pm2 (如果尚未安装)
   npm install -g pm2
   
   # 启动后端服务
   pm2 start server.js --name itam-backend
   
   # 保存 PM2 配置 (使服务在主机重启后自动恢复)
   pm2 save
   pm2 startup
   ```


## 3. 部署前端应用

前端是一个 React 应用 (由 Vite 构建)。

1. **进入项目根目录并安装依赖**
   ```bash
   cd /var/www/itam
   npm install
   ```

2. **确认 API 配置**
   在 `src/api.js` 中，我们的请求基础 URL 当前可能是 `http://localhost:3001/api`。
   为了能让你部署后正确访问，请确保该 URL 与你的服务配置一致（由于接下来我们会使用 Nginx 进行反向代理，你也可以将 `API_BASE_URL` 修改为 `/api`）：
   ```javascript
   // 如果使用 nginx 反向代理，推荐将其改为相对路径:
   const API_BASE_URL = '/api'; 
   ```

3. **构建前端代码**
   ```bash
   npm run build
   ```
   执行完成后，会在项目根目录生成一个 `dist` 文件夹。

## 4. 配置 Nginx 

通过 Nginx 托管构建好的前段静态文件 (`dist`) 并将 `/api` 的请求转发给后端的 Node.js 服务器（在 3001 端口上运行）。

1. **创建 Nginx 配置文件**
   在 `/etc/nginx/conf.d/` 或 `/etc/nginx/sites-available/` 下创建一个名为 `itam.conf` 的配置文件：

   ```nginx
   server {
       listen 80;
       server_name your_domain_or_IP; # 替换成你的域名或服务器 IP

       # 前端静态文件目录配置
       root /var/www/itam/dist;
       index index.html index.htm;

       # 处理前端路由，解决刷新 404 的问题
       location / {
           try_files $uri $uri/ /index.html;
       }

       # 后端 API 反向代理配置
       location /api/ {
           proxy_pass http://127.0.0.1:3001/api/; # 转发请求给 Node.js 服务
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. **重启 Nginx 应用配置**
   ```bash
   # 验证 Nginx 配置文件是否正确
   nginx -t
   
   # 重启 Nginx (如果是 CentOS/RHEL 等使用 systemctl 的系统)
   systemctl restart nginx
   ```

## 5. 完成验证测试
恭喜！现在你可以通过浏览器打开 `http://你的IP或域名/` 来访问 ITAM 系统了。
- 尝试创建一个资产并检查能否成功被添加到列表中。
- 你可以验证后端的控制台或者 pm2 日志查看 API 调用请求是否正常。
   ```bash
   pm2 logs itam-backend
   ```
