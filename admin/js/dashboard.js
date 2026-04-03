/**
 * ============================================================================
 * 文件名：dashboard.js
 * 文件说明：仪表盘（首页概览）页面的渲染与数据加载
 * ----------------------------------------------------------------------------
 * 这个文件负责管理后台首页（仪表盘/Dashboard）的所有逻辑。
 * 仪表盘是管理员登录后看到的第一个页面，它展示了系统的关键数据概览：
 *   - 今日订单数量
 *   - 今日收入金额
 *   - 总用户数
 *   - 总场地数
 *   - 最近的 10 条订单列表
 *
 * 这个文件还提供了两个工具函数：
 *   - getStatusClass()：根据订单状态返回对应的样式类名（用于显示不同颜色的标签）
 *   - getStatusText()：根据订单状态的英文代码返回中文显示文字
 *
 * 什么是"渲染"？
 *   在前端开发中，"渲染"就是"把数据变成用户能看到的页面内容"。
 *   比如把"今日订单数: 15"这个数据显示到页面上的卡片里。
 *
 * 什么是 innerHTML？
 *   每个 HTML 元素都有一个 innerHTML 属性，它代表这个元素内部的 HTML 内容。
 *   通过修改 innerHTML，我们可以动态地改变页面上显示的内容。
 * ============================================================================
 */

/**
 * renderDashboard —— 渲染仪表盘页面
 *
 * 这是仪表盘页面的主函数，负责：
 *   1. 先在页面上创建统计卡片和订单表格的 HTML 结构（此时数据显示为 "-"）
 *   2. 然后从后端服务器获取统计数据，填充到统计卡片中
 *   3. 最后从后端获取最近的订单列表，填充到表格中
 *
 * 为什么先显示结构再加载数据？
 *   因为网络请求需要时间，如果等数据加载完再显示页面，用户会看到一片空白。
 *   先显示页面骨架（带有 "-" 占位符），用户体验更好。
 */
async function renderDashboard() {
  // 获取页面上 id 为 'contentArea' 的元素——这是主内容区域
  // 所有页面的内容都会被放到这个区域中
  const contentArea = document.getElementById('contentArea');

  // 用 innerHTML 设置内容区域的 HTML 结构
  // 这里使用了模板字符串（反引号 `` ），可以方便地写多行 HTML
  contentArea.innerHTML = `
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card">
        <h3>今日订单</h3>
        <div class="value" id="todayOrders">-</div>
      </div>
      <div class="stat-card">
        <h3>今日收入</h3>
        <div class="value" id="todayRevenue">-</div>
      </div>
      <div class="stat-card">
        <h3>总用户数</h3>
        <div class="value" id="totalUsers">-</div>
      </div>
      <div class="stat-card">
        <h3>总场地数</h3>
        <div class="value" id="totalVenues">-</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">最近订单</div>
      <table class="table" id="recentOrders">
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户</th>
            <th>场地</th>
            <th>日期</th>
            <th>金额</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  // ========== 加载统计数据 ==========
  try {
    // 向后端请求统计概览数据
    // apiRequest 会自动带上 token 并处理错误
    const stats = await apiRequest('/admin/statistics/overview');

    // 把服务器返回的统计数据填充到页面上对应的元素中
    // .textContent 用于设置元素的纯文本内容
    document.getElementById('todayOrders').textContent = stats.todayOrders;
    // 收入金额前面加上人民币符号 ¥
    document.getElementById('todayRevenue').textContent = '¥' + stats.todayRevenue;
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('totalVenues').textContent = stats.totalVenues;
  } catch (error) {
    // 如果请求失败（比如网络错误），显示错误提示
    showMessage('加载统计数据失败', 'error');
  }

  // ========== 加载最近订单列表 ==========
  try {
    // 请求最近的 10 条订单数据（limit=10 表示只要 10 条）
    const orders = await apiRequest('/admin/orders?limit=10');

    // 获取订单表格的 <tbody> 元素（表格主体部分）
    const tbody = document.querySelector('#recentOrders tbody');

    // 使用 .map() 遍历订单数组，把每条订单数据转换成一行 HTML（<tr>）
    // .join('') 把所有行拼接成一个完整的 HTML 字符串
    // 然后赋值给 tbody.innerHTML，表格就会显示出所有订单
    tbody.innerHTML = orders.list.map(order => `
      <tr>
        <td>${order.order_no}</td>
        <td>${order.user.nickName}</td>
        <td>${order.venue.name}</td>
        <td>${order.book_date}</td>
        <td>¥${order.total_price}</td>
        <td><span class="badge badge-${getStatusClass(order.order_status)}">${getStatusText(order.order_status)}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    // 如果加载订单失败，显示错误提示
    showMessage('加载订单数据失败', 'error');
  }
}

/**
 * getStatusClass —— 根据订单状态返回对应的 CSS 样式类名
 *
 * 不同的订单状态需要用不同的颜色来区分，方便管理员一眼识别：
 *   - 'success'（绿色）：已支付、已完成
 *   - 'warning'（黄色/橙色）：待支付
 *   - 'danger'（红色）：已取消
 *
 * @param {string} status - 订单状态的英文代码，如 'paid'、'pending'、'cancelled'、'completed'
 * @returns {string} 对应的 CSS 类名后缀，如 'success'、'warning'、'danger'
 */
function getStatusClass(status) {
  // 定义状态到样式类名的映射关系
  const map = {
    'paid': 'success',       // 已支付 → 绿色
    'pending': 'warning',    // 待支付 → 黄色/橙色
    'cancelled': 'danger',   // 已取消 → 红色
    'completed': 'success'   // 已完成 → 绿色
  };
  // 如果传入的状态在映射表中找到了，就返回对应的类名；否则默认返回 'warning'
  return map[status] || 'warning';
}

/**
 * getStatusText —— 根据订单状态的英文代码返回中文显示文字
 *
 * 后端存储的订单状态是英文（如 'paid'），但页面上需要显示中文给管理员看。
 * 这个函数就是做"英文 → 中文"的翻译。
 *
 * @param {string} status - 订单状态的英文代码
 * @returns {string} 对应的中文文字，如 '已支付'、'待支付'
 */
function getStatusText(status) {
  // 定义英文状态到中文文字的映射关系
  const map = {
    'paid': '已支付',
    'pending': '待支付',
    'cancelled': '已取消',
    'completed': '已完成'
  };
  // 如果找到了对应的中文，就返回；否则直接返回原始的英文状态值
  return map[status] || status;
}
