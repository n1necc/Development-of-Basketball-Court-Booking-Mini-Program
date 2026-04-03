/**
 * ============================================================================
 * 文件名：users.js
 * 所属模块：管理后台 - 用户管理模块
 * 文件说明：
 *   这个文件负责管理后台中与"用户"相关的所有操作，包括：
 *   1. 获取用户列表（支持分页、按状态筛选、按昵称/手机号搜索）
 *   2. 获取用户详情（查看某个用户的完整信息及其最近订单）
 *   3. 拉黑/取消拉黑用户
 *
 *   这里的"用户"指的是使用小程序预订篮球场的普通用户（消费者），
 *   不是管理员。管理员可以在后台查看所有用户的信息，
 *   也可以对违规用户进行拉黑处理。
 *
 *   什么是"拉黑"？
 *   拉黑就是将用户加入黑名单，被拉黑的用户将无法正常使用系统
 *   （比如无法预订场地）。如果用户申诉成功，管理员可以取消拉黑。
 *
 * 技术栈：Express.js 路由 + Sequelize ORM
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * express —— Web 框架，用来创建服务器和处理网络请求
 */
const express = require('express');

/**
 * router —— 路由器，定义这个模块下所有的 API 接口路径
 */
const router = express.Router();

/**
 * db —— 数据库操作对象，包含所有数据表的模型
 * 这里会用到：db.User（用户表）、db.Order（订单表）
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * 所有用户管理接口都需要管理员登录后才能访问
 */
const { authAdmin } = require('../../middleware/auth');

/**
 * Op —— Sequelize 的操作符对象
 * 用于构建复杂的数据库查询条件
 * 这里主要用到：
 *   Op.like —— 模糊匹配（类似 SQL 的 LIKE）
 *   Op.or —— 或条件（满足其中任意一个条件即可）
 */
const { Op } = require('sequelize');

// ==================== 路由定义 ====================

/**
 * @api {GET} /admin/users 获取用户列表
 * @description 获取所有注册用户的列表，支持分页和多种筛选条件
 *   管理员打开"用户管理"页面时，前端会调用这个接口。
 *   可以按用户状态筛选，也可以通过关键词搜索用户昵称或手机号。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} [page=1] - 页码，默认第1页
 * @param {number} [limit=10] - 每页条数，默认10条
 * @param {string} [status] - 用户状态筛选（如 'normal' 正常、'blacklisted' 已拉黑）
 * @param {string} [keyword] - 搜索关键词（会同时匹配用户昵称和手机号）
 *
 * @returns {object} 包含用户总数 total 和当前页的用户列表 list
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从 URL 查询参数中获取分页和筛选条件
    const { page = 1, limit = 10, status, keyword } = req.query;

    // 构建查询条件对象
    const where = {};

    // 如果传了状态参数，按状态筛选
    if (status) {
      where.status = status;
    }

    // 如果传了搜索关键词，同时在昵称和手机号中模糊搜索
    // Op.or 表示"或"条件：昵称包含关键词 或者 手机号包含关键词，满足任一即可
    // 例如搜索 "张"，会找到昵称含"张"的用户，也会找到手机号含"张"的（虽然手机号一般不含中文）
    if (keyword) {
      where[Op.or] = [
        { nickName: { [Op.like]: `%${keyword}%` } },   // 昵称模糊匹配
        { phone: { [Op.like]: `%${keyword}%` } }       // 手机号模糊匹配
      ];
    }

    // 执行数据库查询
    const users = await db.User.findAndCountAll({
      where,
      attributes: { exclude: ['openid'] },   // 排除 openid 字段（这是微信的用户标识，属于敏感信息，不应暴露）
      offset: (page - 1) * limit,             // 分页偏移量
      limit: parseInt(limit),                 // 每页条数
      order: [['created_at', 'DESC']]         // 按注册时间倒序排列
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: users.count,     // 符合条件的用户总数
        list: users.rows        // 当前页的用户数据
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.json({
      code: 500,
      msg: '获取用户列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/users/:id 获取用户详情
 * @description 查看某个用户的完整信息，包括其最近的10条订单记录
 *   管理员点击某个用户查看详情时调用此接口。
 *   通过关联查询，可以一次性获取用户信息和订单历史。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 用户ID（通过 URL 路径参数传入，如 /admin/users/42）
 *
 * @returns {object} 用户的完整信息及最近10条订单
 */
router.get('/:id', authAdmin, async (req, res) => {
  try {
    // 根据用户ID查找，同时关联查询该用户的订单
    const user = await db.User.findByPk(req.params.id, {
      attributes: { exclude: ['openid'] },    // 排除敏感的 openid 字段
      include: [
        {
          model: db.Order,                     // 关联订单表
          as: 'orders',                        // 别名，通过 user.orders 访问
          limit: 10,                           // 只取最近10条订单（避免数据量过大）
          order: [['created_at', 'DESC']]      // 按时间倒序（最新的在前）
        }
      ]
    });

    // 如果找不到该用户，返回 404
    if (!user) {
      return res.json({
        code: 404,
        msg: '用户不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      msg: '成功',
      data: user
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.json({
      code: 500,
      msg: '获取用户详情失败',
      data: null
    });
  }
});

/**
 * @api {POST} /admin/users/:id/blacklist 拉黑/取消拉黑用户
 * @description 将用户加入黑名单或从黑名单中移除
 *   这是一个"双向操作"接口，通过 action 参数控制是拉黑还是取消拉黑：
 *   - action = 'add'：拉黑用户（状态变为 'blacklisted'）
 *   - action = 'remove'：取消拉黑（状态恢复为 'normal'）
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 用户ID（通过 URL 路径参数传入）
 * @param {string} action - 操作类型：'add'（拉黑）或 'remove'（取消拉黑）
 *
 * @returns {object} 操作成功或失败的提示信息
 */
router.post('/:id/blacklist', authAdmin, async (req, res) => {
  try {
    // 从请求体中获取操作类型
    const { action } = req.body;

    // 先查找用户是否存在
    const user = await db.User.findByPk(req.params.id);
    if (!user) {
      return res.json({
        code: 404,
        msg: '用户不存在',
        data: null
      });
    }

    // 根据 action 参数执行不同的操作
    if (action === 'add') {
      // 【拉黑操作】将用户状态设为 'blacklisted'（已拉黑）
      user.status = 'blacklisted';
      await user.save();
      return res.json({
        code: 200,
        msg: '用户已拉黑',
        data: null
      });
    } else if (action === 'remove') {
      // 【取消拉黑操作】将用户状态恢复为 'normal'（正常）
      user.status = 'normal';
      await user.save();
      return res.json({
        code: 200,
        msg: '已取消拉黑',
        data: null
      });
    } else {
      // 如果 action 既不是 'add' 也不是 'remove'，返回参数错误
      return res.json({
        code: 400,
        msg: '无效的操作',
        data: null
      });
    }
  } catch (error) {
    console.error('操作失败:', error);
    res.json({
      code: 500,
      msg: '操作失败',
      data: null
    });
  }
});

// 将路由器导出，供主程序（app.js）挂载使用
module.exports = router;
