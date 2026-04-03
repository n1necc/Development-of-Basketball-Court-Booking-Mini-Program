/**
 * ============================================================================
 * 文件名：statistics.js
 * 所属模块：篮球场预约系统 - 管理后台 - 数据统计
 * 文件说明：
 *   这个文件负责管理后台的"数据统计"功能。
 *   管理员可以在这里查看系统的各项运营数据，包括：
 *     1. 营收统计：按日期范围查看每日收入，并以折线图和表格形式展示
 *     2. 场地使用排名：查看哪些场地最受欢迎（预订次数最多、收入最高）
 *     3. 场地使用率：查看每个场地的时段利用情况
 *
 * 主要功能：
 *   1. 渲染统计页面的 HTML 结构（包含三个统计卡片）
 *   2. 加载营收数据并绘制折线图（使用 Canvas 画布技术）
 *   3. 加载场地使用排名数据
 *   4. 加载场地使用率数据
 *   5. 导出营收数据为 Excel 文件
 *
 * 技术亮点：
 *   - 使用 HTML5 Canvas 手动绘制折线图（不依赖第三方图表库）
 *   - 使用 Blob 和动态创建 <a> 标签实现文件下载
 *
 * 依赖说明：
 *   - apiRequest()：封装好的网络请求函数
 *   - showMessage()：消息提示函数
 *   - getToken()：获取用户登录令牌的函数
 *   - API_BASE_URL：后端 API 的基础地址
 * ============================================================================
 */

/**
 * 【渲染统计页面】
 * 这个函数的作用是：在页面的内容区域生成数据统计的完整 HTML 结构。
 * 页面包含三个卡片区域：
 *   1. 营收统计卡片：包含日期选择器、查询按钮、导出按钮、折线图画布和数据表格
 *   2. 场地使用排名卡片：包含日期选择器和排名表格
 *   3. 场地使用率卡片：包含日期选择器和使用率表格
 *
 * 页面渲染完成后，会自动设置默认日期（最近7天）并加载所有统计数据。
 */
