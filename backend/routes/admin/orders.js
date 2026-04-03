/**
 * ============================================================================
 * 文件名：orders.js
 * 所属模块：管理后台 - 订单管理模块
 * 文件说明：
 *   这个文件负责管理后台中与"订单"相关的所有操作，包括：
 *   1. 获取订单列表（支持分页、按状态/订单号/用户名/场地筛选）
 *   2. 获取订单详情（查看某个订单的完整信息）
 *   3. 取消订单（管理员强制取消用户的订单）
 *   4. 完成订单/核销（确认用户已到场使用）
 *   5. 二维码核销（扫描用户出示的二维码来完成订单）
 *
 *   什么是"订单"？
 *   当用户在小程序上预订了一个篮球场地的某个时段后，系统就会生成一个"订单"。
 *   订单记录了：谁预订的、预订了哪个场地、什么时间、花了多少钱等信息。
 *
 *   订单的生命周期（状态流转）：
 *   待支付(pending) → 已支付(paid) → 已完成(completed)
 *                                   ↘ 已取消(cancelled)
 *
 *   什么是"核销"？
 *   核销就是确认用户真的来打球了。用户到场后出示订单二维码，
 *   管理员扫码后订单状态变为"已完成"，类似于电影票的"检票"。
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
 * 这里会用到：db.Order（订单表）、db.Venue（场地表）、
 * db.User（用户表）、db.Review（评价表）
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * 所有订单管理接口都需要管理员登录后才能访问
 */
const { authAdmin } = require('../../middleware/auth');

/**
 * Op —— Sequelize 的操作符对象
 * 用于构建复杂的数据库查询条件，比如模糊搜索（LIKE）、大于、小于等
 * Op.like 相当于 SQL 中的 LIKE 关键字，用于模糊匹配
 * 例如：{ name: { [Op.like]: '%篮球%' } } 相当于 SQL: WHERE name LIKE '%篮球%'
 */
const { Op } = require('sequelize');

// ==================== 路由定义 ====================

/**
 * @api {GET} /admin/orders 获取订单列表
 * @description 获取所有订单的列表，支持多种筛选条件和分页
 *   管理员打开"订单管理"页面时，前端会调用这个接口。
 *   支持按订单状态、订单号、用户名、场地等条件筛选。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} [page=1] - 页码，默认第1页
 * @param {number} [limit=10] - 每页条数，默认10条
 * @param {string} [status] - 订单状态筛选（pending/paid/completed/cancelled）
 * @param {string} [order_no] - 订单号模糊搜索（输入部分订单号即可搜索）
 * @param {string} [user_name] - 用户昵称模糊搜索
 * @param {number} [venue_id] - 场地ID精确筛选
 *
 * @returns {object} 包含订单总数 total 和当前页的订单列表 list
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从 URL 查询参数中获取分页和筛选条件
    const { page = 1, limit = 10, status, order_no, user_name, venue_id } = req.query;

    // 构建查询条件对象
    const where = {};

    // 如果传了订单状态，按状态精确筛选
    if (status) {
      where.order_status = status;
    }

    // 如果传了订单号，使用模糊搜索（LIKE）
    // %号是通配符，表示"任意字符"，所以 %abc% 能匹配到 "xabcy"、"123abc456" 等
    if (order_no) {
      where.order_no = { [Op.like]: `%${order_no}%` };
    }

    // 如果传了场地ID，按场地精确筛选
    if (venue_id) {
      where.venue_id = venue_id;
    }

    // 【关联查询配置】
    // include 用于"联表查询"，就像把多张表的数据拼在一起
    // 这样一次查询就能同时获取订单信息、场地信息和用户信息
    const include = [
      {
        model: db.Venue,                              // 关联场地表
        as: 'venue',                                  // 别名
        attributes: ['id', 'name', 'location']        // 只取需要的字段（提高查询效率）
      },
      {
        model: db.User,                               // 关联用户表
        as: 'user',
        attributes: ['id', 'nickName', 'phone']       // 只取用户ID、昵称、手机号
      }
    ];

    // 如果传了用户名筛选条件，给用户关联查询添加 where 条件
    // 这样就能实现"按用户昵称搜索订单"的功能
    if (user_name) {
      include[1].where = {
        nickName: { [Op.like]: `%${user_name}%` }
      };
    }

    // 执行数据库查询
    const orders = await db.Order.findAndCountAll({
      where,                                // 订单表的筛选条件
      include,                              // 关联查询（场地+用户）
      offset: (page - 1) * limit,           // 分页偏移量
      limit: parseInt(limit),               // 每页条数
      order: [['created_at', 'DESC']]       // 按创建时间倒序（最新订单在前）
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: orders.count,     // 符合条件的订单总数
        list: orders.rows        // 当前页的订单数据
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.json({
      code: 500,
      msg: '获取订单列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/orders/:id 获取订单详情
 * @description 查看某个订单的完整详细信息
 *   包括订单本身的信息，以及关联的场地信息、用户信息和评价信息。
 *   管理员点击某个订单查看详情时调用此接口。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 订单ID（通过 URL 路径参数传入，如 /admin/orders/123）
 *
 * @returns {object} 订单的完整信息（含场地、用户、评价）
 */
