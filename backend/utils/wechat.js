/**
 * ============================================================================
 * 文件名：wechat.js
 * 所属模块：工具模块 - 微信小程序集成
 * 文件说明：
 *   这个文件封装了与微信小程序相关的功能，主要用于向用户发送"订阅消息"。
 *
 *   【什么是订阅消息？】
 *   订阅消息是微信小程序的一种消息推送机制。当用户在小程序中订阅了某个消息后，
 *   后台服务器就可以在特定事件发生时（比如支付成功、即将开场），
 *   通过微信的服务器向用户的微信发送一条通知消息。
 *   用户在微信的"服务通知"中就能看到这条消息。
 *
 *   【工作流程】
 *   1. 先通过 appid 和 secret 向微信服务器获取 access_token（访问令牌）
 *   2. 然后携带 access_token 调用微信的消息发送接口
 *   3. 微信服务器收到请求后，会把消息推送给指定的用户
 *
 *   本文件提供了以下功能：
 *     - getAccessToken()       获取微信 access_token
 *     - sendSubscribeMessage() 发送订阅消息（通用方法）
 *     - notifyOrderPaid()      发送"支付成功"通知
 *     - notifyBeforeStart()    发送"开场前提醒"通知
 *
 * 依赖库：axios（HTTP 请求库，用于调用微信 API）
 * ============================================================================
 */

// ==================== 引入依赖模块 ====================

/**
 * axios —— 一个流行的 HTTP 请求库
 * 可以用它来发送 GET、POST 等网络请求，类似于浏览器中的 fetch
 * 这里用它来调用微信开放平台的 API 接口
 */
const axios = require('axios');

// ==================== 函数定义 ====================

/**
 * 获取微信 access_token（访问令牌）
 *
 * 【什么是 access_token？】
 * access_token 是调用微信 API 的"通行证"。
 * 就像进入小区需要门禁卡一样，调用微信的接口也需要先获取这个令牌。
 * 每次获取的 access_token 有效期为 2 小时，过期后需要重新获取。
 *
 * 【获取方式】
 * 向微信服务器发送 GET 请求，携带小程序的 appid 和 secret，
 * 微信验证通过后会返回 access_token。
 *
 * @returns {string|null} 成功返回 access_token 字符串，失败返回 null
 */
async function getAccessToken() {
  try {
    // 向微信的 token 接口发送 GET 请求
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',       // 授权类型：客户端凭证模式（固定值）
        appid: process.env.WX_APPID,           // 小程序的 AppID（从环境变量中读取）
        secret: process.env.WX_SECRET          // 小程序的 AppSecret（从环境变量中读取）
        // 注意：AppID 和 AppSecret 存储在环境变量（.env 文件）中，
        // 而不是直接写在代码里，这是为了安全——防止密钥泄露
      }
    });
    // 从响应数据中提取 access_token 并返回
    return response.data.access_token;
  } catch (error) {
    console.error('获取access_token失败:', error);
    return null;    // 获取失败时返回 null，调用方需要检查返回值
  }
}

/**
 * 发送订阅消息（通用方法）
 *
 * 这是一个通用的消息发送函数，其他具体的通知函数（如支付成功通知）
 * 都会调用这个函数来实际发送消息。
 *
 * @param {string} openid      - 接收消息的用户的 openid
 *                                openid 是微信为每个用户在每个小程序中分配的唯一标识
 *                                就像每个人在每个小区都有一个专属的门牌号
 * @param {string} templateId  - 消息模板 ID
 *                                每种消息都有一个模板（在微信公众平台后台配置），
 *                                模板定义了消息的格式和字段
 * @param {Object} data        - 模板中各字段的值
 *                                例如：{ thing1: { value: '场地名' }, date2: { value: '日期' } }
 * @param {string} page        - 用户点击消息后跳转到的小程序页面路径
 *
 * @returns {boolean} 发送成功返回 true，失败返回 false
 */
