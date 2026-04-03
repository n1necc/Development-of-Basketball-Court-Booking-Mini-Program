/**
 * ============================================================================
 * 文件名：news.js
 * 所属模块：篮球场预约系统 - 管理后台 - 资讯管理
 * 文件说明：
 *   这个文件负责管理后台的"资讯管理"功能。
 *   管理员可以在这里发布、编辑、删除资讯文章。
 *   资讯可以是篮球相关的新闻、赛事报道、场馆介绍等内容，
 *   会展示在用户端供用户浏览阅读。
 *
 * 主要功能：
 *   1. 渲染资讯管理页面（包含资讯列表表格和添加/编辑的弹窗表单）
 *   2. 从后端加载资讯列表并展示
 *   3. 添加新资讯
 *   4. 编辑已有资讯
 *   5. 删除资讯
 *
 * 与 announcements.js（公告管理）的区别：
 *   - 公告：简短的通知信息，通常是系统级别的重要通知
 *   - 资讯：较长的文章内容，包含标题、摘要、正文、配图等，类似新闻
 *
 * 依赖说明：
 *   - apiRequest()：封装好的网络请求函数，用于和后端服务器通信
 * ============================================================================
 */

/**
 * 【全局变量】资讯列表数据
 * 用一个数组来存储从后端获取的所有资讯数据。
 * 这个变量会在多个函数之间共享使用（加载数据时写入，渲染表格和编辑时读取）。
 */
let newsList = [];

/**
 * 【渲染资讯管理页面】
 * 这个函数的作用是：在页面的内容区域生成资讯管理的完整 HTML 结构。
 * 包括：页面顶部的"添加资讯"按钮、资讯列表表格、以及一个模态框（弹窗）用于添加/编辑资讯。
 *
 * 与公告管理相比，资讯表单多了"摘要"、"内容"和"图片URL"字段。
 */
