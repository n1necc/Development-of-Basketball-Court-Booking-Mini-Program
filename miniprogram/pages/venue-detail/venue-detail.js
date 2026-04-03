/**
 * ========================================
 * 文件名：pages/venue-detail/venue-detail.js
 * 文件说明：这是"场地详情"页面的逻辑文件。
 *
 * 当用户在首页或预订页点击某个篮球场馆时，就会跳转到这个页面。
 * 这个页面展示一个场馆的完整信息，是用户决定是否预订的关键页面。
 *
 * 这个页面的主要功能：
 *   1. 展示场馆详细信息（名称、图片、设施、价格等）
 *   2. 展示其他用户对该场馆的评价
 *   3. 收藏/取消收藏场馆
 *   4. 选择日期查看可预订的时间段
 *   5. 点击可用时段跳转到订单确认页面进行预订
 *
 * 关键概念解释：
 *   - options ：页面参数对象。当从其他页面跳转过来时，URL 中的参数
 *     会被自动解析到 options 中。比如跳转链接是
 *     '/pages/venue-detail/venue-detail?id=123'，
 *     那么 options.id 就是 '123'。
 *   - 时间段（timeSlots）：场馆把一天分成多个时间段（比如 8:00-10:00、
 *     10:00-12:00），每个时间段有自己的状态（可预订/已满/不可用）和价格。
 *   - 模板字符串（``）：用反引号包裹的字符串，可以用 ${变量名} 嵌入变量，
 *     比如 `你好${name}` 会把 name 的值插入到字符串中。
 * ========================================
 */

// 获取全局应用实例
const app = getApp();

/**
 * Page() —— 注册场地详情页面
 */
