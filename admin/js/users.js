/**
 * ============================================================================
 * 文件名：users.js
 * 所属模块：篮球场预约系统 - 管理后台 - 用户管理
 * 文件说明：
 *   这个文件负责管理后台的"用户管理"功能。
 *   管理员可以在这里查看所有注册用户的信息（昵称、手机号、余额、状态等），
 *   并且可以对用户进行"拉黑"或"解除拉黑"操作。
 *
 * 主要功能：
 *   1. 渲染用户管理页面的 HTML 结构（表格）
 *   2. 从后端 API 加载用户列表数据并显示在表格中
 *   3. 将用户加入黑名单（拉黑）
 *   4. 将用户从黑名单中移除（解除拉黑）
 *
 * 依赖说明：
 *   - apiRequest()：封装好的网络请求函数，用于和后端服务器通信（定义在其他公共JS文件中）
 *   - showMessage()：封装好的消息提示函数，用于在页面上显示成功/失败提示
 * ============================================================================
 */

/**
 * 【渲染用户管理页面】
 * 这个函数的作用是：在页面的内容区域生成用户管理的 HTML 结构。
 * 它会创建一个包含表格的卡片，表格的列包括：ID、昵称、手机号、余额、状态、注册时间、操作。
 * 页面渲染完成后，会自动调用 loadUsers() 去后端获取真实的用户数据。
 *
 * 关键字解释：
 *   - async：表示这是一个"异步函数"，可以等待耗时操作（比如网络请求）完成后再继续执行
 *   - document.getElementById()：通过元素的 id 属性找到页面上的某个 HTML 元素
 *   - innerHTML：用来设置或获取一个 HTML 元素内部的 HTML 内容
 */
async function renderUsers() {
  /* 获取页面中 id 为 'contentArea' 的元素，这是管理后台的主内容显示区域 */
  const contentArea = document.getElementById('contentArea');

  /*
   * 使用模板字符串（反引号 `` 包裹的字符串）来设置内容区域的 HTML。
   * 这里创建了一个卡片（card），里面包含一个表格（table），
   * 表格的表头（thead）定义了每一列的标题，
   * 表格的主体（tbody）暂时为空，等数据加载后再填充。
   */
  contentArea.innerHTML = `
    <div class="card">
      <div class="card-title">用户管理</div>
      <table class="table" id="usersTable">
        <thead>
          <tr>
            <th>ID</th>
            <th>昵称</th>
            <th>手机号</th>
            <th>余额</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  /* 页面结构渲染完成后，立即调用 loadUsers() 函数去后端加载用户数据 */
  loadUsers();
}

/**
 * 【加载用户列表】
 * 这个函数的作用是：向后端服务器发送请求，获取所有用户的数据，然后把数据填充到表格中。
 *
 * 执行流程：
 *   1. 调用 apiRequest() 向后端发送 GET 请求，获取用户列表（最多100条）
 *   2. 找到表格的 tbody 元素（表格主体）
 *   3. 使用 map() 方法遍历每个用户数据，为每个用户生成一行 HTML
 *   4. 如果请求失败，显示错误提示
 *
 * 关键字解释：
 *   - await：等待异步操作完成，拿到结果后再继续往下执行
 *   - try...catch：错误处理机制，try 里的代码如果出错，会跳到 catch 里执行
 *   - map()：数组方法，对数组中的每个元素执行一个函数，返回一个新数组
 *   - join('')：把数组中的所有元素拼接成一个字符串（用空字符串连接）
 *   - 三元运算符（条件 ? 值A : 值B）：如果条件为真返回值A，否则返回值B
 */
async function loadUsers() {
  try {
    /* 向后端 API 发送请求，获取用户列表数据，limit=100 表示最多获取100条记录 */
    const data = await apiRequest('/admin/users?limit=100');

    /* 通过 CSS 选择器找到 usersTable 表格内的 tbody 元素 */
    const tbody = document.querySelector('#usersTable tbody');

    /*
     * 使用 map() 遍历用户列表，为每个用户生成一行表格 HTML：
     *   - user.id：用户的唯一标识符
     *   - user.nickName：用户昵称
     *   - user.phone || '未绑定'：如果手机号为空，则显示"未绑定"
     *   - user.balance：用户账户余额，前面加上人民币符号 ¥
     *   - user.status：用户状态，'normal' 表示正常，否则表示黑名单
     *   - user.created_at：注册时间，通过 new Date() 转换为可读的日期格式
     *   - 操作列：根据用户状态显示不同的按钮（正常用户显示"拉黑"按钮，黑名单用户显示"解除拉黑"按钮）
     */
    tbody.innerHTML = data.list.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.nickName}</td>
        <td>${user.phone || '未绑定'}</td>
        <td>¥${user.balance}</td>
        <td><span class="badge badge-${user.status === 'normal' ? 'success' : 'danger'}">${user.status === 'normal' ? '正常' : '黑名单'}</span></td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>
          ${user.status === 'normal'
            ? `<button class="btn btn-sm btn-danger" onclick="blacklistUser(${user.id})">拉黑</button>`
            : `<button class="btn btn-sm btn-success" onclick="unblacklistUser(${user.id})">解除拉黑</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (error) {
    /* 如果请求失败（比如网络错误、服务器错误），显示错误提示信息 */
    showMessage('加载用户列表失败', 'error');
  }
}

