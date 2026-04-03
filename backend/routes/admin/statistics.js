/**
 * ============================================================================
 * 文件名：statistics.js
 * 所属模块：管理员后台 - 数据统计路由
 * 文件说明：
 *   这个文件是管理后台的"数据大脑"，提供各种统计分析功能，帮助管理员了解
 *   篮球场馆的经营状况。主要包含以下功能：
 *
 *     1. 营收统计（/revenue）    - 按日期查看每天的收入情况
 *     2. 场地使用率（/usage）    - 查看各场地的预订使用率
 *     3. 概览统计（/overview）   - 首页仪表盘的关键数据（今日订单、收入、用户数等）
 *     4. 场地排名（/venue-ranking）- 按预订次数对场地进行排名
 *     5. 导出报表（/export-revenue）- 将收入数据导出为 Excel 文件
 *
 *   所有接口都需要管理员身份验证。
 *
 * 技术栈：Express.js + Sequelize ORM + ExcelJS（Excel 文件生成库）
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/** Express Web 框架 */
const express = require('express');

/** 创建路由器实例，用于定义统计相关的路由 */
const router = express.Router();

/** 数据库连接和模型对象（包含 Order、Venue、User、VenuePrice 等数据表） */
const db = require('../../config/database');

/** 管理员身份验证中间件 */
const { authAdmin } = require('../../middleware/auth');

/**
 * Op —— Sequelize 的操作符对象
 * 用于构建复杂的数据库查询条件，比如：
 *   Op.in     → SQL 的 IN（在某个列表中）
 *   Op.between → SQL 的 BETWEEN（在某个范围内）
 *   Op.lt     → SQL 的 <（小于）
 * 例如：{ order_status: { [Op.in]: ['paid', 'completed'] } }
 *       等同于 SQL：WHERE order_status IN ('paid', 'completed')
 */
const { Op } = require('sequelize');

/**
 * ExcelJS —— 用于生成 Excel 文件的第三方库
 * 可以创建工作簿（Workbook）、工作表（Worksheet），设置列、行、样式等
 * 最终生成 .xlsx 格式的 Excel 文件供管理员下载
 */
const ExcelJS = require('exceljs');

// ==================== 路由定义 ====================

/**
 * @route   GET /admin/statistics/revenue
 * @desc    营收统计 —— 查询指定日期范围内每天的收入数据
 * @access  仅管理员可访问
 *
 * 查询参数：
 *   @param {string} [type='daily'] - 统计类型，'daily' 日报 或 'monthly' 月报（预留参数）
 *   @param {string} start_date     - 开始日期（必填），格式 'YYYY-MM-DD'，如 '2024-01-01'
 *   @param {string} end_date       - 结束日期（必填），格式 'YYYY-MM-DD'，如 '2024-01-31'
 *
 * 返回数据：
 *   {
 *     code: 200,
 *     data: {
 *       total: 总收入金额,
 *       list: [{ date: '2024-01-01', revenue: 500 }, ...]  // 每天的收入明细
 *     }
 *   }
 */
