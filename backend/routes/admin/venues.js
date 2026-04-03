/**
 * ============================================================================
 * 文件名：venues.js
 * 所属模块：管理后台 - 篮球场地管理模块
 * 文件说明：
 *   这个文件负责管理后台中与"篮球场地"相关的所有操作，包括：
 *   1. 获取场地列表（支持分页和按状态筛选）
 *   2. 创建新场地
 *   3. 更新场地信息（名称、位置、图片、设施等）
 *   4. 删除场地
 *   5. 设置场地价格（不同时段、工作日/周末可以设不同价格）
 *   6. 锁定场地时段（比如场地维护时，暂时不让用户预订）
 *   7. 查看和删除场地锁定记录
 *   8. 上传场地图片
 *
 *   什么是"场地"？
 *   在这个篮球场预订系统中，"场地"就是一块可以打篮球的场地。
 *   管理员可以添加多个场地，每个场地有自己的名称、位置、图片、
 *   设施（如淋浴间、更衣室）和价格。用户可以在小程序端浏览并预订这些场地。
 *
 * 技术栈：Express.js 路由 + Sequelize ORM + Multer 文件上传
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * express —— Web 框架，用来创建服务器和处理网络请求
 */
const express = require('express');

/**
 * router —— 路由器，定义这个模块下所有的 API 接口路径
 */
const router = express.Router();

/**
 * db —— 数据库操作对象，包含所有数据表的模型（Model）
 * 比如 db.Venue（场地表）、db.VenuePrice（场地价格表）、db.VenueLock（场地锁定表）
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * "中间件"可以理解为"安检门"：每个请求在到达真正的处理代码之前，
 * 都要先经过这个"安检门"，验证请求者是否是已登录的管理员。
 * 如果验证失败，请求会被直接拦截，不会执行后面的代码。
 */
const { authAdmin } = require('../../middleware/auth');
/**
 * multer —— 文件上传中间件
 * 当用户（管理员）需要上传场地图片时，multer 负责接收和保存文件。
 * 它可以控制文件保存的位置、文件名格式、文件大小限制等。
 * 可以把它想象成一个"快递收件员"，专门负责接收上传的文件。
 */
const multer = require('multer');

/**
 * path —— Node.js 内置的路径处理工具
 * 用来处理文件路径和扩展名，比如从 "photo.jpg" 中提取出 ".jpg"
 */
const path = require('path');

// ==================== 文件上传配置 ====================

/**
 * 配置 multer 的文件存储方式
 * diskStorage 表示将上传的文件保存到服务器的硬盘上
 */
