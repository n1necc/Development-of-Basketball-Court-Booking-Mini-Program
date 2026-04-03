/**
 * ============================================================================
 * 文件名：venues.js
 * 所属模块：后端路由（routes）
 * 文件用途：篮球场地相关的所有 API 接口
 * ============================================================================
 *
 * 这个文件是篮球场预订系统的"场地"模块，负责处理所有和场地相关的网络请求。
 *
 * 什么是路由（Route）？
 *   当用户在小程序/网页上点击"查看场地"、"搜索场地"等按钮时，前端会向后端
 *   发送一个网络请求（就像寄一封信）。路由就是后端的"收发室"，负责根据请求
 *   的地址（URL）把信件分发给对应的处理函数。
 *
 * 本文件包含以下 API 接口：
 *   1. GET /           - 获取场地列表（支持按地点、价格筛选和分页）
 *   2. GET /:id        - 获取某个场地的详细信息
 *   3. GET /:id/available - 查询某个场地在指定日期的可用时段
 *   4. GET /search/keyword - 按关键词搜索场地
 *   5. GET /hot/ranking    - 获取热门场馆排行榜
 *   6. PUT /:id/maintenance - 更新场地维护状态
 *   7. GET /:id/maintenance-logs - 获取场地维护状态变更日志
 *
 * 技术栈：Express.js（Web框架） + Sequelize（数据库操作工具）
 * ============================================================================
 */

/* 引入 Express 框架，它是 Node.js 中最流行的 Web 服务器框架，用来处理 HTTP 请求 */
const express = require('express');

/* 创建一个路由器实例，可以理解为一个"子服务器"，专门处理场地相关的请求 */
const router = express.Router();

/* 引入数据库配置，db 对象里包含了所有的数据表模型（Venue、Order 等） */
const db = require('../config/database');

/*
 * 引入 Sequelize 的 Op（操作符）对象
 * Op 提供了数据库查询中的各种条件操作，例如：
 *   Op.like  - 模糊匹配（类似于搜索"包含某个关键词"）
 *   Op.in    - 在某个列表中（类似于"是以下选项之一"）
 *   Op.or    - 或条件（满足任意一个条件即可）
 *   Op.between - 在某个范围之间
 */
const { Op } = require('sequelize');

/*
 * 引入用户认证中间件
 * 中间件就像一个"门卫"，在请求到达真正的处理函数之前，先检查用户是否已登录。
 * authUser 会验证请求中携带的登录凭证（token），确保只有登录用户才能访问。
 * authAdmin 会验证管理员权限，确保只有管理员才能访问管理功能。
 */
const { authUser, authAdmin } = require('../middleware/auth');

/**
 * @api {GET} /venues 获取场地列表
 * @description 获取所有状态为"active"（启用）且维护状态为"normal"（正常）的篮球场地列表。
 *   支持按地点模糊搜索、按价格区间筛选，并支持分页显示。
 *
 * @param {string}  [location] - 地点关键词（可选），用于模糊匹配场地位置
 * @param {number}  [minPrice] - 最低价格（可选），筛选最低价 >= 此值的场地
 * @param {number}  [maxPrice] - 最高价格（可选），筛选最低价 <= 此值的场地
 * @param {number}  [page=1]   - 页码（可选），默认第1页
 * @param {number}  [limit=10] - 每页数量（可选），默认每页10条
 *
 * @returns {object} 返回场地列表和总数，每个场地包含基本信息和最低价格
 *
 * 价格筛选的特殊逻辑：
 *   - 公益球场：minPrice=0 且 maxPrice=0 时，筛选免费场地
 *   - 总统球场：maxPrice>=9999 时，表示不设上限，只看最低价是否达标
 *   - 普通筛选：最低价在 [minPrice, maxPrice] 区间内
 */
