/**
 * ========================================
 * 文件名：pages/index/index.js
 * 文件说明：这是小程序的"首页"逻辑文件。
 *
 * 首页是用户打开小程序后看到的第一个页面，主要展示：
 *   1. 新闻资讯 —— 篮球相关的新闻动态
 *   2. 公告信息 —— 系统发布的通知公告
 *   3. 热门场馆 —— 最受欢迎的篮球场地推荐
 *
 * 用户可以在首页：
 *   - 点击新闻/公告查看详情
 *   - 快速跳转到预订页面、收藏页面、订单页面
 *   - 点击热门场馆查看场地详情
 *
 * 关键概念解释：
 *   - getApp() ：获取全局的小程序实例（就是 app.js 中 App() 创建的那个）
 *     通过它可以访问全局数据和方法，比如 app.request()。
 *   - Page() ：微信提供的函数，用来注册（创建）一个页面。
 *   - this.setData() ：更新页面数据并刷新页面显示。
 *     小程序中，页面上显示的内容和 data 中的数据是绑定的，
 *     修改 data 中的数据，页面上对应的内容就会自动更新。
 *   - onLoad ：页面加载时执行（只执行一次）。
 *   - onShow ：页面显示时执行（每次切回这个页面都会执行）。
 * ========================================
 */

// 获取全局应用实例，这样就可以使用 app.js 中定义的方法和全局数据
const app = getApp();

/**
 * Page() —— 注册首页页面
 * 括号里传入一个对象，包含页面的数据（data）和各种方法。
 */
