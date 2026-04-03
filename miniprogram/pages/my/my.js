/**
 * ========================================
 * 文件名：pages/my/my.js
 * 文件说明：这是"我的"页面（个人中心）的逻辑文件。
 *
 * "我的"页面通常在小程序底部导航栏的最右边，是用户管理个人信息的入口。
 *
 * 这个页面的主要功能：
 *   1. 显示用户的个人信息（昵称、头像等）
 *   2. 如果未登录，引导用户去登录
 *   3. 提供快捷入口：查看订单、查看收藏
 *   4. 退出登录功能
 *
 * 关键概念解释：
 *   - isLogin ：一个布尔值（true/false），用来标记用户是否已登录。
 *     页面模板（WXML）中可以根据这个值来决定显示"登录按钮"还是"用户信息"。
 *   - wx.removeStorageSync() ：从手机本地存储中删除指定的数据。
 *   - wx.showModal() ：弹出确认对话框，让用户做选择（确定/取消）。
 * ========================================
 */

// 获取全局应用实例
const app = getApp();

/**
 * Page() —— 注册"我的"页面
 */
Page({

  /**
   * data —— 页面数据
   */
  data: {
    userInfo: null,   // 用户信息对象（昵称、头像等），null 表示还没有获取到
    isLogin: false,   // 是否已登录，false 表示未登录
    pendingCount: 0,  // 待支付订单数量
    paidCount: 0      // 待使用订单数量
  },

  /**
   * onShow() —— 页面显示时执行
   *
   * 为什么用 onShow 而不是 onLoad？
   *   因为用户可能从登录页返回到"我的"页面，这时候登录状态已经改变了。
   *   onLoad 只在页面第一次加载时执行一次，而 onShow 每次页面显示都会执行，
   *   所以用 onShow 可以确保每次都能正确显示登录状态。
   */
  onShow() {
    // 检查全局数据中是否有 token（登录凭证）
    if (app.globalData.token) {
      // 有 token，说明用户已登录
      this.setData({ isLogin: true });  // 更新登录状态为"已登录"
      this.loadUserInfo();               // 加载用户信息
      this.loadOrderCounts();            // 加载订单数量统计
    } else {
      // 没有 token，说明用户未登录
      this.setData({ isLogin: false, pendingCount: 0, paidCount: 0 });
    }
  },

  /**
   * loadOrderCounts() —— 加载订单数量统计
   * 用于在"我的订单"入口显示待支付和待使用订单的数量徽章
   */
  loadOrderCounts() {
    // 加载待支付订单数量
    app.request({
      url: '/orders',
      data: { status: 'pending', page: 1, limit: 1 }
    }).then(res => {
      const total = res.total || 0;
      this.setData({ pendingCount: total });
    }).catch(() => {
      this.setData({ pendingCount: 0 });
    });

    // 加载待使用订单数量
    app.request({
      url: '/orders',
      data: { status: 'paid', page: 1, limit: 1 }
    }).then(res => {
      const total = res.total || 0;
      this.setData({ paidCount: total });
    }).catch(() => {
      this.setData({ paidCount: 0 });
    });
  },

  /**
   * loadUserInfo() —— 从服务器加载用户信息
   *
   * 调用 app.js 中的 getUserInfo() 方法获取用户资料，
   * 然后更新到页面上显示。
   *
   * 如果获取失败（比如 token 过期了），就把登录状态设为未登录。
   */
  loadUserInfo() {
    app.getUserInfo().then(userInfo => {
      // 获取成功，把用户信息更新到页面数据中
      this.setData({ userInfo });
      // 注意：{ userInfo } 是 ES6 的简写语法，等同于 { userInfo: userInfo }
    }).catch(() => {
      // 获取失败（可能是 token 过期或无效），设为未登录状态
      this.setData({ isLogin: false });
    });
  },

  /**
   * goToLogin() —— 跳转到登录页面
   * 当用户未登录时，点击"去登录"按钮触发此方法。
   */
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  /**
   * goToOrders() —— 跳转到订单列表页面
   *
   * 参数 e 是事件对象，通过 e.currentTarget.dataset.status 获取订单状态。
   * 比如用户点击"待支付"按钮，status 就是对应的状态值，
   * 这样订单页面就知道要显示哪种状态的订单。
   */
  goToOrders(e) {
    // 获取用户点击的订单状态（比如：待支付、已完成等）
    const status = e.currentTarget.dataset.status;

    // 跳转到订单列表页，通过 URL 参数传递订单状态
    wx.navigateTo({
      url: '/pages/orders/orders?status=' + status
    });
  },

  /**
   * goToProfile() —— 跳转到个人信息编辑页面
   */
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  /**
   * goToFavorites() —— 跳转到收藏列表页面
   */
  goToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },

  /**
   * bindPhone() —— 绑定手机号
   *
   * 使用微信提供的 button open-type="getPhoneNumber" 方式获取手机号。
   * 这个方法会在用户点击"绑定手机号"文字时触发。
   *
   * 注意：直接点击文字无法触发微信的手机号授权，需要使用 button 组件。
   * 所以这里弹出提示，引导用户使用功能菜单中的"绑定手机号"按钮。
   */
  bindPhone() {
    wx.showModal({
      title: '提示',
      content: '请使用下方菜单中的"绑定手机号"功能',
      showCancel: false
    });
  },

  /**
   * getPhoneNumber() —— 获取微信手机号（通过 button 组件触发）
   *
   * 当用户点击带有 open-type="getPhoneNumber" 的 button 并授权后，
   * 微信会返回加密的手机号数据，需要发送到后端解密。
   *
   * @param {Object} e - 事件对象
   * @param {Object} e.detail - 微信返回的数据
   * @param {string} e.detail.code - 用于后端解密手机号的临时凭证
   * @param {string} e.detail.errMsg - 错误信息（如果用户拒绝授权）
   */
  getPhoneNumber(e) {
    // 检查用户是否授权
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      // 用户拒绝授权
      wx.showToast({
        title: '已取消授权',
        icon: 'none'
      });
      return;
    }

    // 用户同意授权，获取到 code
    const code = e.detail.code;

    // 显示加载提示
    wx.showLoading({ title: '绑定中...' });

    // 调用后端接口，传递 code 用于解密手机号
    app.request({
      url: '/auth/bind-phone',
      method: 'POST',
      data: { code }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });
      // 重新加载用户信息，更新页面显示
      this.loadUserInfo();
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({
        title: err || '绑定失败',
        icon: 'none'
      });
    });
  },

  /**
   * logout() —— 退出登录
   *
   * 退出登录的步骤：
   *   1. 弹出确认对话框，防止用户误操作
   *   2. 用户确认后，清除本地存储中的 token
   *   3. 清除全局数据中的 token 和用户信息
   *   4. 更新页面状态为"未登录"
   *   5. 显示"已退出登录"的提示
   */
  logout() {
    // 弹出确认对话框
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      // 用户点击按钮后的回调
      success: (res) => {
        // res.confirm 为 true 表示用户点击了"确定"
        if (res.confirm) {
          // 从手机本地存储中删除 token
          wx.removeStorageSync('token');

          // 清除全局数据中的 token 和用户信息
          app.globalData.token = null;
          app.globalData.userInfo = null;

          // 更新页面状态：未登录，用户信息清空
          this.setData({ isLogin: false, userInfo: null });

          // 显示退出成功的提示
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
        // 如果用户点击"取消"，什么都不做
      }
    });
  }
});
