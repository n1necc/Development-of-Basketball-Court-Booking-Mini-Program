/**
 * @file news.js - 资讯（新闻）功能路由模块
 * @description 这个文件负责处理篮球相关资讯/新闻的展示功能。
 *              就像新闻APP一样，管理员可以发布篮球相关的资讯文章，
 *              用户在小程序中可以浏览这些资讯。
 *
 *              本文件包含以下功能：
 *              1. 获取资讯列表 - 分页展示所有已发布的资讯（用于小程序首页或资讯列表页）
 *              2. 获取资讯详情 - 查看某一篇资讯的完整内容
 *
 *              注意：这里只有"读取"功能（GET请求），没有"增删改"功能。
 *              资讯的发布、编辑、删除等管理操作在 admin/news.js 中处理。
 *              这两个接口都不需要用户登录，任何人都可以浏览资讯。
 *
 * @requires express - Web服务器框架
 * @requires ../config/database - 数据库配置
 */

// 引入 express 框架
const express = require('express');

// 创建路由器实例
const router = express.Router();

// 引入数据库模块，通过 db 可以访问资讯表（News）等数据表
const db = require('../config/database');

/**
 * @api {GET} /news 获取资讯列表（小程序端）
 * @method GET
 * @description 分页获取所有已发布状态的资讯文章。
 *              只返回状态为 'published'（已发布）的资讯，
 *              草稿或下架的资讯不会显示给用户。
 *              列表按照"排序权重"和"创建时间"倒序排列，
 *              这样管理员可以通过设置排序权重来置顶重要资讯。
 *
 * @param {Object} req.query - URL查询参数
 * @param {number} [req.query.page=1] - 页码，默认第1页（可选）
 * @param {number} [req.query.limit=10] - 每页条数，默认10条（可选）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: { total: 总数, list: [资讯数组] } }
 *   失败时: { code: 500, msg: '获取资讯列表失败', data: null }
 */
router.get('/', async (req, res) => {
  try {
    // 从URL查询参数中获取分页信息，未传则使用默认值
    const { page = 1, limit = 10 } = req.query;

    // 查询已发布的资讯列表，同时返回总数（用于前端分页组件显示总页数）
    const news = await db.News.findAndCountAll({
      where: { status: 'published' },           // 只查询已发布的资讯
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
        total: news.count,                       // 符合条件的资讯总数
        list: news.rows                          // 当前页的资讯列表
      }
    });
  } catch (error) {
    // 捕获意外错误并打印到控制台
    console.error('获取资讯列表失败:', error);
    res.json({
      code: 500,
      msg: '获取资讯列表失败',
      data: null
    });
  }
});

/**
 * @api {GET} /news/:id 获取资讯详情
 * @method GET
 * @description 根据资讯ID获取一篇资讯的完整内容。
 *              用户在资讯列表中点击某篇资讯后，会调用这个接口获取详细内容。
 *
 * @param {string} req.params.id - URL路径参数，资讯ID
 *        例如请求 /news/8 中的 8 就是资讯ID
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '成功', data: 资讯详情对象 }
 *   不存在: { code: 404, msg: '资讯不存在', data: null }
 *   失败时: { code: 500, msg: '获取资讯详情失败', data: null }
 */
router.get('/:id', async (req, res) => {
  try {
    // 通过主键（ID）查找资讯
    // findByPk = find by Primary Key（通过主键查找）
    const news = await db.News.findByPk(req.params.id);

    // 如果没找到对应的资讯，返回404错误
    if (!news) {
      return res.json({
        code: 404,
        msg: '资讯不存在',
        data: null
      });
    }

    // 找到了，返回资讯的完整信息
    res.json({
      code: 200,
      msg: '成功',
      data: news
    });
  } catch (error) {
    console.error('获取资讯详情失败:', error);
    res.json({
      code: 500,
      msg: '获取资讯详情失败',
      data: null
    });
  }
});

// 导出路由器，供主应用文件引入使用
module.exports = router;
