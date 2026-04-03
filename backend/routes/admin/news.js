/**
 * ============================================================================
 * 文件名：news.js
 * 所属模块：管理员后台 - 资讯管理路由
 * 文件说明：
 *   这个文件负责处理"篮球资讯"相关的管理功能。
 *   管理员可以通过这里提供的接口（API）来：
 *     1. 查看所有资讯的列表（支持分页和按状态筛选）
 *     2. 创建（发布）一条新的资讯
 *     3. 修改已有的资讯内容
 *     4. 删除不需要的资讯
 *
 *   这就是常说的"增删改查"（CRUD）操作。
 *   所有接口都需要管理员身份验证（authAdmin 中间件），普通用户无法访问。
 *
 * 技术栈：Express.js 路由 + Sequelize ORM 数据库操作
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * express —— Node.js 最流行的 Web 框架，用来创建服务器和处理网络请求
 * 可以把它想象成一个"快递分拣中心"，负责把不同的请求分发到对应的处理函数
 */
const express = require('express');

/**
 * router —— Express 的路由器对象
 * 路由器就像一个"子分拣台"，专门处理某一类请求（这里是资讯相关的请求）
 * 最终会被挂载到主应用上，比如挂载到 /admin/news 路径下
 */
const router = express.Router();

/**
 * db —— 数据库连接和模型对象
 * 通过它可以访问数据库中的各种表（比如 db.News 就是资讯表）
 * Sequelize 是一个 ORM（对象关系映射）工具，让我们用 JavaScript 对象的方式操作数据库，
 * 而不需要手写 SQL 语句
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * "中间件"可以理解为"门卫"，在请求到达真正的处理函数之前，先检查一下：
 *   - 这个请求是否携带了有效的登录凭证（token）？
 *   - 这个用户是否是管理员？
 * 如果不是管理员，请求会被直接拒绝，不会执行后面的代码
 */
const { authAdmin } = require('../../middleware/auth');
// ==================== 路由定义 ====================

/**
 * @route   GET /admin/news
 * @desc    获取资讯列表（支持分页和状态筛选）
 * @access  仅管理员可访问（需要 authAdmin 中间件验证）
 *
 * 查询参数（Query Parameters，就是网址 ? 后面的部分）：
 *   @param {number} [page=1]    - 页码，默认第 1 页（用于分页显示，比如第1页、第2页...）
 *   @param {number} [limit=10]  - 每页显示多少条，默认 10 条
 *   @param {string} [status]    - 资讯状态筛选，比如 'published'（已发布）或 'draft'（草稿）
 *
 * 返回数据格式：
 *   {
 *     code: 200,          // 状态码，200 表示成功
 *     msg: '成功',        // 提示信息
 *     data: {
 *       total: 100,       // 符合条件的资讯总数
 *       list: [...]       // 当前页的资讯数组
 *     }
 *   }
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从请求的查询参数中提取 page、limit、status
    // 如果前端没有传这些参数，就使用默认值：page=1, limit=10
    const { page = 1, limit = 10, status } = req.query;

    // 构建查询条件对象（where 就是 SQL 中的 WHERE 子句）
    const where = {};
    // 如果前端传了 status 参数，就加入筛选条件
    // 比如只查看已发布的资讯，或只查看草稿
    if (status) {
      where.status = status;
    }

    // 使用 Sequelize 的 findAndCountAll 方法查询数据库
    // 这个方法会同时返回：符合条件的总数（count）和当前页的数据（rows）
    const news = await db.News.findAndCountAll({
      where,                            // 查询条件
      offset: (page - 1) * limit,       // 跳过前面几条数据（实现分页）
                                        // 例如：第2页，每页10条 → 跳过 (2-1)*10 = 10 条
      limit: parseInt(limit),           // 只取指定数量的数据
      order: [['sort_order', 'DESC'], ['created_at', 'DESC']]
      // 排序规则：先按 sort_order（排序权重）降序，再按 created_at（创建时间）降序
      // DESC = 降序（从大到小），数字越大越靠前
    });

    // 查询成功，返回结果给前端
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: news.count,    // 总条数，前端用来计算总共有多少页
        list: news.rows       // 当前页的资讯列表
      }
    });
  } catch (error) {
    // 如果查询过程中出现任何错误，会跳到这里
    // 在服务器控制台打印错误信息，方便开发者排查问题
    console.error('获取资讯列表失败:', error);
    // 返回错误信息给前端
    res.json({
      code: 500,              // 500 表示服务器内部错误
      msg: '获取资讯列表失败',
      data: null
    });
  }
});

/**
 * @route   POST /admin/news
 * @desc    创建一条新的资讯
 * @access  仅管理员可访问
 *
 * 请求体参数（Request Body，通过 POST 请求发送的数据）：
 *   @param {string} title       - 资讯标题（必填）
 *   @param {string} summary     - 资讯摘要/简介（必填）
 *   @param {string} [content]   - 资讯正文内容（选填，默认为空字符串）
 *   @param {string} [image]     - 资讯封面图片的 URL 地址（选填）
 *   @param {string} [status]    - 发布状态（选填，默认 'published' 已发布）
 *   @param {number} [sort_order]- 排序权重（选填，默认 0，数字越大越靠前）
 */
