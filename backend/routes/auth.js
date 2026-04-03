/**
 * @file auth.js - 用户认证（登录）路由模块
 * @description 这个文件负责处理用户的登录和身份认证功能。
 *              本系统是一个微信小程序，所以用户通过"微信登录"的方式进入系统。
 *
 *              微信登录的流程简单来说是这样的：
 *              1. 用户在小程序中点击"登录"按钮
 *              2. 小程序会从微信获取一个临时的 code（授权码）
 *              3. 小程序把这个 code 发送给我们的服务器
 *              4. 我们的服务器拿着这个 code 去问微信服务器："这个用户是谁？"
 *              5. 微信服务器返回用户的唯一标识 openid
 *              6. 我们用 openid 在自己的数据库中查找或创建用户
 *              7. 生成一个 token（令牌）返回给小程序，之后小程序每次请求都带上这个 token
 *
 *              本文件包含以下功能：
 *              1. 微信登录 - 处理用户登录请求，返回 token
 *              2. 获取用户信息 - 根据 token 返回当前登录用户的个人信息
 *
 * @requires express - Web服务器框架
 * @requires axios - HTTP请求库，用来向微信服务器发送请求
 * @requires jsonwebtoken - JWT（JSON Web Token）库，用来生成和验证用户令牌
 * @requires ../config/database - 数据库配置
 * @requires ../middleware/auth - 身份验证中间件
 */

// 引入 express 框架
const express = require('express');

// 创建路由器实例
const router = express.Router();

// 引入 axios，它是一个用来发送 HTTP 请求的工具库
// 这里用它来向微信服务器发送请求，获取用户的 openid
const axios = require('axios');

// 引入 jsonwebtoken（简称 JWT）
// JWT 是一种安全的"令牌"机制，就像一张"通行证"：
// 用户登录成功后，服务器发给用户一个 token（通行证），
// 之后用户每次请求都带上这个 token，服务器就知道"这个人已经登录过了"
const jwt = require('jsonwebtoken');

// 引入数据库模块
const db = require('../config/database');

/**
 * @api {POST} /auth/login 微信登录
 * @method POST
 * @description 处理微信小程序的用户登录请求。
 *              整个流程：接收小程序传来的 code → 向微信服务器换取 openid →
 *              在数据库中查找或创建用户 → 生成 JWT token → 返回给小程序。
 *
 * @param {Object} req.body - 请求体（小程序发送过来的数据）
 * @param {string} req.body.code - 微信登录授权码（必填，由小程序调用 wx.login() 获得）
 * @param {string} [req.body.nickName] - 用户昵称（可选，用于创建或更新用户信息）
 * @param {string} [req.body.avatarUrl] - 用户头像URL（可选，用于创建或更新用户信息）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '登录成功', data: { token: 'xxx', user: {用户信息} } }
 *   失败时: { code: 400/500, msg: '错误信息', data: null }
 */
