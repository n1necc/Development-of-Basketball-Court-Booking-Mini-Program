/**
 * @file announcements.js - 公告功能路由模块
 * @description 这个文件负责处理系统公告的展示功能。
 *              公告是管理员发布的重要通知信息，比如：
 *              - "春节期间场地营业时间调整"
 *              - "新场地开放预约通知"
 *              - "系统维护公告"
 *
 *              公告和资讯（news）的区别：
 *              - 公告：偏向通知性质，通常是系统或运营相关的重要信息
 *              - 资讯：偏向内容性质，通常是篮球相关的新闻、文章
 *
 *              本文件包含以下功能：
 *              1. 获取公告列表 - 分页展示所有已发布的公告
 *              2. 获取公告详情 - 查看某条公告的完整内容
 *
 *              这两个接口都不需要用户登录，任何人都可以查看公告。
 *              公告的发布、编辑、删除等管理操作在 admin/announcements.js 中处理。
 *
 * @requires express - Web服务器框架
 * @requires ../config/database - 数据库配置
 */

// 引入 express 框架
const express = require('express');

// 创建路由器实例
const router = express.Router();

// 引入数据库模块，通过 db 可以访问公告表（Announcement）等数据表
const db = require('../config/database');

/**
 * @api {GET} /announcements 获取公告列表（小程序端）
 * @method GET
 * @description 分页获取所有已发布状态的公告。
 *              只返回状态为 'published'（已发布）的公告，
 *              草稿或下架的公告不会显示给用户。
 *              列表按照"排序权重"和"创建时间"倒序排列，
 *              管理员可以通过设置排序权重来置顶重要公告。
 *
 * @param {Object} req.query - URL查询参数
 * @param {number} [req.query.page=1] - 页码，默认第1页（可选）
 * @param {number} [req.query.limit=10] - 每页条数，默认10条（可选）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: { total: 总数, list: [公告数组] } }
 *   失败时: { code: 500, msg: '获取公告列表失败', data: null }
 */
router.get('/', async (req, res) => {
  try {
    // 从URL查询参数中获取分页信息，未传则使用默认值
    const { page = 1, limit = 10 } = req.query;

    // 查询已发布的公告列表，同时返回总数
    // findAndCountAll 会返回两个值：count（总数）和 rows（当前页数据）
    const announcements = await db.Announcement.findAndCountAll({
      where: { status: 'published' },           // 只查询已发布的公告
      offset: (page - 1) * limit,               // 分页偏移量（跳过前面的记录）
      limit: parseInt(limit),                    // 每页返回的条数
      order: [
        ['sort_order', 'DESC'],                  // 首先按排序权重倒序（权重越大越靠前，用于置顶）
        ['created_at', 'DESC']                   // 权重相同时，按创建时间倒序（最新的排前面）
      ]
    });

    res.json({
      code: 200,
      msg: '成功',
      data: {
        total: announcements.count,              // 符合条件的公告总数
        list: announcements.rows                 // 当前页的公告列表
      }
    });
  } catch (error) {
    // 捕获意外错误并打印到控制台，方便开发者排查问题
    console.error('获取公告列表失败:', error);
    res.json({
      code: 500,
      msg: '获取公告列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /announcements/:id 获取公告详情
 * @method GET
 * @description 根据公告ID获取一条公告的完整内容。
 *              用户在公告列表中点击某条公告后，会调用这个接口获取详细内容。
 *
 * @param {string} req.params.id - URL路径参数，公告ID
 *        例如请求 /announcements/3 中的 3 就是公告ID
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: 公告详情对象 }
 *   不存在: { code: 404, msg: '公告不存在', data: null }
 *   失败时: { code: 500, msg: '获取公告详情失败', data: null }
 */
router.get('/:id', async (req, res) => {
  try {
    // 通过主键（ID）查找公告
    // findByPk = find by Primary Key（通过主键查找）
    const announcement = await db.Announcement.findByPk(req.params.id);

    // 如果没找到对应的公告，返回404错误
    if (!announcement) {
      return res.json({
        code: 404,
        msg: '公告不存在',
        data: null
      });
    }

    // 找到了，返回公告的完整信息
    res.json({
      code: 200,
      msg: '成功',
      data: announcement
    });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.json({
      code: 500,
      msg: '获取公告详情失败',
      data: null
    });
  }
});

// 导出路由器，供主应用文件引入使用
module.exports = router;