async function renderStatistics() {
  /* 获取页面中的内容显示区域 */
  const contentArea = document.getElementById('contentArea');

  /*
   * 使用模板字符串设置页面 HTML 结构。
   * 这里创建了三个卡片（card），每个卡片对应一种统计功能。
   */
  contentArea.innerHTML = `
    <div class="card">
      <div class="card-title">营收统计</div>
      <!-- 日期选择区域：管理员可以选择查询的起止日期 -->
      <div style="margin-bottom: 20px;">
        <label>开始日期: <input type="date" id="startDate"></label>
        <label style="margin-left: 20px;">结束日期: <input type="date" id="endDate"></label>
        <!-- onclick 属性：当按钮被点击时，执行指定的 JavaScript 函数 -->
        <button class="btn btn-primary" onclick="loadRevenue()" style="margin-left: 20px;">查询</button>
        <button class="btn btn-success" onclick="exportRevenue()" style="margin-left: 10px;">导出Excel</button>
      </div>
      <!--
        Canvas 画布：HTML5 提供的绘图区域。
        我们用它来手动绘制营收折线图，而不需要引入第三方图表库。
        width 和 height 设置画布的像素尺寸。
      -->
      <div id="revenueChart" style="margin-bottom: 20px;">
        <canvas id="revenueCanvas" width="800" height="300"></canvas>
      </div>
      <!-- 营收数据表格：以表格形式展示每日收入明细 -->
      <table class="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>收入</th>
          </tr>
        </thead>
        <tbody id="revenueTableBody"></tbody>
      </table>
      <!-- 总收入汇总显示 -->
      <div style="margin-top: 20px;">
        <strong>总收入: <span id="totalRevenue">¥0</span></strong>
      </div>
    </div>

    <!-- 第二个卡片：场地使用排名 -->
    <div class="card" style="margin-top: 20px;">
      <div class="card-title">场地使用排名</div>
      <div style="margin-bottom: 20px;">
        <label>开始日期: <input type="date" id="rankingStartDate"></label>
        <label style="margin-left: 20px;">结束日期: <input type="date" id="rankingEndDate"></label>
        <button class="btn btn-primary" onclick="loadVenueRanking()" style="margin-left: 20px;">查询</button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>排名</th>
            <th>场地名称</th>
            <th>位置</th>
            <th>预订次数</th>
            <th>总收入</th>
          </tr>
        </thead>
        <tbody id="rankingTableBody"></tbody>
      </table>
    </div>

    <!-- 第三个卡片：场地使用率统计 -->
    <div class="card" style="margin-top: 20px;">
      <div class="card-title">场地使用率统计</div>
      <div style="margin-bottom: 20px;">
        <label>开始日期: <input type="date" id="usageStartDate"></label>
        <label style="margin-left: 20px;">结束日期: <input type="date" id="usageEndDate"></label>
        <button class="btn btn-primary" onclick="loadUsage()" style="margin-left: 20px;">查询</button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>场地名称</th>
            <th>总时段数</th>
            <th>已预订时段</th>
            <th>使用率</th>
          </tr>
        </thead>
        <tbody id="usageTableBody"></tbody>
      </table>
    </div>
  `;

  /*
   * 设置默认日期范围为最近7天。
   * new Date() 获取当前时间，
   * getTime() 获取时间戳（毫秒数），
   * 7 * 24 * 60 * 60 * 1000 = 7天的毫秒数（7天 × 24小时 × 60分钟 × 60秒 × 1000毫秒）
   */
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  /* 使用 formatDate() 函数将日期对象转换为 "YYYY-MM-DD" 格式的字符串，设置到日期输入框中 */
  document.getElementById('startDate').value = formatDate(weekAgo);
  document.getElementById('endDate').value = formatDate(today);
  document.getElementById('rankingStartDate').value = formatDate(weekAgo);
  document.getElementById('rankingEndDate').value = formatDate(today);
  document.getElementById('usageStartDate').value = formatDate(weekAgo);
  document.getElementById('usageEndDate').value = formatDate(today);

  /* 页面加载完成后，自动加载三种统计数据 */
  loadRevenue();       /* 加载营收数据 */
  loadVenueRanking();  /* 加载场地排名数据 */
  loadUsage();         /* 加载使用率数据 */
}

/* PLACEHOLDER_STATS_FUNCTIONS */

/**
 * 【加载营收数据】
 * 这个函数的作用是：根据管理员选择的日期范围，从后端获取每日营收数据。
 * 获取成功后，更新表格内容、总收入显示，并调用 drawRevenueChart() 绘制折线图。
 *
 * 执行流程：
 *   1. 从日期输入框获取起止日期
 *   2. 验证日期是否已选择
 *   3. 向后端发送请求获取营收数据
 *   4. 将数据渲染到表格中
 *   5. 更新总收入显示
 *   6. 绘制折线图
 */
async function loadRevenue() {
  /* 从日期输入框中获取用户选择的起止日期 */
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  /* 验证：如果用户没有选择日期，显示错误提示并退出 */
  if (!startDate || !endDate) {
    showMessage('请选择日期范围', 'error');
    return;
  }

  try {
    /*
     * 向后端发送 GET 请求，获取营收数据。
     * 使用模板字符串将日期参数拼接到 URL 中（这叫做"查询参数"或"URL参数"）。
     * 后端会返回一个对象，包含 list（每日收入列表）和 total（总收入）。
     */
    const data = await apiRequest(`/admin/statistics/revenue?start_date=${startDate}&end_date=${endDate}`);

    /* 更新营收数据表格 */
    const tbody = document.getElementById('revenueTableBody');
    /*
     * 使用 map() 遍历每日收入数据，生成表格行。
     * toFixed(2) 将数字保留两位小数（例如：123.4 → "123.40"）。
     */
    tbody.innerHTML = data.list.map(item => `
      <tr>
        <td>${item.date}</td>
        <td>¥${item.revenue.toFixed(2)}</td>
      </tr>
    `).join('');

    /* 更新总收入显示 */
    document.getElementById('totalRevenue').textContent = '¥' + data.total.toFixed(2);

    /* 调用绘图函数，将营收数据以折线图的形式展示 */
    drawRevenueChart(data.list);
  } catch (error) {
    showMessage('加载营收数据失败', 'error');
  }
}