router.get('/revenue', authAdmin, async (req, res) => {
  try {
    // 从查询参数中获取统计类型和日期范围
    const { type = 'daily', start_date, end_date } = req.query;

    // 验证必填参数：开始日期和结束日期都不能为空
    if (!start_date || !end_date) {
      return res.json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      });
    }

    // 从数据库查询指定日期范围内的所有"已支付"或"已完成"的订单
    // 只获取 book_date（预订日期）和 total_price（订单金额）两个字段
    // raw: true 表示返回纯 JavaScript 对象，而不是 Sequelize 模型实例（性能更好）
    const orders = await db.Order.findAll({
      where: {
        order_status: { [Op.in]: ['paid', 'completed'] },   // 只统计已支付和已完成的订单
        book_date: {
          [Op.between]: [start_date, end_date]               // 日期在指定范围内
        }
      },
      attributes: ['book_date', 'total_price'],              // 只查询需要的字段，提高效率
      raw: true
    });

    // ---- 按日期分组统计每天的收入 ----
    // revenueMap 是一个"字典"对象，key 是日期，value 是当天的总收入
    // 例如：{ '2024-01-01': 500, '2024-01-02': 800 }
    const revenueMap = {};
    orders.forEach(order => {
      const date = order.book_date;
      // 如果这个日期还没有记录，先初始化为 0
      if (!revenueMap[date]) {
        revenueMap[date] = 0;
      }
      // 将当前订单的金额累加到对应日期
      // parseFloat 将字符串类型的金额转换为浮点数（小数），确保数学运算正确
      revenueMap[date] += parseFloat(order.total_price);
    });

    // 将字典对象转换为数组格式，并按日期升序排列
    // Object.keys() 获取所有日期，然后 map 转换为 { date, revenue } 格式
    const revenueData = Object.keys(revenueMap).map(date => ({
      date,
      revenue: revenueMap[date]
    })).sort((a, b) => a.date.localeCompare(b.date));
    // localeCompare 用于字符串比较，日期格式 'YYYY-MM-DD' 刚好可以按字符串排序

    // 计算总收入：使用 reduce 方法将所有天的收入累加
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);

    // 返回统计结果
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: totalRevenue,      // 日期范围内的总收入
        list: revenueData         // 每天的收入明细列表
      }
    });
  } catch (error) {
    console.error('获取营收统计失败:', error);
    res.json({
      code: 500,
      msg: '获取营收统计失败',
      data: null
    });
  }
});

/**
 * @route   GET /admin/statistics/usage
 * @desc    场地使用率统计 —— 计算各场地在指定日期范围内的预订使用率
 * @access  仅管理员可访问
 *
 * 使用率的计算方式：
 *   使用率 = 已预订时段数 / 总可用时段数 * 100%
 *   例如：某场地每天有 10 个可预订时段，查询 7 天，总可用 = 10 * 7 = 70 个时段
 *         其中有 35 个时段被预订了，使用率 = 35 / 70 * 100% = 50%
 *
 * 查询参数：
 *   @param {string} start_date  - 开始日期（必填）
 *   @param {string} end_date    - 结束日期（必填）
 *   @param {number} [venue_id]  - 场地 ID（选填，不传则统计所有场地）
 *
 * 返回数据：
 *   [{ venue_id, venue_name, total_slots, booked_slots, usage_rate }, ...]
 */
router.get('/usage', authAdmin, async (req, res) => {
  try {
    const { start_date, end_date, venue_id } = req.query;

    // 验证必填的日期参数
    if (!start_date || !end_date) {
      return res.json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      });
    }

    // 构建查询条件
    const where = {
      book_date: {
        [Op.between]: [start_date, end_date]
      }
    };

    // 如果指定了场地 ID，就只统计该场地
    if (venue_id) {
      where.venue_id = venue_id;
    }

    // 获取所有场地（或指定场地）的基本信息
    const venues = await db.Venue.findAll({
      where: venue_id ? { id: venue_id } : {},    // 如果有 venue_id 就筛选，否则查全部
      attributes: ['id', 'name']                   // 只需要 id 和名称
    });

    // 对每个场地分别计算使用率
    // Promise.all 可以并行处理多个异步操作，提高效率
    const usageData = await Promise.all(venues.map(async venue => {
      // 获取该场地的所有时段价格配置
      // VenuePrice 表存储了每个场地有哪些可预订的时间段
      // 例如：8:00-9:00、9:00-10:00 等，每条记录代表一个可预订时段
      const prices = await db.VenuePrice.findAll({
        where: { venue_id: venue.id }
      });

      // ---- 计算总可用时段数 ----
      // 先算出日期范围内有多少天
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      // 两个日期相减得到毫秒数，再转换为天数，+1 是因为要包含首尾两天
      const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      // 总可用时段 = 每天的时段数 * 天数
      const totalSlots = prices.length * dayCount;

      // ---- 统计已预订的时段数 ----
      // 查询该场地在日期范围内已支付或已完成的订单数量
      const bookedOrders = await db.Order.count({
        where: {
          venue_id: venue.id,
          book_date: {
            [Op.between]: [start_date, end_date]
          },
          order_status: { [Op.in]: ['paid', 'completed'] }
        }
      });

      // 计算使用率（百分比），保留两位小数
      // 如果总时段为 0（场地没有配置时段），使用率为 0，避免除以零的错误
      const usageRate = totalSlots > 0 ? (bookedOrders / totalSlots * 100).toFixed(2) : 0;

      return {
        venue_id: venue.id,
        venue_name: venue.name,
        total_slots: totalSlots,            // 总可用时段数
        booked_slots: bookedOrders,         // 已预订时段数
        usage_rate: parseFloat(usageRate)   // 使用率（%）
      };
    }));

    // 返回所有场地的使用率数据
    res.json({
      code: 200,
      msg: '成功',
      data: usageData
    });
  } catch (error) {
    console.error('获取使用率统计失败:', error);
    res.json({
      code: 500,
      msg: '获取使用率统计失败',
      data: null
    });
  }
});

