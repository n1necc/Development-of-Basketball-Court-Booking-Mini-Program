/**
 * ========================================================================
 * 文件名：orders.js
 * 所属模块：后端路由（routes）
 * 文件说明：
 *   这是篮球场地预订系统的【订单路由】文件。
 *   它负责处理所有与"订单"相关的网络请求（API接口），包括：
 *     1. 创建订单 —— 用户选好场地和时间后，生成一笔新的预订订单
 *     2. 支付订单 —— 用户对未支付的订单进行（模拟）支付
 *     3. 获取订单列表 —— 用户查看自己所有的订单记录
 *     4. 获取订单详情 —— 用户查看某一笔订单的完整信息
 *     5. 取消订单 —— 用户取消一笔待支付或已支付的订单
 *
 *   技术栈：Express.js（Web框架） + Sequelize（数据库ORM工具）
 *
 *   名词解释（零基础友好）：
 *     - 路由（Route）：可以理解为"网址路径"，浏览器或小程序访问不同路径时，
 *       服务器会执行对应的代码来处理请求。
 *     - 中间件（Middleware）：在处理请求之前先执行的一段代码，比如验证用户是否登录。
 *     - ORM：一种工具，让我们用 JavaScript 代码操作数据库，而不用手写 SQL 语句。
 *     - API：应用程序接口，前端（小程序/网页）和后端（服务器）之间通信的约定格式。
 * ========================================================================
 */

// ============ 引入依赖模块 ============

// express：Node.js 最流行的 Web 框架，用来创建服务器和处理网络请求
const express = require('express');

// Router：express 提供的"路由器"，可以把相关的路由（网址路径）组织在一起
const router = express.Router();

// db：数据库配置和模型（Model）的集合，通过它可以操作数据库中的各张表
const db = require('../config/database');

// Op：Sequelize 提供的"操作符"，用于构建复杂的数据库查询条件
// 例如 Op.in 表示"在...之中"，Op.lte 表示"小于等于"
const { Op } = require('sequelize');

// authUser：用户身份验证中间件，确保只有登录用户才能访问受保护的接口
const { authUser } = require('../middleware/auth');

// QRCode：二维码生成库，用于将订单信息生成二维码图片（用户凭码入场）
const QRCode = require('qrcode');

// crypto：Node.js 内置的加密模块，用于生成随机的安全字符串（作为二维码内容）
const crypto = require('crypto');

// 订单超时处理工具
const { checkAndCancelTimeoutOrders } = require('../utils/orderTimeout');

/**
 * 生成唯一的订单编号
 *
 * 订单编号的组成规则：
 *   "ORD" + 当前时间戳（毫秒级） + 9位随机字符串（大写）
 *   例如：ORD1672531200000A3BF7K2M9
 *
 * 为什么这样设计？
 *   - "ORD" 前缀让人一眼就知道这是订单号
 *   - 时间戳保证了基本的唯一性和时间顺序
 *   - 随机字符串进一步降低重复的可能性
 *
 * @returns {string} 返回生成的订单编号字符串
 */
