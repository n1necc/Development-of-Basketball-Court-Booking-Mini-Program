/**
 * ============================================================================
 * 文件名：announcements.js
 * 所属模块：篮球场预约系统 - 管理后台 - 公告管理
 * 文件说明：
 *   这个文件负责管理后台的"公告管理"功能。
 *   管理员可以在这里对系统公告进行增、删、改、查操作。
 *   公告会显示在用户端（小程序/网页），用于通知用户重要信息，
 *   比如场地维护通知、节假日安排、优惠活动等。
 *
 * 主要功能：
 *   1. 渲染公告管理页面（包含公告列表表格和添加/编辑的弹窗表单）
 *   2. 从后端加载公告列表并展示
 *   3. 添加新公告
 *   4. 编辑已有公告
 *   5. 删除公告
 *
 * 依赖说明：
 *   - apiRequest()：封装好的网络请求函数，用于和后端服务器通信
 *   - 公告有两种状态：'published'（已发布，用户可见）和 'draft'（草稿，用户不可见）
 * ============================================================================
 */

/**
 * 【全局变量】公告列表数据
 * 用一个数组来存储从后端获取的所有公告数据。
 * let 表示这个变量的值可以被修改（与 const 不同，const 声明的变量不能重新赋值）。
 */
let announcementsList = [];

/**
 * 【渲染公告管理页面】
 * 这个函数的作用是：在页面的内容区域生成公告管理的完整 HTML 结构。
 * 包括：页面顶部的"添加公告"按钮、公告列表表格、以及一个隐藏的模态框（弹窗）用于添加/编辑公告。
 *
 * 页面渲染完成后，会自动调用 loadAnnouncementsList() 去后端获取公告数据。
 */
