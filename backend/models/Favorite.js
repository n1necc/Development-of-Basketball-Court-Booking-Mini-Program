/**
 * 收藏模型（Favorite）
 * 对应数据库 favorites 表，存储用户收藏的场馆记录
 * 同一用户对同一场馆只能收藏一次（通过联合唯一索引保证）
 */
module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define('Favorite', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,     // 收藏的用户 ID
      allowNull: false
    },
    venue_id: {
      type: DataTypes.INTEGER,     // 被收藏的场馆 ID
      allowNull: false
    }
  }, {
    tableName: 'favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,              // 联合唯一索引：同一用户不能重复收藏同一场馆
        fields: ['user_id', 'venue_id']
      }
    ]
  });

  return Favorite;
};