const storage = multer.diskStorage({
  /**
   * destination —— 设置文件保存的目标文件夹
   * 所有上传的场地图片都会保存到 'uploads/venues/' 目录下
   * cb 是回调函数（callback），第一个参数 null 表示没有错误
   */
  destination: (req, file, cb) => {
    cb(null, 'uploads/venues/');
  },
  /**
   * filename —— 设置保存的文件名
   * 为了避免不同用户上传同名文件导致覆盖，这里使用"时间戳+随机数"作为文件名
   * 例如：1698765432100-583947261.jpg
   * path.extname() 用来获取原始文件的扩展名（如 .jpg、.png）
   */
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * 创建 multer 上传实例，使用上面定义的存储配置
 */
const upload = multer({ storage });

// ==================== 路由定义 ====================

/**
 * @api {GET} /admin/venues 获取场地列表
 * @description 获取所有篮球场地的列表，支持分页和按状态筛选
 *   管理员打开"场地管理"页面时，前端会调用这个接口来加载场地数据。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} [page=1] - 页码，默认第1页（通过 URL 查询参数传入，如 ?page=2）
 * @param {number} [limit=10] - 每页显示条数，默认10条（如 ?limit=20）
 * @param {string} [status] - 场地状态筛选（如 'open' 营业中、'closed' 已关闭）
 *
 * @returns {object} 包含场地总数 total 和当前页的场地列表 list
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从 URL 查询参数中获取分页和筛选条件
    // 使用默认值：如果前端没传 page，就默认为第1页；没传 limit，就默认每页10条
    const { page = 1, limit = 10, status } = req.query;

    // 构建查询条件对象（where）
    // 如果前端传了 status 参数，就按状态筛选；否则查询所有场地
    const where = {};
    if (status) {
      where.status = status;
    }

    // 使用 Sequelize 的 findAndCountAll 方法查询数据库
    // 这个方法会同时返回：符合条件的总记录数（count）和当前页的数据（rows）
    const venues = await db.Venue.findAndCountAll({
      where,                              // 查询条件
      include: [
        {
          model: db.VenuePrice,           // 关联查询场地价格表
          as: 'prices'                    // 别名，查询结果中用 venue.prices 访问
        }
      ],
      offset: (page - 1) * limit,         // 跳过前面几条（实现分页）
      limit: parseInt(limit),             // 每页返回几条
      order: [['created_at', 'DESC']]     // 按创建时间倒序排列（最新的排在前面）
    });

    // 返回成功响应，包含总数和当前页数据
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: venues.count,    // 符合条件的场地总数（用于前端计算总页数）
        list: venues.rows       // 当前页的场地数据数组
      }
    });
  } catch (error) {
    console.error('获取场地列表失败:', error);
    res.json({
      code: 500,
      msg: '获取场地列表失败',
      data: null
    });
  }
});
/**
 * @api {POST} /admin/venues 创建新场地
 * @description 添加一个新的篮球场地到系统中
 *   管理员填写场地名称、位置等信息后，调用此接口创建场地。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} name - 场地名称（必填，如"阳光篮球馆A场"）
 * @param {string} location - 场地位置/地址（必填，如"XX市XX路XX号"）
 * @param {string} [description] - 场地描述（选填）
 * @param {Array} [images] - 场地图片URL数组（选填）
 * @param {Array} [facilities] - 场地设施列表（选填，如["淋浴间","更衣室","停车场"]）
 *
 * @returns {object} 创建成功的场地信息
 */
router.post('/', authAdmin, async (req, res) => {
  try {
    // 从请求体中解构出场地信息
    const { name, location, description, images, facilities } = req.body;

    // 【校验】场地名称和位置是必填项
    if (!name || !location) {
      return res.json({
        code: 400,
        msg: '场地名称和位置不能为空',
        data: null
      });
    }

    // 调用 Sequelize 的 create 方法在数据库中创建一条新的场地记录
    // 如果 description、images、facilities 没有传值，则使用默认值
    const venue = await db.Venue.create({
      name,
      location,
      description: description || '',      // 没传描述就设为空字符串
      images: images || [],                 // 没传图片就设为空数组
      facilities: facilities || []          // 没传设施就设为空数组
    });

    res.json({
      code: 200,
      msg: '场地创建成功',
      data: venue       // 返回刚创建的场地信息（包含自动生成的 id）
    });
  } catch (error) {
    console.error('创建场地失败:', error);
    res.json({
      code: 500,
      msg: '创建场地失败',
      data: null
    });
  }
});

/**
 * @api {PUT} /admin/venues/:id 更新场地信息
 * @description 修改已有场地的信息（名称、位置、图片、设施、状态等）
 *   管理员在编辑场地页面修改信息后，调用此接口保存更改。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 场地ID（通过 URL 路径参数传入，如 /admin/venues/5）
 * @param {string} [name] - 场地名称（选填，只传需要修改的字段）
 * @param {string} [location] - 场地位置
 * @param {string} [description] - 场地描述
 * @param {Array} [images] - 场地图片
 * @param {Array} [facilities] - 场地设施
 * @param {string} [status] - 场地状态（如 'open' 或 'closed'）
 *
 * @returns {object} 更新后的场地信息
 */
router.put('/:id', authAdmin, async (req, res) => {
  try {
    // 根据 URL 中的 id 参数查找场地
    // findByPk = find by Primary Key（通过主键查找）
    const venue = await db.Venue.findByPk(req.params.id);

    // 如果找不到对应的场地，返回 404 错误
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场地不存在',
        data: null
      });
    }

    // 从请求体中获取要更新的字段
    const { name, location, description, images, facilities, status } = req.body;

    // 【逐字段更新】只更新前端传过来的字段，没传的保持原值不变
    // 这种写法叫"部分更新"（Partial Update），比全量更新更灵活
    if (name) venue.name = name;
    if (location) venue.location = location;
    if (description !== undefined) venue.description = description;  // 注意：description 可以设为空字符串，所以用 !== undefined 判断
    if (images) venue.images = images;
    if (facilities) venue.facilities = facilities;
    if (status) venue.status = status;

    // 将修改保存到数据库
    await venue.save();

    res.json({
      code: 200,
      msg: '场地更新成功',
      data: venue
    });
  } catch (error) {
    console.error('更新场地失败:', error);
    res.json({
      code: 500,
      msg: '更新场地失败',
      data: null
    });
  }
});
/**
 * @api {DELETE} /admin/venues/:id 删除场地
 * @description 从系统中删除一个篮球场地
 *   注意：删除操作是不可逆的！删除后该场地的所有数据都会丢失。
 *   实际项目中通常建议使用"软删除"（只标记为已删除，不真正删除数据），
 *   但这里使用的是"硬删除"（真正从数据库中移除）。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 要删除的场地ID（通过 URL 路径参数传入）
 *
 * @returns {object} 删除成功或失败的提示信息
 */
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    // 先查找场地是否存在
    const venue = await db.Venue.findByPk(req.params.id);
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场地不存在',
        data: null
      });
    }

    // destroy() 方法会从数据库中删除这条记录
    await venue.destroy();

    res.json({
      code: 200,
      msg: '场地删除成功',
      data: null
    });
  } catch (error) {
    console.error('删除场地失败:', error);
    res.json({
      code: 500,
      msg: '删除场地失败',
      data: null
    });
  }
});