function renderAnnouncements() {
  /* 获取页面中的内容显示区域 */
  const content = document.getElementById('contentArea');

  /*
   * 设置内容区域的 HTML，包含三个主要部分：
   *   1. page-header：页面顶部区域，包含"添加公告"按钮
   *   2. table-container：公告列表表格
   *   3. announcementModal：模态框（弹窗），用于添加或编辑公告的表单
   */
  content.innerHTML = `
    <div class="page-header">
      <button class="btn btn-primary" onclick="showAnnouncementAddModal()">添加公告</button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>内容</th>
            <th>状态</th>
            <th>排序</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="announcementsTable">
          <!-- 初始显示"加载中..."，等数据加载完成后会被替换 -->
          <tr><td colspan="7" class="empty">加载中...</td></tr>
        </tbody>
      </table>
    </div>

    <!--
      模态框（Modal）：一种弹窗组件，点击"添加公告"或"编辑"按钮时会显示出来。
      默认是隐藏的（display: none），通过 JavaScript 控制显示和隐藏。
    -->
    <div id="announcementModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <!-- 模态框标题，添加时显示"添加公告"，编辑时显示"编辑公告" -->
          <h3 id="announcementModalTitle">添加公告</h3>
          <!-- 关闭按钮，点击 × 号关闭弹窗 -->
          <span class="close" onclick="closeAnnouncementModal()">&times;</span>
        </div>
        <!--
          表单（form）：用于收集用户输入的数据。
          onsubmit 事件：当用户点击"保存"按钮时触发 submitAnnouncementForm 函数。
        -->
        <form id="announcementForm" onsubmit="submitAnnouncementForm(event)">
          <!-- 隐藏字段：存储当前编辑的公告 ID，添加新公告时为空 -->
          <input type="hidden" id="announcementId">

          <div class="form-group">
            <label>标题</label>
            <!-- required 属性表示这个字段必须填写，否则表单无法提交 -->
            <input type="text" id="announcementTitle" required>
          </div>

          <div class="form-group">
            <label>内容</label>
            <!-- textarea 是多行文本输入框，rows="5" 表示默认显示5行高度 -->
            <textarea id="announcementContent" rows="5" required></textarea>
          </div>

          <div class="form-group">
            <label>状态</label>
            <!-- select 是下拉选择框，包含"已发布"和"草稿"两个选项 -->
            <select id="announcementStatus">
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>

          <div class="form-group">
            <label>排序</label>
            <!-- 排序字段，数字越小排越前面，默认值为 0 -->
            <input type="number" id="announcementSortOrder" value="0">
          </div>

          <div class="form-actions">
            <!-- type="button" 表示普通按钮，不会触发表单提交 -->
            <button type="button" class="btn btn-secondary" onclick="closeAnnouncementModal()">取消</button>
            <!-- type="submit" 表示提交按钮，点击后会触发表单的 onsubmit 事件 -->
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  /* 页面结构渲染完成后，立即去后端加载公告列表数据 */
  loadAnnouncementsList();
}

/**
 * 【加载公告列表】
 * 这个函数的作用是：向后端服务器发送请求，获取所有公告数据，并存储到全局变量 announcementsList 中。
 * 数据获取成功后，调用 renderAnnouncementsTable() 将数据渲染到表格中。
 *
 * 关键字解释：
 *   - async/await：异步编程语法，让代码可以"等待"网络请求完成后再继续执行
 *   - try...catch：错误处理，如果 try 中的代码出错，会跳到 catch 中执行
 */
async function loadAnnouncementsList() {
  try {
    /* 向后端发送 GET 请求，获取公告列表，limit=100 表示最多获取100条 */
    const data = await apiRequest('/admin/announcements?limit=100');
    /* 将获取到的公告列表存储到全局变量中，方便其他函数使用 */
    announcementsList = data.list;
    /* 调用渲染函数，将数据显示到表格中 */
    renderAnnouncementsTable();
  } catch (error) {
    /* 请求失败时弹出提示 */
    alert('加载公告列表失败');
  }
}

/**
 * 【渲染公告表格】
 * 这个函数的作用是：将 announcementsList 数组中的数据渲染成 HTML 表格行。
 * 如果没有数据，显示"暂无公告"的提示。
 *
 * 数据处理说明：
 *   - substring(0, 50)：截取内容的前50个字符，避免表格中显示过长的文本
 *   - 状态显示：'published' 显示为绿色的"已发布"，其他显示为灰色的"草稿"
 *   - 每行末尾有"编辑"和"删除"两个操作按钮
 */
function renderAnnouncementsTable() {
  /* 获取表格主体元素 */
  const tbody = document.getElementById('announcementsTable');

  /* 如果公告列表为空，显示提示信息并退出函数 */
  if (announcementsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">暂无公告</td></tr>';
    return;
  }

  /*
   * 使用 map() 遍历公告列表，为每条公告生成一行 HTML：
   *   - announcement.id：公告的唯一标识
   *   - announcement.title：公告标题
   *   - announcement.content.substring(0, 50)：公告内容的前50个字符（超出部分用...表示）
   *   - announcement.status：公告状态
   *   - announcement.sort_order：排序值
   *   - announcement.created_at：创建时间（通过 formatAnnouncementDate 格式化）
   *   - 编辑按钮：点击后调用 editAnnouncement() 函数
   *   - 删除按钮：点击后调用 deleteAnnouncement() 函数
   */
  tbody.innerHTML = announcementsList.map(announcement => `
    <tr>
      <td>${announcement.id}</td>
      <td>${announcement.title}</td>
      <td>${announcement.content.substring(0, 50)}${announcement.content.length > 50 ? '...' : ''}</td>
      <td>
        <span class="status-badge ${announcement.status === 'published' ? 'status-active' : 'status-inactive'}">
          ${announcement.status === 'published' ? '已发布' : '草稿'}
        </span>
      </td>
      <td>${announcement.sort_order}</td>
      <td>${formatAnnouncementDate(announcement.created_at)}</td>
      <td>
        <button class="btn-small btn-primary" onclick="editAnnouncement(${announcement.id})">编辑</button>
        <button class="btn-small btn-danger" onclick="deleteAnnouncement(${announcement.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

/**
 * 【显示添加公告的模态框】
 * 这个函数的作用是：打开一个空白的弹窗表单，让管理员填写新公告的信息。
 *
 * 执行步骤：
 *   1. 设置弹窗标题为"添加公告"
 *   2. 重置表单（清空所有输入框的内容）
 *   3. 清空隐藏的 ID 字段（表示这是新增操作，不是编辑）
 *   4. 显示模态框（将 display 设置为 'block'）
 */
function showAnnouncementAddModal() {
  document.getElementById('announcementModalTitle').textContent = '添加公告';
  /* reset() 是表单元素的内置方法，可以将所有输入框恢复到初始状态 */
  document.getElementById('announcementForm').reset();
  /* 清空 ID 字段，这样提交时就知道是"新增"而不是"编辑" */
  document.getElementById('announcementId').value = '';
  /* 将模态框的 CSS display 属性设为 'block'，使其显示出来 */
  document.getElementById('announcementModal').style.display = 'block';
}

/* PLACEHOLDER_REMAINING_FUNCTIONS */

/**
 * 【编辑公告】
 * 这个函数的作用是：打开模态框并填充指定公告的现有数据，让管理员进行修改。
 *
 * @param {number} id - 要编辑的公告的 ID
 *
 * 执行步骤：
 *   1. 在 announcementsList 数组中查找对应 ID 的公告数据
 *   2. 如果找不到，直接退出
 *   3. 设置弹窗标题为"编辑公告"
 *   4. 将公告的现有数据填充到表单的各个输入框中
 *   5. 显示模态框
 *
 * 关键字解释：
 *   - find()：数组方法，查找数组中第一个满足条件的元素
 *   - 箭头函数 (a => a.id === id)：简写的函数，检查每个元素的 id 是否等于目标 id
 */
function editAnnouncement(id) {
  /* 在公告列表中查找 ID 匹配的公告 */
  const announcement = announcementsList.find(a => a.id === id);
  /* 如果没找到对应的公告，直接退出函数 */
  if (!announcement) return;

  /* 设置弹窗标题为"编辑公告" */
  document.getElementById('announcementModalTitle').textContent = '编辑公告';
  /* 将公告的各项数据填充到对应的表单字段中 */
  document.getElementById('announcementId').value = announcement.id;
  document.getElementById('announcementTitle').value = announcement.title;
  document.getElementById('announcementContent').value = announcement.content;
  document.getElementById('announcementStatus').value = announcement.status;
  document.getElementById('announcementSortOrder').value = announcement.sort_order;
  /* 显示模态框 */
  document.getElementById('announcementModal').style.display = 'block';
}

/**
 * 【删除公告】
 * 这个函数的作用是：删除指定的公告。
 * 删除前会弹出确认对话框，防止误操作。
 *
 * @param {number} id - 要删除的公告的 ID
 *
 * 执行流程：
 *   1. 弹出确认对话框
 *   2. 用户确认后，向后端发送 DELETE 请求
 *   3. 删除成功后重新加载公告列表
 */
async function deleteAnnouncement(id) {
  /* 弹出确认对话框，用户点击"取消"则退出函数 */
  if (!confirm('确定要删除这条公告吗？')) return;

  try {
    /* 向后端发送 DELETE 请求，删除指定 ID 的公告 */
    await apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' });
    alert('删除成功');
    /* 重新加载公告列表，刷新页面显示 */
    loadAnnouncementsList();
  } catch (error) {
    alert('删除失败');
  }
}

/**
 * 【关闭模态框】
 * 这个函数的作用是：隐藏公告编辑/添加的模态框弹窗。
 * 将模态框的 CSS display 属性设为 'none'，使其从页面上消失。
 */
function closeAnnouncementModal() {
  document.getElementById('announcementModal').style.display = 'none';
}

/**
 * 【提交公告表单】
 * 这个函数的作用是：处理公告表单的提交操作。
 * 根据是否有公告 ID 来判断是"新增"还是"编辑"操作：
 *   - 有 ID → 编辑已有公告（发送 PUT 请求）
 *   - 无 ID → 添加新公告（发送 POST 请求）
 *
 * @param {Event} e - 表单提交事件对象
 *
 * 关键字解释：
 *   - e.preventDefault()：阻止表单的默认提交行为（默认会刷新页面）
 *   - JSON.stringify()：将 JavaScript 对象转换为 JSON 格式的字符串
 *   - parseInt()：将字符串转换为整数
 */
async function submitAnnouncementForm(e) {
  /* 阻止表单默认的提交行为（防止页面刷新） */
  e.preventDefault();

  /* 获取隐藏字段中的公告 ID，如果有值说明是编辑操作，没有值说明是新增操作 */
  const id = document.getElementById('announcementId').value;

  /* 从表单各输入框中收集数据，组装成一个对象 */
  const data = {
    title: document.getElementById('announcementTitle').value,
    content: document.getElementById('announcementContent').value,
    status: document.getElementById('announcementStatus').value,
    /* parseInt() 将排序值从字符串转换为整数，因为输入框的值默认是字符串类型 */
    sort_order: parseInt(document.getElementById('announcementSortOrder').value)
  };

  try {
    if (id) {
      /*
       * 【编辑模式】有 ID，说明是更新已有公告
       * 发送 PUT 请求到 /admin/announcements/{id}
       * PUT 方法在 REST API 中通常表示"更新资源"
       */
      await apiRequest(`/admin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      alert('更新成功');
    } else {
      /*
       * 【新增模式】没有 ID，说明是添加新公告
       * 发送 POST 请求到 /admin/announcements
       * POST 方法在 REST API 中通常表示"创建新资源"
       */
      await apiRequest('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      alert('添加成功');
    }
    /* 操作成功后，关闭模态框并重新加载公告列表 */
    closeAnnouncementModal();
    loadAnnouncementsList();
  } catch (error) {
    /* 根据操作类型显示不同的错误提示 */
    alert(id ? '更新失败' : '添加失败');
  }
}

/**
 * 【格式化日期】
 * 这个函数的作用是：将后端返回的日期字符串转换为中文格式的可读日期。
 *
 * @param {string} dateString - 后端返回的日期字符串（例如："2024-01-15T08:30:00Z"）
 * @returns {string} 格式化后的中文日期字符串（例如："2024/1/15 16:30:00"）
 *
 * 关键字解释：
 *   - new Date()：创建一个日期对象，可以将日期字符串解析为日期
 *   - toLocaleString('zh-CN')：将日期转换为中文地区的本地化格式
 */
function formatAnnouncementDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}
