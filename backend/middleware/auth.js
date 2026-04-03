/**
 * 认证中间件
 * 提供用户认证（authUser）和管理员认证（authAdmin）两个中间件
 * 通过验证请求头中的 JWT Token 来判断用户身份
 */

const jwt = require('jsonwebtoken');     // JWT 库，用于生成和验证 Token
const db = require('../config/database'); // 数据库模型，用于查询用户/管理员信息

/**
 * 用户认证中间件
 * 从请求头的 Authorization 字段提取 Bearer Token，验证后将用户信息挂载到 req.user
 * 如果认证失败，返回 401 或 403 错误
 */
const authUser = async (req, res, next) => {
  try {
    // 从请求头中提取 Token（格式为 "Bearer xxx"，去掉前缀只保留 Token 部分）
    const token = req.headers.authorization?.replace('Bearer ', '');

    // 如果没有提供 Token，返回未认证错误
    if (!token) {
      return res.json({
        code: 401,
        msg: '未提供认证令牌',
        data: null
      });
    }

    // 使用密钥验证 Token 的有效性，解码出用户 ID 等信息
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 根据解码出的用户 ID 查询数据库中的用户记录
    const user = await db.User.findByPk(decoded.id);

    // 用户不存在（可能已被删除）
    if (!user) {
      return res.json({
        code: 401,
        msg: '用户不存在',
        data: null
      });
    }

    // 检查用户是否被拉黑
    if (user.status === 'blacklisted') {
      return res.json({
        code: 403,
        msg: '账号已被禁用',
        data: null
      });
    }

    // 认证通过，将用户信息挂载到请求对象上，后续路由可通过 req.user 获取
    req.user = user;
    next(); // 调用下一个中间件或路由处理函数
  } catch (error) {
    // Token 过期、签名无效等异常情况
    console.error('认证失败:', error);
    return res.json({
      code: 401,
      msg: '认证失败',
      data: null
    });
  }
};

/**
 * 管理员认证中间件
 * 逻辑与用户认证类似，但查询的是管理员表（Admin）
 * 认证通过后将管理员信息挂载到 req.admin
 */
const authAdmin = async (req, res, next) => {
  try {
    // 从请求头中提取 Token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.json({
        code: 401,
        msg: '未提供认证令牌',
        data: null
      });
    }

    // 验证 Token 并查询管理员信息
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await db.Admin.findByPk(decoded.id);

    if (!admin) {
      return res.json({
        code: 401,
        msg: '管理员不存在',
        data: null
      });
    }

    // 认证通过，将管理员信息挂载到请求对象上
    req.admin = admin;
    next();
  } catch (error) {
    console.error('认证失败:', error);
    return res.json({
      code: 401,
      msg: '认证失败',
      data: null
    });
  }
};

module.exports = {
  authUser,   // 导出用户认证中间件
  authAdmin   // 导出管理员认证中间件
};