/**
 * @api {POST} /admin/venues/:id/prices 设置场地价格
 * @description 为指定场地设置价格规则
 *   篮球场的价格通常不是固定的，可能：
 *   - 工作日和周末价格不同
 *   - 白天和晚上价格不同（晚上有灯光费，通常更贵）
 *   所以需要按"日期类型 + 时间段"来设置不同的价格。
 *
 *   这个接口采用"先删后增"的策略：先删除该场地的所有旧价格，再批量创建新价格。
 *   这样可以确保价格数据始终是最新的，不会出现新旧混杂的情况。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 场地ID（通过 URL 路径参数传入）
 * @param {Array} prices - 价格规则数组，每个元素包含：
 *   @param {string} prices[].day_type - 日期类型（如 'weekday' 工作日、'weekend' 周末）
 *   @param {string} prices[].start_time - 开始时间（如 '08:00'）
 *   @param {string} prices[].end_time - 结束时间（如 '12:00'）
 *   @param {number} prices[].price - 价格（单位：元）
 *
 * @returns {object} 新创建的价格规则列表
 */
router.post('/:id/prices', authAdmin, async (req, res) => {
  try {
    // 从请求体中获取价格数组
    const { prices } = req.body;

    // 【校验】确保 prices 是一个数组
    if (!Array.isArray(prices)) {
      return res.json({
        code: 400,
        msg: '价格数据格式错误',
        data: null
      });
    }

    // 先确认场地存在
    const venue = await db.Venue.findByPk(req.params.id);
    if (!venue) {
      return res.json({
        code: 404,
        msg: '场地不存在',
        data: null
      });
    }

    // 【第一步】删除该场地的所有旧价格记录
    // 这是"先删后增"策略的第一步
    await db.VenuePrice.destroy({ where: { venue_id: req.params.id } });

    // 【第二步】批量创建新的价格记录
    // Promise.all 可以同时执行多个异步操作（并行创建多条价格记录），提高效率
    // prices.map 会遍历价格数组，为每个价格规则创建一条数据库记录
    const newPrices = await Promise.all(
      prices.map(p => db.VenuePrice.create({
        venue_id: req.params.id,    // 关联到当前场地
        day_type: p.day_type,       // 日期类型
        start_time: p.start_time,   // 开始时间
        end_time: p.end_time,       // 结束时间
        price: p.price              // 价格
      }))
    );

    res.json({
      code: 200,
      msg: '价格设置成功',
      data: newPrices
    });
  } catch (error) {
    console.error('设置价格失败:', error);
    res.json({
      code: 500,
      msg: '设置价格失败',
      data: null
    });
  }
});
/**
 * @api {POST} /admin/venues/:id/locks 锁定场地时段
 * @description 锁定指定场地的某个时间段，使其不可被用户预订
 *   使用场景举例：
 *   - 场地需要维修保养
 *   - 有包场活动或比赛
 *   - 天气原因（如室外场地下雨）
 *   锁定后，用户在小程序端将无法预订该时段。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 场地ID（通过 URL 路径参数传入）
 * @param {string} lock_date - 锁定日期（如 '2024-03-15'）
 * @param {string} start_time - 锁定开始时间（如 '08:00'）
 * @param {string} end_time - 锁定结束时间（如 '12:00'）
 * @param {string} [reason] - 锁定原因（选填，默认为"维护中"）
 *
 * @returns {object} 创建的锁定记录
 */
