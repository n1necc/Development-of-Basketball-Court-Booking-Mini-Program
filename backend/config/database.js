/**
 * 数据库配置文件
 * 负责创建 Sequelize 数据库连接实例、导入所有数据模型、定义模型之间的关联关系
 */

require('dotenv').config(); // 加载 .env 环境变量
const { Sequelize } = require('sequelize'); // Sequelize ORM 框架

// 创建 Sequelize 数据库连接实例
const sequelize = new Sequelize(
  process.env.DB_NAME,     // 数据库名称
  process.env.DB_USER,     // 数据库用户名
  process.env.DB_PASSWORD, // 数据库密码
  {
    host: process.env.DB_HOST,       // 数据库主机地址
    port: process.env.DB_PORT || 3306, // 数据库端口，默认 3306
    dialect: 'mysql',                // 数据库类型：MySQL
    logging: false,                  // 关闭 SQL 日志输出（设为 console.log 可开启）
    timezone: '+08:00',              // 时区设置为东八区（北京时间）
    pool: {                          // 连接池配置
      max: 5,                        // 最大连接数
      min: 0,                        // 最小连接数
      acquire: 30000,                // 获取连接的最大等待时间（毫秒）
      idle: 10000                    // 连接空闲多久后释放（毫秒）
    }
  }
);

// 创建数据库对象，用于存放所有模型和 Sequelize 实例
const db = {};
db.Sequelize = Sequelize;   // 存放 Sequelize 类（用于访问数据类型等）
db.sequelize = sequelize;   // 存放数据库连接实例

// ========== 导入所有数据模型 ==========
db.User = require('../models/User')(sequelize, Sequelize);                 // 用户模型
db.Venue = require('../models/Venue')(sequelize, Sequelize);               // 场馆模型
db.VenuePrice = require('../models/VenuePrice')(sequelize, Sequelize);     // 场馆价格模型
db.VenueLock = require('../models/VenueLock')(sequelize, Sequelize);       // 场馆锁定模型
db.Order = require('../models/Order')(sequelize, Sequelize);               // 订单模型
db.Review = require('../models/Review')(sequelize, Sequelize);             // 评价模型
db.Favorite = require('../models/Favorite')(sequelize, Sequelize);         // 收藏模型
db.Admin = require('../models/Admin')(sequelize, Sequelize);               // 管理员模型
db.Setting = require('../models/Setting')(sequelize, Sequelize);           // 系统设置模型
db.News = require('../models/News')(sequelize, Sequelize);                 // 资讯模型
db.Announcement = require('../models/Announcement')(sequelize, Sequelize); // 公告模型
db.VenueStatusLog = require('../models/VenueStatusLog')(sequelize, Sequelize); // 场馆状态变更日志模型
db.SystemStatusLog = require('../models/SystemStatusLog')(sequelize, Sequelize); // 系统状态变更日志模型

// ========== 定义模型之间的关联关系 ==========

// 场馆 与 场馆价格：一对多（一个场馆有多个时段价格）
db.Venue.hasMany(db.VenuePrice, { foreignKey: 'venue_id', as: 'prices' });
db.VenuePrice.belongsTo(db.Venue, { foreignKey: 'venue_id' });

// 场馆 与 场馆锁定：一对多（一个场馆可以锁定多个时段）
db.Venue.hasMany(db.VenueLock, { foreignKey: 'venue_id', as: 'locks' });
db.VenueLock.belongsTo(db.Venue, { foreignKey: 'venue_id' });

// 用户 与 订单：一对多（一个用户可以有多个订单）
db.User.hasMany(db.Order, { foreignKey: 'user_id', as: 'orders' });
db.Order.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// 场馆 与 订单：一对多（一个场馆可以有多个订单）
db.Venue.hasMany(db.Order, { foreignKey: 'venue_id', as: 'orders' });
db.Order.belongsTo(db.Venue, { foreignKey: 'venue_id', as: 'venue' });

// 用户 与 评价：一对多（一个用户可以发表多条评价）
db.User.hasMany(db.Review, { foreignKey: 'user_id', as: 'reviews' });
db.Review.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// 场馆 与 评价：一对多（一个场馆可以有多条评价）
db.Venue.hasMany(db.Review, { foreignKey: 'venue_id', as: 'reviews' });
db.Review.belongsTo(db.Venue, { foreignKey: 'venue_id' });

// 订单 与 评价：一对一（一个订单只能有一条评价）
db.Order.hasOne(db.Review, { foreignKey: 'order_id', as: 'review' });
db.Review.belongsTo(db.Order, { foreignKey: 'order_id' });

// 用户 与 收藏：一对多（一个用户可以收藏多个场馆）
db.User.hasMany(db.Favorite, { foreignKey: 'user_id', as: 'favorites' });
db.Favorite.belongsTo(db.User, { foreignKey: 'user_id' });

// 场馆 与 收藏：一对多（一个场馆可以被多个用户收藏）
db.Venue.hasMany(db.Favorite, { foreignKey: 'venue_id', as: 'favorites' });
db.Favorite.belongsTo(db.Venue, { foreignKey: 'venue_id', as: 'venue' });

// 场馆 与 场馆状态变更日志：一对多（一个场馆有多个状态变更记录）
db.Venue.hasMany(db.VenueStatusLog, { foreignKey: 'venue_id', as: 'statusLogs' });
db.VenueStatusLog.belongsTo(db.Venue, { foreignKey: 'venue_id' });

// 注意：operator_id 可能关联 users 表或 admins 表，所以不设置外键约束
// 日志记录中通过 operator_name 字段记录操作人姓名，用于显示

module.exports = db;
