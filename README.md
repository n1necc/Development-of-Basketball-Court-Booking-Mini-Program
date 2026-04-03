# 篮球场预定微信小程序 - 项目说明文档

## 📋 项目概述

这是一个完整的篮球场预定管理系统，包含三个部分：
- **微信小程序端**：用户预定、支付、评价、收藏等功能
- **Node.js 后端**：RESTful API 服务，处理业务逻辑
- **Web 管理后台**：场地管理、订单管理、用户管理、数据统计

### 项目特色
- ✅ **全中文注释**：所有代码都有详细的中文注释，适合零基础学习
- ✅ **完整功能**：涵盖预定、支付、评价、收藏、统计等完整业务流程
- ✅ **易于部署**：一键初始化数据库，快速启动项目
- ✅ **代码规范**：遵循最佳实践，代码结构清晰

## 🛠 技术栈

### 后端技术
- **Node.js** + **Express.js**：Web 服务框架
- **MySQL** + **Sequelize ORM**：数据库及 ORM
- **JWT**：用户身份认证
- **bcryptjs**：密码加密
- **multer**：文件上传处理
- **qrcode**：订单二维码生成
- **node-schedule**：定时任务（自动取消超时订单）
- **axios**：HTTP 请求（微信 API 调用）

### 前端技术
- **微信小程序原生框架**：WXML + WXSS + JavaScript
- **Web 管理后台**：原生 HTML + CSS + JavaScript

## 📁 项目结构

```
basketball/
├── backend/                 # 后端服务
│   ├── config/             # 配置文件
│   │   └── database.js     # 数据库连接和模型关联
│   ├── middleware/         # 中间件
│   │   ├── auth.js         # JWT 认证中间件
│   │   └── upload.js       # 文件上传中间件
│   ├── models/             # 数据模型（13个表）
│   │   ├── User.js         # 用户表
│   │   ├── Venue.js        # 场馆表
│   │   ├── Order.js        # 订单表
│   │   ├── Review.js       # 评价表
│   │   ├── Favorite.js     # 收藏表
│   │   ├── News.js         # 新闻表
│   │   ├── Announcement.js # 公告表
│   │   ├── Admin.js        # 管理员表
│   │   ├── Setting.js      # 系统设置表
│   │   ├── VenueLock.js    # 场地锁定表
│   │   ├── VenuePrice.js   # 场地价格表
│   │   ├── VenueStatusLog.js # 场馆状态变更日志表
│   │   └── SystemStatusLog.js # 系统状态变更日志表
│   ├── routes/             # 路由（API 接口）
│   │   ├── auth.js         # 用户认证（登录、获取用户信息）
│   │   ├── venues.js       # 场馆相关
│   │   ├── orders.js       # 订单相关
│   │   ├── reviews.js      # 评价相关
│   │   ├── favorites.js    # 收藏相关
│   │   ├── news.js         # 新闻相关
│   │   ├── announcements.js# 公告相关
│   │   ├── admin/          # 管理端接口
│   │   │   ├── auth.js     # 管理员认证、注册、修改密码
│   │   │   ├── venues.js   # 场馆管理
│   │   │   ├── orders.js   # 订单管理
│   │   │   ├── users.js    # 用户管理
│   │   │   ├── news.js     # 新闻管理
│   │   │   ├── announcements.js # 公告管理
│   │   │   ├── statistics.js # 数据统计
│   │   │   └── settings.js # 系统设置
│   │   └── admin.js        # 管理端路由入口
│   ├── utils/              # 工具函数
│   │   ├── schedule.js     # 定时任务
│   │   ├── orderTimeout.js # 订单超时处理
│   │   └── wechat.js       # 微信 API 封装
│   ├── uploads/            # 上传文件存储目录
│   ├── app.js              # 应用入口
│   ├── init-database.js    # 数据库初始化脚本
│   ├── .env                # 环境变量配置
│   ├── .env.example        # 环境变量配置模板
│   └── package.json        # 依赖配置
│
├── miniprogram/            # 微信小程序
│   ├── custom-tab-bar/     # 自定义底部导航栏
│   ├── pages/              # 页面
│   │   ├── index/          # 首页（新闻、公告、热门场馆）
│   │   ├── booking/        # 预定页（场馆列表）
│   │   ├── venue-detail/   # 场馆详情
│   │   ├── order-confirm/  # 订单确认
│   │   ├── orders/         # 订单列表
│   │   ├── order-detail/   # 订单详情
│   │   ├── my/             # 个人中心
│   │   ├── profile/        # 个人资料
│   │   ├── login/          # 登录页
│   │   ├── favorites/      # 收藏列表
│   │   ├── review/         # 评价页
│   │   └── search/         # 搜索页
│   ├── app.js              # 小程序入口（全局配置、请求封装）
│   ├── app.json            # 小程序配置
│   ├── app.wxss            # 小程序全局样式
│   ├── project.config.json # 开发者工具配置
│   └── sitemap.json        # 站点地图配置
│
└── admin/                  # Web 管理后台
    ├── css/                # 样式文件
    │   └── style.css       # 全局样式
    ├── js/                 # JavaScript 文件
    │   ├── config.js       # 配置文件
    │   ├── api.js          # API 请求封装
    │   ├── main.js         # 主入口文件
    │   ├── login.js        # 登录页逻辑
    │   ├── dashboard.js    # 数据概览
    │   ├── venues.js       # 场馆管理
    │   ├── orders.js       # 订单管理
    │   ├── users.js        # 用户管理
    │   ├── news.js         # 新闻管理
    │   ├── announcements.js # 公告管理
    │   ├── statistics.js   # 数据统计
    │   └── settings.js     # 系统设置
    ├── index.html          # 后台首页（主框架）
    └── login.html          # 登录页
```

