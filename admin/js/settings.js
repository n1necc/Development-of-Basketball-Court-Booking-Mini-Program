/**
 * ============================================================================
 * 文件名：settings.js
 * 所属模块：篮球场预约系统 - 管理后台 - 系统设置
 * 文件说明：
 *   这个文件负责管理后台的"系统设置"功能。
 *   管理员可以在这里配置系统的全局参数，这些参数会影响用户端的预约行为。
 *
 * 目前支持的设置项：
 *   1. 最多提前预约天数：用户最多可以提前几天预约场地（例如设为7，则用户只能预约未来7天内的场地）
 *   2. 最晚取消时间：用户最晚可以在开场前几小时取消预约（例如设为2，则开场前2小时内不能取消）
 *   3. 系统状态：启用模式或维护模式，维护模式下用户端将显示维护提示
 *
 * 主要功能：
 *   1. 渲染系统设置页面（包含设置表单和系统状态管理）
 *   2. 从后端加载当前的设置值
 *   3. 保存管理员修改后的设置值
 *   4. 系统状态切换（启用/维护模式）
 *   5. 查看系统状态变更日志
 *
 * 依赖说明：
 *   - apiRequest()：封装好的网络请求函数，用于和后端服务器通信
 *   - showMessage()：消息提示函数
 * ============================================================================
 */

/**
 * 【渲染系统设置页面】
 * 这个函数的作用是：在页面的内容区域生成系统设置的 HTML 表单。
 * 表单包含设置项、系统状态管理卡片和状态变更日志。
 *
 * 页面渲染完成后，会：
 *   1. 调用 loadSettings() 从后端加载当前设置值并填充到输入框中
 *   2. 调用 loadSystemStatus() 加载当前系统状态
 *   3. 为表单绑定提交事件监听器
 */
