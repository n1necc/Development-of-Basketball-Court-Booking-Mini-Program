/**
 * 公告模型（Announcement）
 * 对应数据库 announcements 表，存储系统公告信息
 */
module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200), // 公告标题
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,        // 公告正文内容
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('published', 'draft'), // 状态：published-已发布，draft-草稿
      defaultValue: 'published'
    },
    sort_order: {
      type: DataTypes.INTEGER,     // 排序权重，数字越大越靠前
      defaultValue: 0
    }
  }, {
    tableName: 'announcements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Announcement;
};
