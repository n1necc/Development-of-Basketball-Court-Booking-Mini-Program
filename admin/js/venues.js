/**
 * ============================================================================
 * 文件名：venues.js
 * 文件说明：场地管理页面的渲染与操作
 * ----------------------------------------------------------------------------
 * 这个文件是管理后台中"场地管理"模块的核心代码，负责篮球场地的增删改查。
 * 主要功能包括：
 *   1. 渲染场地列表页面，以表格形式展示所有场地信息
 *   2. 添加新场地（通过弹窗输入场地名称、位置、描述、图片、设施等信息）
 *   3. 编辑已有场地的信息
 *   4. 删除场地
 *   5. 设置场地的价格（分为平日和周末，每天分为上午、下午、晚上三个时段）
 *   6. 管理场地维护状态（正常可用/维护中不可预定）
 *   7. 查看场地维护状态变更日志
 *
 * 场地数据结构说明：
 *   - id：场地的唯一标识号
 *   - name：场地名称（如"1号篮球场"）
 *   - location：场地位置（如"体育馆二楼"）
 *   - description：场地描述
 *   - images：场地图片的 URL 数组
 *   - facilities：设施列表数组（如 ["灯光", "空调", "淋浴"]）
 *   - status：场地状态，'active'（启用）或 'inactive'（停用）
 *   - maintenance_status：维护状态，'normal'（正常）或 'maintenance'（维护中）
 *   - maintenance_message：维护提示信息
 *   - maintenance_end_time：预计恢复时间
 *   - prices：价格列表，包含不同时段的价格信息
 * ============================================================================
 */

/**
 * renderVenues —— 渲染场地列表页面
 *
 * 在内容区域创建场地管理的页面结构：
 *   - 顶部有标题"场地列表"和"添加场地"按钮
 *   - 下方是一个表格，用于展示所有场地的信息
 * 页面结构创建完成后，自动调用 loadVenues() 从后端加载场地数据。
 */
async function renderVenues() {
  // 获取主内容区域
  const contentArea = document.getElementById('contentArea');

  // 设置场地管理页面的 HTML 结构
  // display: flex 让标题和按钮在同一行显示（左右分布）
  // justify-content: space-between 让两个元素分别靠左和靠右
  contentArea.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div class="card-title">场地列表</div>
        <button class="btn btn-primary" onclick="showAddVenueModal()">添加场地</button>
      </div>
      <table class="table" id="venuesTable">
        <thead>
          <tr>
            <th>ID</th>
            <th>场地名称</th>
            <th>位置</th>
            <th>状态</th>
            <th>维护状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  // 页面结构就绪后，加载场地数据
  loadVenues();
}

/**
 * loadVenues —— 从后端加载所有场地数据并填充到表格中
 *
 * 工作流程：
 *   1. 调用后端接口获取场地列表（最多 100 条）
 *   2. 遍历场地数组，把每个场地的信息渲染成表格的一行
 *   3. 根据场地状态显示不同颜色的标签（启用=绿色，停用=红色）
 *   4. 根据维护状态显示不同颜色的标签（正常=绿色，维护中=黄色）
 *   5. 每行末尾提供"编辑"、"价格设置"、"维护管理"、"删除"四个操作按钮
 */
async function loadVenues() {
  try {
    // 向后端请求场地列表，limit=100 表示最多获取 100 条数据
    const data = await apiRequest('/admin/venues?limit=100');

    // 获取表格的 <tbody> 元素
    const tbody = document.querySelector('#venuesTable tbody');

    // 使用 .map() 把每个场地对象转换成一行 HTML
    tbody.innerHTML = data.list.map(venue => `
      <tr>
        <td>${venue.id}</td>
        <td>${venue.name}</td>
        <td>${venue.location}</td>
        <td><span class="badge badge-${venue.status === 'active' ? 'success' : 'danger'}">${venue.status === 'active' ? '启用' : '停用'}</span></td>
        <td>
          <span class="badge badge-${venue.maintenance_status === 'normal' ? 'success' : 'warning'}">
            ${venue.maintenance_status === 'normal' ? '正常' : '维护中'}
          </span>
          ${venue.maintenance_status === 'maintenance' && venue.maintenance_end_time ? 
            `<br><small style="color: #999;">预计恢复: ${new Date(venue.maintenance_end_time).toLocaleString('zh-CN')}</small>` : 
            ''}
        </td>
        <td>${new Date(venue.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="editVenue(${venue.id})">编辑</button>
          <button class="btn btn-sm btn-success" onclick="managePrices(${venue.id})">价格设置</button>
          <button class="btn btn-sm btn-warning" onclick="manageMaintenance(${venue.id})">维护管理</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVenue(${venue.id})">删除</button>
        </td>
      </tr>
    `).join('');
    // 状态列说明：
    //   venue.status === 'active' 时显示绿色的"启用"标签
    //   否则显示红色的"停用"标签
    // 维护状态列说明：
    //   venue.maintenance_status === 'normal' 时显示绿色的"正常"标签
    //   否则显示黄色的"维护中"标签
    // 创建时间列：
    //   new Date(venue.created_at) 把时间字符串转换为日期对象
    //   .toLocaleDateString() 把日期格式化为本地日期格式（如 "2024/1/15"）
  } catch (error) {
    showMessage('加载场地列表失败', 'error');
  }
}

