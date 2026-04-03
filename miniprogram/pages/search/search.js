/**
 * ==========================================================================
 * 文件名：search.js
 * 文件路径：miniprogram/pages/search/search.js
 * 文件用途：搜索页面 —— 用户通过关键词搜索篮球场馆
 * --------------------------------------------------------------------------
 * 功能说明：
 *   1. 提供搜索输入框，用户可以输入关键词（如场馆名称、地址等）
 *   2. 向服务器发送搜索请求，获取匹配的场馆列表
 *   3. 对服务器返回的数据进行格式处理（解析图片和设施信息）
 *   4. 点击搜索结果中的场馆，可以跳转到场馆详情页
 * --------------------------------------------------------------------------
 * 什么是"关键词搜索"？
 *   就像你在百度或淘宝的搜索框里输入文字查找东西一样，
 *   用户输入篮球场的名字或地址的一部分，系统就会找出所有匹配的场馆。
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
    keyword: '',      // 用户输入的搜索关键词
    venues: [],       // 搜索结果列表（匹配的场馆数组）
    loading: false    // 是否正在搜索中（用于显示加载动画）
  },

  /**
   * ========== 页面加载时触发（onLoad） ==========
   * 如果从其他页面跳转过来时携带了关键词参数，就自动执行搜索。
   * 例如：从首页点击搜索框跳转过来，URL 可能是 /pages/search/search?keyword=阳光
   */
  onLoad(options) {
    if (options.keyword) {
      // 把传入的关键词保存到页面数据中（搜索框会自动显示这个关键词）
      this.setData({ keyword: options.keyword });
      // 自动执行搜索
      this.search();
    }
  },

  /**
   * ========== 搜索框输入处理（onSearchInput） ==========
   * 当用户在搜索框中输入文字时触发。
   * 每输入一个字都会调用一次，实时同步输入内容到页面数据中。
   * 参数 e：事件对象
   *   - e.detail.value：搜索框中当前的文字内容
   */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  /**
   * ========== 执行搜索（search） ==========
   * 当用户点击搜索按钮或按下回车键时触发。
   * 会先验证关键词是否为空，然后向服务器发送搜索请求。
   */
  search() {
    /**
     * .trim() 方法会去掉字符串两端的空格。
     * 例如："  篮球  ".trim() 的结果是 "篮球"。
     * 这样可以防止用户只输入了空格就点搜索。
     */
    const keyword = this.data.keyword.trim();

    // 如果关键词为空（用户没输入任何内容），提示用户
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;   // 直接返回，不发送请求
    }

    // 开始搜索，设置加载状态
    this.setData({ loading: true });

    /**
     * 向服务器发送搜索请求。
     * 将关键词作为参数传给服务器，服务器会返回匹配的场馆列表。
     */
    app.request({
      url: '/venues/search/keyword',    // 场馆搜索的API地址
      data: { keyword }                 // 搜索参数（这是 ES6 简写，等同于 { keyword: keyword }）
    }).then(res => {
      /**
       * 搜索成功后，对返回的场馆数据进行格式处理。
       *
       * 为什么需要处理？
       * 服务器返回的 images（图片）和 facilities（设施）字段，
       * 有时候是 JSON 字符串格式（如 '["url1","url2"]'），
       * 有时候已经是数组格式（如 ["url1","url2"]）。
       * 我们需要统一把它们转换成数组格式，页面才能正确使用。
       *
       * .map() 方法会遍历数组中的每一项，对每一项执行指定的操作，
       * 然后返回一个新的数组。就像流水线加工一样，每个产品都经过同样的处理。
       */
      const venues = res.map(venue => {
        return {
          ...venue,   // 保留场馆的所有原始数据（"..."展开运算符）

          /**
           * 处理 images 字段：
           * - 如果是字符串类型 → 用 JSON.parse() 解析成数组
           * - 如果已经是数组 → 直接使用
           * - 如果为空（null/undefined） → 使用空数组 []
           *
           * typeof 运算符用来判断一个值的数据类型，
           * 例如：typeof "hello" 返回 'string'，typeof [1,2] 返回 'object'
           *
           * JSON.parse() 可以把 JSON 格式的字符串转换成 JavaScript 对象或数组，
           * 例如：JSON.parse('["a","b"]') 返回 ["a","b"]
           */
          images: typeof venue.images === 'string' ? JSON.parse(venue.images) : (venue.images || []),

          /**
           * 处理 facilities 字段（场馆设施，如"淋浴间"、"停车场"、"更衣室"等）：
           * 处理逻辑和 images 完全一样。
           */
          facilities: typeof venue.facilities === 'string' ? JSON.parse(venue.facilities) : (venue.facilities || [])
        };
      });

      // 更新页面数据：保存处理后的搜索结果，并取消加载状态
      this.setData({
        venues: venues,     // 搜索结果列表
        loading: false      // 搜索完成
      });
    }).catch(() => {
      // 搜索失败（如网络错误），取消加载状态
      this.setData({ loading: false });
    });
  },

  /**
   * ========== 跳转到场馆详情（goToDetail） ==========
   * 当用户点击搜索结果中的某个场馆时触发，跳转到该场馆的详情页面。
   * 参数 e：事件对象，包含被点击元素上绑定的数据
   */
  goToDetail(e) {
    // 从被点击元素的 data-id 属性中获取场馆ID
    const id = e.currentTarget.dataset.id;
    // 跳转到场馆详情页，通过 URL 参数传递场馆ID
    wx.navigateTo({
      url: '/pages/venue-detail/venue-detail?id=' + id
    });
  }
});