router.get('/', async (req, res) => {
  try {
    /*
     * 从请求的查询参数（URL 中 ? 后面的部分）中提取筛选条件
     * 例如：/venues?location=朝阳&minPrice=50&page=2
     * 解构赋值语法：page = 1 表示如果没传 page 参数，默认值为 1
     */
    const { location, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    /*
     * 构建数据库查询条件对象
     * where 对象会被 Sequelize 翻译成 SQL 的 WHERE 子句
     * 初始条件：只查询状态为 'active'（启用）且维护状态为 'normal'（正常）的场地
     */
    const where = { 
      status: 'active',
      maintenance_status: 'normal'
    };

    /*
     * 如果用户传了 location 参数，添加地点模糊匹配条件
     * Op.like 配合 %关键词% 表示"包含该关键词"
     * 例如：location = '朝阳' 会匹配 '北京市朝阳区xxx' 等
     */
    if (location) {
      where.location = { [Op.like]: `%${location}%` };
    }

    /* 先从数据库查询所有符合基本条件（状态、地点）的场地 */
    const allVenues = await db.Venue.findAll({
      where,
      /*
       * include 表示"关联查询"，类似于 SQL 的 JOIN
       * 这里关联查询场地的价格表（VenuePrice），获取每个场地的所有价格
       * as: 'prices' 表示查询结果中用 prices 这个名字来引用关联数据
       * attributes: ['price'] 表示只取价格字段，不需要其他字段
       */
      include: [
        {
          model: db.VenuePrice,
          as: 'prices',
          attributes: ['price']
        }
      ],
      /* 按创建时间倒序排列，最新添加的场地排在前面 */
      order: [['created_at', 'DESC']]
    });

    /*
     * ========== 价格筛选逻辑 ==========
     * 为什么不在数据库查询时直接筛选价格？
     * 因为我们需要根据每个场地的"最低价格"来筛选，而最低价格需要在应用层计算。
     * 一个场地可能有多个时段、多个价格，我们取其中最低的那个来做比较。
     */
    let filteredVenues = allVenues;

    /* 只有当用户传了价格参数时才进行价格筛选 */
    if (minPrice !== undefined && minPrice !== '' || maxPrice !== undefined && maxPrice !== '') {
      filteredVenues = allVenues.filter(venue => {
        /* 如果该场地没有配置任何价格信息 */
        if (!venue.prices || venue.prices.length === 0) {
          /* 没有价格的场地视为免费公益球场，只有筛选免费场地时才会匹配 */
          return parseFloat(minPrice) === 0 && parseFloat(maxPrice) === 0;
        }

        /* 提取该场地所有时段的价格，并转换为数字类型 */
        const prices = venue.prices.map(p => parseFloat(p.price));

        /* 使用 Math.min 找出最低价格，作为该场地的代表价格 */
        const lowestPrice = Math.min(...prices);

        /* 公益球场筛选：最低价和最高价都为0，表示用户想找免费场地 */
        if (parseFloat(minPrice) === 0 && parseFloat(maxPrice) === 0) {
          return lowestPrice === 0;
        }

        /* 总统球场筛选：maxPrice >= 9999 表示不设价格上限，只要最低价达标即可 */
        if (parseFloat(maxPrice) >= 9999) {
          return lowestPrice >= parseFloat(minPrice);
        }

        /* 普通价格区间筛选：最低价必须在 [minPrice, maxPrice] 范围内 */
        return lowestPrice >= parseFloat(minPrice) && lowestPrice <= parseFloat(maxPrice);
      });
    }

    /*
     * ========== 分页逻辑 ==========
     * 分页的目的是避免一次性返回太多数据，提高加载速度
     */

    /* total 记录筛选后的场地总数，前端需要用它来计算总页数 */
    const total = filteredVenues.length;

    /*
     * 计算偏移量（从第几条数据开始取）
     * 例如：第2页，每页10条 → offset = (2-1) * 10 = 10，即跳过前10条
     */
    const offset = (parseInt(page) - 1) * parseInt(limit);

    /* 使用 slice 从数组中截取当前页的数据 */
    const pagedVenues = filteredVenues.slice(offset, offset + parseInt(limit));

    /* 返回成功响应 */
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: total,
        /*
         * 对每个场地数据进行格式化，只返回前端需要的字段
         * map 方法会遍历数组中的每一项，对其进行转换后返回新数组
         */
        list: pagedVenues.map(v => {
          /* 计算该场地的最低价格，用于在列表页展示 */
          let price = null;
          if (v.prices && v.prices.length > 0) {
            const prices = v.prices.map(p => parseFloat(p.price));
            price = Math.min(...prices);
          }

          return {
            id: v.id,
            name: v.name,
            location: v.location,
            description: v.description,
            images: v.images,
            facilities: v.facilities,
            price: price,
            maintenance_status: v.maintenance_status,
            maintenance_message: v.maintenance_message,
            maintenance_end_time: v.maintenance_end_time
          };
        })
      }
    });
  } catch (error) {
    /* 如果执行过程中出现任何错误，打印错误日志并返回500错误 */
    console.error('获取场地列表失败:', error);
    res.json({
      code: 500,
      msg: '获取场地列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /venues/system-status 获取系统状态（无需登录）
 * @description 获取当前系统运行状态（启用/维护模式）
 *   用于小程序端检查系统是否处于维护模式
 *
 * @access 无需登录
 *
 * @returns {object} 系统状态信息
 *   {
 *     "status": "active" | "maintenance",
 *     "message": "系统运行正常" | "系统维护中"
 *   }
 */
router.get('/system-status', async (req, res) => {
  try {
    // 查询系统状态设置
    const systemStatusSetting = await db.Setting.findOne({
      where: { key: 'system_status' }
    });

    // 如果没有设置过，默认为启用状态
    const status = systemStatusSetting ? systemStatusSetting.value : 'active';

    // 查询维护模式提示信息
    const messageSetting = await db.Setting.findOne({
      where: { key: 'maintenance_message' }
    });

    const message = messageSetting ? messageSetting.value :
      (status === 'active' ? '系统运行正常' : '系统维护中，请稍后再试');

    res.json({
      code: 200,
      msg: '成功',
      data: {
        status: status,
        message: message
      }
    });
  } catch (error) {
    console.error('获取系统状态失败:', error);
    res.json({
      code: 500,
      msg: '获取系统状态失败',
      data: null
    });
  }
});

/**
 * @api {GET} /venues/:id 获取场地详情
 * @description 根据场地 ID 获取某个篮球场的完整详细信息，
 *   包括场地基本信息、所有时段价格、以及用户评价。
 *   用户在列表页点击某个场地后，会调用此接口加载详情页。
 *
 * @param {number} id - 场地的唯一标识符（ID），通过 URL 路径传递，例如 /venues/3
 *
 * @returns {object} 返回场地完整信息，包含价格列表和最近20条用户评价
 */
router.get('/:id', async (req, res) => {
  try {
    /*
     * findByPk = Find By Primary Key（通过主键查找）
     * 主键（Primary Key）是数据库中每条记录的唯一标识，通常就是 id 字段
     * req.params.id 从 URL 路径中提取 id 参数，例如 /venues/3 中的 3
     */
    const venue = await db.Venue.findByPk(req.params.id, {
      /*
       * 关联查询：同时查出该场地的价格信息和用户评价
       * 这样只需要一次数据库请求就能拿到所有需要的数据
       */
      include: [
        {
          /* 关联场地价格表，获取所有时段的价格配置 */
          model: db.VenuePrice,
          as: 'prices'
        },
        {
          /* 关联评价表，获取用户对该场地的评价 */
          model: db.Review,
          as: 'reviews',
          include: [
            {
              /*
               * 评价中还需要嵌套关联用户表，获取评价者的昵称和头像
               * attributes 限制只取需要的字段，保护用户隐私
               */
              model: db.User,
              as: 'user',
              attributes: ['nickName', 'avatarUrl']
            }
          ],
          /* 评价按创建时间倒序排列，最新的评价排在前面 */
          order: [['created_at', 'DESC']],
          /* 最多只取20条评价，避免数据量过大 */
          limit: 20
        }
      ]
    });

    /* 如果数据库中找不到该场地（可能已被删除或ID不存在），返回404 */
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场地不存在',
        data: null
      });
    }

    /* 找到场地，返回完整的场地信息 */
    res.json({
      code: 200,
      msg: '成功',
      data: venue
    });
  } catch (error) {
    console.error('获取场地详情失败:', error);
    res.json({
      code: 500,
      msg: '获取场地详情失败',
      data: null
    });
  }
});