function renderNews() {
  /* 获取页面中的内容显示区域 */
  const content = document.getElementById('contentArea');

  /*
   * 设置内容区域的 HTML，包含三个主要部分：
   *   1. page-header：页面顶部，包含"添加资讯"按钮
   *   2. table-container：资讯列表表格
   *   3. newsModal：模态框（弹窗），用于添加或编辑资讯的表单
   */
  content.innerHTML = `
    <div class="page-header">
      <button class="btn btn-primary" onclick="showNewsAddModal()">添加资讯</button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>摘要</th>
            <th>状态</th>
            <th>排序</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="newsTable">
          <!-- 初始显示"加载中..."，等数据加载完成后会被替换为真实数据 -->
          <tr><td colspan="7" class="empty">加载中...</td></tr>
        </tbody>
      </table>
    </div>

    <!--
      模态框（Modal）：一种弹窗组件。
      点击"添加资讯"或"编辑"按钮时会显示出来，用于填写资讯信息。
      默认是隐藏的，通过 JavaScript 控制显示和隐藏。
    -->
    <div id="newsModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <!-- 模态框标题，添加时显示"添加资讯"，编辑时显示"编辑资讯" -->
          <h3 id="newsModalTitle">添加资讯</h3>
          <!-- 关闭按钮（× 号） -->
          <span class="close" onclick="closeNewsModal()">&times;</span>
        </div>
        <!--
          表单：用于收集资讯的各项信息。
          onsubmit 事件在用户点击"保存"按钮时触发。
        -->
        <form id="newsForm" onsubmit="submitNewsForm(event)">
          <!-- 隐藏字段：存储当前编辑的资讯 ID，添加新资讯时为空 -->
          <input type="hidden" id="newsId">

          <div class="form-group">
            <label>标题</label>
            <!-- required 属性表示必填字段 -->
            <input type="text" id="newsTitle" required>
          </div>

          <div class="form-group">
            <label>摘要</label>
            <!-- 摘要：资讯的简短描述，显示在列表页，吸引用户点击阅读全文 -->
            <textarea id="newsSummary" rows="3" required></textarea>
          </div>

          <div class="form-group">
            <label>内容</label>
            <!-- 正文内容：资讯的详细内容 -->
            <textarea id="newsContent" rows="5"></textarea>
          </div>

          <div class="form-group">
            <label>图片URL</label>
            <!-- 资讯的配图地址，用于在列表或详情页展示图片 -->
            <input type="text" id="newsImage">
          </div>

          <div class="form-group">
            <label>状态</label>
            <!-- 下拉选择框：选择资讯是"已发布"还是"草稿" -->
            <select id="newsStatus">
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>

          <div class="form-group">
            <label>排序</label>
            <!-- 排序值：数字越小排越前面 -->
            <input type="number" id="newsSortOrder" value="0">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeNewsModal()">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  /* 页面结构渲染完成后，立即去后端加载资讯列表数据 */
  loadNewsList();
}

/**
 * 【加载资讯列表】
 * 这个函数的作用是：向后端服务器发送请求，获取所有资讯数据。
 * 数据获取成功后，存储到全局变量 newsList 中，并调用 renderNewsTable() 渲染表格。
 */
async function loadNewsList() {
  try {
    /* 向后端发送 GET 请求，获取资讯列表，limit=100 表示最多获取100条 */
    const data = await apiRequest('/admin/news?limit=100');
    /* 将获取到的资讯列表存储到全局变量中 */
    newsList = data.list;
    /* 调用渲染函数，将数据显示到表格中 */
    renderNewsTable();
  } catch (error) {
    alert('加载资讯列表失败');
  }
}

/* PLACEHOLDER_NEWS_REMAINING */

/**
 * 【渲染资讯表格】
 * 这个函数的作用是：将 newsList 数组中的数据渲染成 HTML 表格行。
 * 如果没有数据，显示"暂无资讯"的提示。
 *
 * 数据处理说明：
 *   - summary.substring(0, 50)：截取摘要的前50个字符，避免表格中文本过长
 *   - 状态用不同颜色的标签显示：已发布（绿色）、草稿（灰色）
 */
function renderNewsTable() {
  /* 获取表格主体元素 */
  const tbody = document.getElementById('newsTable');

  /* 如果资讯列表为空，显示提示信息并退出函数 */
  if (newsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">暂无资讯</td></tr>';
    return;
  }

  /*
   * 使用 map() 遍历资讯列表，为每条资讯生成一行 HTML。
   * map() 会返回一个新数组，join('') 将数组拼接成一个完整的 HTML 字符串。
   */
  tbody.innerHTML = newsList.map(news => `
    <tr>
      <td>${news.id}</td>
      <td>${news.title}</td>
      <td>${news.summary.substring(0, 50)}${news.summary.length > 50 ? '...' : ''}</td>
      <td>
        <span class="status-badge ${news.status === 'published' ? 'status-active' : 'status-inactive'}">
          ${news.status === 'published' ? '已发布' : '草稿'}
        </span>
      </td>
      <td>${news.sort_order}</td>
      <td>${formatNewsDate(news.created_at)}</td>
      <td>
        <button class="btn-small btn-primary" onclick="editNews(${news.id})">编辑</button>
        <button class="btn-small btn-danger" onclick="deleteNews(${news.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

/**
 * 【显示添加资讯的模态框】
 * 这个函数的作用是：打开一个空白的弹窗表单，让管理员填写新资讯的信息。
 *
 * 执行步骤：
 *   1. 设置弹窗标题为"添加资讯"
 *   2. 重置表单（清空所有输入框）
 *   3. 清空隐藏的 ID 字段（表示这是新增操作）
 *   4. 显示模态框
 */
function showNewsAddModal() {
  document.getElementById('newsModalTitle').textContent = '添加资讯';
  /* reset() 方法将表单中所有输入框恢复到初始状态 */
  document.getElementById('newsForm').reset();
  document.getElementById('newsId').value = '';
  /* 将模态框显示出来 */
  document.getElementById('newsModal').style.display = 'block';
}

/**
 * 【编辑资讯】
 * 这个函数的作用是：打开模态框并填充指定资讯的现有数据，让管理员进行修改。
 *
 * @param {number} id - 要编辑的资讯的 ID
 *
 * 执行步骤：
 *   1. 在 newsList 数组中查找对应 ID 的资讯
 *   2. 将资讯数据填充到表单各字段中
 *   3. 显示模态框
 */
function editNews(id) {
  /* 使用 find() 方法在数组中查找 ID 匹配的资讯 */
  const news = newsList.find(n => n.id === id);
  /* 如果没找到，直接退出 */
  if (!news) return;

  /* 设置弹窗标题为"编辑资讯" */
  document.getElementById('newsModalTitle').textContent = '编辑资讯';
  /* 将资讯的各项数据填充到对应的表单字段中 */
  document.getElementById('newsId').value = news.id;
  document.getElementById('newsTitle').value = news.title;
  document.getElementById('newsSummary').value = news.summary;
  /* 使用 || '' 确保当 content 或 image 为 null/undefined 时，输入框显示空字符串而不是 "null" */
  document.getElementById('newsContent').value = news.content || '';
  document.getElementById('newsImage').value = news.image || '';
  document.getElementById('newsStatus').value = news.status;
  document.getElementById('newsSortOrder').value = news.sort_order;
  /* 显示模态框 */
  document.getElementById('newsModal').style.display = 'block';
}

/**
 * 【删除资讯】
 * 这个函数的作用是：删除指定的资讯。删除前会弹出确认对话框，防止误操作。
 *
 * @param {number} id - 要删除的资讯的 ID
 */
async function deleteNews(id) {
  /* 弹出确认对话框，用户点击"取消"则退出函数 */
  if (!confirm('确定要删除这条资讯吗？')) return;

  try {
    /* 向后端发送 DELETE 请求，删除指定 ID 的资讯 */
    await apiRequest(`/admin/news/${id}`, { method: 'DELETE' });
    alert('删除成功');
    /* 重新加载资讯列表，刷新页面显示 */
    loadNewsList();
  } catch (error) {
    alert('删除失败');
  }
}

/**
 * 【关闭模态框】
 * 隐藏资讯编辑/添加的模态框弹窗。
 */
function closeNewsModal() {
  document.getElementById('newsModal').style.display = 'none';
}

/* PLACEHOLDER_NEWS_SUBMIT */

/**
 * 【提交资讯表单】
 * 这个函数的作用是：处理资讯表单的提交操作。
 * 根据是否有资讯 ID 来判断是"新增"还是"编辑"操作：
 *   - 有 ID → 编辑已有资讯（发送 PUT 请求）
 *   - 无 ID → 添加新资讯（发送 POST 请求）
 *
 * @param {Event} e - 表单提交事件对象
 */
async function submitNewsForm(e) {
  /* 阻止表单默认的提交行为（防止页面刷新） */
  e.preventDefault();

  /* 获取隐藏字段中的资讯 ID */
  const id = document.getElementById('newsId').value;

  /* 从表单各输入框中收集数据，组装成一个对象 */
  const data = {
    title: document.getElementById('newsTitle').value,
    summary: document.getElementById('newsSummary').value,
    content: document.getElementById('newsContent').value,
    image: document.getElementById('newsImage').value,
    status: document.getElementById('newsStatus').value,
    /* parseInt() 将字符串转换为整数 */
    sort_order: parseInt(document.getElementById('newsSortOrder').value)
  };

  try {
    if (id) {
      /*
       * 【编辑模式】有 ID，发送 PUT 请求更新已有资讯
       * PUT 方法在 REST API 中表示"更新资源"
       */
      await apiRequest(`/admin/news/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      alert('更新成功');
    } else {
      /*
       * 【新增模式】没有 ID，发送 POST 请求创建新资讯
       * POST 方法在 REST API 中表示"创建新资源"
       */
      await apiRequest('/admin/news', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      alert('添加成功');
    }
    /* 操作成功后，关闭模态框并重新加载资讯列表 */
    closeNewsModal();
    loadNewsList();
  } catch (error) {
    /* 根据操作类型显示不同的错误提示 */
    alert(id ? '更新失败' : '添加失败');
  }
}

/**
 * 【格式化日期】
 * 将后端返回的日期字符串转换为中文格式的可读日期。
 *
 * @param {string} dateString - 后端返回的日期字符串（例如："2024-01-15T08:30:00Z"）
 * @returns {string} 格式化后的中文日期字符串（例如："2024/1/15 16:30:00"）
 */
function formatNewsDate(dateString) {
  /* 将日期字符串解析为 JavaScript 的 Date 对象 */
  const date = new Date(dateString);
  /* 使用中文地区格式输出日期 */
  return date.toLocaleString('zh-CN');
}