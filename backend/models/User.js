/**
 * 用户模型（User）
 * 对应数据库 users 表，存储微信小程序用户的基本信息
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,       // 主键
      autoIncrement: true     // 自增
    },
    openid: {
      type: DataTypes.STRING(100), // 微信用户唯一标识（由微信登录接口返回）
      unique: true,
      allowNull: false
    },
    nickName: {
      type: DataTypes.STRING(100), // 用户昵称
      defaultValue: '微信用户'
    },
    avatarUrl: {
      type: DataTypes.TEXT  // 用户头像 URL，使用 TEXT 类型存储 base64 编码的图片
    },
    phone: {
      type: DataTypes.STRING(20)   // 手机号
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2), // 账户余额，最多10位数，2位小数
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('normal', 'blacklist'), // 状态：normal-正常，blacklist-黑名单
      defaultValue: 'normal'
    }
  }, {
    tableName: 'users',        // 对应的数据库表名
    timestamps: true,          // 自动管理 created_at 和 updated_at 字段
    createdAt: 'created_at',   // 创建时间字段名
    updatedAt: 'updated_at'    // 更新时间字段名
  });

  return User;
};