/**
 * @api {GET} /venues/:id/available 查询场地可用时段
 * @description 查询指定场地在某一天的所有时段及其状态（可预订/已预订/已锁定）。
 *   用户选择日期后，前端调用此接口展示当天的时间表，让用户选择要预订的时段。
 *   此接口无需登录即可访问，方便用户在未登录状态下浏览场馆可用性。
 *
 * @param {number} id   - 场地ID，通过 URL 路径传递
 * @param {string} date - 查询日期，格式为 'YYYY-MM-DD'，通过查询参数传递
 *
 * @returns {Array} 返回时段数组，每个时段包含：
 *   - start_time: 开始时间
 *   - end_time:   结束时间
 *   - price:      该时段价格
 *   - status:     状态（'available' 可预订 / 'booked' 已预订 / 'locked' 已锁定 / 'maintenance' 维护中）
 *   - reason:     锁定原因（仅当 status 为 'locked' 或 'maintenance' 时存在）
 */
router.get('/:id/available', async (req, res) => {
  try {
    /* 从查询参数中获取日期，从 URL 路径中获取场地ID */
    const { date } = req.query;
    const venueId = req.params.id;

    /* 参数校验：日期是必填项 */
    if (!date) {
      return res.json({
        code: 400,
        msg: '缺少日期参数',
        data: null
      });
    }

    /* 首先检查场地是否处于维护状态 */
    const venue = await db.Venue.findByPk(venueId);
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场地不存在',
        data: null
      });
    }

    /* 如果场地处于维护状态，返回维护中提示 */
    if (venue.maintenance_status === 'maintenance') {
      return res.json({
        code: 400,
        msg: venue.maintenance_message || '该场地正在维护中，暂不接受预订',
        data: {
          maintenance_status: 'maintenance',
          maintenance_message: venue.maintenance_message,
          maintenance_end_time: venue.maintenance_end_time
        }
      });
    }

    /* 从数据库获取该场地的所有价格配置（即所有可用时段及对应价格） */
    const prices = await db.VenuePrice.findAll({
      where: { venue_id: venueId }
    });

    /* 如果场地没有配置任何价格/时段，说明该场地还未设置好，无法预订 */
    if (prices.length === 0) {
      return res.json({
        code: 400,
        msg: '该场地未配置价格',
        data: null
      });
    }

    /*
     * ========== 判断日期类型（工作日 or 周末） ==========
     * 不同日期类型可能有不同的价格和时段配置
     * getDay() 返回 0-6，其中 0=周日，6=周六
     */
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    let dayType = 'weekday'; /* 默认为工作日 */
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayType = 'weekend'; /* 周六或周日为周末 */
    }

    /*
     * 获取该日期被管理员锁定的时段
     * 锁定时段是管理员手动设置的不可预订时间，例如场地维护、包场等
     */
    const locks = await db.VenueLock.findAll({
      where: {
        venue_id: venueId,
        lock_date: date
      }
    });

    /*
     * 获取该日期已有的订单（已支付或待支付的）
     * 这些时段已经被其他用户预订了，不能重复预订
     * Op.in 表示 order_status 的值必须是 ['paid', 'pending'] 中的一个
     */
    const orders = await db.Order.findAll({
      where: {
        venue_id: venueId,
        book_date: date,
        order_status: { [Op.in]: ['paid', 'pending'] }
      }
    });

    /*
     * ========== 生成时段列表 ==========
     * 遍历所有价格配置，根据日期类型筛选出当天适用的时段，
     * 然后逐一检查每个时段是否被锁定或已预订
     */
    const timeSlots = [];
    prices.forEach(price => {
      /*
       * 只取匹配当天日期类型的时段，或者节假日类型的时段
       * 例如：周末只显示 day_type 为 'weekend' 或 'holiday' 的时段
       */
      if (price.day_type === dayType || price.day_type === 'holiday') {
        /* 初始化时段信息，默认状态为"可预订" */
        const slot = {
          start_time: price.start_time,
          end_time: price.end_time,
          price: price.price,
          status: 'available' /* available=可预订, booked=已预订, locked=已锁定 */
        };

        /*
         * ========== 时间冲突检测：检查是否被锁定 ==========
         * 判断当前时段是否与任何一个锁定时段存在时间重叠。
         * 两个时间段重叠有三种情况：
         *   情况1：当前时段的开始时间落在锁定时段内
         *          锁定: |-------|
         *          当前:     |-------|
         *   情况2：当前时段的结束时间落在锁定时段内
         *          锁定:     |-------|
         *          当前: |-------|
         *   情况3：当前时段完全包含锁定时段
         *          锁定:   |---|
         *          当前: |---------|
         */
        const isLocked = locks.some(lock => {
          return (
            (price.start_time >= lock.start_time && price.start_time < lock.end_time) ||
            (price.end_time > lock.start_time && price.end_time <= lock.end_time) ||
            (price.start_time <= lock.start_time && price.end_time >= lock.end_time)
          );
        });

        if (isLocked) {
          slot.status = 'locked';
          /* 查找具体是哪个锁定记录导致的，获取锁定原因 */
          const lockInfo = locks.find(lock =>
            (price.start_time >= lock.start_time && price.start_time < lock.end_time)
          );
          /* 如果找到了锁定记录就用它的原因，否则显示默认原因"维护中" */
          slot.reason = lockInfo ? lockInfo.reason : '维护中';
        }

        /*
         * ========== 时间冲突检测：检查是否已预订 ==========
         * 逻辑与锁定检测完全相同，判断当前时段是否与已有订单存在时间重叠
         */
        const isBooked = orders.some(order => {
          return (
            (price.start_time >= order.start_time && price.start_time < order.end_time) ||
            (price.end_time > order.start_time && price.end_time <= order.end_time) ||
            (price.start_time <= order.start_time && price.end_time >= order.end_time)
          );
        });

        /*
         * 只有当时段当前状态仍为 'available' 时才标记为 'booked'
         * 如果已经被锁定了，锁定优先级更高，不会被覆盖为已预订
         */
        if (isBooked && slot.status === 'available') {
          slot.status = 'booked';
        }

        timeSlots.push(slot);
      }
    });

    /* 按开始时间升序排列，让时间表从早到晚显示 */
    timeSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    res.json({
      code: 200,
      msg: '成功',
      data: timeSlots
    });
  } catch (error) {
    console.error('查询可用时段失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.json({
      code: 500,
      msg: '查询可用时段失败: ' + error.message,
      data: null
    });
  }
});
/* PLACEHOLDER_REMAINING_ROUTES */

