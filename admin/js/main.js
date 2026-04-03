/**
 * ============================================================================
 * 文件名：main.js
 * 文件说明：管理后台主页面的入口文件（页面路由与导航控制）
 * ----------------------------------------------------------------------------
 * 这个文件是管理后台首页（index.html）加载后最先执行的核心脚本。
 * 它主要做了以下几件事：
 *   1. 检查管理员是否已登录（未登录则跳转到登录页）
 *   2. 定义"页面路由"——把导航菜单中的每个选项和对应的渲染函数关联起来
 *   3. 监听导航菜单的点击事件，实现页面切换
 *   4. 提供退出登录功能
 *   5. 默认加载仪表盘（首页）
 *
 * 什么是"路由"？
 *   在网页应用中，"路由"就是"根据用户的选择，显示不同的页面内容"。
 *   这里我们用一个简单的对象（pages）来实现：
 *   键（key）是页面名称，值（value）是对应的渲染函数。
 *   用户点击"场地管理"，就调用 renderVenues() 来显示场地管理的内容。
 *
 * 什么是"单页应用"（SPA）？
 *   整个管理后台只有一个 HTML 页面（index.html），
 *   点击不同的导航菜单时，不会跳转到新页面，而是通过 JavaScript
 *   动态替换页面中间的内容区域。这就是"单页应用"的基本思路。
 * ============================================================================
 */

// ========== 第一步：检查登录状态 ==========
// 调用 config.js 中定义的 checkAuth() 函数
// 如果管理员没有登录（没有有效的 token），会自动跳转到登录页面
checkAuth();

// ========== 第二步：定义页面路由映射表 ==========
// 这个对象把每个页面的名称（字符串）和对应的渲染函数关联起来
// 例如：当用户点击"场地管理"时，page 的值是 'venues'，
// 程序就会调用 pages['venues']，也就是 renderVenues() 函数
const pages = {
  dashboard: renderDashboard,         // 仪表盘（首页概览）
  venues: renderVenues,               // 场地管理
  orders: renderOrders,               // 订单管理
  users: renderUsers,                 // 用户管理
  news: renderNews,                   // 新闻管理
  announcements: renderAnnouncements, // 公告管理
  statistics: renderStatistics,       // 数据统计
  settings: renderSettings            // 系统设置
};

// ========== 第三步：监听导航菜单的点击事件 ==========
// document.querySelectorAll('.nav-item') 获取页面上所有带有 'nav-item' 类名的元素（即左侧导航菜单的每一项）
// .forEach() 遍历每一个导航项，给它们分别添加点击事件监听器
document.querySelectorAll('.nav-item').forEach(item => {
  // 当用户点击某个导航项时，执行以下操作
  item.addEventListener('click', (e) => {
    // 阻止 <a> 标签的默认跳转行为（因为导航项可能是链接）
    e.preventDefault();

    // 从被点击的导航项上获取 data-page 属性的值
    // HTML 中类似这样：<a class="nav-item" data-page="venues">场地管理</a>
    // dataset.page 就能拿到 'venues' 这个值
    const page = item.dataset.page;

    // --- 更新导航菜单的选中状态 ---
    // 先把所有导航项的 'active'（激活/选中）样式移除
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    // 再给当前被点击的导航项添加 'active' 样式，使其高亮显示
    item.classList.add('active');

    // --- 更新页面顶部的标题文字 ---
    // 把页面标题改成当前点击的导航项的文字内容
    // .trim() 去除文字前后的空格
    document.getElementById('pageTitle').textContent = item.textContent.trim();

    // --- 渲染对应的页面内容 ---
    // 在路由映射表中查找对应的渲染函数，如果找到了就调用它
    if (pages[page]) {
      pages[page]();
    }
  });
});

// ========== 第四步：退出登录功能 ==========
/**
 * logout —— 退出登录
 *
 * 当管理员点击"退出登录"按钮时调用。
 * 先弹出确认对话框，防止误操作。
 * 确认后清除本地保存的 token，然后跳转回登录页面。
 */
function logout() {
  // confirm() 弹出一个带"确定"和"取消"按钮的对话框
  // 用户点击"确定"返回 true，点击"取消"返回 false
  if (confirm('确定要退出登录吗？')) {
    // 清除浏览器中保存的登录令牌（调用 config.js 中的函数）
    clearToken();
    // 跳转到登录页面
    window.location.href = 'login.html';
  }
}

// ========== 第五步：初始化——默认加载仪表盘页面 ==========
// 页面打开后，默认显示仪表盘（Dashboard）的内容
renderDashboard();
