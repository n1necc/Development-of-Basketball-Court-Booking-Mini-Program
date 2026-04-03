/**
 * ==========================================================================
 * 文件名：order-detail.js
 * 文件路径：miniprogram/pages/order-detail/order-detail.js
 * 文件用途：订单详情页面 —— 显示某个订单的完整信息
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 根据订单ID从服务器加载订单的详细信息（场地、时间、价格、状态等）
 *   2. 显示订单的入场二维码（用户到场馆后扫码入场）
 *   3. 提供"去评价"功能，跳转到评价页面
 * --------------------------------------------------------------------------
 * 什么是"二维码入场"？
 *   用户支付成功后，服务器会生成一个专属的二维码。
 *   到了篮球场后，出示这个二维码给工作人员扫描，就可以入场了。
 *   就像电影票的取票码一样。
 * ==========================================================================
 */

/**
 * getApp() 获取小程序的全局应用实例，用于调用全局方法（如网络请求）。
 */
const app = getApp();

/**
 * Page() 注册当前页面。
 */
Page({

  /**
   * ========== 页面数据（data） ==========
   */
  data: {
    order: null,      // 订单详情对象，包含订单的所有信息（初始为 null，表示还没加载）
    qrcodeUrl: ''     // 入场二维码的图片地址（用于在页面上显示二维码图片）
  },

  /**
   * ========== 页面加载时触发（onLoad） ==========
   * options.id 是从上一个页面传过来的订单ID。
   * 例如：从订单列表页点击某个订单，URL 为 /pages/order-detail/order-detail?id=123
   */
  onLoad(options) {
    const id = options.id;   // 从 URL 参数中获取订单ID
    if (id) {
      // 如果有订单ID，就去加载订单详情
      this.loadOrderDetail(id);
    }
  },

  /**
   * ========== 加载订单详情（loadOrderDetail） ==========
   * 根据订单ID向服务器请求该订单的完整信息。
   * 参数 id：订单的唯一标识符
   */
  loadOrderDetail(id) {
    app.request({
      url: '/orders/' + id    // 请求订单详情的API地址，拼接上订单ID
    }).then(res => {
      /**
       * 请求成功后，将订单信息和二维码地址保存到页面数据中。
       * res 是服务器返回的订单详情对象，包含：
       *   - 场地信息、预订日期、时间段、价格、订单状态等
       *   - qrcodeDataUrl：入场二维码的图片数据（Base64格式或图片URL）
       */
      this.setData({
        order: res,                      // 保存完整的订单信息
        qrcodeUrl: res.qrcodeDataUrl     // 保存二维码图片地址
      });
    });
  },

  /**
   * ========== 确认订单（confirmOrder） ==========
   * 当用户点击"确认订单"按钮时触发
   */
  confirmOrder() {
    wx.showLoading({ title: '确认中...' });
    
    app.request({
      url: '/orders/' + this.data.order.id + '/confirm',
      method: 'POST'
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '订单已确认',
        icon: 'success'
      });
      // 刷新订单详情
      this.loadOrderDetail(this.data.order.id);
    }).catch(() => {
      wx.hideLoading();
    });
  },

  /**
   * ========== 支付订单（payOrder） ==========
   * 当用户点击"立即支付"按钮时触发
   */
  payOrder() {
    wx.showLoading({ title: '支付中...' });
    
    app.request({
      url: '/orders/' + this.data.order.id + '/pay',
      method: 'POST'
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });
      // 刷新订单详情
      this.loadOrderDetail(this.data.order.id);
    }).catch(() => {
      wx.hideLoading();
    });
  },

  /**
   * ========== 取消订单（cancelOrder） ==========
   * 当用户点击"取消订单"按钮时触发
   */
  cancelOrder() {
    wx.showModal({
      title: '提示',
      content: '确定要取消此订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          
          app.request({
            url: '/orders/' + this.data.order.id + '/cancel',
            method: 'POST'
          }).then(() => {
            wx.hideLoading();
            wx.showToast({
              title: '订单已取消',
              icon: 'success'
            });
            // 刷新订单详情
            this.loadOrderDetail(this.data.order.id);
          }).catch(() => {
            wx.hideLoading();
          });
        }
      }
    });
  },

  /**
   * ========== 去评价订单（reviewOrder） ==========
   * 当用户点击"去评价"按钮时触发。
   * 跳转到评价页面，并把当前订单的ID传过去，
   * 这样评价页面就知道用户要评价的是哪个订单。
   */
  reviewOrder() {
    wx.navigateTo({
      // 跳转到评价页面，通过 URL 参数传递订单ID
      url: '/pages/review/review?orderId=' + this.data.order.id
    });
  }
});
