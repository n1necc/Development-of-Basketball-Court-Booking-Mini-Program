/**
 * 系统设置模型（Setting）
 * 对应数据库 settings 表，以键值对形式存储系统配置项
 * 如：最大预约天数、最晚取消时间等
 */
module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING(50),  // 设置项的键名（唯一），如 'max_booking_days'
      unique: true,
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT         // 设置项的值，如 '7'
    },
    description: {
      type: DataTypes.STRING(200)  // 设置项的中文说明
    }
  }, {
    tableName: 'settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Setting;
};