/**
 * @api {GET} /venues/search/keyword 按关键词搜索场地
 * @description 根据用户输入的关键词搜索篮球场地。
 *   会同时在场地名称和场地位置中进行模糊匹配。
 *   例如搜索"奥体"，会匹配名称含"奥体"或地址含"奥体"的所有场地。
 *
 * @param {string} keyword - 搜索关键词，通过查询参数传递
 *
 * @returns {Array} 返回匹配的场地列表，最多20条
 */
router.get('/search/keyword', async (req, res) => {
  try {
    /* 从查询参数中获取搜索关键词 */
    const { keyword } = req.query;

    /* 参数校验：关键词是必填项 */
    if (!keyword) {
      return res.json({
        code: 400,
        msg: '缺少搜索关键词',
        data: null
      });
    }

    /*
     * 在数据库中搜索场地
     * Op.or 表示满足任意一个条件即可（名称匹配 或 地址匹配）
     * Op.like 配合 %keyword% 实现模糊搜索（包含关键词即匹配）
     */
    const venues = await db.Venue.findAll({
      where: {
        status: 'active',
        maintenance_status: 'normal',
        [Op.or]: [
          { name: { [Op.like]: `%${keyword}%` } },
          { location: { [Op.like]: `%${keyword}%` } }
        ]
      },
      /* 限制最多返回20条结果，防止结果过多 */
      limit: 20
    });

    res.json({
      code: 200,
      msg: '成功',
      data: venues
    });
  } catch (error) {
    console.error('搜索场地失败:', error);
    res.json({
      code: 500,
      msg: '搜索场地失败',
      data: null
    });
  }
});

