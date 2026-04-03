/**
 * ============================================================================
 * 文件名：schedule.js
 * 所属模块：工具模块 - 定时任务调度器
 * 文件说明：
 *   这个文件负责设置和管理系统中的"定时任务"（也叫"计划任务"或"定时器"）。
 *   定时任务就像一个"闹钟"，到了指定的时间就会自动执行某些操作，
 *   不需要人工干预。
 *
 *   目前设置了两个定时任务：
 *
 *   1. 自动取消超时未支付订单（每小时执行一次）
 *      - 用户下单后如果超过 30 分钟还没有支付，系统会自动取消该订单
 *      - 这样可以释放被占用的场地时段，让其他用户可以预订
 *
 *   2. 自动完成过期订单（每天凌晨 1 点执行）
 *      - 如果某个已支付的订单，其预订日期已经过了（比如昨天的订单），
 *        系统会自动将其标记为"已完成"
 *      - 这样可以保持订单状态的准确性
 *
 * 依赖库：node-schedule（Node.js 定时任务库）
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * node-schedule —— Node.js 的定时任务库
 * 它使用 cron 表达式来定义任务的执行时间
 *
 * 【cron 表达式简介】
 * cron 表达式由 5 个字段组成，用空格分隔：
 *   ┌─────────── 分钟 (0-59)
 *   │ ┌───────── 小时 (0-23)
 *   │ │ ┌─────── 日期 (1-31)
 *   │ │ │ ┌───── 月份 (1-12)
 *   │ │ │ │ ┌─── 星期几 (0-7，0和7都表示星期日)
 *   │ │ │ │ │
 *   * * * * *
 *
 * 常见示例：
 *   '0 * * * *'   → 每小时的第 0 分钟执行（即每小时整点执行）
 *   '0 1 * * *'   → 每天凌晨 1:00 执行
 *   '30 8 * * 1'  → 每周一早上 8:30 执行
 *   '0 0 1 * *'   → 每月 1 号凌晨 0:00 执行
 *   '* * * * *'   → 每分钟执行一次
 */
const schedule = require('node-schedule');

/**
 * db —— 数据库连接和模型对象
 * 通过 db.Order 可以操作订单数据表
 */
const db = require('../config/database');

/**
 * Op —— Sequelize 的操作符，用于构建复杂查询条件
 * 这里主要用到 Op.lt（小于）来查找超时的订单
 */
const { Op } = require('sequelize');

// ==================== 定时任务定义 ====================

/**
 * scheduleJobs —— 启动所有定时任务
 * 这个函数通常在服务器启动时调用一次，之后定时任务会按照设定的时间自动运行
 *
 * 使用方式（在主入口文件 app.js 或 server.js 中）：
 *   const scheduleJobs = require('./utils/schedule');
 *   scheduleJobs();  // 启动定时任务
 */
function scheduleJobs() {

  // ==================== 定时任务 1：自动取消超时订单 ====================
  /**
   * cron 表达式 '* * * * *' 含义：每分钟执行一次
   *
   * 业务逻辑：
   *   1. 查找所有创建时间超过 15 分钟、且仍未确认的订单（unconfirmed），自动将其取消
   *   2. 查找所有确认时间超过 30 分钟、且仍未支付的订单（pending），自动将其取消
   *   这样做的目的是防止用户"占坑不付款"，导致其他用户无法预订该时段。
   */
  schedule.scheduleJob('* * * * *', async () => {
    try {
      // 计算 15 分钟前的时间点（用于未确认订单超时）
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      // 计算 30 分钟前的时间点（用于待支付订单超时）
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // ========== 处理超时未确认订单 ==========
      // 查找所有需要自动取消的未确认订单
      // 条件：状态为"未确认" + 创建时间早于15分钟前
      const unconfirmedOrders = await db.Order.findAll({
        where: {
          order_status: 'unconfirmed',    // 订单状态为"未确认"
          created_at: {
            [Op.lt]: fifteenMinutesAgo    // 创建时间 < 15分钟前
          }
        }
      });

      // 遍历所有超时未确认订单，逐个取消
      for (const order of unconfirmedOrders) {
        order.order_status = 'cancelled';              // 将状态改为"已取消"
        order.cancel_reason = '超时未确认自动取消';     // 记录取消原因
        await order.save();                            // 保存到数据库
      }

      // ========== 处理超时未支付订单 ==========
      // 查找所有需要自动取消的待支付订单
      // 条件：状态为"待支付" + 未支付 + 确认时间早于30分钟前
      const unpaidOrders = await db.Order.findAll({
        where: {
          order_status: 'pending',       // 订单状态为"待支付"
          pay_status: 0,                 // 支付状态为 0（未支付）
          confirmed_at: {
            [Op.lt]: thirtyMinutesAgo    // 确认时间 < 30分钟前
          }
        }
      });

      // 遍历所有超时未支付订单，逐个取消
      for (const order of unpaidOrders) {
        order.order_status = 'cancelled';              // 将状态改为"已取消"
        order.cancel_reason = '超时未支付自动取消';     // 记录取消原因
        await order.save();                            // 保存到数据库
      }

      // 在控制台打印执行结果，方便运维人员查看
      console.log(`自动取消了 ${unconfirmedOrders.length} 个超时未确认订单，${unpaidOrders.length} 个超时未支付订单`);
    } catch (error) {
      // 如果执行过程中出错，打印错误信息（定时任务的错误不会影响服务器运行）
      console.error('自动取消订单失败:', error);
    }
  });

  // ==================== 定时任务 2：自动完成过期订单 ====================
  /**
   * cron 表达式 '0 1 * * *' 含义：每天凌晨 1:00 执行
   * 选择凌晨 1 点是因为这个时间段用户活跃度最低，对系统影响最小
   *
   * 业务逻辑：
   *   查找所有预订日期已过期（早于昨天）的已支付订单，自动标记为"已完成"。
   *   因为预订日期已经过了，说明用户已经使用完了场地（或者错过了），
   *   所以可以安全地将订单状态更新为"已完成"。
   */
  schedule.scheduleJob('0 1 * * *', async () => {
    try {
      // 计算昨天的日期
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);    // 将日期减去 1 天
      // 转换为 'YYYY-MM-DD' 格式的字符串
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 查找所有预订日期早于昨天的已支付订单
      const expiredOrders = await db.Order.findAll({
        where: {
          order_status: 'paid',          // 状态为"已支付"（还没有被标记为完成的）
          book_date: {
            [Op.lt]: yesterdayStr         // 预订日期 < 昨天（即已经过期了）
          }
        }
      });

      // 遍历所有过期订单，逐个标记为已完成
      for (const order of expiredOrders) {
        order.order_status = 'completed';    // 将状态改为"已完成"
        await order.save();                  // 保存到数据库
      }

      console.log(`自动完成了 ${expiredOrders.length} 个过期订单`);
    } catch (error) {
      console.error('自动完成订单失败:', error);
    }
  });

  // 所有定时任务注册完毕，打印提示信息
  console.log('定时任务已启动');
}

// ==================== 导出模块 ====================
/**
 * 导出 scheduleJobs 函数
 * 在服务器启动文件中调用此函数即可启动所有定时任务
 */
module.exports = scheduleJobs;