router.post('/', authAdmin, async (req, res) => {
  try {
    // 从请求体中提取各个字段
    const { title, summary, content, image, status, sort_order } = req.body;

    // 数据验证：标题和摘要是必填项，如果没有提供就返回错误
    if (!title || !summary) {
      return res.json({
        code: 400,              // 400 表示客户端请求参数有误
        msg: '标题和摘要不能为空',
        data: null
      });
    }

    // 调用 Sequelize 的 create 方法，在数据库的 News 表中插入一条新记录
    // 选填字段如果没有传值，就使用默认值
    const news = await db.News.create({
      title,                              // 资讯标题
      summary,                            // 资讯摘要
      content: content || '',             // 正文内容，没传就默认空字符串
      image: image || '',                 // 封面图片，没传就默认空字符串
      status: status || 'published',      // 状态，没传就默认"已发布"
      sort_order: sort_order || 0         // 排序权重，没传就默认 0
    });

    // 创建成功，返回新创建的资讯数据
    res.json({
      code: 200,
      msg: '资讯创建成功',
      data: news
    });
  } catch (error) {
    console.error('创建资讯失败:', error);
    res.json({
      code: 500,
      msg: '创建资讯失败',
      data: null
    });
  }
});

/**
 * @route   PUT /admin/news/:id
 * @desc    更新（修改）指定 ID 的资讯
 * @access  仅管理员可访问
 *
 * 路径参数（URL 中的 :id 部分）：
 *   @param {number} id - 要修改的资讯的唯一标识符（ID）
 *
 * 请求体参数（只需要传入要修改的字段，不需要全部传）：
 *   @param {string} [title]      - 新的标题
 *   @param {string} [summary]    - 新的摘要
 *   @param {string} [content]    - 新的正文内容
 *   @param {string} [image]      - 新的封面图片 URL
 *   @param {string} [status]     - 新的发布状态
 *   @param {number} [sort_order] - 新的排序权重
 */
router.put('/:id', authAdmin, async (req, res) => {
  try {
    // findByPk = Find By Primary Key（通过主键查找）
    // 主键（Primary Key）就是每条记录的唯一标识，通常是 id 字段
    const news = await db.News.findByPk(req.params.id);

    // 如果没找到对应的资讯，返回 404 错误
    if (!news) {
      return res.json({
        code: 404,              // 404 表示请求的资源不存在
        msg: '资讯不存在',
        data: null
      });
    }

    // 从请求体中提取要更新的字段
    const { title, summary, content, image, status, sort_order } = req.body;

    // 逐个检查：只有前端传了某个字段，才更新该字段
    // 这样可以实现"部分更新"，不需要每次都传所有字段
    if (title) news.title = title;
    if (summary) news.summary = summary;
    // content 和 image 用 !== undefined 判断，因为它们可能被设置为空字符串（清空内容）
    if (content !== undefined) news.content = content;
    if (image !== undefined) news.image = image;
    if (status) news.status = status;
    // sort_order 也用 !== undefined，因为 0 是一个有效的排序值
    if (sort_order !== undefined) news.sort_order = sort_order;

    // 将修改保存到数据库
    await news.save();

    // 返回更新后的资讯数据
    res.json({
      code: 200,
      msg: '资讯更新成功',
      data: news
    });
  } catch (error) {
    console.error('更新资讯失败:', error);
    res.json({
      code: 500,
      msg: '更新资讯失败',
      data: null
    });
  }
});

/**
 * @route   DELETE /admin/news/:id
 * @desc    删除指定 ID 的资讯
 * @access  仅管理员可访问
 *
 * 路径参数：
 *   @param {number} id - 要删除的资讯的唯一标识符（ID）
 *
 * 注意：这是"物理删除"（真正从数据库中移除），删除后无法恢复。
 * 如果只是想隐藏资讯，建议使用"更新状态"的方式（逻辑删除/软删除）。
 */
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    // 先根据 ID 查找要删除的资讯
    const news = await db.News.findByPk(req.params.id);

    // 如果资讯不存在，返回 404 错误
    if (!news) {
      return res.json({
        code: 404,
        msg: '资讯不存在',
        data: null
      });
    }

    // 调用 destroy 方法从数据库中删除这条记录
    await news.destroy();

    // 删除成功
    res.json({
      code: 200,
      msg: '资讯删除成功',
      data: null              // 删除操作不需要返回数据
    });
  } catch (error) {
    console.error('删除资讯失败:', error);
    res.json({
      code: 500,
      msg: '删除资讯失败',
      data: null
    });
  }
});

// ==================== 导出路由模块 ====================
/**
 * 将路由器对象导出，以便在主应用文件（如 app.js）中使用
 * 通常会这样挂载：app.use('/admin/news', require('./routes/admin/news'))
 * 这样上面定义的 GET / 就变成了 GET /admin/news
 */
module.exports = router;