/**
 * @api {GET} /venues/hot/ranking 获取热门场馆排行榜
 * @description 根据最近30天内的预订次数，对所有场馆进行排名。
 *   预订次数越多的场馆排名越靠前。常用于首页的"热门推荐"模块。
 *
 * @param {number} [limit=2] - 返回的场馆数量（可选），默认返回前2个
 *
 * @returns {Array} 返回热门场馆列表，每个场馆包含基本信息、平均价格和预订次数
 */
router.get('/hot/ranking', async (req, res) => {
  try {
    /* 从查询参数获取需要返回的数量，默认为2 */
    const { limit = 2 } = req.query;

    /*
     * ========== 计算30天前的日期 ==========
     * 我们只统计最近30天的预订数据，这样排名更能反映近期的热度
     */
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); /* 当前日期减去30天 */
    const today = new Date();

    /*
     * 查询所有启用状态且维护状态正常的场地，同时关联查询它们的订单和价格
     * 这是一个比较复杂的关联查询，一次性获取排名所需的所有数据
     */
    const venues = await db.Venue.findAll({
      where: { 
        status: 'active',
        maintenance_status: 'normal'
      },
      /* 只查询需要的场地字段，减少数据传输量 */
      attributes: ['id', 'name', 'location', 'description', 'images', 'facilities'],
      include: [{
        /* 关联订单表，统计预订次数 */
        model: db.Order,
        as: 'orders',
        where: {
          /*
           * Op.between 表示"在...之间"
           * 只统计最近30天内的订单
           * toISOString().split('T')[0] 将日期对象转换为 'YYYY-MM-DD' 格式的字符串
           */
          book_date: {
            [Op.between]: [thirtyDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]]
          },
          /* 只统计已支付或已完成的订单（排除已取消的） */
          order_status: { [Op.in]: ['paid', 'completed'] }
        },
        /* 只需要订单的 id 字段，因为我们只关心订单数量 */
        attributes: ['id'],
        /*
         * required: false 表示"左连接"（LEFT JOIN）
         * 即使某个场地没有任何订单，也会被查出来（订单数为0）
         * 如果设为 true，没有订单的场地就会被过滤掉
         */
        required: false
      }, {
        /* 关联价格表，用于计算平均价格 */
        model: db.VenuePrice,
        as: 'prices',
        attributes: ['price']
      }]
    });

    /*
     * ========== 统计每个场地的预订次数并计算平均价格 ==========
     * 将数据库查询结果转换为前端需要的格式
     */
    const venuesWithCount = venues.map(venue => {
      /* 计算预订次数：关联的订单数组的长度就是预订次数 */
      const bookingCount = venue.orders ? venue.orders.length : 0;

      /*
       * 计算平均价格
       * reduce 方法用于累加所有价格，然后除以价格数量得到平均值
       * 如果没有价格数据，默认显示100元
       */
      const prices = venue.prices || [];
      const avgPrice = prices.length > 0
        ? prices.reduce((sum, p) => sum + parseFloat(p.price), 0) / prices.length
        : 100;

      return {
        id: venue.id,
        name: venue.name,
        location: venue.location,
        description: venue.description,
        images: venue.images,
        facilities: venue.facilities,
        price: Math.round(avgPrice), /* Math.round 四舍五入取整 */
        booking_count: bookingCount
      };
    });

    /*
     * 按预订次数从高到低排序，然后只取前 N 个（N = limit 参数）
     * sort 中 b - a 表示降序排列（数字大的排前面）
     * slice(0, N) 截取数组的前 N 个元素
     */
    const hotVenues = venuesWithCount
      .sort((a, b) => b.booking_count - a.booking_count)
      .slice(0, parseInt(limit));

    res.json({
      code: 200,
      msg: '成功',
      data: hotVenues
    });
  } catch (error) {
    console.error('获取热门场馆失败:', error);
    res.json({
      code: 500,
      msg: '获取热门场馆失败',
      data: null
    });
  }
});

