/**
 * 场馆模型（Venue）
 * 对应数据库 venues 表，存储篮球场馆的基本信息
 */
module.exports = (sequelize, DataTypes) => {
  const Venue = sequelize.define('Venue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100), // 场馆名称
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(200), // 场馆地址
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT          // 场馆详细描述
    },
    images: {
      type: DataTypes.JSON,         // 场馆图片列表（JSON 数组，存储图片 URL）
      defaultValue: []
    },
    facilities: {
      type: DataTypes.JSON,         // 场馆设施列表（JSON 数组，如 ['灯光', '空调', '淋浴']）
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'), // 状态：active-启用，inactive-停用
      defaultValue: 'active'
    },
    maintenance_status: {
      type: DataTypes.ENUM('normal', 'maintenance'), // 维护状态：normal-正常可用，maintenance-维护中
      defaultValue: 'normal'
    },
    maintenance_message: {
      type: DataTypes.STRING(500), // 维护提示信息
      allowNull: true
    },
    maintenance_start_time: {
      type: DataTypes.DATE, // 维护开始时间
      allowNull: true
    },
    maintenance_end_time: {
      type: DataTypes.DATE, // 维护结束时间（预计恢复时间）
      allowNull: true
    }
  }, {
    tableName: 'venues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Venue;
};