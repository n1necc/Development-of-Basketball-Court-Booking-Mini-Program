/**
 * ============================================================================
 * 文件名：settings.js
 * 所属模块：管理后台 - 系统设置模块
 * 文件说明：
 *   这个文件负责管理后台中"系统设置"相关的操作，包括：
 *   1. 获取所有系统设置（以键值对形式返回）
 *   2. 批量更新系统设置
 *   3. 获取单个设置项的值
 *   4. 系统状态管理（维护模式/启用模式切换）
 *   5. 系统状态变更日志记录
 *
 *   什么是"系统设置"？
 *   系统设置就是一些可以动态调整的配置项，不需要修改代码就能改变系统行为。
 *   比如：
 *   - 系统名称、联系电话、客服微信号
 *   - 预订规则（最早可以提前几天预订、最晚可以提前几小时取消）
 *   - 营业时间（几点开门、几点关门）
 *   - 系统状态（启用/维护模式）
 *   - 公告内容等
 *
 *   这些设置存储在数据库的 Setting 表中，每条记录是一个"键值对"：
 *   key（设置项名称）和 value（设置项的值）。
 *   例如：{ key: 'site_name', value: '阳光篮球馆' }
 *
 * 技术栈：Express.js 路由 + Sequelize ORM
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
 * db —— 数据库操作对象，这里会用到 db.Setting（系统设置表）
 */
const db = require('../../config/database');

/**
 * authAdmin —— 管理员身份验证中间件
 * 系统设置是非常重要的配置，只有管理员才能查看和修改
 */
const { authAdmin } = require('../../middleware/auth');

// ==================== 路由定义 ====================

/**
 * @api {GET} /admin/settings 获取所有系统设置
 * @description 获取系统中所有的设置项，以键值对（key-value）的形式返回
 *   管理员打开"系统设置"页面时，前端会调用这个接口来加载当前的配置。
 *
 *   返回格式示例：
 *   {
 *     "site_name": "阳光篮球馆",
 *     "contact_phone": "13800138000",
 *     "business_hours": "08:00-22:00",
 *     "advance_booking_days": "7"
 *   }
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @returns {object} 所有设置项组成的键值对对象
 */
router.get('/', authAdmin, async (req, res) => {
  try {
    // 从数据库中查询所有设置记录
    // findAll 不带条件，表示查询 Setting 表中的所有数据
    const settings = await db.Setting.findAll();

    // 将数组格式转换为键值对（对象/字典）格式
    // 数据库返回的是数组：[{ key: 'site_name', value: '阳光篮球馆' }, ...]
    // 前端更方便使用对象格式：{ site_name: '阳光篮球馆', ... }
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      code: 200,
      msg: '成功',
      data: settingsMap    // 返回转换后的键值对对象
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    res.json({
      code: 500,
      msg: '获取系统设置失败',
      data: null
    });
  }
});

/**
 * @api {PUT} /admin/settings 批量更新系统设置
 * @description 批量更新多个系统设置项
 *   管理员在设置页面修改配置后点击"保存"，前端会调用这个接口。
 *   请求体格式为键值对对象，例如：
 *   {
 *     "site_name": "新名称",
 *     "contact_phone": "13900139000"
 *   }
 *
 *   这个接口使用了"查找或创建"（findOrCreate）的策略：
 *   - 如果设置项已存在 → 更新它的值
 *   - 如果设置项不存在 → 创建一条新记录
 *   这样无论是修改旧设置还是添加新设置，都能用同一个接口处理。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {object} body - 请求体，格式为 { key: value } 的键值对对象
 *
 * @returns {object} 更新成功或失败的提示信息
 */