/**
 * @api {GET} /venues/status 获取所有场馆状态
 * @description 获取所有场馆的当前状态，用于管理后台查看
 * @access 需要管理员权限
 *
 * @returns {Array} 返回场馆列表，每个场馆包含ID、名称、状态和维护状态
 */
router.get('/status', authUser, async (req, res) => {
  try {
    // 这里可以添加管理员权限验证
    
    const venues = await db.Venue.findAll({
      attributes: ['id', 'name', 'status', 'maintenance_status', 'maintenance_message', 'maintenance_end_time']
    });

    res.json({
      code: 200,
      msg: '成功',
      data: venues
    });
  } catch (error) {
    console.error('获取场馆状态失败:', error);
    res.json({
      code: 500,
      msg: '获取场馆状态失败',
      data: null
    });
  }
});

/**
 * @api {PUT} /venues/:id/status 更新场馆状态
 * @description 更新指定场馆的状态（启用/停用）
 * @access 需要管理员权限
 *
 * @param {number} id - 场馆ID，通过URL路径传递
 * @param {string} status - 新状态，可选值：active（启用）、inactive（停用）
 *
 * @returns {object} 返回更新后的场馆信息
 */
router.put('/:id/status', authUser, async (req, res) => {
  try {
    // 这里可以添加管理员权限验证
    
    const { id } = req.params;
    const { status } = req.body;

    // 参数验证
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.json({
        code: 400,
        msg: '状态参数无效，可选值：active、inactive',
        data: null
      });
    }

    // 查找场馆
    const venue = await db.Venue.findByPk(id);
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场馆不存在',
        data: null
      });
    }

    // 记录旧状态
    const oldStatus = venue.status;

    // 更新状态
    venue.status = status;
    await venue.save();

    // 记录状态变更日志
    await db.VenueStatusLog.create({
      venue_id: venue.id,
      old_status: oldStatus,
      new_status: status,
      operator_id: req.user.id,
      operator_name: req.user.nickName || '未知用户',
      reason: req.body.reason || '状态变更'
    });

    // 同时在控制台记录
    console.log(`场馆 ${venue.name} 状态变更：${oldStatus} → ${status}，操作人：${req.user.nickName || '未知用户'}`);

    res.json({
      code: 200,
      msg: '状态更新成功',
      data: {
        id: venue.id,
        name: venue.name,
        status: venue.status
      }
    });
  } catch (error) {
    console.error('更新场馆状态失败:', error);
    res.json({
      code: 500,
      msg: '更新场馆状态失败',
      data: null
    });
  }
});