Page({

  /**
   * data —— 页面数据
   */
  data: {
    venue: null,          // 场馆详细信息，null 表示还没有加载
    reviews: [],          // 用户评价列表
    isFavorite: false,    // 当前用户是否已收藏该场馆（true=已收藏，false=未收藏）
    selectedDate: '',     // 用户选择的日期（格式：'2024-01-15'）
    timeSlots: []         // 可预订的时间段列表
  },

  /**
   * onLoad() —— 页面加载时执行
   *
   * 参数 options 包含从上一个页面传递过来的参数。
   * 这里需要获取场馆 ID（options.id），然后加载该场馆的所有数据。
   */
  onLoad(options) {
    // 从页面参数中获取场馆 ID
    const id = options.id;

    // 如果 ID 存在，开始加载数据
    if (id) {
      // 把场馆 ID 保存到页面数据中，后续方法会用到
      this.setData({ venueId: id });

      // 同时发起多个数据加载请求（它们互不依赖，可以并行执行）
      this.loadVenueDetail(id);   // 加载场馆详细信息
      this.loadReviews(id);       // 加载用户评价
      this.checkFavorite(id);     // 检查是否已收藏

      // 默认选择今天的日期，并加载今天的可用时段
      const today = new Date();                    // 创建一个表示当前时间的日期对象
      const dateStr = this.formatDate(today);      // 把日期格式化为 'YYYY-MM-DD' 格式的字符串
      this.setData({ selectedDate: dateStr });     // 更新选中的日期
      this.loadTimeSlots(id, dateStr);             // 加载该日期的可用时段
    }
  },

  /**
   * loadVenueDetail() —— 从服务器加载场馆详细信息
   *
   * 参数：id —— 场馆的唯一标识符（ID）
   *
   * 服务器返回的数据中，images（图片）和 facilities（设施）字段
   * 可能是 JSON 字符串格式，需要解析成数组才能在页面中正常使用。
   */
  loadVenueDetail(id) {
    app.request({
      url: '/venues/' + id,   // 接口路径：获取指定 ID 的场馆详情
      requireAuth: false      // 不需要登录即可查看场馆详情
    }).then(res => {
      // 处理服务器返回的数据
      const venue = {
        ...res,  // 复制所有原始属性

        // 解析 images 字段：如果是字符串就用 JSON.parse() 转成数组，否则直接使用
        images: typeof res.images === 'string' ? JSON.parse(res.images) : (res.images || []),

        // 解析 facilities 字段：同上
        facilities: typeof res.facilities === 'string' ? JSON.parse(res.facilities) : (res.facilities || [])
      };

      // 把处理好的场馆数据更新到页面
      this.setData({ venue });
    }).catch(err => {
      console.error('加载场馆详情失败:', err);
      wx.showToast({
        title: '加载场馆信息失败',
        icon: 'none'
      });
    });
  },

  /**
   * loadReviews() —— 从服务器加载该场馆的用户评价
   *
   * 参数：id —— 场馆 ID
   */
  loadReviews(id) {
    app.request({
      url: '/reviews/venue/' + id,  // 接口路径：获取指定场馆的评价列表
      requireAuth: false            // 不需要登录即可查看评价
    }).then(res => {
      // 处理返回的评价数据
      const reviews = res.list || res || [];
      this.setData({ reviews: reviews });  // 更新评价列表
    }).catch(err => {
      console.error('加载评价失败:', err);
      this.setData({ reviews: [] });
    });
  },

  /**
   * checkFavorite() —— 检查当前用户是否已收藏该场馆
   *
   * 参数：id —— 场馆 ID
   *
   * 向服务器查询收藏状态，更新页面上的收藏图标（实心/空心）。
   * 如果用户未登录，直接返回，不发送请求。
   */
  checkFavorite(id) {
    // 如果用户未登录，不查询收藏状态
    if (!app.globalData.token) {
      return;
    }
    
    app.request({
      url: '/favorites/check/' + id   // 接口路径：检查是否已收藏
    }).then(res => {
      // res.isFavorite 是一个布尔值：true 表示已收藏，false 表示未收藏
      this.setData({ isFavorite: res.isFavorite });
    }).catch(() => {
      // 忽略错误（未登录时不影响页面正常显示）
      this.setData({ isFavorite: false });
    });
  },

  /**
   * loadTimeSlots() —— 加载指定日期的可预订时间段
   *
   * 参数：
   *   - venueId ：场馆 ID
   *   - date ：日期字符串（格式：'YYYY-MM-DD'）
   *
   * 服务器会返回该场馆在指定日期的所有时间段，
   * 每个时间段包含开始时间、结束时间、价格、状态（可预订/已满）等信息。
   */
  loadTimeSlots(venueId, date) {
    app.request({
      url: '/venues/' + venueId + '/available',  // 接口路径：获取可用时段
      data: { date },                             // 请求参数：日期
      requireAuth: false                          // 不需要登录即可查看可用时段
      // 注意：{ date } 是 ES6 简写，等同于 { date: date }
    }).then(res => {
      // app.request 已经返回了 res.data.data
      if (res && Array.isArray(res)) {
        this.setData({ timeSlots: res });  // 更新时间段列表
      } else {
        console.error('可用时段数据格式错误:', res);
        this.setData({ timeSlots: [] });
      }
    }).catch(err => {
      console.error('加载可用时段失败:', err);
      this.setData({ timeSlots: [] });
      wx.showToast({
        title: '加载时段失败',
        icon: 'none'
      });
    });
  },

  /**
   * onDateChange() —— 用户切换日期时触发
   *
   * 参数 e 是事件对象，e.detail.value 是用户选择的新日期。
   * 切换日期后，需要重新加载该日期的可用时段。
   */
  onDateChange(e) {
    const date = e.detail.value;                       // 获取用户选择的日期
    this.setData({ selectedDate: date });              // 更新选中的日期
    this.loadTimeSlots(this.data.venueId, date);       // 加载新日期的可用时段
  },

  /**
   * toggleFavorite() —— 收藏或取消收藏场馆
   *
   * 这是一个"切换"操作：
   *   - 如果当前已收藏，点击后取消收藏
   *   - 如果当前未收藏，点击后添加收藏
   * 服务器会自动判断当前状态并执行相应操作。
   *
   * 注意：收藏功能需要登录，如果用户未登录，会先跳转到登录页。
   */
  toggleFavorite() {
    // 检查用户是否已登录（通过判断 token 是否存在）
    if (!app.globalData.token) {
      // 未登录，跳转到登录页面
      wx.navigateTo({ url: '/pages/login/login' });
      return;  // 直接返回，不执行后续代码
    }

    // 向服务器发送收藏/取消收藏的请求
    app.request({
      url: '/favorites',
      method: 'POST',                              // POST 请求：向服务器提交数据
      data: { venue_id: this.data.venueId }        // 传递场馆 ID
    }).then(res => {
      // 更新收藏状态
      this.setData({ isFavorite: res.isFavorite });

      // 根据操作结果显示不同的提示
      wx.showToast({
        title: res.isFavorite ? '收藏成功' : '已取消收藏',  // 三元表达式：条件 ? 真值 : 假值
        icon: 'success'
      });
    });
  },

  /**
   * bookVenue() —— 预订场地
   *
   * 用户点击某个可用时段时触发此方法。
   * 会先检查登录状态、场地维护状态和时段是否可预订，然后跳转到订单确认页面。
   *
   * 参数 e 是事件对象，通过 e.currentTarget.dataset.slot 获取
   * 用户点击的时段信息（包含开始时间、结束时间、价格、状态等）。
   */
  bookVenue(e) {
    // 检查用户是否已登录
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }

    // 检查场地是否处于维护状态
    const venue = this.data.venue;
    if (venue && venue.maintenance_status === 'maintenance') {
      wx.showModal({
        title: '场地维护中',
        content: venue.maintenance_message || '该场地正在维护中，暂不接受预订',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    // 获取用户点击的时段数据
    const slot = e.currentTarget.dataset.slot;

    // 检查该时段是否可预订（status 为 'available' 表示可预订）
    if (slot.status !== 'available') {
      wx.showToast({
        title: '该时段不可预订',
        icon: 'none'
      });
      return;  // 不可预订，直接返回
    }

    // 跳转到订单确认页面，通过 URL 参数传递预订所需的信息
    // 使用模板字符串（反引号 ``）拼接 URL，${} 中可以嵌入变量
    wx.navigateTo({
      url: `/pages/order-confirm/order-confirm?venueId=${this.data.venueId}&date=${this.data.selectedDate}&startTime=${slot.start_time}&endTime=${slot.end_time}&price=${slot.price}`
    });
  },

  /**
   * formatDate() —— 将日期对象格式化为字符串
   *
   * 参数：date —— JavaScript 的 Date 日期对象
   * 返回值：格式为 'YYYY-MM-DD' 的字符串（比如 '2024-01-15'）
   *
   * 为什么需要格式化？
   *   JavaScript 的 Date 对象包含很多信息（年月日时分秒等），
   *   但服务器接口通常只需要 'YYYY-MM-DD' 格式的日期字符串。
   */
  formatDate(date) {
    const year = date.getFullYear();                          // 获取年份（比如 2024）
    const month = String(date.getMonth() + 1).padStart(2, '0');  // 获取月份（注意：月份从 0 开始，所以要 +1）
    // padStart(2, '0') 表示如果不足 2 位就在前面补 '0'，比如 1 变成 '01'
    const day = String(date.getDate()).padStart(2, '0');     // 获取日期，同样补零

    // 拼接成 'YYYY-MM-DD' 格式并返回
    return `${year}-${month}-${day}`;
  }
});