router.get('/:id', authAdmin, async (req, res) => {
  try {
    // 根据订单ID查找，同时关联查询场地、用户和评价信息
    const order = await db.Order.findByPk(req.params.id, {
      include: [
        {
          model: db.Venue,       // 关联场地表（查看预订的是哪个场地）
          as: 'venue'
        },
        {
          model: db.User,        // 关联用户表（查看是谁下的单）
          as: 'user'
        },
        {
          model: db.Review,      // 关联评价表（查看用户是否评价了）
          as: 'review'
        }
      ]
    });

    // 如果找不到该订单，返回 404
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    res.json({
      code: 200,
      msg: '成功',
      data: order
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.json({
      code: 500,
      msg: '获取订单详情失败',
      data: null
    });
  }
});
/**
 * @api {POST} /admin/orders/:id/cancel 取消订单
 * @description 管理员强制取消一个订单
 *   使用场景举例：
 *   - 场地临时关闭，需要取消该场地的所有订单
 *   - 用户联系客服要求取消，但自己无法操作
 *   - 发现异常订单需要处理
 *
 *   业务规则：只有"未完成"且"未取消"的订单才能被取消。
 *   已完成或已取消的订单不能再次取消。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 订单ID（通过 URL 路径参数传入）
 * @param {string} [reason] - 取消原因（选填，默认为"管理员取消"）
 *
 * @returns {object} 取消成功或失败的提示信息
 */
router.post('/:id/cancel', authAdmin, async (req, res) => {
  try {
    // 从请求体中获取取消原因
    const { reason } = req.body;

    // 先查找订单是否存在
    const order = await db.Order.findByPk(req.params.id);
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 【业务规则校验】已取消或已完成的订单不能再取消
    // 这是一个"状态机"的概念：订单只能按照特定的路径流转状态
    if (order.order_status === 'cancelled' || order.order_status === 'completed') {
      return res.json({
        code: 400,
        msg: '订单状态不允许取消',
        data: null
      });
    }

    // 更新订单状态为"已取消"，并记录取消原因
    order.order_status = 'cancelled';
    order.cancel_reason = reason || '管理员取消';   // 如果没填原因，默认写"管理员取消"
    await order.save();

    res.json({
      code: 200,
      msg: '订单已取消',
      data: null
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.json({
      code: 500,
      msg: '取消订单失败',
      data: null
    });
  }
});

/**
 * @api {POST} /admin/orders/:id/complete 完成订单（手动核销）
 * @description 管理员手动将订单标记为"已完成"
 *   这是手动核销方式，适用于无法扫码的情况。
 *   比如用户手机没电了，管理员可以通过订单ID手动完成核销。
 *
 *   业务规则：只有"已支付"状态的订单才能被标记为完成。
 *   未支付的订单不能完成（用户还没付钱呢！）。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 订单ID（通过 URL 路径参数传入）
 *
 * @returns {object} 操作成功或失败的提示信息
 */
router.post('/:id/complete', authAdmin, async (req, res) => {
  try {
    const order = await db.Order.findByPk(req.params.id);
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 【业务规则校验】只有已支付的订单才能标记为完成
    // 'paid' 表示用户已经付过钱了
    if (order.order_status !== 'paid') {
      return res.json({
        code: 400,
        msg: '只能完成已支付的订单',
        data: null
      });
    }

    // 将订单状态更新为"已完成"
    order.order_status = 'completed';
    await order.save();

    res.json({
      code: 200,
      msg: '订单已完成',
      data: null
    });
  } catch (error) {
    console.error('完成订单失败:', error);
    res.json({
      code: 500,
      msg: '完成订单失败',
      data: null
    });
  }
});
/**
 * @api {POST} /admin/orders/verify 二维码核销订单
 * @description 通过扫描用户出示的二维码来核销（完成）订单
 *   这是最常用的核销方式，流程如下：
 *   1. 用户到达篮球场后，打开小程序展示订单二维码
 *   2. 管理员使用后台的扫码功能扫描二维码
 *   3. 系统根据二维码内容找到对应订单，验证状态后标记为"已完成"
 *
 *   业务规则：只有"已支付"状态的订单才能核销。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} qrcode - 二维码内容/核销码（通过请求体 body 传入）
 *
 * @returns {object} 核销成功时返回订单详情（含场地和用户信息）
 */
router.post('/verify', authAdmin, async (req, res) => {
  try {
    // 从请求体中获取二维码内容
    const { qrcode } = req.body;

    // 【校验】核销码不能为空
    if (!qrcode) {
      return res.json({
        code: 400,
        msg: '缺少核销码',
        data: null
      });
    }

    // 根据二维码内容查找对应的订单
    // 同时关联查询场地和用户信息，方便管理员确认订单详情
    const order = await db.Order.findOne({
      where: { qrcode },          // 用二维码内容匹配订单
      include: [
        {
          model: db.Venue,         // 关联场地信息
          as: 'venue'
        },
        {
          model: db.User,          // 关联用户信息
          as: 'user'
        }
      ]
    });

    // 如果找不到对应的订单，可能是二维码无效或已过期
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 【业务规则校验】只有已支付的订单才能核销
    // 如果订单未支付、已完成或已取消，都不能核销
    if (order.order_status !== 'paid') {
      return res.json({
        code: 400,
        msg: '订单状态不正确',
        data: null
      });
    }

    // 核销成功，将订单状态更新为"已完成"
    order.order_status = 'completed';
    await order.save();

    // 返回订单详情，方便管理员在核销页面看到订单信息
    res.json({
      code: 200,
      msg: '核销成功',
      data: order
    });
  } catch (error) {
    console.error('核销订单失败:', error);
    res.json({
      code: 500,
      msg: '核销订单失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/orders/export 导出订单数据（Excel）
 * @description 导出订单数据为Excel文件，包含财务明细
 *   管理员可以通过此接口导出订单数据，用于财务对账、数据分析等
 *   支持按状态、时间范围等条件筛选导出
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} [status] - 订单状态筛选（pending/paid/completed/cancelled）
 * @param {string} [start_date] - 开始日期（格式：YYYY-MM-DD）
 * @param {string} [end_date] - 结束日期（格式：YYYY-MM-DD）
 *
 * @returns {file} Excel文件下载
 */
router.get('/export', authAdmin, async (req, res) => {
  try {
    // 从查询参数中获取筛选条件
    const { status, start_date, end_date } = req.query;

    // 构建查询条件
    const where = {};
    
    // 按订单状态筛选
    if (status) {
      where.order_status = status;
    }
    
    // 按日期范围筛选
    if (start_date) {
      where.book_date = {
        [Op.gte]: start_date
      };
    }
    if (end_date) {
      if (!where.book_date) where.book_date = {};
      where.book_date[Op.lte] = end_date;
    }

    // 查询订单数据，包含场地和用户信息
    const orders = await db.Order.findAll({
      where,
      include: [
        {
          model: db.Venue,
          as: 'venue',
          attributes: ['name', 'location']
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['nickName', 'phone']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 引入ExcelJS库
    const ExcelJS = require('exceljs');
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '篮球场地预订系统';
    workbook.lastModifiedBy = 'Admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 创建工作表
    const worksheet = workbook.addWorksheet('订单数据');

    // 设置表头
    worksheet.columns = [
      { header: '订单编号', key: 'order_no', width: 25 },
      { header: '场地名称', key: 'venue_name', width: 20 },
      { header: '场地地址', key: 'venue_location', width: 30 },
      { header: '预订日期', key: 'book_date', width: 15 },
      { header: '开始时间', key: 'start_time', width: 12 },
      { header: '结束时间', key: 'end_time', width: 12 },
      { header: '订单金额', key: 'total_price', width: 12 },
      { header: '支付状态', key: 'pay_status', width: 12 },
      { header: '订单状态', key: 'order_status', width: 12 },
      { header: '用户昵称', key: 'user_nickName', width: 15 },
      { header: '用户手机', key: 'user_phone', width: 15 },
      { header: '创建时间', key: 'created_at', width: 20 },
      { header: '支付时间', key: 'paid_at', width: 20 }
    ];

    // 填充数据
    orders.forEach(order => {
      worksheet.addRow({
        order_no: order.order_no,
        venue_name: order.venue?.name || '',
        venue_location: order.venue?.location || '',
        book_date: order.book_date,
        start_time: order.start_time,
        end_time: order.end_time,
        total_price: order.total_price,
        pay_status: order.pay_status === 1 ? '已支付' : '未支付',
        order_status: {
          'pending': '待支付',
          'paid': '已支付',
          'completed': '已完成',
          'cancelled': '已取消'
        }[order.order_status] || order.order_status,
        user_nickName: order.user?.nickName || '',
        user_phone: order.user?.phone || '',
        created_at: order.created_at ? order.created_at.toLocaleString() : '',
        paid_at: order.paid_at ? order.paid_at.toLocaleString() : ''
      });
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders_${new Date().toISOString().split('T')[0]}.xlsx`);

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('导出订单失败:', error);
    res.json({
      code: 500,
      msg: '导出订单失败',
      data: null
    });
  }
});

// 将路由器导出，供主程序（app.js）挂载使用
module.exports = router;