/**
 * @api {PUT} /venues/:id/maintenance 更新场馆维护状态
 * @description 更新指定场馆的维护状态（正常可用/维护中不可预定）
 * @access 需要管理员权限
 *
 * @param {number} id - 场馆ID，通过URL路径传递
 * @param {string} maintenance_status - 新维护状态，可选值：normal（正常）、maintenance（维护中）
 * @param {string} [maintenance_message] - 维护提示信息（可选）
 * @param {string} [maintenance_end_time] - 预计恢复时间（可选，ISO 8601格式）
 * @param {string} [reason] - 变更原因（可选）
 *
 * @returns {object} 返回更新后的场馆信息
 */
router.put('/:id/maintenance', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      maintenance_status, 
      maintenance_message, 
      maintenance_end_time,
      reason 
    } = req.body;

    // 参数验证
    if (!maintenance_status || !['normal', 'maintenance'].includes(maintenance_status)) {
      return res.json({
        code: 400,
        msg: '维护状态参数无效，可选值：normal（正常）、maintenance（维护中）',
        data: null
      });
    }

    // 查找场馆
    const venue = await db.Venue.findByPk(id);
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场馆不存在',
        data: null
      });
    }

    // 记录旧状态
    const oldMaintenanceStatus = venue.maintenance_status;

    // 更新维护状态
    venue.maintenance_status = maintenance_status;
    
    // 如果设置为维护中，保存维护信息
    if (maintenance_status === 'maintenance') {
      if (maintenance_message) {
        venue.maintenance_message = maintenance_message;
      }
      if (maintenance_end_time) {
        venue.maintenance_end_time = new Date(maintenance_end_time);
      }
      venue.maintenance_start_time = new Date();
    } else {
      // 如果恢复为正常，清空维护信息
      venue.maintenance_message = null;
      venue.maintenance_start_time = null;
      venue.maintenance_end_time = null;
    }
    
    await venue.save();

    // 记录状态变更日志
    await db.VenueStatusLog.create({
      venue_id: venue.id,
      old_maintenance_status: oldMaintenanceStatus,
      new_maintenance_status: maintenance_status,
      operator_id: req.admin.id,
      operator_name: req.admin.username || '管理员',
      reason: reason || (maintenance_status === 'maintenance' ? '场地维护' : '维护完成'),
      maintenance_message: maintenance_message,
      maintenance_end_time: maintenance_end_time ? new Date(maintenance_end_time) : null,
      ip_address: req.ip || req.connection.remoteAddress
    });

    // 控制台记录
    console.log(`场馆 ${venue.name} 维护状态变更：${oldMaintenanceStatus} → ${maintenance_status}，操作人：${req.admin.username || '管理员'}`);

    res.json({
      code: 200,
      msg: maintenance_status === 'maintenance' ? '场地已设置为维护状态' : '场地已恢复为正常状态',
      data: {
        id: venue.id,
        name: venue.name,
        maintenance_status: venue.maintenance_status,
        maintenance_message: venue.maintenance_message,
        maintenance_start_time: venue.maintenance_start_time,
        maintenance_end_time: venue.maintenance_end_time
      }
    });
  } catch (error) {
    console.error('更新场馆维护状态失败:', error);
    res.json({
      code: 500,
      msg: '更新场馆维护状态失败: ' + (error.message || '未知错误'),
      data: null
    });
  }
});