/**
 * 【绘制营收折线图】
 * 这个函数的作用是：使用 HTML5 Canvas 技术，将营收数据绘制成一个折线图。
 * 这是整个项目中最复杂的函数之一，涉及到坐标计算和图形绘制。
 *
 * @param {Array} data - 营收数据数组，每个元素包含 { date: "日期", revenue: 收入金额 }
 *
 * Canvas 绘图基础知识：
 *   - Canvas 是一个画布，左上角是坐标原点 (0,0)
 *   - X 轴向右增大，Y 轴向下增大（注意：Y轴方向和数学中相反！）
 *   - getContext('2d') 获取 2D 绘图上下文，所有绘图操作都通过它完成
 *   - beginPath() 开始一条新路径
 *   - moveTo(x, y) 将画笔移动到指定位置（不画线）
 *   - lineTo(x, y) 从当前位置画一条线到指定位置
 *   - stroke() 实际绘制路径（描边）
 *   - fill() 填充路径
 *   - arc(x, y, r, startAngle, endAngle) 画圆弧
 */
function drawRevenueChart(data) {
  /* 获取 Canvas 画布元素 */
  const canvas = document.getElementById('revenueCanvas');
  /* 获取 2D 绘图上下文，后续所有绘图操作都通过 ctx 来完成 */
  const ctx = canvas.getContext('2d');

  /* 清空画布：清除之前绘制的所有内容，从 (0,0) 到画布右下角 */
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* 如果没有数据，不绘制任何内容，直接退出 */
  if (data.length === 0) return;

  /*
   * 设置图表的内边距（padding）。
   * padding 是图表边缘到画布边缘的距离，留出空间用于显示坐标轴标签。
   *
   *   画布结构示意图：
   *   ┌─────────────────────────────┐
   *   │  padding                     │
   *   │  ┌───────────────────────┐  │
   *   │  │                       │  │
   *   │  │    图表绘制区域        │  │
   *   │  │                       │  │
   *   │  └───────────────────────┘  │
   *   │                     padding  │
   *   └─────────────────────────────┘
   */
  const padding = 50;
  const chartWidth = canvas.width - padding * 2;   /* 图表实际绘制区域的宽度 */
  const chartHeight = canvas.height - padding * 2; /* 图表实际绘制区域的高度 */

  /*
   * 计算 Y 轴的缩放比例：
   *   - Math.max(...data.map(d => d.revenue))：找出所有收入中的最大值
   *   - 展开运算符 (...)：将数组展开为单独的参数传给 Math.max
   *   - yScale：每单位收入对应的像素数，用于将收入值转换为画布上的 Y 坐标
   */
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const yScale = chartHeight / maxRevenue;

  /*
   * 计算 X 轴上每个数据点之间的间距：
   *   - 如果只有1个数据点，间距为整个图表宽度（避免除以0）
   */
  const xStep = chartWidth / (data.length - 1 || 1);

  /* ========== 绘制坐标轴 ========== */
  ctx.strokeStyle = '#e5e7eb'; /* 设置线条颜色为浅灰色 */
  ctx.lineWidth = 1;           /* 设置线条宽度为1像素 */

  /* 绘制 Y 轴（垂直线）：从左上角到左下角 */
  ctx.beginPath();
  ctx.moveTo(padding, padding);                    /* 起点：左上角 */
  ctx.lineTo(padding, canvas.height - padding);    /* 终点：左下角 */
  ctx.stroke();

  /* 绘制 X 轴（水平线）：从左下角到右下角 */
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - padding);                /* 起点：左下角 */
  ctx.lineTo(canvas.width - padding, canvas.height - padding); /* 终点：右下角 */
  ctx.stroke();

  /* PLACEHOLDER_CHART_GRID */

  /* ========== 绘制网格线和 Y 轴标签 ========== */
  ctx.fillStyle = '#6b7280';  /* 设置文字颜色为灰色 */
  ctx.font = '12px Arial';    /* 设置字体大小和字体 */
  ctx.textAlign = 'right';    /* 设置文字右对齐（Y轴标签在轴线左侧） */

  /*
   * 绘制5条水平网格线和对应的 Y 轴标签。
   * 从底部（i=0，收入为0）到顶部（i=5，收入为最大值），均匀分布。
   */
  for (let i = 0; i <= 5; i++) {
    /* 计算当前网格线的 Y 坐标（注意：Canvas 的 Y 轴向下增大，所以要用减法） */
    const y = canvas.height - padding - (chartHeight / 5) * i;
    /* 计算当前网格线对应的收入值 */
    const value = (maxRevenue / 5) * i;

    /* 绘制水平网格线（浅灰色虚线效果） */
    ctx.strokeStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();

    /* 在 Y 轴左侧绘制收入标签文字（例如：¥100、¥200...） */
    ctx.fillText('¥' + value.toFixed(0), padding - 10, y + 4);
  }

  /* ========== 绘制折线（连接所有数据点的线段） ========== */
  ctx.strokeStyle = '#f97316'; /* 设置折线颜色为橙色 */
  ctx.lineWidth = 2;           /* 设置折线宽度为2像素 */
  ctx.beginPath();

  /*
   * 遍历每个数据点，计算其在画布上的坐标并连线。
   * forEach 会对数组中的每个元素执行一次回调函数。
   * index 是当前元素的索引（从0开始）。
   */
  data.forEach((item, index) => {
    /* 计算数据点的 X 坐标：起始位置 + 间距 × 索引 */
    const x = padding + xStep * index;
    /*
     * 计算数据点的 Y 坐标：
     * 因为 Canvas 的 Y 轴向下增大，而我们希望收入越高点越靠上，
     * 所以用"底部位置 - 收入值 × 缩放比例"来计算。
     */
    const y = canvas.height - padding - item.revenue * yScale;

    /* 第一个点用 moveTo（移动画笔），后续的点用 lineTo（画线连接） */
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  /* 实际绘制折线 */
  ctx.stroke();

  /* ========== 绘制数据点（每个数据点画一个小圆点） ========== */
  ctx.fillStyle = '#f97316'; /* 设置圆点颜色为橙色（与折线颜色一致） */
  data.forEach((item, index) => {
    const x = padding + xStep * index;
    const y = canvas.height - padding - item.revenue * yScale;

    /*
     * arc(x, y, radius, startAngle, endAngle) 绘制圆弧：
     *   - x, y：圆心坐标
     *   - 4：半径为4像素
     *   - 0 到 Math.PI * 2：从0度到360度，即一个完整的圆
     */
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill(); /* 填充圆点 */
  });

  /* ========== 绘制 X 轴标签（日期） ========== */
  ctx.fillStyle = '#6b7280';  /* 文字颜色 */
  ctx.font = '11px Arial';    /* 字体稍小一些 */
  ctx.textAlign = 'center';   /* 文字居中对齐 */
  data.forEach((item, index) => {
    const x = padding + xStep * index;
    /* substring(5) 截取日期字符串从第5个字符开始的部分，即只显示"月-日"（去掉年份） */
    const dateStr = item.date.substring(5);
    /* 在 X 轴下方绘制日期标签 */
    ctx.fillText(dateStr, x, canvas.height - padding + 20);
  });
}

/* PLACEHOLDER_VENUE_RANKING */

/**
 * 【加载场地使用排名】
 * 这个函数的作用是：根据日期范围，从后端获取各场地的预订次数和收入排名。
 * 管理员可以通过这个功能了解哪些场地最受欢迎。
 *
 * 返回数据包含：场地名称、位置、预订次数、总收入。
 * 数据按预订次数或收入从高到低排列。
 */
async function loadVenueRanking() {
  /* 获取排名查询的起止日期 */
  const startDate = document.getElementById('rankingStartDate').value;
  const endDate = document.getElementById('rankingEndDate').value;

  /* 验证日期是否已选择 */
  if (!startDate || !endDate) {
    showMessage('请选择日期范围', 'error');
    return;
  }

  try {
    /* 向后端发送请求，获取场地排名数据 */
    const data = await apiRequest(`/admin/statistics/venue-ranking?start_date=${startDate}&end_date=${endDate}`);
    /* 在浏览器控制台输出数据，方便开发调试 */
    console.log('场地排名数据:', data);
    const tbody = document.getElementById('rankingTableBody');

    /* 如果没有数据，显示"暂无数据"提示 */
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">暂无数据</td></tr>';
      return;
    }

    /*
     * 遍历排名数据，生成表格行。
     * index + 1 作为排名序号（因为 index 从0开始，排名从1开始）。
     * toFixed(2) 将收入保留两位小数。
     */
    tbody.innerHTML = data.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.venue_name}</td>
        <td>${item.location}</td>
        <td>${item.booking_count}</td>
        <td>¥${item.total_revenue.toFixed(2)}</td>
      </tr>
    `).join('');
  } catch (error) {
    /* 在控制台输出详细错误信息，方便排查问题 */
    console.error('场地排名错误:', error);
    showMessage('加载场地排名失败: ' + error.message, 'error');
  }
}

/**
 * 【导出营收数据为 Excel 文件】
 * 这个函数的作用是：将指定日期范围内的营收数据导出为 Excel 文件并下载到本地。
 *
 * 实现原理：
 *   1. 向后端发送请求，后端生成 Excel 文件并返回文件的二进制数据（Blob）
 *   2. 在浏览器中创建一个临时的下载链接
 *   3. 自动触发点击下载
 *   4. 下载完成后清理临时资源
 *
 * 关键概念：
 *   - Blob（Binary Large Object）：二进制大对象，用于表示文件数据
 *   - URL.createObjectURL()：为 Blob 创建一个临时的 URL 地址
 *   - 动态创建 <a> 标签并触发点击：这是浏览器中实现文件下载的常用技巧
 */
function exportRevenue() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  /* 验证日期是否已选择 */
  if (!startDate || !endDate) {
    showMessage('请选择日期范围', 'error');
    return;
  }

  /* 获取用户的登录令牌（Token），用于身份验证 */
  const token = getToken();
  /* 拼接导出接口的完整 URL */
  const url = `${API_BASE_URL}/admin/statistics/export-revenue?start_date=${startDate}&end_date=${endDate}`;

  /*
   * 使用 fetch API 发送请求下载文件。
   * 这里没有使用 apiRequest()，因为需要处理二进制文件数据（Blob），
   * 而 apiRequest() 通常只处理 JSON 数据。
   *
   * 请求头中携带 Authorization（授权）信息，格式为 "Bearer 令牌值"，
   * 这是 JWT（JSON Web Token）认证的标准格式。
   */
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  /*
   * .then() 是 Promise 的链式调用方法：
   * 第一个 .then()：检查响应是否成功，然后将响应转换为 Blob（二进制数据）
   */
  .then(response => {
    if (!response.ok) throw new Error('导出失败');
    /* response.blob() 将响应体转换为 Blob 对象（二进制文件数据） */
    return response.blob();
  })
  /*
   * 第二个 .then()：拿到 Blob 数据后，创建下载链接并触发下载
   */
  .then(blob => {
    /* 为 Blob 创建一个临时的 URL（类似 blob:http://...） */
    const url = window.URL.createObjectURL(blob);
    /* 动态创建一个 <a>（链接）元素 */
    const a = document.createElement('a');
    /* 设置链接地址为 Blob 的临时 URL */
    a.href = url;
    /* 设置下载文件名，例如：revenue_2024-01-01_2024-01-07.xlsx */
    a.download = `revenue_${startDate}_${endDate}.xlsx`;
    /* 将 <a> 元素添加到页面中（必须添加到页面才能触发点击） */
    document.body.appendChild(a);
    /* 自动触发点击，开始下载文件 */
    a.click();
    /* 释放临时 URL，避免内存泄漏 */
    window.URL.revokeObjectURL(url);
    /* 从页面中移除临时创建的 <a> 元素，保持页面整洁 */
    document.body.removeChild(a);
    showMessage('导出成功', 'success');
  })
  /*
   * .catch()：如果上面任何一步出错，都会跳到这里执行
   */
  .catch(error => {
    showMessage('导出失败', 'error');
  });
}

/* PLACEHOLDER_USAGE_FORMAT */

/**
 * 【加载场地使用率数据】
 * 这个函数的作用是：根据日期范围，从后端获取每个场地的使用率统计数据。
 * 使用率 = 已预订时段数 / 总时段数 × 100%
 *
 * 管理员可以通过这个数据了解哪些场地利用率高、哪些场地闲置较多，
 * 从而做出合理的运营调整（比如调整价格、增加推广等）。
 *
 * 返回数据包含：场地名称、总时段数、已预订时段数、使用率百分比。
 */
async function loadUsage() {
  /* 获取使用率查询的起止日期 */
  const startDate = document.getElementById('usageStartDate').value;
  const endDate = document.getElementById('usageEndDate').value;

  /* 验证日期是否已选择 */
  if (!startDate || !endDate) {
    showMessage('请选择日期范围', 'error');
    return;
  }

  try {
    /* 向后端发送请求，获取场地使用率数据 */
    const data = await apiRequest(`/admin/statistics/usage?start_date=${startDate}&end_date=${endDate}`);
    const tbody = document.getElementById('usageTableBody');

    /*
     * 遍历使用率数据，生成表格行。
     * 每行显示：场地名称、总时段数、已预订时段数、使用率百分比。
     */
    tbody.innerHTML = data.map(item => `
      <tr>
        <td>${item.venue_name}</td>
        <td>${item.total_slots}</td>
        <td>${item.booked_slots}</td>
        <td>${item.usage_rate}%</td>
      </tr>
    `).join('');
  } catch (error) {
    showMessage('加载使用率数据失败', 'error');
  }
}

/**
 * 【格式化日期】
 * 这个函数的作用是：将 JavaScript 的 Date 对象转换为 "YYYY-MM-DD" 格式的字符串。
 * 例如：new Date('2024-01-05') → "2024-01-05"
 *
 * 这个格式是 HTML <input type="date"> 元素所需要的标准格式。
 *
 * @param {Date} date - JavaScript 日期对象
 * @returns {string} 格式化后的日期字符串，例如 "2024-01-05"
 *
 * 关键方法说明：
 *   - getFullYear()：获取四位数的年份（例如：2024）
 *   - getMonth()：获取月份（0-11，注意：0代表1月，所以需要 +1）
 *   - getDate()：获取日期（1-31）
 *   - String()：将数字转换为字符串
 *   - padStart(2, '0')：如果字符串长度不足2位，在前面补'0'（例如：'1' → '01'）
 */
function formatDate(date) {
  const year = date.getFullYear();
  /* getMonth() 返回 0-11，所以要 +1 才是实际月份 */
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  /* 使用模板字符串拼接成 "YYYY-MM-DD" 格式 */
  return `${year}-${month}-${day}`;
}