async function renderSettings() {
  /* 获取页面中的内容显示区域 */
  const contentArea = document.getElementById('contentArea');

  /*
   * 设置内容区域的 HTML 结构。
   * 创建三个卡片：系统设置、系统状态管理、状态变更日志
   */
  contentArea.innerHTML = `
    <!-- 系统设置卡片 -->
    <div class="card">
      <div class="card-title">系统设置</div>
      <form id="settingsForm">
        <div class="form-group">
          <label>最多提前预约天数</label>
          <input type="number" id="maxBookingDays" class="form-control" min="1" max="30">
        </div>
        <div class="form-group">
          <label>最晚取消时间（开场前小时数）</label>
          <input type="number" id="cancelDeadline" class="form-control" min="0" max="48">
        </div>
        <button type="submit" class="btn btn-primary">保存设置</button>
      </form>
    </div>

    <!-- 系统状态管理卡片 -->
    <div class="card" style="margin-top: 20px;">
      <div class="card-title">系统状态管理</div>
      <div class="system-status-container">
        <!-- 当前状态显示 -->
        <div class="status-display" id="statusDisplay">
          <div class="status-indicator">
            <span class="status-dot" id="statusDot"></span>
            <span class="status-text" id="statusText">加载中...</span>
          </div>
          <div class="status-message" id="statusMessage"></div>
        </div>
        
        <!-- 状态切换按钮 -->
        <div class="status-actions" style="margin-top: 20px;">
          <button type="button" class="btn" id="toggleStatusBtn" onclick="toggleSystemStatus()">
            切换状态
          </button>
          <button type="button" class="btn btn-secondary" onclick="showStatusLogs()" style="margin-left: 10px;">
            查看日志
          </button>
        </div>
      </div>
    </div>

    <!-- 状态变更日志弹窗（默认隐藏） -->
    <div id="logsModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>系统状态变更日志</h3>
          <span class="close" onclick="closeLogsModal()">&times;</span>
        </div>
        <div class="modal-body">
          <table class="data-table" id="logsTable">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作</th>
                <th>操作人</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody id="logsTableBody">
              <!-- 日志数据将在这里动态加载 -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 管理员管理卡片 -->
    <div class="card" style="margin-top: 20px;">
      <div class="card-title">管理员管理</div>
      <div class="admin-management-container">
        <p style="color: #666; margin-bottom: 15px;">管理系统管理员账号，包括注册新管理员和修改当前登录密码。</p>
        <div class="admin-actions">
          <button type="button" class="btn btn-primary" onclick="showRegisterModal()">
            <span style="margin-right: 5px;">➕</span>注册新管理员
          </button>
          <button type="button" class="btn" onclick="showChangePasswordModal()" style="margin-left: 10px;">
            <span style="margin-right: 5px;">🔐</span>修改密码
          </button>
        </div>
      </div>
    </div>

    <!-- 注册管理员模态框 -->
    <div id="registerModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>注册新管理员</h3>
          <span class="close" onclick="closeRegisterModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="registerForm">
            <div class="form-group">
              <label for="regUsername">用户名 *</label>
              <input type="text" id="regUsername" name="username" class="form-control" required minlength="3" maxlength="50">
              <small class="form-hint">用户名长度需在3-50个字符之间</small>
            </div>
            <div class="form-group">
              <label for="regPassword">密码 *</label>
              <input type="password" id="regPassword" name="password" class="form-control" required>
              <small class="form-hint">密码需至少8位，包含大小写字母和数字</small>
            </div>
            <div class="form-group">
              <label for="regConfirmPassword">确认密码 *</label>
              <input type="password" id="regConfirmPassword" name="confirmPassword" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="regRole">角色</label>
              <select id="regRole" name="role" class="form-control">
                <option value="normal">普通管理员</option>
                <option value="super">超级管理员</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="closeRegisterModal()">取消</button>
              <button type="submit" class="btn btn-primary">注册</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 修改密码模态框 -->
    <div id="changePasswordModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>修改密码</h3>
          <span class="close" onclick="closeChangePasswordModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="changePasswordForm">
            <div class="form-group">
              <label for="oldPassword">原密码 *</label>
              <input type="password" id="oldPassword" name="oldPassword" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="newPassword">新密码 *</label>
              <input type="password" id="newPassword" name="newPassword" class="form-control" required>
              <small class="form-hint">密码需至少8位，包含大小写字母和数字</small>
            </div>
            <div class="form-group">
              <label for="confirmNewPassword">确认新密码 *</label>
              <input type="password" id="confirmNewPassword" name="confirmNewPassword" class="form-control" required>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="closeChangePasswordModal()">取消</button>
              <button type="submit" class="btn btn-primary">确认修改</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  /* 从后端加载当前的设置值，填充到表单输入框中 */
  loadSettings();
  
  /* 加载当前系统状态 */
  loadSystemStatus();

  /* 为表单绑定"提交"事件监听器 */
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);

  /* 绑定管理员管理相关事件 */
  bindAdminManagementEvents();
}

/**
 * 【加载系统设置】
 * 这个函数的作用是：从后端获取当前的系统设置值，并填充到页面的输入框中。
 *
 * 如果后端没有返回某个设置值（比如第一次使用系统），会使用默认值：
 *   - 最多提前预约天数：默认 7 天
 *   - 最晚取消时间：默认 2 小时
 */
async function loadSettings() {
  try {
    /* 向后端发送 GET 请求，获取当前系统设置 */
    const settings = await apiRequest('/admin/settings');
    /* 将设置值填充到对应的输入框中，如果值为空则使用默认值 */
    document.getElementById('maxBookingDays').value = settings.max_booking_days || 7;
    document.getElementById('cancelDeadline').value = settings.cancel_deadline || 2;
  } catch (error) {
    showMessage('加载设置失败', 'error');
  }
}

/**
 * 【保存系统设置】
 * 这个函数的作用是：将管理员在表单中修改的设置值保存到后端。
 *
 * @param {Event} e - 表单提交事件对象
 */
async function saveSettings(e) {
  /* 阻止表单默认的提交行为（默认行为会刷新页面，导致数据丢失） */
  e.preventDefault();

  /* 从输入框中获取管理员设置的值，组装成一个对象 */
  const settings = {
    max_booking_days: document.getElementById('maxBookingDays').value,
    cancel_deadline: document.getElementById('cancelDeadline').value
  };

  try {
    /* 向后端发送 PUT 请求，保存设置 */
    await apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    showMessage('设置保存成功');
  } catch (error) {
    showMessage('保存失败: ' + error.message, 'error');
  }
}

/**
 * 【加载系统状态】
 * 这个函数的作用是：从后端获取当前系统运行状态（启用/维护模式），
 * 并更新页面上的状态显示。
 */
async function loadSystemStatus() {
  try {
    const result = await apiRequest('/admin/settings/system/status');
    const { status, message } = result;
    
    /* 更新状态显示 */
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusMessage = document.getElementById('statusMessage');
    const toggleBtn = document.getElementById('toggleStatusBtn');
    
    if (status === 'active') {
      /* 启用状态 */
      statusDot.className = 'status-dot active';
      statusDot.style.backgroundColor = '#52c41a';
      statusText.textContent = '系统运行正常';
      statusText.style.color = '#52c41a';
      toggleBtn.textContent = '切换到维护模式';
      toggleBtn.className = 'btn btn-warning';
    } else {
      /* 维护状态 */
      statusDot.className = 'status-dot maintenance';
      statusDot.style.backgroundColor = '#faad14';
      statusText.textContent = '系统维护中';
      statusText.style.color = '#faad14';
      toggleBtn.textContent = '恢复启用';
      toggleBtn.className = 'btn btn-success';
    }
    
    statusMessage.textContent = message || '';
    
    /* 存储当前状态，用于切换时判断 */
    window.currentSystemStatus = status;
  } catch (error) {
    showMessage('加载系统状态失败', 'error');
    console.error('加载系统状态失败:', error);
  }
}

/**
 * 【切换系统状态】
 * 这个函数的作用是：在启用模式和维护模式之间切换系统状态。
 * 切换前会弹出确认对话框，要求管理员确认操作。
 */
async function toggleSystemStatus() {
  const currentStatus = window.currentSystemStatus || 'active';
  const newStatus = currentStatus === 'active' ? 'maintenance' : 'active';
  
  /* 构建确认对话框的内容 */
  let confirmMessage = '';
  let inputHtml = '';
  
  if (newStatus === 'maintenance') {
    confirmMessage = '确定要将系统切换到维护模式吗？\n\n维护模式下：\n• 用户端将显示维护提示\n• 无法接受新的预订\n• 已有订单不受影响';
    inputHtml = `
      <div style="margin-top: 15px;">
        <label>维护提示信息（可选）：</label>
        <input type="text" id="maintenanceMessage" class="form-control" 
               placeholder="系统维护中，请稍后再试" style="margin-top: 5px;">
      </div>
      <div style="margin-top: 10px;">
        <label>变更原因（可选）：</label>
        <input type="text" id="changeReason" class="form-control" 
               placeholder="例如：系统升级、服务器维护等" style="margin-top: 5px;">
      </div>
    `;
  } else {
    confirmMessage = '确定要恢复系统启用状态吗？\n\n恢复后：\n• 用户端将恢复正常使用\n• 可以接受新的预订';
    inputHtml = `
      <div style="margin-top: 15px;">
        <label>变更原因（可选）：</label>
        <input type="text" id="changeReason" class="form-control" 
               placeholder="例如：维护完成、问题解决等" style="margin-top: 5px;">
      </div>
    `;
  }
  
  /* 创建自定义确认对话框 */
  const modalHtml = `
    <div id="confirmModal" class="modal" style="display: flex; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); justify-content: center; align-items: center;">
      <div class="modal-content" style="background-color: #fefefe; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e8e8e8; padding-bottom: 10px;">
          <h3 style="margin: 0; font-size: 18px;">${newStatus === 'maintenance' ? '切换到维护模式' : '恢复系统启用'}</h3>
          <span class="close" onclick="closeConfirmModal()" style="cursor: pointer; font-size: 24px; color: #999;">&times;</span>
        </div>
        <div class="modal-body" style="margin-bottom: 20px;">
          <p style="white-space: pre-line; line-height: 1.6;">${confirmMessage}</p>
          ${inputHtml}
        </div>
        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">取消</button>
          <button type="button" class="btn ${newStatus === 'maintenance' ? 'btn-warning' : 'btn-success'}" onclick="confirmToggleStatus('${newStatus}')">确认${newStatus === 'maintenance' ? '切换' : '恢复'}</button>
        </div>
      </div>
    </div>
  `;
  
  /* 添加对话框到页面 */
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 【关闭确认对话框】
 */
function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 【确认切换系统状态】
 * 这个函数的作用是：执行实际的系统状态切换操作。
 *
 * @param {string} newStatus - 新状态，'active' 或 'maintenance'
 */
async function confirmToggleStatus(newStatus) {
  try {
    /* 获取输入的值 */
    const maintenanceMessage = document.getElementById('maintenanceMessage')?.value || '';
    const changeReason = document.getElementById('changeReason')?.value || '';
    
    /* 构建请求体 */
    const requestBody = {
      status: newStatus,
      reason: changeReason
    };
    
    if (newStatus === 'maintenance' && maintenanceMessage) {
      requestBody.message = maintenanceMessage;
    }
    
    /* 发送请求 */
    const result = await apiRequest('/admin/settings/system/status', {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });
    
    /* 关闭确认对话框 */
    closeConfirmModal();
    
    /* 显示成功消息 */
    showMessage(result.msg || '操作成功');
    
    /* 重新加载系统状态显示 */
    await loadSystemStatus();
    
  } catch (error) {
    closeConfirmModal();
    showMessage('操作失败: ' + error.message, 'error');
    console.error('切换系统状态失败:', error);
  }
}

/**
 * 【显示状态变更日志】
 * 这个函数的作用是：打开日志弹窗并加载系统状态变更历史记录。
 */
async function showStatusLogs() {
  const modal = document.getElementById('logsModal');
  modal.style.display = 'flex';
  
  try {
    /* 加载日志数据 */
    const result = await apiRequest('/admin/settings/system/logs');
    const logs = result.list || [];
    
    const tbody = document.getElementById('logsTableBody');
    
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">暂无日志记录</td></tr>';
      return;
    }
    
    /* 渲染日志表格 */
    tbody.innerHTML = logs.map(log => {
      const date = new Date(log.created_at).toLocaleString('zh-CN');
      const operation = log.new_status === 'maintenance' ? '切换到维护模式' : '恢复启用';
      const operationClass = log.new_status === 'maintenance' ? 'text-warning' : 'text-success';
      
      return `
        <tr>
          <td>${date}</td>
          <td class="${operationClass}">${operation}</td>
          <td>${log.operator_name}</td>
          <td>${log.reason || '-'}</td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('加载日志失败:', error);
    document.getElementById('logsTableBody').innerHTML = 
      '<tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">加载日志失败</td></tr>';
  }
}

