/**
 * 资讯模型（News）
 * 对应数据库 news 表，存储篮球相关的资讯文章
 */
module.exports = (sequelize, DataTypes) => {
  const News = sequelize.define('News', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200), // 资讯标题
      allowNull: false
    },
    summary: {
      type: DataTypes.STRING(500), // 资讯摘要（列表页显示）
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT         // 资讯正文内容
    },
    image: {
      type: DataTypes.STRING(500)  // 封面图片 URL
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
    tableName: 'news',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return News;
};
