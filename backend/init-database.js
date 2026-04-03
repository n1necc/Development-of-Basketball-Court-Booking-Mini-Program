/**
 * 数据库初始化脚本
 * 首次运行时创建数据库表、插入默认管理员账号、系统设置和示例数据
 * 使用方式：node init-database.js
 */

const bcrypt = require('bcryptjs');        // 密码加密库，用于对管理员密码进行哈希处理
const db = require('./config/database');   // 数据库配置和模型

/**
 * 初始化数据库的主函数
 * 按顺序执行：建表 → 创建管理员 → 创建系统设置 → 创建示例数据
 */
async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    // 同步所有模型到数据库（根据模型定义自动创建表）
    // force: false 表示如果表已存在则不会删除重建
    await db.sequelize.sync({ force: false });
    console.log('✓ 数据库表创建成功');

    // ========== 创建默认管理员 ==========
    const adminCount = await db.Admin.count(); // 检查是否已有管理员

    if (adminCount === 0) {
      // 没有管理员，创建一个默认的超级管理员
      const hashedPassword = await bcrypt.hash('admin123', 10); // 对密码进行哈希加密，10 是加密轮数
      await db.Admin.create({
        username: 'admin',                      // 默认用户名
        password: hashedPassword,               // 加密后的密码
        role: 'super',                          // 角色：超级管理员
        permissions: JSON.stringify(['all'])     // 权限：所有权限
      });
      console.log('✓ 默认管理员创建成功');
      console.log('  用户名: admin');
      console.log('  密码: admin123');
    } else {
      console.log('✓ 管理员已存在，跳过创建');
    }

    // ========== 创建默认系统设置 ==========
    const settingsCount = await db.Setting.count();
    if (settingsCount === 0) {
      await db.Setting.bulkCreate([
        {
          key: 'max_booking_days',        // 设置项的键名
          value: '7',                     // 设置项的值
          description: '最多提前预约天数'  // 设置项的说明
        },
        {
          key: 'cancel_deadline',
          value: '2',
          description: '最晚取消时间（开场前小时数）'
        }
      ]);
      console.log('✓ 默认系统设置创建成功');
    }

    // ========== 创建示例场地 ==========
    const venueCount = await db.Venue.count();
    if (venueCount === 0) {
      // 创建一个示例篮球场
      const venue = await db.Venue.create({
        name: '示例篮球场A',
        location: '北京市朝阳区',
        description: '标准室内篮球场，配备专业灯光和空调',
        images: ['https://picsum.photos/800/600?random=1'],  // 场馆图片列表
        facilities: ['灯光', '空调', '淋浴', '停车场'],       // 场馆设施列表
        status: 'active'                                      // 状态：启用
      });

      // 为示例场地创建不同时段的价格
      // 分为工作日（weekday）和周末（weekend），每天分三个时段
      await db.VenuePrice.bulkCreate([
        // 工作日价格
        { venue_id: venue.id, day_type: 'weekday', start_time: '08:00', end_time: '12:00', price: 100 },  // 上午
        { venue_id: venue.id, day_type: 'weekday', start_time: '12:00', end_time: '18:00', price: 150 },  // 下午
        { venue_id: venue.id, day_type: 'weekday', start_time: '18:00', end_time: '22:00', price: 200 },  // 晚上
        // 周末价格（比工作日贵）
        { venue_id: venue.id, day_type: 'weekend', start_time: '08:00', end_time: '12:00', price: 150 },
        { venue_id: venue.id, day_type: 'weekend', start_time: '12:00', end_time: '18:00', price: 200 },
        { venue_id: venue.id, day_type: 'weekend', start_time: '18:00', end_time: '22:00', price: 250 }
      ]);

      console.log('✓ 示例场地和价格创建成功');
    }

    // ========== 创建示例资讯 ==========
    const newsCount = await db.News.count();
    if (newsCount === 0) {
      await db.News.bulkCreate([
        {
          title: 'NBA季后赛精彩瞬间回顾',
          summary: '回顾本赛季最激动人心的比赛时刻',
          content: 'NBA季后赛进入白热化阶段，各支球队展现出顶级竞技水平...',
          image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
          status: 'published',   // 状态：已发布
          sort_order: 3          // 排序权重，数字越大越靠前
        },
        {
          title: '篮球训练技巧：提高投篮命中率',
          summary: '专业教练分享实用训练方法',
          content: '专业篮球教练分享如何通过科学训练提高投篮命中率的技巧...',
          image: 'https://images.unsplash.com/photo-1574907060871-4555aa8aca75?w=800',
          status: 'published',
          sort_order: 2
        },
        {
          title: '篮球装备选购指南',
          summary: '如何选择适合自己的篮球鞋和装备',
          content: '选择合适的篮球装备对提升运动表现至关重要...',
          image: 'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=800',
          status: 'published',
          sort_order: 1
        }
      ]);
      console.log('✓ 示例资讯创建成功');
    }

    // ========== 创建示例公告 ==========
    const announcementCount = await db.Announcement.count();
    if (announcementCount === 0) {
      await db.Announcement.bulkCreate([
        {
          title: '春节期间场馆开放时间调整通知',
          content: '春节期间（2月10日-2月17日）各场馆营业时间调整为9:00-21:00，请提前预约。',
          status: 'published',
          sort_order: 3
        },
        {
          title: '新增会员优惠活动',
          content: '即日起，注册会员可享受首次预订8折优惠，充值满500元送100元。',
          status: 'published',
          sort_order: 2
        },
        {
          title: '场馆设施升级公告',
          content: '市体育中心篮球馆已完成地板更换和灯光升级，欢迎体验。',
          status: 'published',
          sort_order: 1
        }
      ]);
      console.log('✓ 示例公告创建成功');
    }

    // 初始化完成，打印后续操作提示
    console.log('\n数据库初始化完成！');
    console.log('\n下一步：');
    console.log('1. 启动后端服务: npm start');
    console.log('2. 访问管理后台: admin/login.html');
    console.log('3. 使用 admin/admin123 登录');

    process.exit(0); // 正常退出
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1); // 异常退出
  }
}

// 执行初始化
initDatabase();