/**
 * 【拉黑用户】
 * 这个函数的作用是：将指定用户加入黑名单。
 * 被拉黑的用户将无法正常使用系统的预约功能。
 *
 * @param {number} id - 要拉黑的用户的 ID（每个用户都有一个唯一的数字编号）
 *
 * 执行流程：
 *   1. 弹出确认对话框，防止管理员误操作
 *   2. 如果管理员点击"确定"，向后端发送 POST 请求，将用户加入黑名单
 *   3. 操作成功后显示提示，并重新加载用户列表以刷新页面显示
 *   4. 如果操作失败，显示错误信息
 */
async function blacklistUser(id) {
  /* confirm() 会弹出一个确认对话框，用户点击"取消"时返回 false，此时直接退出函数 */
  if (!confirm('确定要拉黑此用户吗？')) return;

  try {
    /*
     * 向后端发送 POST 请求，将用户加入黑名单
     *   - '/admin/users/' + id + '/blacklist'：拼接出请求的 URL 地址
     *   - method: 'POST'：使用 POST 方法（表示"执行一个操作"）
     *   - body: JSON.stringify(...)：将 JavaScript 对象转换为 JSON 字符串，作为请求体发送
     *   - action: 'add'：告诉后端要执行的是"添加到黑名单"操作
     */
    await apiRequest('/admin/users/' + id + '/blacklist', {
      method: 'POST',
      body: JSON.stringify({ action: 'add' })
    });
    /* 操作成功，显示提示信息 */
    showMessage('用户已拉黑');
    /* 重新加载用户列表，让页面显示最新的用户状态 */
    loadUsers();
  } catch (error) {
    /* 操作失败，显示具体的错误信息 */
    showMessage('操作失败: ' + error.message, 'error');
  }
}

/**
 * 【解除拉黑用户】
 * 这个函数的作用是：将指定用户从黑名单中移除，恢复其正常使用权限。
 *
 * @param {number} id - 要解除拉黑的用户的 ID
 *
 * 执行流程：
 *   1. 向后端发送 POST 请求，将用户从黑名单中移除
 *   2. 操作成功后显示提示，并重新加载用户列表
 *   3. 如果操作失败，显示错误信息
 *
 * 注意：这个函数没有确认对话框，因为"解除拉黑"是一个相对安全的操作
 */
async function unblacklistUser(id) {
  try {
    /*
     * 向后端发送 POST 请求，将用户从黑名单中移除
     *   - action: 'remove'：告诉后端要执行的是"从黑名单移除"操作
     */
    await apiRequest('/admin/users/' + id + '/blacklist', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove' })
    });
    /* 操作成功，显示提示信息 */
    showMessage('已解除拉黑');
    /* 重新加载用户列表，让页面显示最新的用户状态 */
    loadUsers();
  } catch (error) {
    /* 操作失败，显示具体的错误信息 */
    showMessage('操作失败: ' + error.message, 'error');
  }
}