/**
 * @route   GET /admin/statistics/overview
 * @desc    概览统计 —— 获取管理后台首页仪表盘所需的关键数据
 * @access  仅管理员可访问
 *
 * 这个接口不需要任何参数，它会自动统计以下数据：
 *   - todayOrders:   今日有效订单数（已支付 + 已完成）
 *   - todayRevenue:  今日总收入（元）
 *   - totalUsers:    系统注册用户总数
 *   - totalVenues:   当前启用的场地总数
 *   - pendingOrders: 待处理（未支付）的订单数
 *
 * 返回数据：
 *   { code: 200, data: { todayOrders, todayRevenue, totalUsers, totalVenues, pendingOrders } }
 */
router.get('/overview', authAdmin, async (req, res) => {
  try {
    // 获取今天的日期字符串，格式为 'YYYY-MM-DD'（使用本地时区）
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // ---- 统计今日有效订单数 ----
    // count() 方法返回符合条件的记录数量
    const todayOrders = await db.Order.count({
      where: {
        book_date: todayStr,                                     // 预订日期是今天
        order_status: { [Op.in]: ['paid', 'completed'] }      // 状态为已支付或已完成
      }
    });

    // ---- 统计今日总收入 ----
    // sum() 方法对指定字段求和，这里是对 total_price（订单金额）求和
    const todayRevenue = await db.Order.sum('total_price', {
      where: {
        book_date: todayStr,
        order_status: { [Op.in]: ['paid', 'completed'] }
      }
    });

    // ---- 统计总用户数 ----
    const totalUsers = await db.User.count();

    // ---- 统计启用中的场地数 ----
    // 只统计状态为 'active'（启用）的场地，不包括已停用的
    const totalVenues = await db.Venue.count({
      where: { status: 'active' }
    });

    // ---- 统计待处理订单数 ----
    // 'pending' 状态表示用户已下单但尚未支付
    const pendingOrders = await db.Order.count({
      where: { order_status: 'pending' }
    });

    // 返回所有统计数据
    res.json({
      code: 200,
      msg: '成功',
      data: {
        todayOrders,                        // 今日订单数
        todayRevenue: todayRevenue || 0,    // 今日收入（如果没有订单，sum 返回 null，用 || 0 兜底）
        totalUsers,                         // 总用户数
        totalVenues,                        // 总场地数
        pendingOrders                       // 待处理订单数
      }
    });
  } catch (error) {
    console.error('获取概览统计失败:', error);
    res.json({
      code: 500,
      msg: '获取概览统计失败',
      data: null
    });
  }
});

/**
 * @route   GET /admin/statistics/venue-ranking
 * @desc    场地使用排名 —— 按预订次数对所有场地进行排名，同时统计各场地的收入
 * @access  仅管理员可访问
 *
 * 查询参数：
 *   @param {string} start_date - 开始日期（必填）
 *   @param {string} end_date   - 结束日期（必填）
 *
 * 返回数据（按预订次数从高到低排序）：
 *   [{ venue_id, venue_name, location, booking_count, total_revenue }, ...]
 */
