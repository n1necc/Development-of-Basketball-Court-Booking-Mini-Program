/**
 * 场馆状态变更日志模型（VenueStatusLog）
 * 对应数据库 venue_status_logs 表，存储场馆状态变更的记录
 */
module.exports = (sequelize, DataTypes) => {
  const VenueStatusLog = sequelize.define('VenueStatusLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    venue_id: {
      type: DataTypes.INTEGER, // 场馆ID
      allowNull: false
    },
    old_status: {
      type: DataTypes.ENUM('active', 'inactive'), // 变更前状态（启用/停用）
      allowNull: true
    },
    new_status: {
      type: DataTypes.ENUM('active', 'inactive'), // 变更后状态（启用/停用）
      allowNull: true
    },
    old_maintenance_status: {
      type: DataTypes.ENUM('normal', 'maintenance'), // 变更前维护状态
      allowNull: true
    },
    new_maintenance_status: {
      type: DataTypes.ENUM('normal', 'maintenance'), // 变更后维护状态
      allowNull: true
    },
    operator_id: {
      type: DataTypes.INTEGER, // 操作人ID（管理员ID）
      allowNull: false
    },
    operator_name: {
      type: DataTypes.STRING(100), // 操作人名称
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(200), // 变更原因
      allowNull: true
    },
    maintenance_message: {
      type: DataTypes.STRING(500), // 维护提示信息
      allowNull: true
    },
    maintenance_end_time: {
      type: DataTypes.DATE, // 预计恢复时间
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(50), // 操作人IP地址
      allowNull: true
    }
  }, {
    tableName: 'venue_status_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false  // 日志不需要更新时间
  });

  return VenueStatusLog;
};