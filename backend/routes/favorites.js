/**
 * @file favorites.js - 收藏功能路由模块
 * @description 这个文件负责处理用户对篮球场地的"收藏"功能。
 *              就像你在购物网站上"收藏"喜欢的商品一样，用户可以收藏自己喜欢的篮球场地，
 *              方便下次快速找到。
 *
 *              本文件包含以下功能：
 *              1. 添加或取消收藏（点一下收藏，再点一下取消，类似"开关"效果）
 *              2. 获取用户的收藏列表（查看自己收藏了哪些场地）
 *              3. 检查某个场地是否已被收藏（用于在页面上显示收藏状态，比如红心/灰心）
 *
 *              所有接口都需要用户登录后才能使用（通过 authUser 中间件验证身份）。
 *
 * @requires express - Web服务器框架，用来创建路由（可以理解为"网址"和对应的处理逻辑）
 * @requires ../config/database - 数据库配置，通过它可以操作数据库中的各种数据表
 * @requires ../middleware/auth - 身份验证中间件，用来确认用户是否已登录
 */

// 引入 express 框架，它是 Node.js 中最流行的 Web 服务器框架
// 可以把它想象成一个"服务员"，负责接收客人（用户）的请求并返回结果
const express = require('express');

// 创建一个路由器（Router）实例
// 路由器就像一个"分类菜单"，把不同的请求分配到不同的处理函数
const router = express.Router();

// 引入数据库模块，通过 db 可以访问所有的数据表（如用户表、场地表、收藏表等）
const db = require('../config/database');

// 从身份验证中间件中引入 authUser 函数
// authUser 的作用是：在处理请求之前，先检查用户是否已登录
// 如果未登录，会直接返回错误信息，不会执行后面的逻辑
const { authUser } = require('../middleware/auth');

/**
 * @api {POST} /favorites 添加或取消收藏（切换收藏状态）
 * @method POST
 * @description 这是一个"开关"式的接口：
 *              - 如果用户还没有收藏这个场地 → 添加收藏
 *              - 如果用户已经收藏了这个场地 → 取消收藏
 *              这样前端只需要调用同一个接口，就能实现收藏/取消收藏的切换效果。
 *
 * @requires 用户登录（authUser 中间件会自动验证）
 *
 * @param {Object} req.body - 请求体（前端发送过来的数据）
 * @param {number} req.body.venue_id - 场地ID（要收藏/取消收藏的篮球场地的唯一编号）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '收藏成功'/'已取消收藏', data: { isFavorite: true/false } }
 *   失败时: { code: 400/404/500, msg: '错误信息', data: null }
 */
router.post('/', authUser, async (req, res) => {
  try {
    // 从请求体中取出场地ID
    const { venue_id } = req.body;

    // 参数校验：如果前端没有传 venue_id，直接返回错误
    if (!venue_id) {
      return res.json({
        code: 400,       // 400 表示"请求参数有误"
        msg: '缺少场地ID',
        data: null
      });
    }

    // 第一步：检查这个场地是否真实存在
    // findByPk 是 Sequelize（数据库工具）提供的方法，通过主键（Primary Key，即ID）查找记录
    const venue = await db.Venue.findByPk(venue_id);
    if (!venue) {
      return res.json({
        code: 404,       // 404 表示"找不到资源"
        msg: '场地不存在',
        data: null
      });
    }

    // 第二步：检查用户是否已经收藏过这个场地
    // findOne 会在收藏表中查找同时满足"用户ID"和"场地ID"的记录
    const existing = await db.Favorite.findOne({
      where: {
        user_id: req.user.id,   // req.user 是 authUser 中间件解析出来的当前登录用户信息
        venue_id
      }
    });

    if (existing) {
      // 如果已经收藏过 → 取消收藏（从数据库中删除这条收藏记录）
      await existing.destroy();  // destroy() 方法会删除这条数据库记录
      return res.json({
        code: 200,
        msg: '已取消收藏',
        data: { isFavorite: false }  // 告诉前端：当前状态是"未收藏"
      });
    } else {
      // 如果还没收藏过 → 添加收藏（在数据库中创建一条新的收藏记录）
      await db.Favorite.create({
        user_id: req.user.id,
        venue_id
      });
      return res.json({
        code: 200,
        msg: '收藏成功',
        data: { isFavorite: true }   // 告诉前端：当前状态是"已收藏"
      });
    }
  } catch (error) {
    // 如果上面的代码执行过程中出现任何意外错误，会被 catch 捕获
    // 在控制台打印错误信息，方便开发者排查问题
    console.error('收藏操作失败:', error);
    res.json({
      code: 500,       // 500 表示"服务器内部错误"
      msg: '收藏操作失败',
      data: null
    });
  }
});

