/**
 * ==========================================================================
 * 文件名：review.js
 * 文件路径：miniprogram/pages/review/review.js
 * 文件用途：订单评价页面 —— 用户对已完成的篮球场预订进行评分和评价
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 根据订单ID加载订单信息（显示用户要评价的是哪个订单）
 *   2. 用户可以选择评分（1-5星）
 *   3. 用户可以输入文字评价内容
 *   4. 提交评价到服务器
 * --------------------------------------------------------------------------
 * 什么是"评价"功能？
 *   就像你在美团、大众点评上给餐厅打分写评价一样，
 *   用户打完篮球后可以给场馆打个分、写几句感受，
 *   帮助其他用户了解这个场馆的真实情况。
 * ==========================================================================
 */

/**
 * getApp() 获取小程序的全局应用实例，用于调用全局方法。
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
    orderId: '',      // 要评价的订单ID
    order: null,      // 订单详情对象（用于在页面上显示订单信息）
    rating: 5,        // 用户选择的评分（1-5星，默认5星好评）
    content: ''       // 用户输入的评价文字内容
  },

  /**
   * ========== 页面加载时触发（onLoad） ==========
   * 从上一个页面（订单详情页）跳转过来时，会携带 orderId 参数。
   * 例如 URL：/pages/review/review?orderId=123
   */
  onLoad(options) {
    if (options.orderId) {
      // 保存订单ID到页面数据中
      this.setData({ orderId: options.orderId });
      // 根据订单ID加载订单信息
      this.loadOrder(options.orderId);
    }
  },

  /**
   * ========== 加载订单信息（loadOrder） ==========
   * 根据订单ID从服务器获取订单详情，用于在评价页面上显示订单信息。
   * 参数 orderId：订单的唯一标识符
   */
  loadOrder(orderId) {
    app.request({
      url: '/orders/' + orderId    // 获取订单详情的API地址
    }).then(res => {
      // 请求成功，保存订单信息
      this.setData({ order: res });
    }).catch(() => {
      /**
       * 请求失败（比如订单不存在或已被删除），
       * 显示错误提示，然后自动返回上一页。
       */
      wx.showToast({
        title: '订单不存在',
        icon: 'none'       // 'none' 表示不显示图标，只显示文字
      });
      // 等待1.5秒（让用户看到提示信息），然后自动返回上一页
      setTimeout(() => {
        wx.navigateBack();   // 返回上一个页面（相当于点击左上角的返回按钮）
      }, 1500);
    });
  },

  /**
   * ========== 评分变化处理（onRatingChange） ==========
   * 当用户点击星星选择评分时触发。
   * 参数 e：事件对象
   *   - e.currentTarget.dataset.rating：用户点击的星星对应的分数（1-5）
   *
   * 在 WXML 模板中，每个星星元素上会绑定 data-rating="1"、data-rating="2" 等属性，
   * 用户点击哪个星星，就能获取到对应的评分值。
   */
  onRatingChange(e) {
    this.setData({ rating: e.currentTarget.dataset.rating });
  },

  /**
   * ========== 评价内容输入处理（onContentInput） ==========
   * 当用户在文本输入框中输入评价内容时触发。
   * 参数 e：事件对象
   *   - e.detail.value：用户当前输入的文字内容
   *
   * 每次用户输入一个字，这个函数就会被调用一次，
   * 把最新的输入内容同步到页面数据中。
   */
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  /**
   * ========== 提交评价（submitReview） ==========
   * 当用户点击"提交评价"按钮时触发。
   * 会先检查用户是否选择了评分，然后将评价数据发送到服务器。
   */
  submitReview() {
    // 验证：如果用户没有选择评分（rating 为 0 或 undefined），提示用户
    if (!this.data.rating) {
      wx.showToast({
        title: '请选择评分',
        icon: 'none'
      });
      return;   // 直接返回，不继续执行后面的代码
    }

    // 显示"提交中"的加载提示
    wx.showLoading({ title: '提交中...' });

    /**
     * 向服务器发送评价数据。
     * POST 请求，携带订单ID、评分和评价内容。
     */
    app.request({
      url: '/reviews',       // 提交评价的API地址
      method: 'POST',        // POST 方法，表示创建新的评价数据
      data: {
        order_id: this.data.orderId,    // 关联的订单ID（评价的是哪个订单）
        rating: this.data.rating,       // 评分（1-5星）
        content: this.data.content      // 评价文字内容
      }
    }).then(() => {
      // 提交成功
      wx.hideLoading();   // 关闭加载提示
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });
      // 等待1.5秒后自动返回上一页（订单详情页）
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }).catch(() => {
      // 提交失败，关闭加载提示（错误信息通常由 app.request() 内部处理）
      wx.hideLoading();
    });
  }
});
