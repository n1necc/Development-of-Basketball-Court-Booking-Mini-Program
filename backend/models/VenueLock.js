/**
 * 场馆锁定模型（VenueLock）
 * 对应数据库 venue_locks 表，用于管理员锁定场馆的某个时段
 * 被锁定的时段用户无法预约（如场馆维护、包场等情况）
 */
module.exports = (sequelize, DataTypes) => {
  const VenueLock = sequelize.define('VenueLock', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    venue_id: {
      type: DataTypes.INTEGER,     // 被锁定的场馆 ID
      allowNull: false
    },
    lock_date: {
      type: DataTypes.DATEONLY,    // 锁定日期（如 "2024-03-15"）
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,        // 锁定开始时间
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,        // 锁定结束时间
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(200)  // 锁定原因（如 "场馆维护"）
    },
    created_by: {
      type: DataTypes.INTEGER      // 操作管理员 ID
    }
  }, {
    tableName: 'venue_locks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VenueLock;
};