/**
 * showAddVenueModal —— 显示"添加场地"的输入对话框
 *
 * 通过一系列 prompt() 弹窗，依次让管理员输入新场地的各项信息：
 *   1. 场地名称（必填）
 *   2. 场地位置（必填）
 *   3. 场地描述（可选）
 *   4. 图片 URL（可多个，用逗号分隔）
 *   5. 设施列表（可多个，用逗号分隔）
 *
 * 任何一步如果用户点击"取消"，整个添加操作就中止。
 * 所有信息收集完毕后，调用 addVenue() 函数提交到后端。
 */
function showAddVenueModal() {
  // prompt() 弹出一个带输入框的对话框，返回用户输入的文字
  // 如果用户点击"取消"，返回 null；如果输入为空点击"确定"，返回空字符串
  const name = prompt('请输入场地名称:');
  if (!name) return; // 名称为空或取消，直接返回

  const location = prompt('请输入场地位置:');
  if (!location) return; // 位置为空或取消，直接返回

  const description = prompt('请输入场地描述:');
  if (description === null) return; // 用户点击了取消（注意：空描述是允许的）

  // 图片 URL 输入，提供了一个默认值（随机图片占位符）
  const imageUrls = prompt('请输入图片URL（多个用逗号分隔）:', 'https://picsum.photos/800/600?random=1');
  if (imageUrls === null) return;

  // 设施输入，提供了常见设施作为默认值
  const facilities = prompt('请输入设施（用逗号分隔）:', '灯光,空调,淋浴,停车场');
  if (facilities === null) return;

  // 所有信息收集完毕，调用添加函数
  addVenue(name, location, description, imageUrls, facilities);
}

/**
 * addVenue —— 向后端提交新场地数据
 *
 * 把管理员输入的场地信息整理成后端需要的格式，然后发送 POST 请求创建新场地。
 *
 * @param {string} name - 场地名称
 * @param {string} location - 场地位置
 * @param {string} description - 场地描述
 * @param {string} imageUrls - 图片 URL 字符串（多个用逗号分隔）
 * @param {string} facilities - 设施字符串（多个用逗号分隔）
 */
async function addVenue(name, location, description, imageUrls, facilities) {
  try {
    // 处理图片 URL：把逗号分隔的字符串拆分成数组
    // .split(',') 按逗号拆分 → .map(url => url.trim()) 去除每项前后空格 → .filter(url => url) 过滤掉空字符串
    const images = imageUrls ? imageUrls.split(',').map(url => url.trim()).filter(url => url) : [];

    // 处理设施列表：同样的拆分、去空格、过滤操作
    const facilitiesArray = facilities ? facilities.split(',').map(f => f.trim()).filter(f => f) : [];

    // 向后端发送 POST 请求，创建新场地
    // JSON.stringify() 把 JavaScript 对象转换成 JSON 字符串作为请求体
    await apiRequest('/admin/venues', {
      method: 'POST',
      body: JSON.stringify({
        name,
        location,
        description: description || '',
        images,
        facilities: facilitiesArray
      })
    });

    // 添加成功，显示成功提示
    showMessage('场地添加成功');
    // 重新加载场地列表，让新添加的场地显示出来
    loadVenues();
  } catch (error) {
    showMessage('添加失败: ' + error.message, 'error');
  }
}

/**
 * deleteVenue —— 删除指定的场地
 *
 * 删除前会弹出确认对话框，防止误操作。
 * 确认后向后端发送 DELETE 请求删除场地。
 *
 * @param {number} id - 要删除的场地 ID
 */
