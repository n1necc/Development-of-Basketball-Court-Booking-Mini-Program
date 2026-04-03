/**
 * ==========================================================================
 * 文件名：orders.js
 * 文件路径：miniprogram/pages/orders/orders.js
 * 文件用途：订单列表页面 —— 显示用户所有的篮球场预订订单
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 从服务器加载用户的订单列表（可按状态筛选）
 *   2. 支持分页加载（每次加载10条，滚动到底部自动加载更多）
 *   3. 支持下拉刷新（从头重新加载订单）
 *   4. 可以查看订单详情（跳转到订单详情页）
 *   5. 可以取消订单（弹窗确认后发送取消请求）
 * --------------------------------------------------------------------------
 * 什么是"分页加载"？
 *   想象你在刷朋友圈，不是一次性把所有内容都加载出来，
 *   而是先显示最新的几条，往下滑才会加载更多。
 *   这样做可以节省流量，也让页面打开更快。
 * ==========================================================================
 */

/**
 * getApp() 是微信小程序提供的一个全局函数，
 * 它会返回整个小程序的"应用实例"（也就是 app.js 里定义的那个对象）。
 * 通过 app 我们可以调用全局的方法，比如 app.request() 用来发送网络请求。
 */
const app = getApp();

/**
 * Page() 是微信小程序用来"注册一个页面"的函数。
 * 你可以把它理解为：告诉微信"这个页面长什么样、有什么数据、能做什么事"。
 * 里面传入的对象包含了页面的数据（data）和各种方法（函数）。
 */