function generateOrderNo() {
  return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * @route   POST /api/orders/
 * @desc    创建订单 —— 用户选好场地和时间后，提交预订请求，系统生成一笔新订单
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 请求参数（放在请求体 body 中，JSON 格式）：
 *   @param {number} venue_id   - 场地ID，表示用户要预订哪个篮球场
 *   @param {string} book_date  - 预订日期，格式如 "2026-03-01"
 *   @param {string} start_time - 开始时间，格式如 "14:00"
 *   @param {string} end_time   - 结束时间，格式如 "16:00"
 *   @param {string} [pay_type] - 支付方式，默认为 "wechat"（微信支付）
 *
 * 返回数据：
 *   成功时返回订单ID、订单编号、总价和入场二维码
 *
 * 创建订单的完整流程：
 *   第1步：验证前端传来的参数是否完整
 *   第2步：检查场地是否存在且处于可用状态
 *   第3步：检查该时段是否被管理员锁定（比如场地维护）
 *   第4步：检查该时段是否已被其他用户预订
 *   第5步：根据日期类型（工作日/周末）和时段计算价格
 *   第6步：在数据库中创建订单记录
 *   第7步：生成入场二维码并返回给前端
 */
router.post('/', authUser, async (req, res) => {
  try {
    // 从请求体中解构出预订所需的参数
    // pay_type = 'wechat' 表示如果前端没传支付方式，默认使用微信支付
    const { venue_id, book_date, start_time, end_time, pay_type = 'wechat' } = req.body;

    // ========== 第0步：检查系统状态 ==========
    // 查询系统状态设置
    const systemStatusSetting = await db.Setting.findOne({
      where: { key: 'system_status' }
    });
    
    // 如果系统状态为 maintenance（维护中），拒绝预订
    if (systemStatusSetting && systemStatusSetting.value === 'maintenance') {
      // 查询维护模式提示信息
      const maintenanceMessageSetting = await db.Setting.findOne({
        where: { key: 'maintenance_message' }
      });
      
      const message = maintenanceMessageSetting ? 
        maintenanceMessageSetting.value : 
        '系统维护中，请稍后再试';
      
      return res.json({
        code: 400,
        msg: message,
        data: null
      });
    }

    // ========== 第1步：验证参数完整性 ==========
    // 如果任何一个必填参数缺失，直接返回错误提示
    if (!venue_id || !book_date || !start_time || !end_time) {
      return res.json({
        code: 400,
        msg: '参数不完整',
        data: null
      });
    }

    // ========== 第2步：检查场地是否存在且可用 ==========
    // findByPk = find by primary key，即通过主键（ID）查找场地记录
    const venue = await db.Venue.findByPk(venue_id);
    // 如果场地不存在，返回错误
    if (!venue) {
      return res.json({
        code: 400,
        msg: '场地不存在',
        data: null
      });
    }
    // 如果场地状态为 'inactive'（停用），拒绝预订
    if (venue.status === 'inactive') {
      return res.json({
        code: 400,
        msg: '场地已停用，暂不接受预订',
        data: null
      });
    }

    // ========== 第3步：检查时段是否被管理员锁定 ==========
    // 管理员可以锁定某些时段（比如场地维修、包场活动等），被锁定的时段不允许预订
    // 这里的查询逻辑是检测"时间段重叠"（时段冲突检测）：
    //   条件1：已锁定时段的开始时间 <= 用户选的开始时间 且 已锁定时段的结束时间 > 用户选的开始时间
    //          （说明用户选的开始时间落在了某个锁定时段内）
    //   条件2：已锁定时段的开始时间 < 用户选的结束时间 且 已锁定时段的结束时间 >= 用户选的结束时间
    //          （说明用户选的结束时间落在了某个锁定时段内）
    //   只要满足其中任意一个条件（Op.or），就说明存在时间冲突
    const locks = await db.VenueLock.findAll({
      where: {
        venue_id,
        lock_date: book_date,
        [Op.or]: [
          {
            start_time: { [Op.lte]: start_time },  // lte = less than or equal（小于等于）
            end_time: { [Op.gt]: start_time }       // gt = greater than（大于）
          },
          {
            start_time: { [Op.lt]: end_time },      // lt = less than（小于）
            end_time: { [Op.gte]: end_time }         // gte = greater than or equal（大于等于）
          }
        ]
      }
    });

    // 如果查到了任何锁定记录，说明该时段不可预订
    if (locks.length > 0) {
      return res.json({
        code: 400,
        msg: '该时段已被锁定',
        data: null
      });
    }

    // ========== 第4步：检查时段是否已被其他用户预订 ==========
    // 查询逻辑与上面的锁定检测类似，也是检测时间段重叠
    // 额外条件：只检查状态为 'paid'（已支付）或 'pending'（待支付）的订单
    //           已取消的订单不算占用
    const existingOrders = await db.Order.findAll({
      where: {
        venue_id,
        book_date,
        order_status: { [Op.in]: ['paid', 'pending'] },  // in 表示"在这个列表中"
        [Op.or]: [
          {
            start_time: { [Op.lte]: start_time },
            end_time: { [Op.gt]: start_time }
          },
          {
            start_time: { [Op.lt]: end_time },
            end_time: { [Op.gte]: end_time }
          }
        ]
      }
    });

    // 如果已有有效订单占用了该时段，拒绝预订
    if (existingOrders.length > 0) {
      return res.json({
        code: 400,
        msg: '该时段已被预订',
        data: null
      });
    }

    // ========== 第5步：计算订单价格 ==========
    // 首先判断预订日期是工作日还是周末，因为价格可能不同
    const targetDate = new Date(book_date);       // 将日期字符串转为 Date 对象
    const dayOfWeek = targetDate.getDay();         // getDay() 返回 0-6，0=周日，6=周六
    // 如果是周六(6)或周日(0)，则为 'weekend'（周末价），否则为 'weekday'（工作日价）
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

    // 从价格配置表中查询该场地、该日期类型、该时段范围内的所有价格记录
    // 一个时段可能对应多条价格记录（比如 14:00-15:00 一个价，15:00-16:00 另一个价）
    const prices = await db.VenuePrice.findAll({
      where: {
        venue_id,
        day_type: dayType,
        start_time: { [Op.gte]: start_time },  // 价格记录的开始时间 >= 用户选的开始时间
        end_time: { [Op.lte]: end_time }        // 价格记录的结束时间 <= 用户选的结束时间
      }
    });

    // 如果没有找到价格配置，说明管理员还没有为该时段设置价格
    if (prices.length === 0) {
      return res.json({
        code: 400,
        msg: '该时段未配置价格',
        data: null
      });
    }

    // 将所有时段的价格累加，得到总价
    // reduce 是数组的累加方法：从 0 开始，依次把每条价格记录的 price 加上去
    // parseFloat 将字符串类型的价格转为浮点数（小数），避免字符串拼接
    const total_price = prices.reduce((sum, p) => sum + parseFloat(p.price), 0);

    // ========== 第6步：在数据库中创建订单记录 ==========
    const order_no = generateOrderNo();  // 生成唯一订单编号
    // 生成一个32位的随机十六进制字符串，作为二维码的内容（用于入场验证）
    const qrcode = crypto.randomBytes(16).toString('hex');

    // 调用 Sequelize 的 create 方法，向 orders 表中插入一条新记录
    // 订单创建后状态直接为 pending（待支付），用户可以直接支付
    const order = await db.Order.create({
      order_no,                   // 订单编号
      user_id: req.user.id,       // 下单用户的ID（从登录信息中获取）
      venue_id,                   // 场地ID
      book_date,                  // 预订日期
      start_time,                 // 开始时间
      end_time,                   // 结束时间
      total_price,                // 订单总价
      pay_type,                   // 支付方式
      qrcode,                     // 二维码内容（随机字符串）
      order_status: 'pending',    // 订单状态：待支付
      confirmed_at: new Date()    // 确认时间：创建即确认
    });

    // ========== 第7步：返回订单信息 ==========
    res.json({
      code: 200,
      msg: '订单创建成功',
      data: {
        order_id: order.id,
        order_no: order.order_no,
        total_price: order.total_price,
        order_status: order.order_status
      }
    });
  } catch (error) {
    // 如果上述任何步骤出错，捕获异常并返回服务器错误
    console.error('创建订单失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.json({
      code: 500,       // 500 表示服务器内部错误
      msg: '创建订单失败: ' + error.message,
      data: null
    });
  }
});