async function deleteVenue(id) {
  // 弹出确认对话框，用户点击"取消"则不执行删除
  if (!confirm('确定要删除此场地吗？')) return;

  try {
    // 向后端发送 DELETE 请求
    // 请求路径中包含场地 ID，如 '/admin/venues/5'
    await apiRequest('/admin/venues/' + id, {
      method: 'DELETE'
    });
    showMessage('场地删除成功');
    // 重新加载场地列表
    loadVenues();
  } catch (error) {
    showMessage('删除失败: ' + error.message, 'error');
  }
}

/**
 * managePrices —— 打开价格设置弹窗
 *
 * 这是一个简单的中转函数，点击"价格设置"按钮时调用，
 * 实际工作由 showPriceModal() 完成。
 *
 * @param {number} venueId - 要设置价格的场地 ID
 */
function managePrices(venueId) {
  showPriceModal(venueId);
}

/**
 * manageMaintenance —— 打开维护管理弹窗
 *
 * 点击"维护管理"按钮时调用，显示维护状态管理的模态框。
 *
 * @param {number} venueId - 要管理维护状态的场地 ID
 */
async function manageMaintenance(venueId) {
  try {
    // 获取场地信息
    const venue = await apiRequest('/admin/venues?limit=100').then(data =>
      data.list.find(v => v.id === venueId)
    );

    if (!venue) {
      showMessage('场地不存在', 'error');
      return;
    }

    // 创建维护管理模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'maintenanceModal';

    const isMaintenance = venue.maintenance_status === 'maintenance';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>场地维护管理 - ${venue.name}</h3>
          <span class="close" onclick="closeMaintenanceModal()">&times;</span>
        </div>
        <div class="modal-body">
          <!-- 当前状态显示 -->
          <div style="margin-bottom: 20px; padding: 15px; background: ${isMaintenance ? '#fff7e6' : '#f6ffed'}; border-radius: 8px; border-left: 4px solid ${isMaintenance ? '#faad14' : '#52c41a'};">
            <div style="font-weight: bold; margin-bottom: 5px; color: ${isMaintenance ? '#faad14' : '#52c41a'};">
              当前状态：${isMaintenance ? '维护中' : '正常可用'}
            </div>
            ${isMaintenance && venue.maintenance_message ? `<div style="color: #666; font-size: 14px;">提示信息：${venue.maintenance_message}</div>` : ''}
            ${isMaintenance && venue.maintenance_end_time ? `<div style="color: #666; font-size: 14px;">预计恢复：${new Date(venue.maintenance_end_time).toLocaleString('zh-CN')}</div>` : ''}
          </div>

          <!-- 状态切换表单 -->
          <div class="form-group">
            <label>维护状态</label>
            <select id="maintenanceStatus" class="form-control" onchange="toggleMaintenanceForm()">
              <option value="normal" ${!isMaintenance ? 'selected' : ''}>正常可用</option>
              <option value="maintenance" ${isMaintenance ? 'selected' : ''}>维护中不可预定</option>
            </select>
          </div>

          <!-- 维护信息表单（仅在维护状态时显示） -->
          <div id="maintenanceInfoForm" style="display: ${isMaintenance ? 'block' : 'none'};">
            <div class="form-group">
              <label>维护提示信息</label>
              <textarea id="maintenanceMessage" class="form-control" rows="2" placeholder="例如：场地正在维修，预计明天恢复">${venue.maintenance_message || ''}</textarea>
            </div>
            <div class="form-group">
              <label>预计恢复时间</label>
              <input type="datetime-local" id="maintenanceEndTime" class="form-control" value="${venue.maintenance_end_time ? new Date(venue.maintenance_end_time).toISOString().slice(0, 16) : ''}">
            </div>
          </div>

          <div class="form-group">
            <label>变更原因（可选）</label>
            <input type="text" id="maintenanceReason" class="form-control" placeholder="例如：场地维修、设备升级等">
          </div>

          <!-- 操作日志按钮 -->
          <div style="margin-top: 20px; text-align: right;">
            <button class="btn btn-default" onclick="showMaintenanceLogs(${venueId})">查看操作日志</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveMaintenanceStatus(${venueId})">保存</button>
          <button class="btn btn-default" onclick="closeMaintenanceModal()">取消</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

  } catch (error) {
    showMessage('加载场地信息失败', 'error');
    console.error('加载场地信息失败:', error);
  }
}

/**
 * toggleMaintenanceForm —— 切换维护信息表单的显示/隐藏
 *
 * 当选择"维护中"状态时显示维护信息表单，选择"正常"时隐藏。
 */