## 🚀 快速开始

### 1. 环境准备

#### 必需软件
1. **Node.js**（v14.x 或更高）
   - 下载：https://nodejs.org/
   - 验证：`node -v` 和 `npm -v`

2. **MySQL**（v5.7 或 v8.0）
   - 下载：https://dev.mysql.com/downloads/mysql/
   - 启动 MySQL 服务

3. **微信开发者工具**
   - 下载：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

#### 微信小程序准备
1. 注册微信小程序：https://mp.weixin.qq.com/
2. 获取 AppID 和 AppSecret
3. 开发阶段可以使用测试号

### 2. 数据库配置

#### 2.1 创建数据库
登录 MySQL，执行：
```sql
CREATE DATABASE court_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2.2 配置环境变量
编辑 `backend/.env` 文件：
```env
# 服务器配置
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=court_booking
DB_USER=root
DB_PASSWORD=你的MySQL密码

# JWT密钥
JWT_SECRET=你的随机密钥

# 微信小程序配置
WX_APPID=你的小程序AppID
WX_SECRET=你的小程序AppSecret
```

#### 2.3 初始化数据库
```bash
cd backend
npm install
node init-database.js
```

初始化脚本会自动：
- ✅ 创建所有数据表（11个表）
- ✅ 创建默认管理员（用户名：admin，密码：admin123）
- ✅ 创建默认系统设置
- ✅ 创建示例数据（可选）

### 3. 启动后端服务

#### 开发模式（推荐）
```bash
cd backend
npm run dev
```
使用 nodemon 自动重启，修改代码后自动生效。

#### 生产模式
```bash
cd backend
npm start
```

启动成功后会显示：
```
数据库连接并同步成功
定时任务已启动
========================================
🚀 后台启动成功 3000
========================================
📱 管理后台: http://localhost:3000
========================================
👤 默认账号: admin
🔑 默认密码: admin123
========================================
```

### 4. 配置微信小程序

#### 4.1 导入项目
1. 打开微信开发者工具
2. 选择"导入项目"
3. 项目目录：`d:\ACode_myb\bcb\miniprogram`
4. AppID：填入你的小程序 AppID（或使用测试号）

#### 4.2 配置开发设置
在微信开发者工具中：
- 点击右上角"详情"
- 本地设置 → 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
- 本地设置 → 勾选"启用调试"

#### 4.3 编译运行
点击工具栏的"编译"按钮，小程序即可运行。

### 5. 访问管理后台

浏览器打开：http://localhost:3000

默认登录信息：
- 用户名：`admin`
- 密码：`admin123`

**⚠️ 重要：首次登录后请立即修改密码！**

## 📱 功能说明

### 用户端（微信小程序）

#### 首页
- 查看最新新闻资讯
- 查看系统公告
- 浏览热门场馆推荐
- 快捷入口：预定、收藏、订单

#### 预定功能
1. 浏览场馆列表（支持搜索、筛选）
2. 查看场馆详情（图片、价格、设施、评价）
3. 选择日期和时间段
4. 确认订单信息
5. 支付订单（模拟支付）
6. 获取订单二维码（用于入场验证）

#### 订单管理
- 查看订单列表（待支付、待使用、已完成、已取消）
- 查看订单详情
- 取消订单（未完成的订单）
- 订单二维码展示

#### 评价功能
- 对已完成的订单进行评价
- 评分（1-5星）
- 文字评价

#### 收藏功能
- 收藏喜欢的场馆
- 查看收藏列表
- 快速访问收藏的场馆

#### 个人中心
- 显示随机头像和昵称
- 订单快捷入口（按状态分类）
- 个人信息
- 我的收藏
- 退出登录

### 管理端（Web 后台）

#### 数据概览
- 今日订单数、营收、用户数
- 待处理订单提醒
- 营收趋势图表

#### 场馆管理
- 添加/编辑/删除场馆
- 上传场馆图片
- 设置场馆价格（工作日/周末）
- 设置场馆状态（开放/维护）
- 场馆排序

#### 订单管理
- 查看所有订单
- 按状态筛选（待支付、已支付、已完成、已取消）
- 订单详情查看
- 订单状态修改

#### 用户管理
- 查看用户列表
- 用户详情（订单历史、消费统计）
- 用户状态管理（正常/禁用）

#### 内容管理
- 新闻管理（发布、编辑、删除）
- 公告管理（发布、编辑、删除）
- 内容排序和状态控制

#### 数据统计
- 营收统计（日/周/月）
- 订单统计
- 导出订单数据（Excel）
- 场馆使用率分析
- 用户增长趋势
- 可视化图表展示

#### 系统设置
- 注册新管理员（超级管理员权限）
- 修改当前登录密码
- 系统参数配置
- 系统状态管理（启用/维护模式）
- 查看系统状态变更日志

## 🔐 用户认证流程

### 小程序端登录
1. 用户点击"登录"按钮
2. 调用 `wx.login()` 获取临时登录凭证 code
3. 调用 `wx.getUserProfile()` 请求用户授权
4. 用户点击"允许"授权获取头像和昵称
5. 将 code 和用户信息发送到后端
6. 后端调用微信 API 验证 code，获取 openid
7. 创建或更新用户信息
8. 生成 JWT token 返回给小程序
9. 小程序保存 token，后续请求携带 token

### 管理端登录
1. 输入用户名和密码
2. 后端验证账号密码（使用 bcrypt 加密对比）
3. 验证成功生成 JWT token
4. 前端保存 token 到 localStorage
5. 后续请求在 Header 中携带 token

### 管理员管理
- 超级管理员可以注册新管理员账号
- 所有管理员可以修改自己的密码
- 管理员注册需要用户名（3-50字符）和密码（至少8位，包含大小写字母和数字）
- 密码使用 bcrypt 加密存储

## 📊 数据库设计

### 核心表说明

#### users（用户表）
- 存储小程序用户信息
- 字段：openid、昵称、头像、余额、状态等

#### venues（场馆表）
- 存储篮球场馆信息
- 字段：名称、地址、图片、设施、状态、排序等

#### venue_prices（场馆价格表）
- 存储不同时间段的价格
- 字段：场馆ID、开始时间、结束时间、工作日价格、周末价格

#### orders（订单表）
- 存储预定订单
- 字段：订单号、用户ID、场馆ID、日期、时间段、价格、状态、二维码等
- 状态：unconfirmed（未确认）、pending（待支付）、paid（已支付）、completed（已完成）、cancelled（已取消）、refunded（已退款）

#### reviews（评价表）
- 存储用户评价
- 字段：订单ID、用户ID、场馆ID、评分、内容等

#### favorites（收藏表）
- 存储用户收藏
- 字段：用户ID、场馆ID

#### news（新闻表）
- 存储新闻资讯
- 字段：标题、摘要、内容、图片、状态等

#### announcements（公告表）
- 存储系统公告
- 字段：标题、内容、状态等

#### admins（管理员表）
- 存储管理员账号
- 字段：用户名、密码（加密）、角色等

#### settings（系统设置表）
- 存储系统配置
- 字段：键值对形式

#### venue_locks（场地锁定表）
- 临时锁定场地（防止重复预定）
- 字段：场馆ID、日期、时间段、锁定时间

#### venue_status_logs（场馆状态变更日志表）
- 记录场馆状态变更历史
- 字段：场馆ID、旧状态、新状态、变更原因、操作人、操作时间

#### system_status_logs（系统状态变更日志表）
- 记录系统状态变更历史（启用/维护模式）
- 字段：旧状态、新状态、维护信息、变更原因、操作人、操作时间

## 🔧 API 接口说明

### 用户端接口（/api）

#### 认证相关
- `POST /api/auth/login` - 微信登录
- `GET /api/auth/userinfo` - 获取用户信息

#### 场馆相关
- `GET /api/venues` - 获取场馆列表
- `GET /api/venues/:id` - 获取场馆详情
- `GET /api/venues/:id/available-times` - 获取可用时间段

#### 订单相关
- `POST /api/orders` - 创建订单
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `POST /api/orders/:id/pay` - 支付订单
- `POST /api/orders/:id/cancel` - 取消订单

#### 评价相关
- `POST /api/reviews` - 提交评价
- `GET /api/reviews` - 获取评价列表

#### 收藏相关
- `POST /api/favorites` - 添加/取消收藏
- `GET /api/favorites` - 获取收藏列表

#### 新闻公告
- `GET /api/news` - 获取新闻列表
- `GET /api/announcements` - 获取公告列表

### 管理端接口（/api/admin）

#### 认证
- `POST /api/admin/auth/login` - 管理员登录
- `POST /api/admin/auth/register` - 注册新管理员（超级管理员）
- `POST /api/admin/auth/change-password` - 修改当前登录管理员密码

#### 场馆管理
- `GET /api/admin/venues` - 场馆列表
- `POST /api/admin/venues` - 创建场馆
- `PUT /api/admin/venues/:id` - 更新场馆
- `DELETE /api/admin/venues/:id` - 删除场馆

#### 订单管理
- `GET /api/admin/orders` - 订单列表
- `GET /api/admin/orders/:id` - 订单详情
- `PUT /api/admin/orders/:id/status` - 更新订单状态
- `GET /api/admin/orders/export` - 导出订单

#### 用户管理
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/:id/status` - 更新用户状态

