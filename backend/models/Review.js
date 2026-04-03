/**
 * 评价模型（Review）
 * 对应数据库 reviews 表，存储用户对场馆的评价信息
 * 每个订单完成后可以提交一条评价
 */
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,     // 关联的订单 ID
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,     // 评价用户 ID
      allowNull: false
    },
    venue_id: {
      type: DataTypes.INTEGER,     // 评价的场馆 ID
      allowNull: false
    },
    rating: {
      type: DataTypes.TINYINT,     // 评分（1-5 星）
      allowNull: false,
      validate: {
        min: 1,                    // 最低 1 分
        max: 5                     // 最高 5 分
      }
    },
    content: {
      type: DataTypes.TEXT         // 评价文字内容
    }
  }, {
    tableName: 'reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Review;
};