router.post('/:id/locks', authAdmin, async (req, res) => {
  try {
    // 从请求体中获取锁定信息
    const { lock_date, start_time, end_time, reason } = req.body;

    // 【校验】日期和时间段是必填的
    if (!lock_date || !start_time || !end_time) {
      return res.json({
        code: 400,
        msg: '参数不完整',
        data: null
      });
    }

    // 在数据库中创建一条锁定记录
    const lock = await db.VenueLock.create({
      venue_id: req.params.id,              // 关联到哪个场地
      lock_date,                            // 锁定哪一天
      start_time,                           // 从几点开始锁定
      end_time,                             // 到几点结束锁定
      reason: reason || '维护中',            // 锁定原因，默认"维护中"
      created_by: req.admin.id              // 记录是哪个管理员操作的
    });

    res.json({
      code: 200,
      msg: '锁定成功',
      data: lock
    });
  } catch (error) {
    console.error('锁定场地失败:', error);
    res.json({
      code: 500,
      msg: '锁定场地失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/venues/:id/locks 获取场地锁定列表
 * @description 查看指定场地的所有锁定记录
 *   管理员可以通过这个接口查看某个场地当前有哪些时段被锁定了。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 场地ID（通过 URL 路径参数传入）
 *
 * @returns {Array} 该场地的所有锁定记录列表
 */
router.get('/:id/locks', authAdmin, async (req, res) => {
  try {
    // 查询该场地的所有锁定记录
    // 按锁定日期倒序（最近的日期在前），同一天内按开始时间正序排列
    const locks = await db.VenueLock.findAll({
      where: { venue_id: req.params.id },
      order: [['lock_date', 'DESC'], ['start_time', 'ASC']]
    });

    res.json({
      code: 200,
      msg: '成功',
      data: locks
    });
  } catch (error) {
    console.error('获取锁定列表失败:', error);
    res.json({
      code: 500,
      msg: '获取锁定列表失败',
      data: null
    });
  }
});

/**
 * @api {DELETE} /admin/venues/:id/locks/:lockId 删除锁定记录（解锁）
 * @description 删除一条场地锁定记录，相当于"解锁"该时段
 *   解锁后，用户就可以重新预订这个时段了。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} id - 场地ID（通过 URL 路径参数传入）
 * @param {number} lockId - 锁定记录ID（通过 URL 路径参数传入）
 *
 * @returns {object} 解锁成功或失败的提示信息
 */
router.delete('/:id/locks/:lockId', authAdmin, async (req, res) => {
  try {
    // 根据锁定记录ID查找
    const lock = await db.VenueLock.findByPk(req.params.lockId);
    if (!lock) {
      return res.json({
        code: 404,
        msg: '锁定记录不存在',
        data: null
      });
    }

    // 删除锁定记录，即"解锁"
    await lock.destroy();

    res.json({
      code: 200,
      msg: '解锁成功',
      data: null
    });
  } catch (error) {
    console.error('解锁失败:', error);
    res.json({
      code: 500,
      msg: '解锁失败',
      data: null
    });
  }
});

/**
 * @api {POST} /admin/venues/upload 上传场地图片
 * @description 上传一张场地图片到服务器
 *   管理员在创建或编辑场地时，可以上传场地的实拍照片。
 *   图片会被保存到服务器的 uploads/venues/ 目录下，
 *   接口返回图片的访问 URL，前端可以用这个 URL 来显示图片。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {File} image - 图片文件（通过 FormData 的 'image' 字段上传）
 *   upload.single('image') 表示只接收一个名为 'image' 的文件
 *
 * @returns {object} 包含图片访问 URL 的对象，如 { url: '/uploads/venues/xxx.jpg' }
 */
router.post('/upload', authAdmin, upload.single('image'), (req, res) => {
  try {
    // 检查是否成功接收到文件
    // 如果前端没有选择文件就提交了，req.file 会是 undefined
    if (!req.file) {
      return res.json({
        code: 400,
        msg: '未上传文件',
        data: null
      });
    }

    // 拼接图片的访问 URL
    // req.file.filename 是 multer 生成的唯一文件名（如 1698765432100-583947261.jpg）
    const imageUrl = '/uploads/venues/' + req.file.filename;

    res.json({
      code: 200,
      msg: '上传成功',
      data: { url: imageUrl }   // 返回图片 URL，前端可以直接用来显示图片
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.json({
      code: 500,
      msg: '上传图片失败',
      data: null
    });
  }
});

// 将路由器导出，供主程序（app.js）挂载使用
module.exports = router;