/**
 * @api {GET} /venues/:id/maintenance-logs 获取场馆维护状态变更日志
 * @description 获取指定场馆的维护状态变更历史记录
 * @access 需要管理员权限
 *
 * @param {number} id - 场馆ID，通过URL路径传递
 * @param {number} [page=1] - 页码，默认第1页
 * @param {number} [limit=20] - 每页条数，默认20条
 *
 * @returns {object} 维护状态变更日志列表
 */
router.get('/:id/maintenance-logs', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 查询该场馆的维护状态变更日志
    const logs = await db.VenueStatusLog.findAndCountAll({
      where: { 
        venue_id: id,
        new_maintenance_status: { [Op.not]: null }  // 只查询维护状态变更的记录
      },
      order: [['created_at', 'DESC']],
      offset: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: logs.count,
        list: logs.rows
      }
    });
  } catch (error) {
    console.error('获取场馆维护状态日志失败:', error);
    res.json({
      code: 500,
      msg: '获取场馆维护状态日志失败',
      data: null
    });
  }
});

/*
 * 导出路由器模块
 * 这样在主应用文件（如 app.js）中就可以通过 require 引入并挂载到指定路径
 * 例如：app.use('/api/venues', require('./routes/venues'))
 * 这意味着本文件中所有的路由都会自动加上 /api/venues 前缀
 */
module.exports = router;