router.put('/', authAdmin, async (req, res) => {
  try {
    // 请求体本身就是一个键值对对象，如 { site_name: '新名称', ... }
    const settings = req.body;

    // 遍历每个设置项，逐一更新或创建
    // for...in 循环会遍历对象的所有键（key）
    for (const key in settings) {
      // findOrCreate —— "查找或创建"方法
      // 先在数据库中查找是否存在 key 相同的记录：
      //   - 如果找到了（已存在），返回该记录，created = false
      //   - 如果没找到（不存在），创建一条新记录，created = true
      const [setting, created] = await db.Setting.findOrCreate({
        where: { key },                        // 查找条件：按 key 查找
        defaults: { value: settings[key] }     // 如果不存在，用这个值创建新记录
      });

      // 如果记录已存在（不是新创建的），需要更新它的值
      if (!created) {
        setting.value = settings[key];
        await setting.save();    // 保存更新到数据库
      }
    }

    res.json({
      code: 200,
      msg: '设置更新成功',
      data: null
    });
  } catch (error) {
    console.error('更新系统设置失败:', error);
    res.json({
      code: 500,
      msg: '更新系统设置失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/settings/:key 获取单个设置项
 * @description 根据设置项的 key（名称）获取对应的值
 *   当只需要获取某一个特定的设置项时，使用这个接口比获取全部设置更高效。
 *   例如：GET /admin/settings/site_name 只获取网站名称
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} key - 设置项的键名（通过 URL 路径参数传入，如 /admin/settings/site_name）
 *
 * @returns {object} 包含设置值的对象，如 { value: '阳光篮球馆' }
 */
router.get('/:key', authAdmin, async (req, res) => {
  try {
    // 根据 URL 中的 key 参数查找对应的设置记录
    const setting = await db.Setting.findOne({
      where: { key: req.params.key }
    });

    // 如果找不到该设置项，返回 404
    if (!setting) {
      return res.json({
        code: 404,
        msg: '设置不存在',
        data: null
      });
    }

    // 返回设置项的值
    res.json({
      code: 200,
      msg: '成功',
      data: { value: setting.value }
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.json({
      code: 500,
      msg: '获取设置失败',
      data: null
    });
  }
});

// ==================== 系统状态管理路由 ====================

/**
 * @api {GET} /admin/settings/system/status 获取系统状态
 * @description 获取当前系统运行状态（启用/维护模式）
 *   用于管理端显示当前系统状态，以及用户端判断系统是否可用
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @returns {object} 系统状态信息
 *   {
 *     "status": "active" | "maintenance",
 *     "message": "系统运行正常" | "系统维护中"
 *   }
 */
router.get('/system/status', authAdmin, async (req, res) => {
  try {
    // 查询系统状态设置项
    const setting = await db.Setting.findOne({
      where: { key: 'system_status' }
    });

    // 如果没有设置过，默认为启用状态
    const status = setting ? setting.value : 'active';
    
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
 * @api {PUT} /admin/settings/system/status 切换系统状态
 * @description 切换系统运行状态（启用模式/维护模式）
 *   管理员可以通过此接口将系统切换到维护模式或恢复启用模式
 *   切换到维护模式后，用户端将显示维护提示，无法接受新的预订
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} status - 新状态，可选值：active（启用）、maintenance（维护）
 * @param {string} [message] - 维护模式提示信息（可选）
 * @param {string} [reason] - 状态变更原因（可选，用于日志记录）
 *
 * @returns {object} 更新后的系统状态
 */
router.put('/system/status', authAdmin, async (req, res) => {
  try {
    const { status, message, reason } = req.body;

    // 参数验证
    if (!status || !['active', 'maintenance'].includes(status)) {
      return res.json({
        code: 400,
        msg: '状态参数无效，可选值：active（启用）、maintenance（维护）',
        data: null
      });
    }

    // 获取当前状态（用于日志记录）
    const currentSetting = await db.Setting.findOne({
      where: { key: 'system_status' }
    });
    const oldStatus = currentSetting ? currentSetting.value : 'active';

    // 更新系统状态
    const [setting, created] = await db.Setting.findOrCreate({
      where: { key: 'system_status' },
      defaults: { value: status }
    });

    if (!created) {
      setting.value = status;
      await setting.save();
    }

    // 更新维护模式提示信息
    if (status === 'maintenance' && message) {
      const [msgSetting, msgCreated] = await db.Setting.findOrCreate({
        where: { key: 'maintenance_message' },
        defaults: { value: message }
      });

      if (!msgCreated) {
        msgSetting.value = message;
        await msgSetting.save();
      }
    }

    // 记录状态变更日志
    await db.SystemStatusLog.create({
      old_status: oldStatus,
      new_status: status,
      operator_id: req.admin.id,
      operator_name: req.admin.username || '管理员',
      reason: reason || (status === 'maintenance' ? '系统维护' : '恢复启用'),
      ip_address: req.ip || req.connection.remoteAddress
    });

    // 控制台记录
    console.log(`系统状态变更：${oldStatus} → ${status}，操作人：${req.admin.username || '管理员'}`);

    res.json({
      code: 200,
      msg: status === 'active' ? '系统已恢复启用' : '系统已进入维护模式',
      data: {
        status: status,
        message: status === 'active' ? '系统运行正常' : (message || '系统维护中，请稍后再试')
      }
    });
  } catch (error) {
    console.error('切换系统状态失败:', error);
    res.json({
      code: 500,
      msg: '切换系统状态失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/settings/system/logs 获取系统状态变更日志
 * @description 获取系统状态切换的历史记录
 *   用于管理员查看系统状态的变更历史，包括操作人、时间和原因
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {number} [page=1] - 页码，默认第1页
 * @param {number} [limit=20] - 每页条数，默认20条
 *
 * @returns {object} 状态变更日志列表
 */
router.get('/system/logs', authAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // 查询状态变更日志
    const logs = await db.SystemStatusLog.findAndCountAll({
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
    console.error('获取系统状态日志失败:', error);
    res.json({
      code: 500,
      msg: '获取系统状态日志失败',
      data: null
    });
  }
});

// 将路由器导出，供主程序（app.js）挂载使用
module.exports = router;
