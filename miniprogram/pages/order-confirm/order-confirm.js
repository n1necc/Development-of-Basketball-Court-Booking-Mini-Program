/**
 * ==========================================================================
 * 文件名：order-confirm.js
 * 文件路径：miniprogram/pages/order-confirm/order-confirm.js
 * 文件用途：订单确认页面 —— 用户确认预订信息并提交订单、完成支付
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 显示用户即将预订的场地信息（场地名称、日期、时间、价格）
 *   2. 用户确认无误后，点击按钮提交订单
 *   3. 订单创建成功后，自动发起支付
 *   4. 支付成功后，跳转到订单详情页面
 * --------------------------------------------------------------------------
 * 页面流程：
 *   选择场地和时间 → 进入本页面确认信息 → 提交订单 → 支付 → 查看订单详情
 * ==========================================================================
 */

/**
 * getApp() 获取小程序的全局应用实例，
 * 这样我们就可以使用 app.js 中定义的公共方法（如 app.request() 发送网络请求）。
 */
const app = getApp();

/**
 * Page() 注册当前页面，传入页面的数据和方法。
 */
Page({

  /**
   * ========== 页面数据（data） ==========
   * 存放页面上需要展示的所有信息。
   * 这些数据会和页面的 WXML 模板绑定，数据变化时页面会自动更新。
   */
  data: {
    venueId: '',      // 场地ID（用来标识是哪个篮球场）
    venueName: '',    // 场地名称（如"阳光篮球馆"，显示给用户看的）
    date: '',         // 预订日期（如"2026-02-28"）
    startTime: '',    // 开始时间（如"14:00"）
    endTime: '',      // 结束时间（如"16:00"）
    price: 0          // 价格（单位：元）
  },

  /**
   * ========== 页面加载时触发（onLoad） ==========
   * 当用户从场地详情页跳转到本页面时，微信会自动调用此函数。
   * options 里包含了上一个页面通过 URL 传递过来的参数。
   * 例如 URL 可能是：/pages/order-confirm/order-confirm?venueId=1&date=2026-02-28&startTime=14:00&endTime=16:00&price=100
   */
  onLoad(options) {
    // 把上一个页面传过来的预订信息保存到页面数据中，用于页面展示
    this.setData({
      venueId: options.venueId,       // 场地ID
      date: options.date,             // 预订日期
      startTime: options.startTime,   // 开始时间
      endTime: options.endTime,       // 结束时间
      price: options.price            // 价格
    });
    // 根据场地ID去服务器查询场地名称（因为URL参数里通常只传ID，不传名称）
    this.loadVenueName(options.venueId);
  },

  /**
   * ========== 加载场地名称（loadVenueName） ==========
   * 根据场地ID向服务器请求场地的详细信息，从中获取场地名称。
   * 参数 id：场地的唯一标识符
   */
  loadVenueName(id) {
    app.request({
      url: '/venues/' + id    // 请求场地详情的API，拼接上场地ID
    }).then(res => {
      // 请求成功后，把场地名称保存到页面数据中，页面上就能显示场地名了
      this.setData({ venueName: res.name });
    });
  },

  /**
   * ========== 提交订单（submitOrder） ==========
   * 当用户点击"确认预订"按钮时触发。
   * 这个函数会先检查系统状态，然后把预订信息发送给服务器，创建一个新的订单。
   * 订单创建成功后直接跳转到订单详情页
   */
  submitOrder() {
    // 先检查系统是否处于维护模式
    if (app.isSystemInMaintenance()) {
      // 系统处于维护模式，不允许提交订单
      return;
    }

    // 显示一个加载提示，告诉用户"正在创建订单，请稍候"
    wx.showLoading({ title: '创建订单中...' });

    /**
     * 向服务器发送 POST 请求来创建订单。
     * POST 方法通常用于"创建新数据"（相对的，GET 方法用于"获取数据"）。
     */
    app.request({
      url: '/orders',          // 创建订单的API地址
      method: 'POST',          // 使用 POST 方法（表示要创建新数据）
      data: {
        venue_id: this.data.venueId,       // 场地ID
        book_date: this.data.date,         // 预订日期
        start_time: this.data.startTime,   // 开始时间
        end_time: this.data.endTime,       // 结束时间
        pay_type: 'wechat'                 // 支付方式：微信支付
      }
    }).then(res => {
      // 订单创建成功，关闭加载提示
      wx.hideLoading();
      // 显示创建成功提示
      wx.showToast({
        title: '订单创建成功',
        icon: 'success'
      });
      // 等待1.5秒后跳转到订单详情页面
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/order-detail/order-detail?id=' + res.order_id
        });
      }, 1500);
    }).catch(() => {
      // 订单创建失败（如网络错误），关闭加载提示
      // 注意：app.request() 内部通常已经处理了错误提示，这里只需关闭 loading
      wx.hideLoading();
    });
  }

});