/**
 * 【关闭日志弹窗】
 */
function closeLogsModal() {
  const modal = document.getElementById('logsModal');
  modal.style.display = 'none';
}

/* 点击弹窗外部关闭 */
window.onclick = function(event) {
  const logsModal = document.getElementById('logsModal');
  const registerModal = document.getElementById('registerModal');
  const changePasswordModal = document.getElementById('changePasswordModal');
  
  if (event.target === logsModal) {
    logsModal.style.display = 'none';
  }
  if (event.target === registerModal) {
    registerModal.classList.remove('show');
  }
  if (event.target === changePasswordModal) {
    changePasswordModal.classList.remove('show');
  }
}

/**
 * ============================================================================
 * 管理员管理功能
 * ============================================================================
 */

/**
 * 显示注册管理员模态框
 */
function showRegisterModal() {
  const modal = document.getElementById('registerModal');
  modal.style.display = 'flex';
  modal.classList.add('show');
  // 清空表单
  document.getElementById('registerForm').reset();
}

/**
 * 关闭注册管理员模态框
 */
function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  modal.style.display = 'none';
  modal.classList.remove('show');
}

/**
 * 显示修改密码模态框
 */
function showChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  modal.style.display = 'flex';
  modal.classList.add('show');
  // 清空表单
  document.getElementById('changePasswordForm').reset();
}