/**
 * @route   POST /api/orders/:id/confirm
 * @desc    确认订单 —— 用户确认未确认的订单，将状态转为待支付
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 路径参数：
 *   @param {number} id - 订单ID，放在 URL 路径中
 *
 * 订单确认流程：
 *   第1步：根据订单ID查找订单
 *   第2步：验证订单是否属于当前登录用户
 *   第3步：检查订单状态是否为 unconfirmed（未确认）
 *   第4步：更新订单状态为 pending（待支付），记录确认时间
 *   第5步：生成二维码图片并返回
 */
router.post('/:id/confirm', authUser, async (req, res) => {
  try {
    // 根据订单ID查找订单，同时关联查询场地信息
    const order = await db.Order.findByPk(req.params.id, {
      include: [{ model: db.Venue, as: 'venue' }]
    });

    // 如果订单不存在，返回 404 错误
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 验证订单归属：确保当前用户只能确认自己的订单
    if (order.user_id !== req.user.id) {
      return res.json({
        code: 403,
        msg: '无权操作此订单',
        data: null
      });
    }

    // 检查订单状态：只有未确认（unconfirmed）的订单才能确认
    if (order.order_status !== 'unconfirmed') {
      return res.json({
        code: 400,
        msg: '订单状态不正确，只有未确认的订单才能确认',
        data: null
      });
    }

    // 更新订单状态为 pending（待支付），记录确认时间
    order.order_status = 'pending';
    order.confirmed_at = new Date();
    await order.save();

    // 返回成功响应
    res.json({
      code: 200,
      msg: '订单确认成功，请完成支付',
      data: {
        order_id: order.id,
        order_no: order.order_no,
        total_price: order.total_price,
        order_status: order.order_status
      }
    });
  } catch (error) {
    console.error('确认订单失败:', error);
    res.json({
      code: 500,
      msg: '确认订单失败',
      data: null
    });
  }
});

