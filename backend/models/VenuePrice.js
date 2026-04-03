/**
 * 场馆价格模型（VenuePrice）
 * 对应数据库 venue_prices 表，存储场馆不同时段的价格
 * 每个场馆可以设置多个时段价格，按日期类型（工作日/周末/节假日）区分
 */
module.exports = (sequelize, DataTypes) => {
  const VenuePrice = sequelize.define('VenuePrice', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    venue_id: {
      type: DataTypes.INTEGER,     // 所属场馆 ID，关联 venues 表
      allowNull: false
    },
    day_type: {
      // 日期类型：weekday-工作日，weekend-周末，holiday-节假日
      type: DataTypes.ENUM('weekday', 'weekend', 'holiday'),
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,        // 时段开始时间（如 "08:00"）
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,        // 时段结束时间（如 "12:00"）
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), // 该时段的价格（元）
      allowNull: false
    }
  }, {
    tableName: 'venue_prices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VenuePrice;
};
