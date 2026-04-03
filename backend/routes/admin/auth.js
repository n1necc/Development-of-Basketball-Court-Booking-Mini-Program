/**
 * ============================================================================
 * 文件名：auth.js
 * 所属模块：管理后台 - 管理员身份认证（登录/鉴权）模块
 * 文件说明：
 *   这个文件负责管理员（后台工作人员）的身份验证相关功能，包括：
 *   1. 管理员登录（输入用户名和密码，验证通过后发放令牌 token）
 *   2. 获取当前已登录管理员的个人信息
 *   3. 修改管理员密码
 *
 *   什么是"身份认证"？
 *   就像进入公司大楼需要刷工牌一样，管理员要使用后台系统，
 *   首先需要"登录"来证明自己的身份。登录成功后，系统会发一个
 *   "通行证"（叫做 token），之后每次操作都带上这个通行证，
 *   系统就知道你是谁了。
 *
 * 技术栈：Express.js 路由 + bcryptjs 密码加密 + jsonwebtoken 令牌
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * express —— Node.js 最流行的 Web 框架，用来创建服务器和处理网络请求
 * 可以把它想象成一个"前台接待员"，负责接收和分发各种请求
 */
const express = require('express');

/**
 * router —— 路由器，可以理解为"导航地图"
 * 它告诉服务器：当收到某个网址的请求时，应该执行哪段代码
 * 比如：收到 /login 请求 → 执行登录代码
 */
const router = express.Router();

/**
 * bcryptjs —— 密码加密工具库
 * 为什么需要加密？因为密码不能以明文（原始文字）存储在数据库中，
 * 万一数据库被黑客攻破，所有用户的密码就泄露了。
 * bcrypt 会把密码变成一串看不懂的乱码（叫做"哈希值"），
 * 即使被盗也无法还原出原始密码。
 */
const bcrypt = require('bcryptjs');

/**
 * jsonwebtoken（简称 JWT）—— 令牌（token）生成和验证工具
 * 登录成功后，服务器会用 JWT 生成一个加密的"通行证"（token），
 * 发给前端。前端之后每次请求都带上这个 token，
 * 服务器验证 token 有效后才允许操作。
 */
const jwt = require('jsonwebtoken');

/**
 * db —— 数据库操作对象，通过它可以访问所有的数据表
 * 比如 db.Admin 就是管理员表，db.User 就是用户表
 * 这里使用的是 Sequelize ORM 框架，它让我们可以用 JavaScript 代码
 * 来操作数据库，而不需要手写 SQL 语句
 */
const db = require('../../config/database');

// ==================== 路由定义 ====================

/**
 * @api {POST} /admin/auth/login 管理员登录
 * @description 管理员登录接口 —— 整个后台系统的"大门"
 *   管理员输入用户名和密码，系统验证通过后返回一个 token（令牌）。
 *   这个 token 就像一把钥匙，后续所有需要权限的操作都要带上它。
 *
 * @param {string} username - 管理员用户名（通过请求体 body 传入）
 * @param {string} password - 管理员密码（通过请求体 body 传入）
 *
 * @returns {object} 成功时返回 token 和管理员基本信息
 * @returns {object} 失败时返回错误码和错误信息
 *
 * 注意：这个接口不需要 authAdmin 中间件验证，因为用户还没登录呢！
 */
router.post('/login', async (req, res) => {
  try {
    // 从请求体中取出用户名和密码
    // req.body 就是前端发送过来的数据，类似于一个"信封"里的内容
    const { username, password } = req.body;

    // 【校验】检查用户名和密码是否都填写了
    // 如果有任何一个为空，直接返回错误提示，不再继续往下执行
    if (!username || !password) {
      return res.json({
        code: 400,       // 400 表示"请求参数有误"
        msg: '用户名和密码不能为空',
        data: null
      });
    }

    // 【第一步】根据用户名去数据库的 Admin（管理员）表中查找
    // findOne 表示只查找一条记录，where 是查询条件
    const admin = await db.Admin.findOne({ where: { username } });

    // 如果没找到这个用户名对应的管理员，说明用户名不存在
    // 但为了安全，我们不会告诉用户"用户名不存在"，
    // 而是统一提示"用户名或密码错误"，防止黑客试探有效用户名
    if (!admin) {
      return res.json({
        code: 401,       // 401 表示"未授权/认证失败"
        msg: '用户名或密码错误',
        data: null
      });
    }

    // 【第二步】验证密码是否正确
    // bcrypt.compare 会把用户输入的明文密码和数据库中存储的加密密码进行比对
    // 它会自动处理加密过程，不需要我们手动加密后再比较
    const isValid = await bcrypt.compare(password, admin.password);

    // 密码不匹配，返回错误（同样不透露具体是密码错了）
    if (!isValid) {
      return res.json({
        code: 401,
        msg: '用户名或密码错误',
        data: null
      });
    }

    // 【第三步】用户名和密码都验证通过，生成 JWT token（令牌）
    // jwt.sign() 的三个参数：
    //   1. 要存入 token 的数据（这里存了管理员ID和角色）
    //   2. 密钥（JWT_SECRET），用来加密 token，存在环境变量中
    //   3. 配置项，expiresIn: '7d' 表示 token 7天后过期，届时需要重新登录
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 登录成功，返回 token 和管理员的基本信息
    // 注意：不会返回密码等敏感信息
    res.json({
      code: 200,         // 200 表示"成功"
      msg: '登录成功',
      data: {
        token,           // 前端需要保存这个 token，后续请求都要带上
        admin: {
          id: admin.id,              // 管理员ID
          username: admin.username,  // 用户名
          role: admin.role,          // 角色（如：超级管理员、普通管理员）
          permissions: admin.permissions  // 权限列表
        }
      }
    });
  } catch (error) {
    // 如果代码执行过程中出现意外错误（如数据库连接断开），会进入这里
    // console.error 会在服务器控制台打印错误信息，方便开发者排查问题
    console.error('管理员登录失败:', error);
    res.json({
      code: 500,         // 500 表示"服务器内部错误"
      msg: '登录失败',
      data: null
    });
  }
});

