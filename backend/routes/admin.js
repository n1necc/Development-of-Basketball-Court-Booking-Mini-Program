/**
 * @file admin.js - 管理后台主路由模块（路由分发器）
 * @description 这个文件是管理后台所有功能的"总入口"。
 *              它本身不处理任何具体的业务逻辑，而是像一个"交通枢纽"一样，
 *              把不同类型的请求分发到对应的子路由模块去处理。
 *
 *              打个比方：这个文件就像一栋大楼的"前台导航"，
 *              当有人来访时，前台会根据来访目的指引到不同的楼层/部门：
 *              - 要登录？→ 请去 auth 模块（管理员登录认证）
 *              - 要管理场地？→ 请去 venues 模块（场地的增删改查）
 *              - 要管理订单？→ 请去 orders 模块（订单查看和处理）
 *              - 要看统计数据？→ 请去 statistics 模块（数据统计和报表）
 *              - 要修改设置？→ 请去 settings 模块（系统配置）
 *              - 要管理用户？→ 请去 users 模块（用户管理）
 *              - 要管理资讯？→ 请去 news 模块（资讯的增删改查）
 *              - 要管理公告？→ 请去 announcements 模块（公告的增删改查）
 *
 *              这种"分模块"的设计方式叫做"模块化路由"，好处是：
 *              1. 代码结构清晰，每个模块只负责自己的功能
 *              2. 方便多人协作开发，不同的人可以负责不同的模块
 *              3. 便于维护和扩展，新增功能只需要添加新的子路由文件
 *
 * @requires express - Web服务器框架
 * @requires ./admin/* - 各个子路由模块
 */

// 引入 express 框架
const express = require('express');

// 创建路由器实例
const router = express.Router();

// ========== 注册子路由（将不同路径的请求分发到对应的处理模块） ==========

// router.use('/路径', require('子路由文件')) 的意思是：
// 当请求的URL以 '/路径' 开头时，交给对应的子路由文件去处理
// 例如：请求 /admin/auth/login 会被分发到 ./admin/auth.js 中的 /login 路由

// 管理员登录认证模块 - 处理管理员的登录、登出等
// 例如：POST /admin/auth/login（管理员登录）
router.use('/auth', require('./admin/auth'));

// 场地管理模块 - 处理篮球场地的增删改查
// 例如：GET /admin/venues（获取场地列表）、POST /admin/venues（新增场地）
router.use('/venues', require('./admin/venues'));

// 订单管理模块 - 处理用户预订订单的查看和管理
// 例如：GET /admin/orders（获取订单列表）、PUT /admin/orders/:id（更新订单状态）
router.use('/orders', require('./admin/orders'));

// 数据统计模块 - 提供各种统计数据和报表
// 例如：GET /admin/statistics/overview（获取总览数据，如总收入、总订单数等）
router.use('/statistics', require('./admin/statistics'));

// 系统设置模块 - 管理系统的各项配置
// 例如：GET /admin/settings（获取系统设置）、PUT /admin/settings（更新设置）
router.use('/settings', require('./admin/settings'));

// 用户管理模块 - 管理小程序用户
// 例如：GET /admin/users（获取用户列表）、PUT /admin/users/:id/status（禁用/启用用户）
router.use('/users', require('./admin/users'));

// 资讯管理模块 - 管理篮球资讯/新闻的发布
// 例如：POST /admin/news（发布资讯）、DELETE /admin/news/:id（删除资讯）
router.use('/news', require('./admin/news'));

// 公告管理模块 - 管理系统公告的发布
// 例如：POST /admin/announcements（发布公告）、PUT /admin/announcements/:id（编辑公告）
router.use('/announcements', require('./admin/announcements'));

// 导出路由器，供主应用文件（如 app.js）引入
// 在 app.js 中通常会这样使用：app.use('/admin', require('./routes/admin'))
// 这样所有以 /admin 开头的请求都会进入这个路由器进行分发
module.exports = router;
