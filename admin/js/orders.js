/**
 * ============================================================================
 * 文件名：orders.js
 * 文件说明：订单管理页面的渲染与操作
 * ----------------------------------------------------------------------------
 * 这个文件负责管理后台"订单管理"页面的所有功能：
 *   1. 渲染订单列表页面（包含状态筛选下拉框和订单表格）
 *   2. 从后端加载订单数据并显示在表格中
 *   3. 支持按订单状态筛选（全部、待支付、已支付、已完成、已取消）
 *   4. 完成订单操作（把"已支付"的订单标记为"已完成"）
 *   5. 取消订单操作（需要填写取消原因）
 *
 * 订单的生命周期（状态流转）：
 *   待支付(pending) → 已支付(paid) → 已完成(completed)
 *                  ↘ 已取消(cancelled) ↗
 *   用户下单后状态为"待支付"，支付后变为"已支付"，
 *   管理员确认服务完成后标记为"已完成"，
 *   任何未完成的订单都可以被取消。
 * ============================================================================
 */

/**
 * renderOrders —— 渲染订单管理页面的 HTML 结构
 *
 * 在内容区域创建：
 *   1. 一个状态筛选下拉框（<select>），用于按状态过滤订单
 *   2. 一个订单数据表格，包含表头（订单号、用户、场地等列）
 * 页面结构创建完成后，自动调用 loadOrders() 加载订单数据。
 */
async function renderOrders() {
  // 获取主内容区域元素
  const contentArea = document.getElementById('contentArea');

  // 设置订单管理页面的 HTML 结构
  // <select> 是下拉选择框，onchange="loadOrders()" 表示选项改变时自动重新加载订单
  // <option value=""> 表示"全部状态"（不筛选）
  // 其他 <option> 分别对应四种订单状态
  contentArea.innerHTML = `
    <div class="card">
      <div class="card-title">订单管理</div>
      <div style="margin-bottom: 20px;">
        <select id="statusFilter" onchange="loadOrders()">
          <option value="">全部状态</option>
          <option value="pending">待支付</option>
          <option value="paid">已支付</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      <table class="table" id="ordersTable">
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户</th>
            <th>场地</th>
            <th>日期</th>
            <th>时段</th>
            <th>金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  // 页面结构创建完成后，立即加载订单数据
  loadOrders();
}

/**
 * loadOrders —— 从后端加载订单列表数据并填充到表格中
 *
 * 工作流程：
 *   1. 读取状态筛选下拉框的当前选中值
 *   2. 构建请求参数（最多 100 条，可选的状态筛选）
 *   3. 调用后端接口获取订单数据
 *   4. 把每条订单数据渲染成表格的一行
 *   5. 根据订单状态动态显示/隐藏操作按钮
 *
 * 这个函数在以下场景会被调用：
 *   - 页面首次加载时
 *   - 用户切换状态筛选时（下拉框的 onchange 事件）
 *   - 完成或取消订单后（刷新列表）
 */
async function loadOrders() {
  // 获取状态筛选下拉框的当前值
  // ?. 是"可选链"操作符——如果元素不存在不会报错，而是返回 undefined
  // || '' 表示如果值为 undefined 或空，就用空字符串代替（即不筛选）
  const status = document.getElementById('statusFilter')?.value || '';

  try {
    // 使用 URLSearchParams 构建 URL 查询参数
    // 这是一个方便的工具类，可以自动处理参数的编码和拼接
    const params = new URLSearchParams({ limit: 100 });
    // 如果用户选择了某个状态，就把状态参数也加上
    if (status) params.append('status', status);

    // 向后端发送请求，获取订单列表
    // params.toString() 会生成类似 "limit=100&status=paid" 的字符串
    const data = await apiRequest('/admin/orders?' + params);

    // 获取表格的 <tbody>（表格主体）元素
    const tbody = document.querySelector('#ordersTable tbody');

    // 遍历订单数组，把每条订单转换成一行 HTML
    tbody.innerHTML = data.list.map(order => `
      <tr>
        <td>${order.order_no}</td>
        <td>${order.user.nickName}</td>
        <td>${order.venue.name}</td>
        <td>${order.book_date}</td>
        <td>${order.start_time}-${order.end_time}</td>
        <td>¥${order.total_price}</td>
        <td><span class="badge badge-${getStatusClass(order.order_status)}">${getStatusText(order.order_status)}</span></td>
        <td>
          ${order.order_status === 'paid' ? `<button class="btn btn-sm btn-success" onclick="completeOrder(${order.id})">完成</button>` : ''}
          ${order.order_status !== 'cancelled' && order.order_status !== 'completed' ? `<button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})">取消</button>` : ''}
        </td>
      </tr>
    `).join('');
    // 操作列的按钮逻辑说明：
    // - "完成"按钮：只有状态为"已支付"(paid)的订单才显示，点击后将订单标记为已完成
    // - "取消"按钮：状态不是"已取消"也不是"已完成"的订单才显示，点击后可以取消订单
  } catch (error) {
    // 加载失败时显示错误提示
    showMessage('加载订单列表失败', 'error');
  }
}

/**
 * completeOrder —— 将订单标记为"已完成"
 *
 * 当篮球场服务已经完成（用户已经打完球离场），管理员点击"完成"按钮，
 * 调用此函数将订单状态从"已支付"改为"已完成"。
 *
 * @param {number} id - 要完成的订单的 ID
 */
async function completeOrder(id) {
  // 弹出确认对话框，防止管理员误操作
  if (!confirm('确定要完成此订单吗？')) return;

  try {
    // 向后端发送"完成订单"的请求
    // method: 'POST' 表示这是一个提交操作
    await apiRequest('/admin/orders/' + id + '/complete', {
      method: 'POST'
    });
    // 操作成功，显示成功提示
    showMessage('订单已完成');
    // 重新加载订单列表，刷新页面上的数据
    loadOrders();
  } catch (error) {
    // 操作失败，显示错误提示
    showMessage('操作失败: ' + error.message, 'error');
  }
}

/**
 * cancelOrder —— 取消订单
 *
 * 管理员可以取消尚未完成的订单（待支付或已支付状态）。
 * 取消时需要填写取消原因，原因会被发送到后端记录。
 *
 * @param {number} id - 要取消的订单的 ID
 */
async function cancelOrder(id) {
  // 弹出输入框，让管理员填写取消原因
  // prompt() 会显示一个带输入框的对话框，返回用户输入的文字
  // 如果用户点击"取消"按钮或不输入内容，reason 为 null 或空字符串，直接返回不执行
  const reason = prompt('请输入取消原因:');
  if (!reason) return;

  try {
    // 向后端发送"取消订单"的请求，同时把取消原因作为请求体发送
    // JSON.stringify() 把 JavaScript 对象转换成 JSON 字符串
    await apiRequest('/admin/orders/' + id + '/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    // 操作成功，显示成功提示
    showMessage('订单已取消');
    // 重新加载订单列表
    loadOrders();
  } catch (error) {
    // 操作失败，显示错误提示
    showMessage('操作失败: ' + error.message, 'error');
  }
}