/**
 * @api {GET} /admin/auth/info 获取当前管理员信息
 * @description 获取当前已登录管理员的个人信息
 *   前端登录后，通常会调用这个接口来获取管理员的详细信息，
 *   用于显示在页面右上角（如"欢迎，张管理员"）。
 *
 * @requires authAdmin - 需要管理员身份验证（必须先登录才能访问）
 *   authAdmin 中间件会验证请求中的 token，并把管理员信息挂载到 req.admin 上
 *
 * @returns {object} 管理员的 id、用户名、角色、权限信息
 */
router.get('/info', require('../../middleware/auth').authAdmin, async (req, res) => {
  // req.admin 是由 authAdmin 中间件解析 token 后挂载上去的管理员对象
  // 直接返回需要的字段即可
  res.json({
    code: 200,
    msg: '成功',
    data: {
      id: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      permissions: req.admin.permissions
    }
  });
});

/**
 * @api {POST} /admin/auth/change-password 修改管理员密码
 * @description 管理员修改自己的登录密码
 *   需要提供旧密码（验证身份）和新密码。
 *   这是一个安全措施：即使别人拿到了你的 token，
 *   如果不知道旧密码，也无法修改密码。
 *
 * @requires authAdmin - 需要管理员身份验证
 *
 * @param {string} oldPassword - 旧密码/原密码（通过请求体 body 传入）
 * @param {string} newPassword - 新密码（通过请求体 body 传入）
 *
 * @returns {object} 成功或失败的提示信息
 */
router.post('/change-password', require('../../middleware/auth').authAdmin, async (req, res) => {
  try {
    // 从请求体中取出旧密码和新密码
    const { oldPassword, newPassword } = req.body;

    // 【校验】旧密码和新密码都不能为空
    if (!oldPassword || !newPassword) {
      return res.json({
        code: 400,
        msg: '参数不完整',
        data: null
      });
    }

    // 【第一步】验证旧密码是否正确
    // 这一步很重要：防止别人捡到你没锁屏的电脑后直接改密码
    const isValid = await bcrypt.compare(oldPassword, req.admin.password);
    if (!isValid) {
      return res.json({
        code: 401,
        msg: '原密码错误',
        data: null
      });
    }

    // 【第二步】对新密码进行加密
    // bcrypt.hash 的第二个参数 10 是"加盐轮数"（salt rounds）
    // 数字越大越安全，但加密速度越慢。10 是一个常用的平衡值。
    // "加盐"是指在密码中混入随机字符串，让相同的密码加密后结果也不同
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 【第三步】把加密后的新密码保存到数据库
    req.admin.password = hashedPassword;
    await req.admin.save();  // save() 将修改写入数据库

    res.json({
      code: 200,
      msg: '密码修改成功',
      data: null
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.json({
      code: 500,
      msg: '修改密码失败',
      data: null
    });
  }
});

/**
 * @api {POST} /admin/auth/register 注册管理员
 * @description 注册新的管理员账号
 *   需要超级管理员权限才能注册新管理员
 *
 * @requires authAdmin - 需要管理员身份验证（且必须是超级管理员）
 *
 * @param {string} username - 管理员用户名（通过请求体 body 传入）
 * @param {string} password - 管理员密码（通过请求体 body 传入）
 * @param {string} role - 角色（super-超级管理员，normal-普通管理员，默认 normal）
 * @param {array} permissions - 权限列表（通过请求体 body 传入，可选）
 *
 * @returns {object} 成功或失败的提示信息
 */
router.post('/register', require('../../middleware/auth').authAdmin, async (req, res) => {
  try {
    // 【权限校验】只有超级管理员才能注册新管理员
    if (req.admin.role !== 'super') {
      return res.json({
        code: 403,
        msg: '只有超级管理员才能注册新管理员',
        data: null
      });
    }

    // 从请求体中取出注册信息
    const { username, password, role = 'normal', permissions = [] } = req.body;

    // 【校验】用户名和密码不能为空
    if (!username || !password) {
      return res.json({
        code: 400,
        msg: '用户名和密码不能为空',
        data: null
      });
    }

    // 【校验】用户名长度限制（3-50个字符）
    if (username.length < 3 || username.length > 50) {
      return res.json({
        code: 400,
        msg: '用户名长度需在3-50个字符之间',
        data: null
      });
    }

    // 【校验】密码复杂度要求
    // 至少8位，包含大小写字母和数字
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.json({
        code: 400,
        msg: '密码需至少8位，包含大小写字母和数字',
        data: null
      });
    }

    // 【校验】检查用户名是否已存在
    const existingAdmin = await db.Admin.findOne({ where: { username } });
    if (existingAdmin) {
      return res.json({
        code: 400,
        msg: '该用户名已被占用',
        data: null
      });
    }

    // 【第一步】对密码进行加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 【第二步】创建新管理员
    const newAdmin = await db.Admin.create({
      username,
      password: hashedPassword,
      role,
      permissions
    });

    res.json({
      code: 200,
      msg: '管理员注册成功',
      data: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('注册管理员失败:', error);
    res.json({
      code: 500,
      msg: '注册失败',
      data: null
    });
  }
});

// 将路由器导出，供主程序（app.js）挂载使用
// 其他文件通过 require('./routes/admin/auth') 就能引入这个路由
module.exports = router;
