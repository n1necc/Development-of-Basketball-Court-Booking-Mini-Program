/**
 * 系统状态变更日志模型（SystemStatusLog）
 * 对应数据库 system_status_logs 表，存储系统状态（启用/维护模式）变更的记录
 */
module.exports = (sequelize, DataTypes) => {
  const SystemStatusLog = sequelize.define('SystemStatusLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    old_status: {
      type: DataTypes.ENUM('active', 'maintenance'), // 变更前状态：active-启用，maintenance-维护
      allowNull: false
    },
    new_status: {
      type: DataTypes.ENUM('active', 'maintenance'), // 变更后状态：active-启用，maintenance-维护
      allowNull: false
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
    ip_address: {
      type: DataTypes.STRING(50), // 操作人IP地址
      allowNull: true
    }
  }, {
    tableName: 'system_status_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false  // 不需要 updated_at，因为日志记录创建后不会修改
  });

  return SystemStatusLog;
};