router.get('/venue-ranking', authAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // 验证必填的日期参数
    if (!start_date || !end_date) {
      return res.json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      });
    }

    // 获取所有场地，并通过"关联查询"（JOIN）同时获取每个场地的订单数据
    // include 就是 SQL 中的 JOIN 操作，把场地表和订单表关联起来
    const venues = await db.Venue.findAll({
      attributes: ['id', 'name', 'location'],     // 场地的基本信息
      include: [{
        model: db.Order,                           // 关联订单表
        as: 'orders',                              // 关联别名（在模型定义中设置的）
        where: {
          book_date: {
            [Op.between]: [start_date, end_date]   // 只关联指定日期范围内的订单
          },
          order_status: { [Op.in]: ['paid', 'completed'] }  // 只统计有效订单
        },
        attributes: ['total_price'],               // 只需要订单金额字段
        required: false                            // 重要！false 表示"左连接"（LEFT JOIN）
        // 即使某个场地没有任何订单，也会出现在结果中（订单数为 0）
        // 如果设为 true（内连接），没有订单的场地会被过滤掉
      }]
    });

    // 对查询结果进行加工：统计每个场地的预订次数和总收入
    const rankingData = venues.map(venue => {
      const orders = venue.orders || [];           // 该场地的订单列表（可能为空数组）
      const bookingCount = orders.length;          // 预订次数 = 订单数量
      // 使用 reduce 累加所有订单的金额，得到总收入
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

      return {
        venue_id: venue.id,
        venue_name: venue.name,
        location: venue.location,
        booking_count: bookingCount,               // 预订次数
        total_revenue: totalRevenue                // 总收入
      };
    }).sort((a, b) => b.booking_count - a.booking_count);
    // 按预订次数降序排列（预订最多的排在最前面）

    res.json({
      code: 200,
      msg: '成功',
      data: rankingData
    });
  } catch (error) {
    console.error('获取场地排名失败:', error);
    // 打印详细的错误堆栈信息，方便定位问题
    console.error('错误堆栈:', error.stack);
    res.json({
      code: 500,
      msg: '获取场地排名失败: ' + error.message,
      data: null
    });
  }
});

/**
 * @route   GET /admin/statistics/export-revenue
 * @desc    导出收入 Excel 报表 —— 将指定日期范围内的订单数据导出为 Excel 文件
 * @access  仅管理员可访问
 *
 * 查询参数：
 *   @param {string} start_date - 开始日期（必填）
 *   @param {string} end_date   - 结束日期（必填）
 *
 * 返回：直接下载一个 .xlsx 格式的 Excel 文件（不是 JSON 数据）
 * 文件名格式：revenue_开始日期_结束日期.xlsx
 *
 * Excel 表格包含的列：
 *   订单号 | 场地名称 | 场地位置 | 预订日期 | 开始时间 | 结束时间 |
 *   用户昵称 | 联系电话 | 订单金额 | 订单状态
 *   最后一行为总计行，显示所有订单的金额总和
 */