/**
 * @api {GET} /favorites 获取当前用户的收藏列表
 * @method GET
 * @description 查询当前登录用户收藏的所有篮球场地，支持分页显示。
 *              分页的意思是：如果用户收藏了100个场地，不会一次性全部返回，
 *              而是每次返回一部分（比如每页10条），前端可以翻页查看。
 *
 * @requires 用户登录（authUser 中间件会自动验证）
 *
 * @param {Object} req.query - URL查询参数（跟在网址?后面的参数）
 * @param {number} [req.query.page=1] - 页码，默认第1页（可选参数）
 * @param {number} [req.query.limit=10] - 每页显示条数，默认10条（可选参数）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: { total: 总数, list: [场地信息数组] } }
 *   失败时: { code: 500, msg: '获取收藏列表失败', data: null }
 */
router.get('/', authUser, async (req, res) => {
  try {
    // 从URL查询参数中获取分页信息，如果没传则使用默认值
    // 例如请求 /favorites?page=2&limit=5 表示获取第2页，每页5条
    const { page = 1, limit = 10 } = req.query;

    // 使用 findAndCountAll 方法同时获取"数据列表"和"总数"
    // 这样前端既能显示当前页的数据，也能知道一共有多少条（用于显示总页数）
    const favorites = await db.Favorite.findAndCountAll({
      where: { user_id: req.user.id },  // 只查询当前用户的收藏
      include: [
        {
          // include 是"关联查询"，类似于把两张表连接起来查询
          // 这里把收藏记录和场地信息关联，这样每条收藏记录都会附带场地的详细信息
          model: db.Venue,                // 关联场地表
          as: 'venue',                    // 给关联起个别名叫 'venue'
          attributes: ['id', 'name', 'location', 'images', 'description']
          // attributes 指定只返回场地的这几个字段，不需要返回所有字段（节省数据量）
        }
      ],
      offset: (page - 1) * limit,        // 跳过前面几条记录（实现分页效果）
      // 例如：第2页，每页10条 → offset = (2-1)*10 = 10，即跳过前10条
      limit: parseInt(limit),             // 每页返回的最大条数
      order: [['created_at', 'DESC']]     // 按创建时间倒序排列（最新收藏的排在最前面）
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: favorites.count,           // 收藏总数
        // 使用 map 方法从每条收藏记录中只提取场地信息（前端只需要场地数据，不需要收藏记录本身的数据）
        list: favorites.rows.map(f => f.venue)
      }
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.json({
      code: 500,
      msg: '获取收藏列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /favorites/check/:venueId 检查某个场地是否已被当前用户收藏
 * @method GET
 * @description 前端在显示场地详情页时，需要知道用户是否已收藏该场地，
 *              以便显示不同的收藏图标（比如：已收藏显示红心，未收藏显示灰心）。
 *              这个接口就是用来查询收藏状态的。
 *
 * @requires 用户登录（authUser 中间件会自动验证）
 *
 * @param {string} req.params.venueId - URL路径参数，场地ID
 *        例如请求 /favorites/check/5 中的 5 就是 venueId
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: { isFavorite: true/false } }
 *   失败时: { code: 500, msg: '检查收藏状态失败', data: null }
 */
router.get('/check/:venueId', authUser, async (req, res) => {
  try {
    // 在收藏表中查找是否存在"当前用户 + 指定场地"的收藏记录
    const favorite = await db.Favorite.findOne({
      where: {
        user_id: req.user.id,
        venue_id: req.params.venueId      // 从URL路径中获取场地ID
      }
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        // !!favorite 是一个JavaScript技巧：
        // 如果 favorite 有值（找到了记录）→ !!favorite 等于 true（已收藏）
        // 如果 favorite 是 null（没找到记录）→ !!favorite 等于 false（未收藏）
        isFavorite: !!favorite
      }
    });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.json({
      code: 500,
      msg: '检查收藏状态失败',
      data: null
    });
  }
});

// 将路由器导出，这样其他文件（如主应用文件 app.js）就可以引入并使用这些路由
// 类似于把这个"菜单"交给"餐厅前台"，前台就知道该怎么分配客人的请求了
module.exports = router;
