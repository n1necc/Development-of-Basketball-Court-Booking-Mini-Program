/**
 * 管理员模型（Admin）
 * 对应数据库 admins 表，存储管理后台的管理员账号信息
 */
module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),  // 管理员用户名（唯一）
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255), // 加密后的密码（使用 bcrypt 哈希）
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('super', 'normal'), // 角色：super-超级管理员，normal-普通管理员
      defaultValue: 'normal'
    },
    permissions: {
      type: DataTypes.JSON,        // 权限列表（JSON 数组，如 ['all'] 或 ['venues', 'orders']）
      defaultValue: []
    }
  }, {
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Admin;
};