router.post('/login', async (req, res) => {
  try {
    // 从请求体中取出微信授权码、昵称和头像
    const { code, nickName, avatarUrl } = req.body;

    // 参数校验：code 是必须的，没有它就无法完成微信登录
    if (!code) {
      return res.json({
        code: 400,
        msg: '缺少code参数',
        data: null
      });
    }

    // ========== 第一步：用 code 向微信服务器换取用户的 openid ==========
    // openid 是微信为每个用户分配的唯一标识，类似于用户在微信中的"身份证号"
    // 我们需要把 appid（小程序ID）、secret（小程序密钥）和 code 一起发给微信
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,          // 小程序的 AppID，从环境变量中读取
        secret: process.env.WX_SECRET,         // 小程序的密钥，从环境变量中读取
        js_code: code,                         // 小程序传来的临时授权码
        grant_type: 'authorization_code'       // 固定值，表示使用授权码模式
      }
    });

    // 检查微信服务器是否返回了错误
    if (response.data.errcode) {
      return res.json({
        code: 400,
        msg: '微信登录失败: ' + response.data.errmsg,
        data: null
      });
    }

    // 从微信的响应中取出 openid 和 session_key
    // openid: 用户唯一标识
    // session_key: 会话密钥（用于解密微信加密数据，这里暂未使用）
    const { openid, session_key } = response.data;

    // ========== 第二步：在数据库中查找或创建用户 ==========
    // 用 openid 在用户表中查找，看这个微信用户是否之前登录过
    let user = await db.User.findOne({ where: { openid } });
    
    console.log('登录请求参数 - code:', code, 'nickName:', nickName, 'avatarUrl:', avatarUrl);
    console.log('nickName 类型:', typeof nickName, 'avatarUrl 类型:', typeof avatarUrl);
    console.log('nickName 是否为空:', !nickName, 'avatarUrl 是否为空:', !avatarUrl);

    if (!user) {
      // 如果是新用户（第一次登录），在数据库中创建一条用户记录
      console.log('创建新用户...');
      
      // 判断是否使用随机值
      const shouldUseRandomNickName = !nickName || (typeof nickName === 'string' && nickName.trim() === '');
      const shouldUseRandomAvatar = !avatarUrl || (typeof avatarUrl === 'string' && avatarUrl.trim() === '');
      
      console.log('使用随机昵称:', shouldUseRandomNickName, '使用随机头像:', shouldUseRandomAvatar);
      
      const finalNickName = shouldUseRandomNickName ? generateRandomUsername() : nickName;
      const finalAvatarUrl = shouldUseRandomAvatar ? generateRandomAvatar() : avatarUrl;
      
      console.log('最终昵称:', finalNickName);
      console.log('最终头像:', finalAvatarUrl.substring(0, 50) + '...');
      
      user = await db.User.create({
        openid,
        nickName: finalNickName,
        avatarUrl: finalAvatarUrl
      });
      console.log('新用户创建成功:', user.toJSON());
    } else {
      // 如果是老用户（之前登录过），更新他的昵称和头像信息
      // 因为用户可能在微信中修改了昵称或头像
      if (nickName && nickName.trim()) user.nickName = nickName;
      if (avatarUrl && avatarUrl.trim()) user.avatarUrl = avatarUrl;
      await user.save();                       // 保存更新到数据库
    }

    // ========== 第三步：生成 JWT token（用户令牌） ==========
    // token 就像一张"通行证"，里面包含了用户的ID和openid
    // 小程序之后每次请求都会带上这个 token，服务器通过它识别用户身份
    const token = jwt.sign(
      { id: user.id, openid: user.openid },    // token 中存储的数据（载荷）
      process.env.JWT_SECRET,                   // 加密密钥，从环境变量中读取
      { expiresIn: '30d' }                      // token 有效期为30天，过期后需要重新登录
    );

    // ========== 第四步：返回登录成功的响应 ==========
    res.json({
      code: 200,
      msg: '登录成功',
      data: {
        token,                                  // 用户令牌，前端需要保存它
        user: {
          id: user.id,                          // 用户ID
          nickName: user.nickName,              // 昵称
          avatarUrl: user.avatarUrl,            // 头像
          phone: user.phone,                    // 手机号
          balance: user.balance                 // 账户余额
        }
      }
    });
  } catch (error) {
    // 捕获所有意外错误
    console.error('登录错误:', error);
    res.json({
      code: 500,
      msg: '登录失败',
      data: null
    });
  }
});

/**
 * @api {GET} /auth/userinfo 获取当前登录用户的个人信息
 * @method GET
 * @description 根据用户携带的 token 令牌，返回该用户的个人信息。
 *              这个接口通常在小程序启动时调用，用来获取最新的用户数据
 *              （比如余额可能发生了变化）。
 *
 * @requires 用户登录（authUser 中间件会验证 token 并将用户信息挂载到 req.user 上）
 *
 * @returns {Object} 返回JSON格式的响应：
 *   { code: 200, msg: '成功', data: { id, nickName, avatarUrl, phone, balance, status } }
 */
router.get('/userinfo', require('../middleware/auth').authUser, async (req, res) => {
  // authUser 中间件已经验证了 token 并把用户信息放在了 req.user 中
  // 所以这里直接从 req.user 中取数据返回即可
  res.json({
    code: 200,
    msg: '成功',
    data: {
      id: req.user.id,                         // 用户ID
      nickName: req.user.nickName,              // 昵称
      avatarUrl: req.user.avatarUrl,            // 头像URL
      phone: req.user.phone,                    // 手机号
      balance: req.user.balance,                // 账户余额
      status: req.user.status                   // 账户状态（如正常、禁用等）
    }
  });
});

