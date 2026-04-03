/**
 * ============================================================================
 * 文件名：config.js
 * 文件说明：系统配置文件
 * ----------------------------------------------------------------------------
 * 这个文件是整个管理后台的"基础设置"文件，就像一栋大楼的地基。
 * 它主要做了以下几件事：
 *   1. 定义后端服务器的地址（API_BASE_URL），告诉前端"去哪里获取数据"
 *   2. 提供管理登录令牌（token）的工具函数——获取、保存、删除
 *   3. 提供检查管理员是否已登录的函数
 *
 * 什么是 token（令牌）？
 *   当管理员成功登录后，服务器会返回一个特殊的字符串（token），
 *   就像进入游乐园时拿到的手环——之后每次请求数据时都要带上它，
 *   服务器看到这个手环才知道"你是合法的管理员"。
 *
 * 什么是 localStorage（本地存储）？
 *   浏览器提供的一个"小仓库"，可以把数据保存在用户的电脑上，
 *   即使关闭浏览器再打开，数据还在。我们用它来保存 token。
 * ============================================================================
 */

/**
 * API_BASE_URL —— 后端服务器的基础地址
 * 所有的网络请求都会以这个地址作为开头，后面再拼接具体的路径。
 * 例如：请求登录接口时，完整地址就是 "http://localhost:3000/api/admin/auth/login"
 *
 * "localhost" 表示本机（也就是你自己的电脑），3000 是服务器监听的端口号。
 * 如果将来服务器部署到了真实的服务器上，需要把这个地址改成真实的域名或IP。
 */
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * getToken —— 获取保存在浏览器中的登录令牌
 *
 * 从浏览器的 localStorage（本地存储）中读取名为 'admin_token' 的值。
 * 如果之前登录过并且没有手动清除，就能拿到 token；否则返回 null（空）。
 *
 * @returns {string|null} 返回 token 字符串，如果没有则返回 null
 */
function getToken() {
  return localStorage.getItem('admin_token');
}

/**
 * setToken —— 把登录令牌保存到浏览器中
 *
 * 登录成功后调用这个函数，把服务器返回的 token 存起来，
 * 这样下次打开页面时就不需要重新登录了。
 *
 * @param {string} token - 服务器返回的登录令牌字符串
 */
function setToken(token) {
  localStorage.setItem('admin_token', token);
}

/**
 * clearToken —— 清除浏览器中保存的登录令牌
 *
 * 退出登录时调用这个函数，把 token 从本地存储中删掉，
 * 这样用户下次访问时就需要重新登录了。
 */
function clearToken() {
  localStorage.removeItem('admin_token');
}

/**
 * checkAuth —— 检查管理员是否已经登录
 *
 * 工作流程：
 *   1. 先调用 getToken() 看看有没有保存的 token
 *   2. 如果没有 token，并且当前页面不是登录页（login.html），
 *      就自动跳转到登录页，让管理员重新登录
 *   3. 如果有 token，返回 true 表示"已登录"
 *
 * 这个函数在每个需要登录才能访问的页面都会被调用，
 * 相当于一个"门卫"，没有通行证就不让进。
 *
 * @returns {boolean} true 表示已登录，false 表示未登录（同时会跳转到登录页）
 */
function checkAuth() {
  // 从本地存储中获取 token
  const token = getToken();

  // 如果没有 token，并且当前不在登录页面，就强制跳转到登录页
  // window.location.pathname 获取当前页面的路径，includes() 检查路径中是否包含 'login.html'
  if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return false;
  }

  // 有 token，说明已登录，返回 true
  return true;
}
