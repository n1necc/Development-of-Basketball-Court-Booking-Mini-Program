/**
 * @file reviews.js - 评价功能路由模块
 * @description 这个文件负责处理用户对篮球场地的"评价"功能。
 *              用户在完成一次篮球场地预订并使用后，可以对场地进行打分和文字评价，
 *              就像你在外卖平台上给商家打星和写评论一样。
 *
 *              本文件包含以下功能：
 *              1. 提交评价 - 用户对已完成/已支付的订单进行评分和评论（需要登录）
 *              2. 获取场地评价列表 - 查看某个场地的所有用户评价（无需登录，所有人都能看）
 *
 *              评价的业务规则：
 *              - 只有订单的下单人才能评价自己的订单
 *              - 只有"已支付"或"已完成"状态的订单才能评价
 *              - 每个订单只能评价一次，不能重复评价
 *
 * @requires express - Web服务器框架，用来创建路由
 * @requires ../config/database - 数据库配置，通过它操作数据库中的各种数据表
 * @requires ../middleware/auth - 身份验证中间件，用来确认用户是否已登录
 */

// 引入 express 框架，它是 Node.js 中最流行的 Web 服务器框架
const express = require('express');

// 创建一个路由器实例，用来定义和管理这个模块的所有路由（接口）
const router = express.Router();

// 引入数据库模块，通过 db 可以访问所有的数据表（如订单表、评价表、用户表等）
const db = require('../config/database');

// 引入用户身份验证中间件
// authUser 会在处理请求前检查用户是否已登录，未登录则拒绝访问
const { authUser } = require('../middleware/auth');

/**
 * @api {POST} /reviews 提交评价
 * @method POST
 * @description 用户对已完成或已支付的订单提交评价（打分 + 文字评论）。
 *              提交前会进行多重验证：订单是否存在、是否是本人的订单、
 *              订单状态是否允许评价、是否已经评价过。
 *
 * @requires 用户登录（authUser 中间件会自动验证）
 *
 * @param {Object} req.body - 请求体（前端发送过来的数据）
 * @param {number} req.body.order_id - 订单ID（要评价的订单的唯一编号，必填）
 * @param {number} req.body.rating - 评分（比如1-5分，必填）
 * @param {string} [req.body.content] - 评价内容/文字评论（可选，不填则默认为空字符串）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '评价成功', data: 评价记录对象 }
 *   失败时: { code: 400/403/404/500, msg: '错误信息', data: null }
 */
router.post('/', authUser, async (req, res) => {
  try {
    // 从请求体中取出订单ID、评分和评价内容
    const { order_id, rating, content } = req.body;

    // 参数校验：订单ID和评分是必填项，缺少任何一个都返回错误
    if (!order_id || !rating) {
      return res.json({
        code: 400,       // 400 表示"请求参数有误"
        msg: '参数不完整',
        data: null
      });
    }

    // ========== 第一重验证：检查订单是否存在 ==========
    const order = await db.Order.findByPk(order_id);
    if (!order) {
      return res.json({
        code: 404,       // 404 表示"找不到资源"
        msg: '订单不存在',
        data: null
      });
    }

    // ========== 第二重验证：检查是否是本人的订单 ==========
    // 只有下单的人才能评价，不能评价别人的订单
    if (order.user_id !== req.user.id) {
      return res.json({
        code: 403,       // 403 表示"没有权限"
        msg: '无权评价此订单',
        data: null
      });
    }

    // ========== 第三重验证：检查订单状态是否允许评价 ==========
    // 只有"已完成"(completed)或"已支付"(paid)的订单才能评价
    // 比如"已取消"或"待支付"的订单是不能评价的
    if (order.order_status !== 'completed' && order.order_status !== 'paid') {
      return res.json({
        code: 400,
        msg: '只能评价已支付或已完成的订单',
        data: null
      });
    }

    // ========== 第四重验证：检查是否已经评价过 ==========
    // 每个订单只能评价一次，防止重复评价
    const existingReview = await db.Review.findOne({
      where: { order_id }
    });

    if (existingReview) {
      return res.json({
        code: 400,
        msg: '该订单已评价',
        data: null
      });
    }

    // ========== 所有验证通过，创建评价记录 ==========
    const review = await db.Review.create({
      order_id,                          // 关联的订单ID
      user_id: req.user.id,              // 评价人（当前登录用户）的ID
      venue_id: order.venue_id,          // 场地ID（从订单中获取，因为订单里记录了是哪个场地）
      rating: parseInt(rating),          // 评分（用 parseInt 确保是整数）
      content: content || ''             // 评价内容，如果没填则默认为空字符串
    });

    res.json({
      code: 200,
      msg: '评价成功',
      data: review                       // 返回刚创建的评价记录
    });
  } catch (error) {
    // 捕获所有意外错误，打印到控制台方便排查
    console.error('提交评价失败:', error);
    res.json({
      code: 500,       // 500 表示"服务器内部错误"
      msg: '提交评价失败',
      data: null
    });
  }
});

/**
 * @api {GET} /reviews/venue/:venueId 获取指定场地的评价列表
 * @method GET
 * @description 查看某个篮球场地的所有用户评价，支持分页。
 *              这个接口不需要登录，任何人都可以查看场地评价。
 *              每条评价会附带评价者的昵称和头像信息。
 *
 * @param {string} req.params.venueId - URL路径参数，场地ID
 *        例如请求 /reviews/venue/3 中的 3 就是 venueId
 * @param {Object} req.query - URL查询参数
 * @param {number} [req.query.page=1] - 页码，默认第1页（可选）
 * @param {number} [req.query.limit=20] - 每页条数，默认20条（可选）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: { total: 总数, list: [评价数组] } }
 *   失败时: { code: 500, msg: '获取评价列表失败', data: null }
 */
router.get('/venue/:venueId', async (req, res) => {
  try {
    // 获取分页参数，默认第1页，每页20条
    const { page = 1, limit = 20 } = req.query;

    // 查询指定场地的所有评价，同时获取评价总数
    const reviews = await db.Review.findAndCountAll({
      where: { venue_id: req.params.venueId },  // 筛选条件：只查询指定场地的评价
      include: [
        {
          // 关联查询用户表，获取评价者的昵称和头像
          // 这样前端就能在每条评价旁边显示"谁写的这条评价"
          model: db.User,
          as: 'user',                            // 关联别名
          attributes: ['nickName', 'avatarUrl']  // 只获取昵称和头像，保护用户隐私
        }
      ],
      offset: (page - 1) * limit,               // 分页偏移量
      limit: parseInt(limit),                    // 每页条数
      order: [['created_at', 'DESC']]            // 按创建时间倒序（最新评价排在前面）
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: reviews.count,                    // 评价总数
        list: reviews.rows                       // 当前页的评价列表
      }
    });
  } catch (error) {
    console.error('获取评价列表失败:', error);
    res.json({
      code: 500,
      msg: '获取评价列表失败',
      data: null
    });
  }
});

// 导出路由器，供主应用文件（如 app.js）引入使用
module.exports = router;
