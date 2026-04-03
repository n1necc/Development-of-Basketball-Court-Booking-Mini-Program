/**
 * ============================================================================
 * 文件名：announcements.js
 * 所属模块：管理员后台 - 公告管理路由
 * 文件说明：
 *   这个文件负责处理"系统公告"相关的管理功能。
 *   公告和资讯（news）的区别：
 *     - 公告：通常是系统级别的通知，比如"场地维护通知"、"节假日营业时间调整"等
 *     - 资讯：通常是篮球相关的新闻、活动信息等
 *
 *   管理员可以通过这里提供的接口来：
 *     1. 查看公告列表（支持分页和按状态筛选）
 *     2. 创建新公告
 *     3. 修改已有公告
 *     4. 删除公告
 *
 *   所有接口都需要管理员身份验证，普通用户无法访问。
 *
 * 技术栈：Express.js 路由 + Sequelize ORM 数据库操作
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * express —— Node.js 的 Web 框架，用来创建服务器和处理 HTTP 请求
 */
const express = require('express');

/**
 * router —— Express 路由器，专门处理公告相关的请求
 * 最终会被挂载到类似 /admin/announcements 的路径下
 */
const router = express.Router();

/**
 * db —— 数据库连接和模型对象，通过 db.Announcement 可以操作公告数据表
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * 作用：在处理请求之前，先验证当前用户是否为管理员
 * 如果验证失败，请求会被拦截，不会执行后续的处理函数
 */
const { authAdmin } = require('../../middleware/auth');

// ==================== 路由定义 ====================

/**
 * @route   GET /admin/announcements
 * @desc    获取公告列表（支持分页和状态筛选）
 * @access  仅管理员可访问
 *
 * 查询参数（URL 中 ? 后面的键值对）：
 *   @param {number} [page=1]    - 页码，默认第 1 页
 *   @param {number} [limit=10]  - 每页条数，默认 10 条
 *   @param {string} [status]    - 公告状态筛选，如 'published'（已发布）或 'draft'（草稿）
 *
 * 返回数据：
 *   { code: 200, msg: '成功', data: { total: 总数, list: 公告数组 } }
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从查询参数中解构出 page、limit、status，并设置默认值
    const { page = 1, limit = 10, status } = req.query;

    // 构建数据库查询条件
    const where = {};
    // 如果传了 status 参数，就只查询该状态的公告
    if (status) {
      where.status = status;
    }

    // findAndCountAll：查询数据并同时返回总数，非常适合分页场景
    const announcements = await db.Announcement.findAndCountAll({
      where,                            // 筛选条件
      offset: (page - 1) * limit,       // 分页偏移量：跳过前面已显示的数据
      limit: parseInt(limit),           // 每页返回的数据条数（parseInt 确保是整数）
      order: [['sort_order', 'DESC'], ['created_at', 'DESC']]
      // 排序：优先按排序权重降序，权重相同则按创建时间降序（最新的排在前面）
    });

    // 返回成功响应
    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: announcements.count,     // 符合条件的公告总数
        list: announcements.rows        // 当前页的公告列表
      }
    });
  } catch (error) {
    // 捕获异常，打印错误日志并返回错误响应
    console.error('获取公告列表失败:', error);
    res.json({
      code: 500,
      msg: '获取公告列表失败',
      data: null
    });
  }
});

/**
 * @route   POST /admin/announcements
 * @desc    创建一条新公告
 * @access  仅管理员可访问
 *
 * 请求体参数（通过 POST 请求发送的 JSON 数据）：
 *   @param {string} title        - 公告标题（必填）
 *   @param {string} content      - 公告内容（必填）
 *   @param {string} [status]     - 发布状态（选填，默认 'published' 已发布）
 *   @param {number} [sort_order] - 排序权重（选填，默认 0，数字越大越靠前显示）
 */
router.post('/', authAdmin, async (req, res) => {
  try {
    // 从请求体中提取公告的各个字段
    const { title, content, status, sort_order } = req.body;

    // 数据验证：标题和内容是必填的
    if (!title || !content) {
      return res.json({
        code: 400,              // 400 = 请求参数错误
        msg: '标题和内容不能为空',
        data: null
      });
    }

    // 在数据库中创建新的公告记录
    const announcement = await db.Announcement.create({
      title,                              // 公告标题
      content,                            // 公告内容
      status: status || 'published',      // 状态，默认"已发布"
      sort_order: sort_order || 0         // 排序权重，默认 0
    });

    // 创建成功，返回新公告的完整数据
    res.json({
      code: 200,
      msg: '公告创建成功',
      data: announcement
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.json({
      code: 500,
      msg: '创建公告失败',
      data: null
    });
  }
});

/**
 * @route   PUT /admin/announcements/:id
 * @desc    更新（修改）指定 ID 的公告
 * @access  仅管理员可访问
 *
 * 路径参数：
 *   @param {number} id - 要修改的公告 ID（在 URL 中传递，如 /admin/announcements/5）
 *
 * 请求体参数（只传需要修改的字段即可）：
 *   @param {string} [title]      - 新的标题
 *   @param {string} [content]    - 新的内容
 *   @param {string} [status]     - 新的状态
 *   @param {number} [sort_order] - 新的排序权重
 */
router.put('/:id', authAdmin, async (req, res) => {
  try {
    // 根据 URL 中的 id 参数，从数据库中查找对应的公告
    const announcement = await db.Announcement.findByPk(req.params.id);

    // 如果公告不存在，返回 404 错误
    if (!announcement) {
      return res.json({
        code: 404,              // 404 = 资源不存在
        msg: '公告不存在',
        data: null
      });
    }

    // 从请求体中提取要更新的字段
    const { title, content, status, sort_order } = req.body;

    // 逐个字段检查并更新（只更新前端传了值的字段）
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (status) announcement.status = status;
    // sort_order 使用 !== undefined 判断，因为 0 也是有效值
    // 如果用 if (sort_order) 判断，当值为 0 时会被当作 false 而跳过更新
    if (sort_order !== undefined) announcement.sort_order = sort_order;

    // 将所有修改保存到数据库
    await announcement.save();

    // 返回更新后的公告数据
    res.json({
      code: 200,
      msg: '公告更新成功',
      data: announcement
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.json({
      code: 500,
      msg: '更新公告失败',
      data: null
    });
  }
});

/**
 * @route   DELETE /admin/announcements/:id
 * @desc    删除指定 ID 的公告
 * @access  仅管理员可访问
 *
 * 路径参数：
 *   @param {number} id - 要删除的公告 ID
 *
 * 注意：此操作为物理删除（从数据库中彻底移除），删除后不可恢复
 */
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    // 先查找要删除的公告
    const announcement = await db.Announcement.findByPk(req.params.id);

    // 公告不存在则返回 404
    if (!announcement) {
      return res.json({
        code: 404,
        msg: '公告不存在',
        data: null
      });
    }

    // 从数据库中删除该公告记录
    await announcement.destroy();

    // 删除成功
    res.json({
      code: 200,
      msg: '公告删除成功',
      data: null              // 删除操作无需返回数据
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.json({
      code: 500,
      msg: '删除公告失败',
      data: null
    });
  }
});

// ==================== 导出路由模块 ====================
/**
 * 将公告路由器导出，供主应用挂载使用
 * 例如：app.use('/admin/announcements', require('./routes/admin/announcements'))
 */
module.exports = router;