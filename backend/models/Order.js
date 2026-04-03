/**
 * 订单模型（Order）
 * 对应数据库 orders 表，存储用户的场馆预约订单信息
 */
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_no: {
      type: DataTypes.STRING(50),  // 订单编号（唯一标识，如 "ORD20240101120000001"）
      unique: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,     // 下单用户 ID，关联 users 表
      allowNull: false
    },
    venue_id: {
      type: DataTypes.INTEGER,     // 预约场馆 ID，关联 venues 表
      allowNull: false
    },
    book_date: {
      type: DataTypes.DATEONLY,    // 预约日期（如 "2024-03-15"）
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,        // 开始时间（如 "08:00"）
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,        // 结束时间（如 "10:00"）
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2), // 订单总价
      allowNull: false
    },
    pay_type: {
      type: DataTypes.ENUM('wechat', 'balance'), // 支付方式：wechat-微信支付，balance-余额支付
      defaultValue: 'wechat'
    },
    pay_status: {
      type: DataTypes.TINYINT,     // 支付状态：0-未支付，1-已支付
      defaultValue: 0,
      comment: '0-未支付, 1-已支付'
    },
    order_status: {
      // 订单状态：unconfirmed-未确认，pending-待支付，paid-已支付，completed-已完成，cancelled-已取消，refunded-已退款
      type: DataTypes.ENUM('unconfirmed', 'pending', 'paid', 'completed', 'cancelled', 'refunded'),
      defaultValue: 'unconfirmed'
    },
    confirmed_at: {
      type: DataTypes.DATE,  // 订单确认时间
      allowNull: true
    },
    qrcode: {
      type: DataTypes.STRING(100)  // 入场二维码路径
    },
    transaction_id: {
      type: DataTypes.STRING(100)  // 微信支付交易流水号
    },
    cancel_reason: {
      type: DataTypes.STRING(255),  // 订单取消原因
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Order;
};
