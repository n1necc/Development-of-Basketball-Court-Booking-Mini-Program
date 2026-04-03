/**
 * 后端主入口文件
 * 负责初始化 Express 服务器、配置中间件、注册路由、连接数据库并启动服务
 */

require('dotenv').config();              // 加载 .env 环境变量配置文件
const express = require('express');      // Express 框架，用于创建 Web 服务器
const cors = require('cors');            // 跨域资源共享中间件，允许前端跨域请求
const db = require('./config/database'); // 数据库配置和模型
const scheduleJobs = require('./utils/schedule'); // 定时任务（如自动取消超时订单）

const app = express(); // 创建 Express 应用实例

// ========== 中间件配置 ==========
app.use(cors());                                    // 允许所有来源的跨域请求
app.use(express.json());                            // 解析 JSON 格式的请求体
app.use(express.urlencoded({ extended: true }));    // 解析 URL 编码的请求体（如表单提交）
app.use('/uploads', express.static('uploads'));      // 将 uploads 目录设为静态资源，可通过 URL 直接访问上传的文件

// 提供管理后台静态文件服务（admin 目录下的 HTML/CSS/JS）
const path = require('path');
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// 根路径重定向到管理后台登录页
app.get('/', (req, res) => {
  res.redirect('/admin/login.html');
});

// ========== 注册 API 路由 ==========
app.use('/api/auth', require('./routes/auth'));               // 用户认证（登录/注册）
app.use('/api/venues', require('./routes/venues'));           // 场馆相关接口
app.use('/api/orders', require('./routes/orders'));           // 订单相关接口
app.use('/api/reviews', require('./routes/reviews'));         // 评价相关接口
app.use('/api/favorites', require('./routes/favorites'));     // 收藏相关接口
app.use('/api/news', require('./routes/news'));               // 资讯相关接口
app.use('/api/announcements', require('./routes/announcements')); // 公告相关接口
app.use('/api/admin', require('./routes/admin'));             // 管理后台接口

// ========== 全局错误处理中间件 ==========
// 当路由处理中抛出异常时，会被这里捕获并返回统一的错误响应
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    msg: err.message || '服务器内部错误',
    data: null
  });
});

// ========== 数据库同步并启动服务器 ==========
const PORT = process.env.PORT || 3000; // 服务器端口，默认 3000

// 同步数据库模型（alter: false 表示不自动修改已有表结构）
db.sequelize.sync({ alter: false }).then(() => {
  console.log('数据库连接并同步成功');

  // 启动定时任务（如自动取消超时未支付订单、自动完成已过期订单）
  scheduleJobs();

  // 启动 HTTP 服务器，开始监听请求
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 后台启动成功 ${PORT}`);
    console.log(`========================================`);
    console.log(`📱 管理后台: http://localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`👤 默认账号: admin`);
    console.log(`🔑 默认密码: admin123`);
    console.log(`========================================\n`);
  });
}).catch(err => {
  console.error('数据库连接失败:', err);
});