Page({

  /**
   * ========== 页面数据（data） ==========
   * data 里存放的是页面上需要用到的所有变量。
   * 当这些变量的值发生变化时，页面上对应的内容会自动更新（这叫"数据绑定"）。
   */
  data: {
    orders: [],       // 订单列表数组，存放从服务器获取的所有订单信息
    status: '',       // 当前筛选的订单状态（如 'paid'已支付、'cancelled'已取消等），空字符串表示查看全部
    activeTab: 'all', // 当前激活的标签页：all-全部, pending-待支付, paid-待使用, completed-已完成
    page: 1,          // 当前加载到第几页（用于分页，从第1页开始）
    loading: false,   // 是否正在加载中（true=正在加载，防止重复请求）
    noMore: false,    // 是否已经没有更多数据了（true=所有订单都已加载完毕）
    tabCounts: {      // 各状态订单数量
      all: 0,
      pending: 0,
      paid: 0
    }
  },

  /**
   * ========== 页面加载时触发（onLoad） ==========
   * 当用户进入这个页面时，微信会自动调用这个函数。
   * options 参数包含了从上一个页面传过来的数据（通过 URL 参数传递）。
   * 例如：从"我的"页面跳转过来时可能带上 status='paid'，表示只看已支付的订单。
   */
  onLoad(options) {
    console.log('订单列表页面加载，options:', options);
    this.processOptions(options);
  },

  onShow() {
    console.log('订单列表页面显示');
    // 如果有缓存的选项，也需要处理
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage.options && currentPage.options.status) {
      console.log('onShow 中处理 options:', currentPage.options);
      this.processOptions(currentPage.options);
    }
  },

  processOptions(options) {
    // 根据传入的参数设置初始标签
    let activeTab = 'all';
    let status = '';
    
    if (options.status === 'pending') {
      activeTab = 'pending';
      status = 'pending';
      console.log('设置为待支付标签');
    } else if (options.status === 'paid') {
      activeTab = 'paid';
      status = 'paid';
      console.log('设置为待使用标签');
    } else if (options.status === 'completed') {
      activeTab = 'completed';
      status = 'completed';
      console.log('设置为已完成标签');
    } else if (options.status === 'cancelled') {
      activeTab = 'cancelled';
      status = 'cancelled';
      console.log('设置为已取消标签');
    } else {
      console.log('设置为全部标签');
    }
    
    console.log('最终设置 - activeTab:', activeTab, 'status:', status);
    
    this.setData({ 
      status: status,
      activeTab: activeTab,
      page: 1,
      orders: [],
      noMore: false
    }, () => {
      console.log('setData完成后的数据:', this.data);
      // 开始加载订单列表
      this.loadOrders();
    });
    
    // 加载各状态订单数量
    this.loadTabCounts();
  },

  /**
   * ========== 切换标签页（switchTab） ==========
   * 当用户点击标签栏时触发。
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    let status = '';
    
    // 根据标签设置对应的状态筛选
    if (tab === 'pending') {
      status = 'pending';
    } else if (tab === 'paid') {
      status = 'paid';
    } else if (tab === 'completed') {
      status = 'completed';
    } else if (tab === 'cancelled') {
      status = 'cancelled';
    }
    
    this.setData({
      activeTab: tab,
      status: status,
      page: 1,
      orders: [],
      noMore: false
    });
    
    this.loadOrders();
  },

  /**
   * ========== 加载各状态订单数量（loadTabCounts） ==========
   * 用于显示标签上的未读数量徽章。
   */
  loadTabCounts() {
    // 加载待支付订单数量
    app.request({
      url: '/orders',
      data: { status: 'pending', page: 1, limit: 1 }
    }).then(res => {
      const list = res.list || res || [];
      const total = res.total || list.length || 0;
      this.setData({ 'tabCounts.pending': total });
    }).catch(() => {});
    
    // 加载待使用订单数量
    app.request({
      url: '/orders',
      data: { status: 'paid', page: 1, limit: 1 }
    }).then(res => {
      const list = res.list || res || [];
      const total = res.total || list.length || 0;
      this.setData({ 'tabCounts.paid': total });
    }).catch(() => {});
  },

  /**
   * ========== 计算支付截止时间（calculatePayDeadline） ==========
   * 根据订单确认时间计算支付截止时间（确认后30分钟）。
   */
  calculatePayDeadline(order) {
    if (order.order_status !== 'pending' || !order.confirmed_at) {
      return null;
    }
    
    const confirmedTime = new Date(order.confirmed_at).getTime();
    const deadlineTime = confirmedTime + 30 * 60 * 1000; // 30分钟后
    const now = Date.now();
    const remaining = deadlineTime - now;
    
    // 格式化截止时间
    const deadline = new Date(deadlineTime);
    const hours = String(deadline.getHours()).padStart(2, '0');
    const minutes = String(deadline.getMinutes()).padStart(2, '0');
    
    // 计算剩余时间
    let remainingTime = '';
    if (remaining > 0) {
      const remainingMinutes = Math.floor(remaining / 60000);
      if (remainingMinutes > 0) {
        remainingTime = `${remainingMinutes}分钟`;
      } else {
        remainingTime = '即将超时';
      }
    } else {
      remainingTime = '已超时';
    }
    
    return {
      payDeadline: `${hours}:${minutes}`,
      remainingTime: remainingTime
    };
  },

  /**
   * ========== 加载订单列表（loadOrders） ==========
   * 这个函数负责从服务器获取订单数据。
   * 它会检查是否正在加载或已无更多数据，避免重复请求。
   */
  loadOrders() {
    // 如果当前正在加载，或者已经没有更多数据了，就直接返回，不再发送请求
    if (this.data.loading || this.data.noMore) return;

    // 将 loading 设为 true，表示"我正在加载数据，请不要重复请求"
    this.setData({ loading: true });

    // 构建请求参数：告诉服务器要第几页的数据，每页显示多少条
    const params = {
      page: this.data.page,   // 当前页码
      limit: 10               // 每页最多返回10条订单
    };

    // 如果用户选择了某个状态筛选（比如只看"已支付"的订单），就把状态也加到请求参数里
    if (this.data.status) {
      params.status = this.data.status;
    }

    /**
     * 向服务器发送请求，获取订单列表。
     * app.request() 是在 app.js 中封装好的网络请求方法，
     * 它会自动帮我们加上服务器地址、用户身份信息等。
     */
    app.request({
      url: '/orders',    // 请求的接口地址（服务器上获取订单列表的API）
      data: params       // 携带的参数（页码、每页数量、状态筛选）
    }).then(res => {
      /**
       * 请求成功后的处理逻辑：
       * - 如果是第1页（刷新或首次加载），直接用新数据替换
       * - 如果不是第1页（加载更多），把新数据追加到已有数据后面
       *
       * "..." 是 JavaScript 的"展开运算符"，可以把数组里的元素一个个取出来。
       * 例如：[...['a','b'], ...['c','d']] 的结果是 ['a','b','c','d']
       */
      // 处理返回的数据结构
      let list = res.list || res || [];
      
      // 为待支付订单计算支付截止时间
      list = list.map(order => {
        if (order.order_status === 'pending') {
          const deadlineInfo = this.calculatePayDeadline(order);
          if (deadlineInfo) {
            order.payDeadline = deadlineInfo.payDeadline;
            order.remainingTime = deadlineInfo.remainingTime;
          }
        }
        return order;
      });
      
      const newOrders = this.data.page === 1 ? list : [...this.data.orders, ...list];
      this.setData({
        orders: newOrders,              // 更新订单列表
        loading: false,                 // 加载完成，取消加载状态
        noMore: list.length < 10        // 如果返回的数据不足10条，说明后面没有更多数据了
      });
    }).catch((err) => {
      // 请求失败时（比如网络断了或未登录），也要取消加载状态
      console.error('加载订单列表失败:', err);
      this.setData({ loading: false });
      // 如果是未登录错误，提示用户登录
      if (err && err.includes && err.includes('未登录')) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
      }
    });
  },

  /**
   * ========== 查看订单详情（viewOrder） ==========
   * 当用户点击某个订单时触发，跳转到订单详情页面。
   * 参数 e 是"事件对象"，包含了用户点击的那个元素上绑定的数据。
   */
  viewOrder(e) {
    // 从被点击元素的 data-id 属性中获取订单ID
    const id = e.currentTarget.dataset.id;
    // 使用微信的页面跳转功能，跳转到订单详情页，并把订单ID通过URL参数传过去
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?id=' + id
    });
  },

  /**
   * ========== 确认订单（confirmOrder） ==========
   * 当用户点击"确认订单"按钮时触发。
   */
  confirmOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '确认中...' });
    
    app.request({
      url: '/orders/' + id + '/confirm',
      method: 'POST'
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '订单已确认',
        icon: 'success'
      });
      // 刷新订单列表
      this.setData({ page: 1, orders: [], noMore: false });
      this.loadOrders();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  /**
   * ========== 支付订单（payOrder） ==========
   * 当用户点击"去支付"按钮时触发。
   */
  payOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '支付中...' });
    
    app.request({
      url: '/orders/' + id + '/pay',
      method: 'POST'
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });
      // 刷新订单列表
      this.setData({ page: 1, orders: [], noMore: false });
      this.loadOrders();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  /**
   * ========== 取消订单（cancelOrder） ==========
   * 当用户点击"取消订单"按钮时触发。
   * 会先弹出一个确认对话框，用户确认后才会真正取消。
   */
  cancelOrder(e) {
    // 获取要取消的订单ID
    const id = e.currentTarget.dataset.id;

    /**
     * wx.showModal() 会弹出一个带"确定"和"取消"按钮的对话框，
     * 防止用户误操作（比如不小心点到了取消按钮）。
     */
    wx.showModal({
      title: '提示',                      // 对话框标题
      content: '确定要取消此订单吗？',      // 对话框内容
      success: (res) => {
        // 用户点击了"确定"按钮
        if (res.confirm) {
          // 向服务器发送取消订单的请求（POST 方法表示"执行一个操作"）
          app.request({
            url: '/orders/' + id + '/cancel',   // 取消订单的API地址，包含订单ID
            method: 'POST'                       // 使用 POST 请求方法
          }).then(() => {
            // 取消成功，显示一个短暂的成功提示
            wx.showToast({
              title: '订单已取消',
              icon: 'success'
            });
            // 重置分页参数，重新从第1页加载订单列表（因为数据已经变了）
            this.setData({ page: 1, orders: [], noMore: false });
            this.loadOrders();
          });
        }
      }
    });
  },

  /**
   * ========== 下拉刷新（onPullDownRefresh） ==========
   * 当用户在页面顶部往下拉时，微信会自动调用这个函数。
   * 就像刷朋友圈一样，往下拉就能刷新内容。
   * 注意：需要在页面的 .json 配置文件中开启 "enablePullDownRefresh": true 才能生效。
   */
  onPullDownRefresh() {
    // 重置所有分页相关的数据，从头开始加载
    this.setData({ page: 1, orders: [], noMore: false });
    this.loadOrders();
    // 告诉微信"刷新完成了"，让下拉刷新的动画停下来
    wx.stopPullDownRefresh();
  },

  /**
   * ========== 触底加载更多（onReachBottom） ==========
   * 当用户滚动到页面底部时，微信会自动调用这个函数。
   * 用来实现"无限滚动"效果——滑到底部自动加载下一页的数据。
   */
  onReachBottom() {
    // 只有在"没有正在加载"且"还有更多数据"的情况下，才加载下一页
    if (!this.data.loading && !this.data.noMore) {
      // 页码加1，表示要加载下一页
      this.setData({ page: this.data.page + 1 });
      this.loadOrders();
    }
  }
});