/**
 * @route   POST /api/orders/:id/pay
 * @desc    支付订单（模拟支付） —— 用户对一笔待支付的订单进行支付操作
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 路径参数：
 *   @param {number} id - 订单ID，放在 URL 路径中，例如 /api/orders/123/pay
 *
 * 说明：
 *   这是一个"模拟支付"接口，并没有真正对接微信支付等第三方支付平台。
 *   在实际项目中，这里需要调用微信支付/支付宝的 API 完成真实扣款。
 *   模拟支付会直接将订单标记为"已支付"，方便开发和测试。
 *
 * 支付流程：
 *   第1步：根据订单ID查找订单
 *   第2步：验证订单是否属于当前登录用户
 *   第3步：检查订单状态是否为 pending（待支付）
 *   第4步：更新订单状态为 paid（已支付）
 *   第5步：发送微信订阅消息通知用户（可选功能）
 */
router.post('/:id/pay', authUser, async (req, res) => {
  try {
    // 根据 URL 中的订单ID查找订单记录
    const order = await db.Order.findByPk(req.params.id);

    // 如果订单不存在，返回 404 错误
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 验证订单归属：确保当前用户只能支付自己的订单，不能支付别人的
    if (order.user_id !== req.user.id) {
      return res.json({
        code: 403,       // 403 表示"禁止访问"，即没有权限
        msg: '无权操作此订单',
        data: null
      });
    }

    // 检查订单状态：只有待支付（pending）的订单才能支付
    if (order.order_status !== 'pending') {
      return res.json({
        code: 400,
        msg: '订单状态不正确，只有待支付的订单才能支付',
        data: null
      });
    }

    // 检查是否已经支付过，防止重复支付
    // pay_status === 1 表示已支付
    if (order.pay_status === 1) {
      return res.json({
        code: 400,
        msg: '订单已支付',
        data: null
      });
    }

    // ========== 模拟支付成功 ==========
    // 在真实项目中，这里会调用微信支付API，等待支付回调确认后才更新状态
    order.pay_status = 1;                          // 将支付状态改为 1（已支付）
    order.order_status = 'paid';                   // 将订单状态改为 'paid'（已支付）
    order.transaction_id = 'MOCK_' + Date.now();   // 生成模拟的交易流水号（真实场景由支付平台返回）
    await order.save();                            // 将更改保存到数据库

    // 发送微信订阅消息通知用户支付成功（可选功能）
    // 即使发送失败也不影响支付结果，所以放在支付成功之后
    const venue = await db.Venue.findByPk(order.venue_id);  // 查询场地信息，用于消息内容
    const wechat = require('../utils/wechat');               // 引入微信工具模块
    await wechat.notifyOrderPaid(req.user, order, venue);    // 发送支付成功通知

    // 返回支付成功的响应
    res.json({
      code: 200,
      msg: '支付成功',
      data: {
        order_id: order.id,
        order_no: order.order_no
      }
    });
  } catch (error) {
    // 捕获异常，记录错误日志并返回失败响应
    console.error('支付失败:', error);
    res.json({
      code: 500,
      msg: '支付失败',
      data: null
    });
  }
});