async function sendSubscribeMessage(openid, templateId, data, page) {
  try {
    // 第一步：获取 access_token
    const accessToken = await getAccessToken();
    // 如果获取 token 失败，直接返回 false
    if (!accessToken) return false;

    // 第二步：调用微信的订阅消息发送接口
    // 这是一个 POST 请求，access_token 放在 URL 参数中，消息内容放在请求体中
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        touser: openid,              // 接收者的 openid
        template_id: templateId,     // 消息模板 ID
        page: page,                  // 点击消息后跳转的页面
        data: data                   // 模板字段数据
      }
    );

    // 微信返回 errcode 为 0 表示发送成功
    return response.data.errcode === 0;
  } catch (error) {
    console.error('发送订阅消息失败:', error);
    return false;
  }
}

/**
 * 发送"订单支付成功"通知
 *
 * 当用户成功支付了一个篮球场预订订单后，调用此函数向用户发送通知。
 * 用户会在微信的"服务通知"中收到一条消息，内容包括：
 *   - 场地名称
 *   - 预订日期和时间段
 *   - 支付金额
 *   - 支付状态
 *
 * @param {Object} user   - 用户对象，需要包含 openid 字段
 * @param {Object} order  - 订单对象，需要包含 book_date、start_time、end_time、total_price、id 字段
 * @param {Object} venue  - 场地对象，需要包含 name 字段
 *
 * @returns {boolean} 发送成功返回 true，失败返回 false
 */
async function notifyOrderPaid(user, order, venue) {
  // 按照微信消息模板的格式，组装各字段的数据
  // thing1、date2、amount3、thing4 是模板中定义的字段名
  // 不同的模板字段名可能不同，需要在微信公众平台后台查看
  const data = {
    thing1: { value: venue.name },                                              // 场地名称
    date2: { value: `${order.book_date} ${order.start_time}-${order.end_time}` }, // 预订时间
    amount3: { value: `¥${order.total_price}` },                                // 支付金额
    thing4: { value: '支付成功' }                                                // 支付状态
  };

  // 调用通用的消息发送函数
  return await sendSubscribeMessage(
    user.openid,                                           // 接收者
    'YOUR_TEMPLATE_ID',                                    // 模板 ID（需要替换为实际的模板 ID）
    data,                                                  // 消息数据
    'pages/order-detail/order-detail?id=' + order.id       // 点击消息后跳转到订单详情页
  );
}

/**
 * 发送"开场前提醒"通知
 *
 * 在用户预订的场地即将开始使用前，调用此函数提醒用户准时到场。
 * 通常由定时任务在开场前一定时间（如 30 分钟或 1 小时）触发。
 * 用户会收到一条包含以下信息的通知：
 *   - 场地名称
 *   - 开始时间
 *   - 温馨提示
 *
 * @param {Object} user   - 用户对象，需要包含 openid 字段
 * @param {Object} order  - 订单对象，需要包含 book_date、start_time、id 字段
 * @param {Object} venue  - 场地对象，需要包含 name 字段
 *
 * @returns {boolean} 发送成功返回 true，失败返回 false
 */
async function notifyBeforeStart(user, order, venue) {
  // 组装开场提醒的消息数据
  const data = {
    thing1: { value: venue.name },                              // 场地名称
    date2: { value: `${order.book_date} ${order.start_time}` }, // 开始时间
    thing3: { value: '请准时到场' }                              // 温馨提示
  };

  return await sendSubscribeMessage(
    user.openid,
    'YOUR_TEMPLATE_ID',                                    // 模板 ID（需要替换为实际的模板 ID）
    data,
    'pages/order-detail/order-detail?id=' + order.id       // 跳转到订单详情页
  );
}

// ==================== 导出模块 ====================
/**
 * 将所有函数导出，供其他模块使用
 *
 * 使用示例：
 *   const wechat = require('./utils/wechat');
 *   await wechat.notifyOrderPaid(user, order, venue);    // 发送支付成功通知
 *   await wechat.notifyBeforeStart(user, order, venue);  // 发送开场提醒
 */
module.exports = {
  getAccessToken,          // 获取微信 access_token
  sendSubscribeMessage,    // 发送订阅消息（通用）
  notifyOrderPaid,         // 发送支付成功通知
  notifyBeforeStart        // 发送开场前提醒
};