/**
 * @api {POST} /auth/bind-phone 绑定手机号
 * @method POST
 * @description 通过微信提供的 code 获取用户手机号并绑定到账户。
 *              这个接口需要用户已登录（需要 token）。
 *
 * @param {Object} req.body - 请求体
 * @param {string} req.body.code - 微信返回的临时凭证，用于获取手机号
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '绑定成功', data: { phone: '手机号' } }
 *   失败时: { code: 400/500, msg: '错误信息', data: null }
 */
router.post('/bind-phone', require('../middleware/auth').authUser, async (req, res) => {
  try {
    const { code } = req.body;

    // 参数校验
    if (!code) {
      return res.json({
        code: 400,
        msg: '缺少code参数',
        data: null
      });
    }

    // 调用微信接口获取手机号
    // 注意：这个接口需要小程序已经通过微信认证
    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${await getAccessToken()}`,
      { code }
    );

    // 检查微信接口返回
    if (response.data.errcode !== 0) {
      return res.json({
        code: 400,
        msg: '获取手机号失败: ' + response.data.errmsg,
        data: null
      });
    }

    // 获取手机号信息
    const phoneInfo = response.data.phone_info;
    const phone = phoneInfo.purePhoneNumber; // 纯手机号（不带区号）

    // 更新用户的手机号
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.json({
        code: 404,
        msg: '用户不存在',
        data: null
      });
    }

    user.phone = phone;
    await user.save();

    res.json({
      code: 200,
      msg: '绑定成功',
      data: { phone }
    });
  } catch (error) {
    console.error('绑定手机号错误:', error);
    res.json({
      code: 500,
      msg: '绑定失败',
      data: null
    });
  }
});

/**
 * 获取微信 access_token
 * access_token 是调用微信接口的凭证，有效期为 2 小时
 * 这里简化处理，每次都重新获取（实际项目中应该缓存）
 */
async function getAccessToken() {
  const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: process.env.WX_APPID,
      secret: process.env.WX_SECRET
    }
  });
  return response.data.access_token;
}

/**
 * @api {POST} /auth/update-profile 更新用户个人信息
 * @method POST
 * @description 更新当前登录用户的个人信息，包括昵称、头像和手机号
 *
 * @requires 用户登录（authUser 中间件会验证 token 并将用户信息挂载到 req.user 上）
 *
 * @param {Object} req.body - 请求体
 * @param {string} [req.body.nickName] - 用户昵称
 * @param {string} [req.body.avatarUrl] - 用户头像URL
 * @param {string} [req.body.phone] - 手机号
 *
 * @returns {Object} 返回JSON格式的响应：
 *   成功时: { code: 200, msg: '更新成功', data: null }
 *   失败时: { code: 400/500, msg: '错误信息', data: null }
 */
router.post('/update-profile', require('../middleware/auth').authUser, async (req, res) => {
  try {
    const { nickName, avatarUrl, phone } = req.body;
    
    // 获取当前用户
    const user = await db.User.findByPk(req.user.id);
    if (!user) {
      return res.json({
        code: 404,
        msg: '用户不存在',
        data: null
      });
    }
    
    // 更新用户信息
    if (nickName) user.nickName = nickName;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (phone) user.phone = phone;
    
    await user.save();
    
    res.json({
      code: 200,
      msg: '更新成功',
      data: null
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.json({
      code: 500,
      msg: '更新失败',
      data: null
    });
  }
});

// 生成随机用户名
function generateRandomUsername() {
  const adjectives = ['快乐的', '勇敢的', '聪明的', '友善的', '活泼的', '机智的', '热情的', '耐心的', '细心的', '幽默的'];
  const nouns = ['篮球手', '运动家', '健身达人', '灌篮高手', '三分王', '篮板王', '控球大师', '得分王', '防守专家', '团队领袖'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${number}`;
}

// 生成随机头像（使用 base64 编码的 SVG）
function generateRandomAvatar() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomId = Math.floor(Math.random() * 1000);
  
  // 生成简单的 SVG 头像
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" fill="${randomColor}"/>
    <circle cx="50" cy="40" r="20" fill="white" opacity="0.8"/>
    <path d="M 30 70 Q 50 85 70 70" stroke="white" stroke-width="3" fill="none" opacity="0.8"/>
  </svg>`;
  
  // 将 SVG 转换为 base64
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// 导出路由器，供主应用文件引入使用
module.exports = router;