router.get('/export-revenue', authAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // 验证必填的日期参数
    if (!start_date || !end_date) {
      return res.json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      });
    }

    // 查询指定日期范围内的有效订单，同时关联场地和用户信息
    const orders = await db.Order.findAll({
      where: {
        order_status: { [Op.in]: ['paid', 'completed'] },
        book_date: {
          [Op.between]: [start_date, end_date]
        }
      },
      include: [{
        model: db.Venue,
        as: 'venue',
        attributes: ['name', 'location']       // 关联场地表，获取场地名称和位置
      }, {
        model: db.User,
        as: 'user',
        attributes: ['nickname', 'phone']       // 关联用户表，获取昵称和电话
      }],
      order: [['book_date', 'ASC'], ['start_time', 'ASC']]  // 按日期和时间升序排列
    });

    // ==================== 创建 Excel 工作簿 ====================

    // 创建一个新的 Excel 工作簿（一个 .xlsx 文件就是一个工作簿）
    const workbook = new ExcelJS.Workbook();
    // 在工作簿中添加一个工作表（Sheet），命名为"收入报表"
    const worksheet = workbook.addWorksheet('收入报表');

    // 定义表格的列（表头）
    // header: 列标题（显示在第一行）
    // key: 数据字段名（用于后面添加数据时的映射）
    // width: 列宽度（字符数）
    worksheet.columns = [
      { header: '订单号', key: 'order_no', width: 20 },
      { header: '场地名称', key: 'venue_name', width: 25 },
      { header: '场地位置', key: 'location', width: 30 },
      { header: '预订日期', key: 'book_date', width: 15 },
      { header: '开始时间', key: 'start_time', width: 12 },
      { header: '结束时间', key: 'end_time', width: 12 },
      { header: '用户昵称', key: 'user_nickname', width: 20 },
      { header: '联系电话', key: 'phone', width: 15 },
      { header: '订单金额', key: 'total_price', width: 12 },
      { header: '订单状态', key: 'status', width: 12 }
    ];

    // ---- 设置表头行的样式 ----
    // getRow(1) 获取第一行（表头行）
    worksheet.getRow(1).font = { bold: true };     // 字体加粗
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF97316' }               // 背景色：橙色（ARGB 颜色格式）
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };  // 居中对齐

    // ---- 逐行添加订单数据 ----
    let totalRevenue = 0;    // 用于累计总收入

    orders.forEach(order => {
      // 订单状态的中英文映射表
      const statusMap = {
        'paid': '已支付',
        'completed': '已完成',
        'pending': '待支付',
        'cancelled': '已取消'
      };

      // 向工作表中添加一行数据
      // key 与上面 columns 定义的 key 对应
      worksheet.addRow({
        order_no: order.order_no,
        venue_name: order.venue?.name || '-',          // ?. 是可选链操作符，防止 venue 为空时报错
        location: order.venue?.location || '-',        // 如果为空就显示 '-'
        book_date: order.book_date,
        start_time: order.start_time,
        end_time: order.end_time,
        user_nickname: order.user?.nickname || '-',
        phone: order.user?.phone || '-',
        total_price: parseFloat(order.total_price),
        status: statusMap[order.order_status] || order.order_status  // 转换为中文状态
      });

      // 累加总收入
      totalRevenue += parseFloat(order.total_price);
    });

    // ---- 添加总计行（最后一行，显示总金额） ----
    const totalRow = worksheet.addRow({
      order_no: '',
      venue_name: '',
      location: '',
      book_date: '',
      start_time: '',
      end_time: '',
      user_nickname: '总计：',
      phone: '',
      total_price: totalRevenue,       // 所有订单的金额总和
      status: ''
    });
    // 总计行的样式：加粗 + 浅黄色背景，使其醒目
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }   // 浅黄色背景
    };

    // ==================== 发送 Excel 文件给客户端下载 ====================

    // 设置 HTTP 响应头，告诉浏览器这是一个 Excel 文件
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // Content-Disposition 告诉浏览器以附件形式下载，并指定文件名
    res.setHeader('Content-Disposition', `attachment; filename=revenue_${start_date}_${end_date}.xlsx`);

    // 将 Excel 工作簿的内容写入 HTTP 响应流，浏览器会自动开始下载
    await workbook.xlsx.write(res);
    // 结束响应
    res.end();
  } catch (error) {
    console.error('导出Excel失败:', error);
    res.json({
      code: 500,
      msg: '导出Excel失败',
      data: null
    });
  }
});

// ==================== 导出路由模块 ====================
/**
 * 将统计路由器导出，供主应用挂载使用
 * 例如：app.use('/admin/statistics', require('./routes/admin/statistics'))
 */
module.exports = router;