/**
 * @route   GET /api/orders/
 * @desc    获取用户订单列表 —— 查询当前登录用户的所有订单，支持按状态筛选和分页
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 查询参数（放在 URL 的 ? 后面，例如 /api/orders?status=paid&page=1&limit=10）：
 *   @param {string} [status] - 订单状态筛选，可选值：pending（待支付）、paid（已支付）、cancelled（已取消）
 *                              如果不传，则返回所有状态的订单
 *   @param {number} [page=1]   - 页码，默认第1页（用于分页显示）
 *   @param {number} [limit=10] - 每页条数，默认10条
 *
 * 返回数据：
 *   total - 符合条件的订单总数
 *   list  - 当前页的订单列表（包含关联的场地信息）
 *
 * 什么是分页？
 *   当数据量很大时（比如用户有100条订单），不可能一次全部返回给前端，
 *   所以把数据分成多"页"，每次只返回一页的数据。
 *   前端通过翻页来加载更多数据，这样既节省流量又提升加载速度。
 */
router.get('/', authUser, async (req, res) => {
  try {
    // 从 URL 查询参数中获取筛选条件和分页参数
    const { status, page = 1, limit = 10 } = req.query;

    // 先检查该用户的超时订单，如果超时则取消
    await checkAndCancelTimeoutOrders(req.user.id);

    // 构建查询条件：必须是当前登录用户的订单
    const where = { user_id: req.user.id };
    // 如果前端传了 status 参数，则增加订单状态的筛选条件
    if (status) {
      where.order_status = status;
    }

    // findAndCountAll：Sequelize 提供的方法，同时返回"符合条件的总数"和"当前页的数据"
    // 这对分页功能非常有用，前端需要总数来计算总共有多少页
    const orders = await db.Order.findAndCountAll({
      where,
      include: [
        {
          // 关联查询场地信息，这样每条订单都会附带对应的场地名称、地址、图片
          // as: 'venue' 是在模型定义时设置的关联别名
          model: db.Venue,
          as: 'venue',
          attributes: ['id', 'name', 'location', 'images']  // 只查询需要的字段，减少数据传输量
        }
      ],
      offset: (page - 1) * limit,    // 跳过前面页的数据。例如第2页、每页10条，则跳过前10条
      limit: parseInt(limit),         // 每页返回的条数（parseInt 确保是整数）
      order: [['created_at', 'DESC']] // 按创建时间倒序排列，最新的订单排在最前面
    });

    // 返回订单列表和总数
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: orders.count,   // 符合条件的订单总数
        list: orders.rows      // 当前页的订单数据数组
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.json({
      code: 500,
      msg: '获取订单列表失败: ' + error.message,
      data: null
    });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    获取订单详情 —— 查看某一笔订单的完整信息，包括场地详情、评价和入场二维码
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 路径参数：
 *   @param {number} id - 订单ID，放在 URL 路径中，例如 /api/orders/123
 *
 * 返回数据：
 *   订单的所有字段 + 关联的场地信息 + 关联的评价信息 + 二维码图片（如果已支付）
 */
router.get('/:id', authUser, async (req, res) => {
  try {
    // 先检查该订单是否超时，如果超时则取消
    await checkAndCancelTimeoutOrders(null, parseInt(req.params.id));
    
    // 根据订单ID查询订单，同时关联查询场地信息和评价信息
    const order = await db.Order.findByPk(req.params.id, {
      include: [
        {
          model: db.Venue,    // 关联场地表，获取场地的详细信息
          as: 'venue'
        },
        {
          model: db.Review,   // 关联评价表，获取用户对该订单的评价（如果有的话）
          as: 'review'
        }
      ]
    });

    // 如果订单不存在，返回 404 错误
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 验证订单归属：只能查看自己的订单
    if (order.user_id !== req.user.id) {
      return res.json({
        code: 403,
        msg: '无权查看此订单',
        data: null
      });
    }

    // ========== 生成入场二维码 ==========
    // 只有在订单已支付（'paid'）且二维码内容存在时，才生成二维码图片
    // 未支付或已取消的订单不需要显示二维码
    let qrcodeDataUrl = null;
    if (order.qrcode && order.order_status === 'paid') {
      // 将二维码内容字符串转为 Base64 编码的图片（DataURL 格式）
      qrcodeDataUrl = await QRCode.toDataURL(order.qrcode);
    }

    // 返回订单详情
    // order.toJSON() 将 Sequelize 模型实例转为普通 JavaScript 对象
    // ...（展开运算符）将对象的所有属性展开，再额外添加 qrcodeDataUrl 字段
    res.json({
      code: 200,
      msg: '成功',
      data: {
        ...order.toJSON(),
        qrcodeDataUrl          // 二维码图片的 DataURL（已支付时有值，否则为 null）
      }
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
 * @route   POST /api/orders/:id/cancel
 * @desc    取消订单 —— 用户取消一笔待支付或已支付的订单
 * @access  需要用户登录（通过 authUser 中间件验证）
 *
 * 路径参数：
 *   @param {number} id - 订单ID，放在 URL 路径中，例如 /api/orders/123/cancel
 *
 * 说明：
 *   只有状态为 'pending'（待支付）或 'paid'（已支付）的订单才允许取消。
 *   已取消或已完成的订单不能再次取消。
 *   注意：在真实项目中，已支付的订单取消后通常需要执行退款操作，
 *   这里简化处理，只修改了订单状态，没有退款逻辑。
 *
 * 取消流程：
 *   第1步：根据订单ID查找订单
 *   第2步：验证订单是否属于当前登录用户
 *   第3步：检查订单状态是否允许取消
 *   第4步：将订单状态更新为 'cancelled'（已取消）
 */
router.post('/:id/cancel', authUser, async (req, res) => {
  try {
    // 根据 URL 中的订单ID查找订单记录
    const order = await db.Order.findByPk(req.params.id);

    // 如果订单不存在，返回 404 错误
    if (!order) {
      return res.json({
        code: 404,
        msg: '订单不存在',
        data: null
      });
    }

    // 验证订单归属：只能取消自己的订单
    if (order.user_id !== req.user.id) {
      return res.json({
        code: 403,
        msg: '无权操作此订单',
        data: null
      });
    }

    // 检查订单状态：只有"待支付"和"已支付"的订单才能取消
    // 已取消（cancelled）、已完成（completed）等状态的订单不允许再取消
    if (order.order_status !== 'pending' && order.order_status !== 'paid') {
      return res.json({
        code: 400,
        msg: '订单状态不允许取消',
        data: null
      });
    }

    // 将订单状态更新为"已取消"，并保存到数据库
    order.order_status = 'cancelled';
    await order.save();

    // 返回取消成功的响应
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

// 导出路由模块
// 其他文件（如 app.js）通过 require 引入后，可以使用 app.use('/api/orders', router) 挂载这些路由
module.exports = router;