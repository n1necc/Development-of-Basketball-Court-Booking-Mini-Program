/**
 * ============================================================================
 * 文件名：api.js
 * 文件说明：通用网络请求 & 消息提示工具
 * ----------------------------------------------------------------------------
 * 这个文件提供了两个核心工具函数：
 *   1. apiRequest —— 统一的网络请求函数，所有与后端服务器的数据交互都通过它完成
 *   2. showMessage —— 在页面右上角弹出提示消息（成功/失败）
 *
 * 为什么要把网络请求封装成一个函数？
 *   因为每次请求都需要做很多重复的事情：设置请求头、带上 token、处理错误……
 *   把这些逻辑统一写在一个函数里，其他地方只需要调用 apiRequest() 就行了，
 *   避免到处写重复代码，也方便统一修改。
 *
 * 什么是 async/await？
 *   网络请求需要时间（就像点外卖要等配送），async/await 是 JavaScript 中
 *   处理"需要等待的操作"的语法。加了 async 的函数里可以用 await 来"等待"
 *   某个操作完成后再继续执行下一步。
 * ============================================================================
 */

/**
 * apiRequest —— 通用的 API 请求函数
 *
 * 这是整个管理后台最核心的工具函数，所有页面获取数据、提交数据都通过它。
 *
 * 工作流程：
 *   1. 准备请求头（headers），设置数据格式为 JSON
 *   2. 如果管理员已登录（有 token），自动在请求头中带上 token
 *   3. 使用 fetch() 发送网络请求到后端服务器
 *   4. 解析服务器返回的 JSON 数据
 *   5. 根据返回的状态码（code）判断请求是否成功：
 *      - code === 200：成功，返回数据
 *      - code === 401：未授权（token 过期或无效），自动跳转到登录页
 *      - 其他：请求失败，抛出错误
 *
 * @param {string} url - 请求的路径（不含基础地址），例如 '/admin/venues'
 * @param {Object} options - 可选的请求配置，例如 { method: 'POST', body: '...' }
 * @returns {Promise<Object>} 返回服务器响应中的 data 部分
 * @throws {Error} 请求失败时抛出错误
 */
async function apiRequest(url, options = {}) {
  // 获取保存在浏览器中的登录令牌
  const token = getToken();

  // 设置请求头（headers）
  // 'Content-Type': 'application/json' 告诉服务器"我发送的数据是 JSON 格式"
  // ...options.headers 表示如果调用者传入了额外的请求头，也合并进来
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // 如果有 token，就在请求头中加上 Authorization 字段
  // 'Bearer ' 是一种标准的认证格式，后面跟着实际的 token 值
  // 服务器收到后会验证这个 token 是否有效
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    // 使用 fetch() 发送网络请求
    // API_BASE_URL + url 拼接出完整的请求地址，例如 "http://localhost:3000/api/admin/venues"
    // ...options 把调用者传入的配置（如 method、body）展开合并进去
    const response = await fetch(API_BASE_URL + url, {
      ...options,
      headers
    });

    // 把服务器返回的响应解析为 JSON 对象
    // 服务器返回的数据格式通常是：{ code: 200, msg: '成功', data: {...} }
    const data = await response.json();

    // 判断业务状态码
    if (data.code === 200) {
      // 请求成功，返回 data 字段中的实际数据
      return data.data;
    } else if (data.code === 401) {
      // 401 表示"未授权"——token 过期了或者无效
      // 显示具体的错误信息，然后再跳转到登录页
      const errorMsg = data.msg || '登录已过期，请重新登录';
      showMessage(errorMsg, 'error');
      // 延迟1秒后跳转到登录页，让用户看到错误提示
      setTimeout(() => {
        clearToken();
        window.location.href = 'login.html';
      }, 1000);
      throw new Error(errorMsg);
    } else if (data.code === 403) {
      // 403 表示"禁止访问"——用户没有权限执行此操作
      const errorMsg = data.msg || '您没有权限执行此操作';
      showMessage(errorMsg, 'error');
      throw new Error(errorMsg);
    } else {
      // 其他错误码，把服务器返回的错误消息抛出
      const errorMsg = data.msg || '请求失败';
      showMessage(errorMsg, 'error');
      throw new Error(errorMsg);
    }
  } catch (error) {
    // 捕获所有错误（包括网络错误、JSON 解析错误等），打印到控制台方便调试
    console.error('API请求错误:', error);
    // 把错误继续向上抛出，让调用者可以处理（比如显示错误提示）
    throw error;
  }
}

/**
 * showMessage —— 在页面右上角显示提示消息
 *
 * 操作成功或失败时，调用这个函数可以在页面右上角弹出一个彩色提示条，
 * 3 秒后自动消失。成功是绿色，失败是红色。
 *
 * 工作流程：
 *   1. 动态创建一个 <div> 元素
 *   2. 设置它的样式（位置、颜色、动画等）
 *   3. 把它添加到页面上
 *   4. 设置一个 3 秒的定时器，时间到了自动移除这个元素
 *
 * @param {string} message - 要显示的提示文字，例如 '保存成功'
 * @param {string} type - 提示类型，'success'（成功，绿色）或 'error'（失败，红色），默认为 'success'
 */
function showMessage(message, type = 'success') {
  // 动态创建一个 div 元素作为提示消息的容器
  const div = document.createElement('div');

  // 设置 CSS 类名，方便通过样式表控制外观
  div.className = `message message-${type}`;

  // 设置提示消息的文字内容
  div.textContent = message;

  // 通过 style.cssText 直接设置内联样式（CSS）
  // position: fixed —— 固定定位，不随页面滚动
  // top: 20px; right: 20px —— 显示在页面右上角
  // padding —— 内边距，让文字不紧贴边框
  // background —— 背景颜色：成功用绿色(#1AAD19)，失败用红色(#f44336)
  // color: white —— 文字颜色为白色
  // border-radius: 5px —— 圆角边框
  // z-index: 9999 —— 层级最高，确保显示在所有元素之上
  // animation: slideIn 0.3s —— 滑入动画，持续 0.3 秒
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#1AAD19' : '#f44336'};
    color: white;
    border-radius: 5px;
    z-index: 9999;
    animation: slideIn 0.3s;
  `;

  // 把创建好的提示消息元素添加到页面的 <body> 中，这样它就会显示出来
  document.body.appendChild(div);

  // setTimeout 设置一个定时器：3000 毫秒（3 秒）后自动移除这个提示消息
  // div.remove() 会把这个元素从页面上删除
  setTimeout(() => {
    div.remove();
  }, 3000);
}