/**
 * 关闭修改密码模态框
 */
function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  modal.style.display = 'none';
  modal.classList.remove('show');
}

/**
 * 密码复杂度验证
 * @param {string} password - 密码
 * @returns {boolean} 是否符合要求
 */
function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

/**
 * 绑定管理员管理相关事件
 * 在renderSettings中调用
 */
function bindAdminManagementEvents() {
  // 注册管理员表单提交处理
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const role = document.getElementById('regRole').value;

    // 验证密码一致性
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    // 验证密码复杂度
    if (!validatePassword(password)) {
      alert('密码需至少8位，包含大小写字母和数字');
      return;
    }

    try {
      const response = await fetch(API_BASE_URL + '/admin/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();

      if (data.code === 200) {
        alert('管理员注册成功！');
        closeRegisterModal();
      } else {
        alert(data.msg || '注册失败');
      }
    } catch (error) {
      console.error('注册管理员失败:', error);
      alert('注册失败，请检查网络连接');
    }
  });

  // 修改密码表单提交处理
  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    // 验证密码一致性
    if (newPassword !== confirmNewPassword) {
      alert('两次输入的新密码不一致');
      return;
    }

    // 验证密码复杂度
    if (!validatePassword(newPassword)) {
      alert('新密码需至少8位，包含大小写字母和数字');
      return;
    }

    try {
      const response = await fetch(API_BASE_URL + '/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await response.json();

      if (data.code === 200) {
        alert('密码修改成功！请重新登录');
        closeChangePasswordModal();
        // 退出登录
        clearToken();
        window.location.href = 'login.html';
      } else {
        alert(data.msg || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      alert('密码修改失败，请检查网络连接');
    }
  });
}