Page({

  /**
   * data —— 页面数据
   * 这里定义的数据可以在页面的 WXML（页面模板）中直接使用。
   * 比如 newsData 对应页面上显示的新闻列表。
   */
  data: {
    newsData: [],       // 新闻资讯列表，初始为空数组（还没有加载数据）
    announcements: [],  // 公告列表，初始为空数组
    hotVenues: []       // 热门场馆列表，初始为空数组
  },

  /**
   * onLoad() —— 页面加载时自动执行的生命周期函数
   * 页面第一次打开时会执行，适合在这里加载初始数据。
   */
  onLoad() {
    this.loadNews();          // 加载新闻资讯
    this.loadAnnouncements(); // 加载公告信息
    this.loadHotVenues();     // 加载热门场馆
  },

  /**
   * onShow() —— 页面显示时自动执行的生命周期函数
   * 每次页面出现在屏幕上时都会执行（包括从其他页面返回时）。
   * 这里重新加载数据，确保用户看到的是最新内容。
   */
  onShow() {
    // 每次显示页面时重新加载数据，保证数据是最新的
    this.loadNews();
    this.loadAnnouncements();
    this.loadHotVenues();
  },

  /**
   * loadNews() —— 从服务器加载新闻资讯数据
   *
   * 调用 app.request() 向服务器的 /news 接口发送请求，
   * 获取第 1 页、最多 3 条新闻数据，然后更新到页面上。
   *
   * .then() 表示请求成功后要做的事情。
   * .catch() 表示请求失败后要做的事情（这里把列表清空，避免显示旧数据）。
   */
  loadNews() {
    app.request({
      url: '/news',                    // 接口路径：获取新闻列表
      data: { page: 1, limit: 3 }     // 请求参数：第 1 页，每页最多 3 条
    }).then(res => {
      // 请求成功，把服务器返回的新闻列表更新到页面数据中
      this.setData({ newsData: res.list });
    }).catch(() => {
      // 请求失败，把新闻列表设为空数组
      this.setData({ newsData: [] });
    });
  },

  /**
   * loadAnnouncements() —— 从服务器加载公告数据
   * 逻辑和 loadNews() 类似，只是请求的接口不同。
   */
  loadAnnouncements() {
    app.request({
      url: '/announcements',           // 接口路径：获取公告列表
      data: { page: 1, limit: 3 }     // 请求参数：第 1 页，每页最多 3 条
    }).then(res => {
      this.setData({ announcements: res.list });
    }).catch(() => {
      this.setData({ announcements: [] });
    });
  },

  /**
   * loadHotVenues() —— 从服务器加载热门场馆数据
   *
   * 这里有一个额外的数据处理步骤：
   * 服务器返回的 images（图片）和 facilities（设施）字段
   * 可能是 JSON 字符串格式（比如 '["图片1.jpg","图片2.jpg"]'），
   * 需要用 JSON.parse() 把字符串转换成数组才能在页面中正常使用。
   */
  loadHotVenues() {
    app.request({
      url: '/venues/hot/ranking',      // 接口路径：获取热门场馆排行
      data: { limit: 2 }              // 请求参数：只获取前 2 个热门场馆
    }).then(res => {
      // res.map() —— 遍历数组中的每一项，对每一项进行处理，返回一个新数组
      const venues = res.map(venue => {
        return {
          ...venue,  // ...venue 是"展开运算符"，把原来场馆的所有属性复制过来

          // 处理 images 字段：如果是字符串就解析成数组，否则直接使用（如果为空则用空数组）
          images: typeof venue.images === 'string' ? JSON.parse(venue.images) : (venue.images || []),

          // 处理 facilities 字段：同上
          facilities: typeof venue.facilities === 'string' ? JSON.parse(venue.facilities) : (venue.facilities || [])
        };
      });

      // 把处理好的场馆数据更新到页面
      this.setData({ hotVenues: venues });
    }).catch(() => {
      // 如果加载失败，使用空数组作为默认数据
      this.setData({ hotVenues: [] });
    });
  },

  /**
   * goToNewsDetail() —— 跳转到新闻详情（弹窗显示）
   *
   * 参数 e 是"事件对象"，当用户点击页面上的元素时，微信会自动传入这个对象。
   * e.currentTarget.dataset.index 可以获取到用户点击的是第几条新闻。
   * （这个 index 是在 WXML 模板中通过 data-index 属性设置的）
   *
   * wx.showModal() —— 弹出一个模态对话框（就是一个弹窗），显示新闻的标题和内容。
   */
  goToNewsDetail(e) {
    // 根据点击的索引，从新闻列表中取出对应的新闻数据
    const news = this.data.newsData[e.currentTarget.dataset.index];

    // 弹出对话框显示新闻详情
    wx.showModal({
      title: news.title,                      // 弹窗标题：新闻标题
      content: news.content || news.summary,  // 弹窗内容：优先显示完整内容，没有则显示摘要
      showCancel: false                        // 不显示"取消"按钮，只显示"确定"按钮
    });
  },

  /**
   * goToAnnouncementDetail() —— 跳转到公告详情（弹窗显示）
   * 逻辑和 goToNewsDetail() 类似，只是数据来源是公告列表。
   */
  goToAnnouncementDetail(e) {
    const announcement = this.data.announcements[e.currentTarget.dataset.index];
    wx.showModal({
      title: announcement.title,       // 弹窗标题：公告标题
      content: announcement.content,   // 弹窗内容：公告内容
      showCancel: false
    });
  },

  /**
   * goToBooking() —— 跳转到预订页面
   *
   * wx.switchTab() —— 跳转到 tabBar 页面（底部导航栏中的页面）。
   * 注意：tabBar 页面只能用 switchTab 跳转，不能用 navigateTo。
   */
  goToBooking() {
    wx.switchTab({
      url: '/pages/booking/booking'    // 预订页面的路径
    });
  },

  /**
   * goToFavorites() —— 跳转到"我的收藏"页面
   *
   * wx.navigateTo() —— 跳转到一个新页面（会保留当前页面，可以返回）。
   * 就像打开了一个新窗口，点"返回"可以回到之前的页面。
   */
  goToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'  // 收藏页面的路径
    });
  },

  /**
   * goToOrders() —— 跳转到"我的订单"页面
   */
  goToOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'        // 订单页面的路径
    });
  },

  /**
   * goToVenueDetail() —— 跳转到场地详情页面
   *
   * 通过 e.currentTarget.dataset.id 获取用户点击的场馆 ID，
   * 然后把 ID 作为参数拼接到 URL 中传递给详情页面。
   * 详情页面通过 onLoad(options) 中的 options.id 就能拿到这个 ID。
   */
  goToVenueDetail(e) {
    // 获取用户点击的场馆 ID
    const id = e.currentTarget.dataset.id;

    // 跳转到场地详情页，并通过 URL 参数传递场馆 ID
    wx.navigateTo({
      url: '/pages/venue-detail/venue-detail?id=' + id
    });
  }
});
