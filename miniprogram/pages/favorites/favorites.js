/**
 * ==========================================================================
 * 文件名：favorites.js
 * 文件路径：miniprogram/pages/favorites/favorites.js
 * 文件用途：收藏列表页面 —— 显示用户收藏的所有篮球场馆
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 从服务器加载用户收藏的场馆列表
 *   2. 点击某个场馆可以跳转到场馆详情页
 *   3. 可以取消收藏某个场馆
 * --------------------------------------------------------------------------
 * 什么是"收藏"功能？
 *   就像你在淘宝里收藏商品一样，用户可以把喜欢的篮球场馆加入收藏，
 *   下次想预订时就不用重新搜索了，直接从收藏列表里找到就行。
 * ==========================================================================
 */

/**
 * getApp() 获取小程序的全局应用实例，用于调用全局方法（如 app.request() 发送网络请求）。
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
    favorites: [],    // 收藏列表数组，存放用户收藏的所有场馆信息
    loading: false    // 是否正在加载中（true=正在加载，用于显示加载动画）
  },

  /**
   * ========== 页面显示时触发（onShow） ==========
   * 每次页面显示时都会调用（包括从其他页面返回时）。
   *
   * 为什么用 onShow 而不是 onLoad？
   * - onLoad 只在页面第一次打开时调用一次
   * - onShow 每次页面显示都会调用（包括从详情页返回时）
   * 这样做的好处是：如果用户在详情页取消了收藏，返回收藏列表时会自动刷新，
   * 保证列表数据是最新的。
   */
  onShow() {
    this.loadFavorites();
  },

  /**
   * ========== 加载收藏列表（loadFavorites） ==========
   * 从服务器获取当前用户的所有收藏场馆。
   */
  loadFavorites() {
    // 开始加载，设置 loading 为 true（页面上可以显示加载动画）
    this.setData({ loading: true });

    app.request({
      url: '/favorites'    // 获取收藏列表的API地址
    }).then(res => {
      /**
       * 请求成功后，更新页面数据：
       * - res.list 是服务器返回的收藏场馆数组
       * - 同时将 loading 设为 false，表示加载完成
       */
      this.setData({
        favorites: res.list,    // 更新收藏列表
        loading: false          // 加载完成
      });
    }).catch(() => {
      // 请求失败时，也要取消加载状态
      this.setData({ loading: false });
    });
  },

  /**
   * ========== 跳转到场馆详情（goToDetail） ==========
   * 当用户点击收藏列表中的某个场馆时触发，跳转到该场馆的详情页面。
   * 参数 e：事件对象，包含被点击元素上绑定的数据
   */
  goToDetail(e) {
    // 从被点击元素的 data-id 属性中获取场馆ID
    const id = e.currentTarget.dataset.id;
    // 使用 wx.navigateTo() 跳转到场馆详情页，并通过 URL 参数传递场馆ID
    wx.navigateTo({
      url: '/pages/venue-detail/venue-detail?id=' + id
    });
  },

  /**
   * ========== 取消收藏（removeFavorite） ==========
   * 当用户点击"取消收藏"按钮时触发。
   * 向服务器发送请求，将该场馆从用户的收藏列表中移除。
   * 参数 e：事件对象，包含被点击元素上绑定的数据
   */
  removeFavorite(e) {
    // 获取要取消收藏的场馆ID
    const id = e.currentTarget.dataset.id;

    /**
     * 向服务器发送取消收藏的请求。
     * 这里用 POST 方法发送 venue_id，服务器会判断：
     * 如果已收藏则取消收藏，如果未收藏则添加收藏（即"切换收藏状态"）。
     */
    app.request({
      url: '/favorites',           // 收藏相关的API地址
      method: 'POST',              // POST 方法
      data: { venue_id: id }       // 传递场馆ID
    }).then(() => {
      // 取消收藏成功，显示提示信息
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
      // 重新加载收藏列表，让页面上的数据保持最新
      this.loadFavorites();
    });
  }
});
