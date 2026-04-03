/**
 * 订单超时处理工具
 * 用于检查并取消超时的订单
 */

const db = require('../config/database');
const { Op } = require('sequelize');

/**
 * 检查并取消超时订单
 * @param {number} userId - 用户ID（可选，只检查该用户的订单）
 * @param {number} orderId - 订单ID（可选，只检查该订单）
 * @returns {Promise<number>} 取消的订单数量
 */
async function checkAndCancelTimeoutOrders(userId = null, orderId = null) {
  try {
    // 计算 30 分钟前的时间点（用于待支付订单超时）
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 构建查询条件
    const where = {
      order_status: 'pending',       // 订单状态为"待支付"
      pay_status: 0,                 // 支付状态为 0（未支付）
      confirmed_at: {
        [Op.lt]: thirtyMinutesAgo    // 确认时间 < 30分钟前
      }
    };

    // 如果指定了用户ID，只检查该用户的订单
    if (userId) {
      where.user_id = userId;
    }

    // 如果指定了订单ID，只检查该订单
    if (orderId) {
      where.id = orderId;
    }

    // 查找所有需要自动取消的订单
    const unpaidOrders = await db.Order.findAll({ where });

    // 遍历所有超时订单，逐个取消
    for (const order of unpaidOrders) {
      order.order_status = 'cancelled';              // 将状态改为"已取消"
      order.cancel_reason = '超时未支付自动取消';     // 记录取消原因
      await order.save();                            // 保存到数据库
    }

    if (unpaidOrders.length > 0) {
      console.log(`检查到 ${unpaidOrders.length} 个超时订单，已自动取消`);
    }

    return unpaidOrders.length;
  } catch (error) {
    console.error('检查超时订单失败:', error);
    return 0;
  }
}

module.exports = {
  checkAndCancelTimeoutOrders
};