function toggleMaintenanceForm() {
  const status = document.getElementById('maintenanceStatus').value;
  const form = document.getElementById('maintenanceInfoForm');
  form.style.display = status === 'maintenance' ? 'block' : 'none';
}

/**
 * closeMaintenanceModal —— 关闭维护管理弹窗
 */
function closeMaintenanceModal() {
  const modal = document.getElementById('maintenanceModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * saveMaintenanceStatus —— 保存场地维护状态
 *
 * @param {number} venueId - 场地 ID
 */
async function saveMaintenanceStatus(venueId) {
  try {
    const maintenanceStatus = document.getElementById('maintenanceStatus').value;
    const maintenanceMessage = document.getElementById('maintenanceMessage').value;
    const maintenanceEndTime = document.getElementById('maintenanceEndTime').value;
    const reason = document.getElementById('maintenanceReason').value;

    // 构建请求体
    const requestBody = {
      maintenance_status: maintenanceStatus,
      reason: reason
    };

    // 如果设置为维护中，添加维护信息
    if (maintenanceStatus === 'maintenance') {
      if (maintenanceMessage) {
        requestBody.maintenance_message = maintenanceMessage;
      }
      if (maintenanceEndTime) {
        requestBody.maintenance_end_time = maintenanceEndTime;
      }
    }

    // 发送请求
    await apiRequest('/venues/' + venueId + '/maintenance', {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });

    showMessage(maintenanceStatus === 'maintenance' ? '场地已设置为维护状态' : '场地已恢复为正常状态');
    closeMaintenanceModal();
    loadVenues(); // 刷新场地列表

  } catch (error) {
    showMessage('保存失败: ' + error.message, 'error');
    console.error('保存维护状态失败:', error);
  }
}

/**
 * showMaintenanceLogs —— 显示场地维护状态变更日志
 *
 * @param {number} venueId - 场地 ID
 */
async function showMaintenanceLogs(venueId) {
  try {
    const result = await apiRequest('/venues/' + venueId + '/maintenance-logs');
    const logs = result.list || [];

    // 创建日志弹窗
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'logsModal';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h3>维护状态变更日志</h3>
          <span class="close" onclick="document.getElementById('logsModal').remove()">&times;</span>
        </div>
        <div class="modal-body">
          ${logs.length === 0 ? 
            '<p style="text-align: center; color: #999;">暂无日志记录</p>' :
            `<table class="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>操作人</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => {
                  const date = new Date(log.created_at).toLocaleString('zh-CN');
                  const operation = log.new_maintenance_status === 'maintenance' ? 
                    '<span style="color: #faad14;">设置为维护中</span>' : 
                    '<span style="color: #52c41a;">恢复为正常</span>';
                  return `
                    <tr>
                      <td>${date}</td>
                      <td>${operation}</td>
                      <td>${log.operator_name}</td>
                      <td>${log.reason || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>`
          }
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" onclick="document.getElementById('logsModal').remove()">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

  } catch (error) {
    showMessage('加载日志失败', 'error');
    console.error('加载日志失败:', error);
  }
}

/**
 * editVenue —— 编辑已有场地的信息
 *
 * 工作流程：
 *   1. 先从后端获取该场地的当前信息
 *   2. 用 prompt() 弹窗逐项让管理员修改（输入框中预填当前值）
 *   3. 管理员修改完成后，把新数据提交到后端更新
 *
 * @param {number} venueId - 要编辑的场地 ID
 */
async function editVenue(venueId) {
  try {
    // 获取场地信息：先请求所有场地列表，再从中找到目标场地
    // .then() 是 Promise 的链式调用，data => data.list.find(...) 从列表中查找匹配的场地
    const venue = await apiRequest('/admin/venues?limit=100').then(data =>
      data.list.find(v => v.id === venueId)
    );

    // 如果没找到该场地，显示错误提示并返回
    if (!venue) {
      showMessage('场地不存在', 'error');
      return;
    }

    // 显示编辑表单——使用 prompt() 弹窗，第二个参数是输入框的默认值（当前值）
    const name = prompt('场地名称:', venue.name);
    if (name === null) return; // 用户点击了取消

    const location = prompt('场地位置:', venue.location);
    if (location === null) return;

    const description = prompt('场地描述:', venue.description || '');
    if (description === null) return;

    // 设施字段的处理比较复杂：
    // 后端返回的 facilities 可能是数组，也可能是 JSON 字符串
    // Array.isArray() 判断是否为数组，如果是就直接用 .join(',') 拼接成逗号分隔的字符串
    // 如果是字符串，先用 JSON.parse() 解析成数组再拼接
    const facilities = prompt('设施（用逗号分隔）:',
      Array.isArray(venue.facilities) ? venue.facilities.join(',') :
      (typeof venue.facilities === 'string' ? JSON.parse(venue.facilities).join(',') : '')
    );
    if (facilities === null) return;

    // 图片 URL 的处理逻辑与设施相同
    const imageUrls = prompt('图片URL（多个用逗号分隔）:',
      Array.isArray(venue.images) ? venue.images.join(',') :
      (typeof venue.images === 'string' ? JSON.parse(venue.images).join(',') : '')
    );
    if (imageUrls === null) return;

    // 向后端发送 PUT 请求更新场地信息
    // PUT 方法通常用于"更新已有资源"
    await apiRequest('/admin/venues/' + venueId, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        location,
        description,
        facilities: facilities.split(',').map(f => f.trim()).filter(f => f),
        images: imageUrls.split(',').map(url => url.trim()).filter(url => url)
      })
    });

    showMessage('场地更新成功');
    // 重新加载场地列表以显示更新后的数据
    loadVenues();
  } catch (error) {
    showMessage('更新失败: ' + error.message, 'error');
  }
}

/**
 * showPriceModal —— 显示价格设置的模态框（弹窗）
 *
 * 动态创建一个模态框（Modal），包含 6 个价格输入框：
 *   - 平日（周一到周五）：上午、下午、晚上
 *   - 周末（周六和周日）：上午、下午、晚上
 *
 * 模态框创建后会自动加载该场地已有的价格数据，填充到输入框中。
 *
 * 什么是模态框（Modal）？
 *   一种覆盖在页面上方的弹窗，用户必须处理完弹窗内容（保存或取消）
 *   才能继续操作下面的页面。常用于表单填写、确认操作等场景。
 *
 * @param {number} venueId - 要设置价格的场地 ID
 */
function showPriceModal(venueId) {
  // 动态创建一个 div 元素作为模态框的容器
  const modal = document.createElement('div');
  modal.className = 'modal';

  // 设置模态框的内部 HTML 结构
  // 包含：标题栏（带关闭按钮）、价格输入表单、底部操作按钮
  // this.closest('.modal').remove() —— 点击关闭/取消按钮时，找到最近的 .modal 父元素并移除
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>设置场地价格</h3>
        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
      </div>
      <div class="modal-body">
        <div class="price-form">
          <h4>平日价格</h4>
          <div class="price-item">
            <label>08:00-12:00</label>
            <input type="number" id="weekday_morning" placeholder="价格（元）">
          </div>
          <div class="price-item">
            <label>12:00-18:00</label>
            <input type="number" id="weekday_afternoon" placeholder="价格（元）">
          </div>
          <div class="price-item">
            <label>18:00-22:00</label>
            <input type="number" id="weekday_evening" placeholder="价格（元）">
          </div>

          <h4 style="margin-top: 20px;">周末价格</h4>
          <div class="price-item">
            <label>08:00-12:00</label>
            <input type="number" id="weekend_morning" placeholder="价格（元）">
          </div>
          <div class="price-item">
            <label>12:00-18:00</label>
            <input type="number" id="weekend_afternoon" placeholder="价格（元）">
          </div>
          <div class="price-item">
            <label>18:00-22:00</label>
            <input type="number" id="weekend_evening" placeholder="价格（元）">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="savePrices(${venueId})">保存</button>
        <button class="btn btn-default" onclick="this.closest('.modal').remove()">取消</button>
      </div>
    </div>
  `;

  // 把模态框添加到页面的 <body> 中
  document.body.appendChild(modal);
  // 设置 display 为 'block' 使模态框可见（默认可能是隐藏的）
  modal.style.display = 'block';

  // 模态框显示后，加载该场地已有的价格数据并填充到输入框中
  loadExistingPrices(venueId);
}

/**
 * loadExistingPrices —— 加载场地已有的价格数据并填充到模态框的输入框中
 *
 * 当打开价格设置模态框时，如果该场地之前已经设置过价格，
 * 这个函数会把已有的价格数据自动填入对应的输入框中，方便管理员修改。
 *
 * 工作流程：
 *   1. 从后端获取场地信息（包含价格数据）
 *   2. 遍历价格数组，根据 day_type（平日/周末）和 start_time（开始时间）
 *      确定对应的输入框 ID
 *   3. 把价格值填入对应的输入框
 *
 * @param {number} venueId - 场地 ID
 */
async function loadExistingPrices(venueId) {
  try {
    // 获取场地信息（从场地列表中查找目标场地）
    const venue = await apiRequest('/admin/venues?limit=100').then(data =>
      data.list.find(v => v.id === venueId)
    );

    // 如果场地存在且有价格数据
    if (venue && venue.prices) {
      // 遍历每条价格记录
      venue.prices.forEach(price => {
        let inputId = ''; // 用于存储对应的输入框 ID

        // 根据 day_type（日期类型）和 start_time（开始时间）确定输入框 ID
        // 平日价格的输入框 ID 以 'weekday_' 开头
        if (price.day_type === 'weekday') {
          if (price.start_time === '08:00') inputId = 'weekday_morning';       // 平日上午
          else if (price.start_time === '12:00') inputId = 'weekday_afternoon'; // 平日下午
          else if (price.start_time === '18:00') inputId = 'weekday_evening';   // 平日晚上
        // 周末价格的输入框 ID 以 'weekend_' 开头
        } else if (price.day_type === 'weekend') {
          if (price.start_time === '08:00') inputId = 'weekend_morning';       // 周末上午
          else if (price.start_time === '12:00') inputId = 'weekend_afternoon'; // 周末下午
          else if (price.start_time === '18:00') inputId = 'weekend_evening';   // 周末晚上
        }

        // 如果找到了对应的输入框 ID，就把价格值填入
        if (inputId) {
          const input = document.getElementById(inputId);
          if (input) input.value = price.price;
        }
      });
    }
  } catch (error) {
    console.error('加载价格失败:', error);
  }
}

/**
 * savePrices —— 保存场地价格设置
 *
 * 从模态框的 6 个输入框中读取价格值，组装成价格数组，
 * 然后发送到后端保存。保存成功后关闭模态框并刷新场地列表。
 *
 * 价格数据结构说明：
 *   每条价格记录包含：
 *   - day_type：'weekday'（平日）或 'weekend'（周末）
 *   - start_time：时段开始时间（如 '08:00'）
 *   - end_time：时段结束时间（如 '12:00'）
 *   - price：该时段的价格（元）
 *
 * @param {number} venueId - 场地 ID
 */
async function savePrices(venueId) {
  // 从页面上的 6 个输入框中读取价格值，组装成价格数组
  // || 0 表示如果输入框为空，默认价格为 0
  const prices = [
    // ===== 平日（周一到周五）价格 =====
    {
      day_type: 'weekday',       // 平日
      start_time: '08:00',       // 上午时段开始
      end_time: '12:00',         // 上午时段结束
      price: document.getElementById('weekday_morning').value || 0
    },
    {
      day_type: 'weekday',       // 平日
      start_time: '12:00',       // 下午时段开始
      end_time: '18:00',         // 下午时段结束
      price: document.getElementById('weekday_afternoon').value || 0
    },
    {
      day_type: 'weekday',       // 平日
      start_time: '18:00',       // 晚上时段开始
      end_time: '22:00',         // 晚上时段结束
      price: document.getElementById('weekday_evening').value || 0
    },
    // ===== 周末（周六和周日）价格 =====
    {
      day_type: 'weekend',       // 周末
      start_time: '08:00',       // 上午时段开始
      end_time: '12:00',         // 上午时段结束
      price: document.getElementById('weekend_morning').value || 0
    },
    {
      day_type: 'weekend',       // 周末
      start_time: '12:00',       // 下午时段开始
      end_time: '18:00',         // 下午时段结束
      price: document.getElementById('weekend_afternoon').value || 0
    },
    {
      day_type: 'weekend',       // 周末
      start_time: '18:00',       // 晚上时段开始
      end_time: '22:00',         // 晚上时段结束
      price: document.getElementById('weekend_evening').value || 0
    }
  ];

  try {
    // 向后端发送 POST 请求，保存价格数据
    await apiRequest('/admin/venues/' + venueId + '/prices', {
      method: 'POST',
      body: JSON.stringify({ prices })
    });

    // 保存成功，显示成功提示
    showMessage('价格设置成功');
    // 关闭模态框：找到页面上的 .modal 元素并移除
    document.querySelector('.modal').remove();
    // 刷新场地列表
    loadVenues();
  } catch (error) {
    showMessage('保存失败: ' + error.message, 'error');
  }
}