#### 内容管理
- `GET /api/admin/news` - 新闻列表
- `POST /api/admin/news` - 创建新闻
- `PUT /api/admin/news/:id` - 更新新闻
- `DELETE /api/admin/news/:id` - 删除新闻
- 公告接口类似

#### 统计分析
- `GET /api/admin/statistics/overview` - 数据概览
- `GET /api/admin/statistics/revenue` - 营收统计
- `GET /api/admin/statistics/orders` - 订单统计

## ⚙️ 核心功能实现

### 1. 时间段冲突检测
预定时自动检测该时间段是否已被预定，防止重复预定。

### 2. 订单自动取消
使用 node-schedule 定时任务，每分钟检查：
- 超过30分钟未支付的订单自动取消
- 已过期的订单自动标记为已完成

### 3. 价格计算
根据预定日期自动判断工作日/周末，计算对应价格。

### 4. 二维码生成
订单支付成功后自动生成二维码，用于入场验证。

### 5. 文件上传
支持场馆图片上传，自动生成唯一文件名，限制文件大小（5MB）。

### 6. JWT 认证
所有需要登录的接口都通过 JWT 中间件验证身份。

## 🐛 常见问题

### 1. 后端启动失败

**问题**：端口被占用
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决**：
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# Linux/Mac
lsof -i :3000
kill -9 <进程ID>
```

### 2. 数据库连接失败

**问题**：无法连接到 MySQL

**解决**：
1. 检查 MySQL 服务是否启动
2. 检查 `.env` 文件中的数据库配置
3. 确认数据库已创建
4. 检查用户名密码是否正确

### 3. 小程序无法登录

**问题**：点击登录后提示"需要授权才能登录"

**解决**：
1. 清除微信开发者工具的授权缓存：清缓存 → 清除授权数据
2. 重新编译小程序
3. 点击登录时选择"允许"授权
4. 如果仍无法授权，选择"使用默认信息登录"

### 4. 小程序无法获取数据

**问题**：页面空白，无数据显示

**解决**：
1. 确认后端服务已启动（http://localhost:3000）
2. 检查 `miniprogram/app.js` 中的 `baseUrl` 配置
3. 在开发者工具中勾选"不校验合法域名"
4. 查看控制台是否有网络请求错误

### 5. 图片上传失败

**问题**：上传图片时报错

**解决**：
1. 确认 `backend/uploads` 目录存在且有写入权限
2. 检查图片大小是否超过 5MB
3. 检查图片格式是否为 jpg/jpeg/png

### 6. 数据概览显示今日订单为 0

**问题**：系统中有今日已完成订单，但数据概览显示今日订单数为 0

**原因**：时区问题！后端原代码使用 `toISOString()` 获取日期，这会返回 UTC 时间的日期，而不是本地时区的日期

**解决**：已修复！现在使用本地时区获取日期（`getFullYear()`、`getMonth()`、`getDate()`），确保日期统计正确

**相关文件**：`backend/routes/admin/statistics.js` 第 273-278 行

## 🔒 安全建议

### 生产环境部署前必做

1. **修改默认密码**
   - 登录管理后台后立即修改 admin 密码

2. **更换 JWT 密钥**
   - 在 `.env` 中设置强随机字符串作为 JWT_SECRET

3. **配置 HTTPS**
   - 小程序正式版必须使用 HTTPS
   - 使用 Nginx 配置 SSL 证书

4. **数据库安全**
   - 不要使用 root 账号
   - 创建专用数据库用户并限制权限
   - 定期备份数据库

5. **关闭调试日志**
   - 生产环境关闭 Sequelize 的 logging
   - 移除 console.log 调试信息

6. **配置 CORS**
   - 限制允许的域名，不要使用 `*`

## 📦 部署指南

### 后端部署（推荐使用 PM2）

1. 安装 PM2
```bash
npm install -g pm2
```

2. 启动应用
```bash
cd backend
pm2 start app.js --name basketball-booking
```

3. 设置开机自启
```bash
pm2 startup
pm2 save
```

4. 常用命令
```bash
pm2 list          # 查看进程列表
pm2 logs          # 查看日志
pm2 restart all   # 重启所有进程
pm2 stop all      # 停止所有进程
```

### 小程序发布

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 登录微信公众平台（https://mp.weixin.qq.com/）
4. 开发管理 → 开发版本 → 提交审核
5. 审核通过后点击"发布"

## 📝 开发建议

### 代码规范
- 所有代码都有详细的中文注释
- 遵循统一的命名规范
- 函数功能单一，易于维护

### 学习路径
1. 先理解项目整体架构
2. 从简单的 API 接口开始学习
3. 理解数据库表之间的关系
4. 学习前后端交互流程
5. 尝试添加新功能

### 扩展功能建议
- [ ] 集成真实微信支付
- [ ] 添加优惠券功能
- [ ] 实现会员等级制度
- [ ] 添加场馆评分系统
- [ ] 实现消息推送（订阅消息）
- [x] 添加数据导出功能（订单Excel导出）
- [x] 实现多管理员权限管理（普通管理员/超级管理员）
- [ ] 添加场馆使用热力图
- [x] 添加系统状态管理（启用/维护模式）
- [x] 添加系统状态变更日志
- [x] 添加管理员注册和密码修改功能

## 📞 技术支持

如遇到问题：
1. 查看本文档的"常见问题"部分
2. 检查代码中的详细注释
3. 查看控制台错误信息
4. 检查网络请求和响应数据

## 📄 许可证

本项目为个人本科毕业设计作品，仅供学习交流使用。

---

**欢迎交流学习！🏀**

如有问题，请仔细阅读代码注释，所有功能都有详细的中文说明。
