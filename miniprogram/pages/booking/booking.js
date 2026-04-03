/**
 * ========================================
 * 文件名：pages/booking/booking.js
 * 文件说明：这是"场地预订"页面的逻辑文件。
 *
 * 这个页面的主要功能：
 *   1. 展示所有可预订的篮球场地列表
 *   2. 支持按场地类型筛选（公益球场、普通球场、豪华球场、总统球场）
 *   3. 支持关键词搜索场地
 *   4. 支持下拉加载更多（分页加载）
 *   5. 点击场地可跳转到场地详情页
 *
 * 关键概念解释：
 *   - 分页加载：数据量很大时，不会一次性全部加载，而是分批加载。
 *     比如每次加载 10 条，用户滑到底部时再加载下一批 10 条。
 *     这样可以减少等待时间，提升用户体验。
 *   - page ：当前加载到第几页。
 *   - limit ：每页加载多少条数据。
 *   - noMore ：是否已经没有更多数据了（已经加载完全部数据）。
 *   - loading ：是否正在加载中（防止重复请求）。
 * ========================================
 */

// 获取全局应用实例
const app = getApp();

/**
 * Page() —— 注册预订页面
 */
Page({

  /**
   * data —— 页面数据
   */
  data: {
    venues: [],          // 场地列表，存放从服务器获取的场地数据
    venueTypes: ['全部', '公益球场', '普通球场', '豪华球场', '总统球场'],  // 场地类型选项（供用户筛选）
    selectedType: '',    // 当前选中的场地类型，空字符串表示未选择（显示全部）
    searchKeyword: '',   // 搜索关键词，用户在搜索框中输入的内容
    page: 1,             // 当前页码，从第 1 页开始
    loading: false,      // 是否正在加载数据（true 表示正在加载，防止重复请求）
    noMore: false        // 是否已经没有更多数据了（true 表示全部加载完毕）
  },

  /**
   * onLoad() —— 页面加载时执行
   * 页面第一次打开时，加载场地列表。
   */
  onLoad() {
    this.loadVenues();
  },

  /**
   * onShow() —— 页面显示时执行
   * 如果场地列表已经有数据，就刷新一下，确保数据是最新的。
   * 比如用户从详情页返回时，场地状态可能已经变化。
   */
  onShow() {
    // 每次显示页面时刷新（前提是之前已经加载过数据）
    if (this.data.venues.length > 0) {
      this.refreshVenues();
    }
  },

  /**
   * loadVenues() —— 从服务器加载场地列表
   *
   * 这是核心方法，负责向服务器请求场地数据。
   * 支持分页加载和按类型筛选。
   *
   * 执行流程：
   *   1. 检查是否正在加载或已无更多数据，如果是则直接返回（防止重复请求）
   *   2. 构建请求参数（页码、每页数量、价格范围等）
   *   3. 发送请求获取数据
   *   4. 处理返回的数据（解析图片和设施字段）
   *   5. 更新页面显示
   */
  loadVenues() {
    // 如果正在加载中，或者已经没有更多数据了，就不再发送请求
    if (this.data.loading || this.data.noMore) return;

    // 设置加载状态为 true，表示开始加载
    this.setData({ loading: true });

    // 构建请求参数
    const params = {
      page: this.data.page,   // 当前页码
      limit: 10               // 每页加载 10 条数据
    };

    // 如果用户选择了场地类型（且不是"全部"），添加价格范围筛选条件
    if (this.data.selectedType && this.data.selectedType !== '全部') {
      // typeMap —— 场地类型与价格范围的对应关系
      // 通过价格范围来区分不同类型的球场
      const typeMap = {
        '公益球场': { min: 0, max: 0 },         // 免费球场：价格为 0
        '普通球场': { min: 1, max: 500 },       // 普通球场：1~500 元
        '豪华球场': { min: 500, max: 1000 },    // 豪华球场：500~1000 元
        '总统球场': { min: 1000, max: 9999 }    // 总统球场：1000 元以上
      };

      // 根据选中的类型获取对应的价格范围
      const range = typeMap[this.data.selectedType];
      if (range) {
        params.minPrice = range.min;  // 最低价格
        params.maxPrice = range.max;  // 最高价格
      }
    }

    // 向服务器发送请求，获取场地列表
    app.request({
      url: '/venues',       // 接口路径：获取场地列表
      data: params          // 请求参数
    }).then(res => {
      // 解析图片和设施字段（服务器返回的可能是 JSON 字符串，需要转换成数组）
      const venues = res.list.map(venue => {
        return {
          ...venue,  // 复制场馆的所有原始属性
          // 如果 images 是字符串，用 JSON.parse() 解析成数组；否则直接使用
          images: typeof venue.images === 'string' ? JSON.parse(venue.images) : (venue.images || []),
          // facilities（设施）字段同理
          facilities: typeof venue.facilities === 'string' ? JSON.parse(venue.facilities) : (venue.facilities || [])
        };
      });

      // 判断是第一页还是加载更多：
      // 如果是第 1 页，直接使用新数据；否则把新数据追加到已有数据后面
      const newVenues = this.data.page === 1 ? venues : [...this.data.venues, ...venues];

      // 更新页面数据
      this.setData({
        venues: newVenues,                  // 更新场地列表
        loading: false,                     // 加载完成，取消加载状态
        noMore: res.list.length < 10        // 如果返回的数据不足 10 条，说明没有更多数据了
      });
    }).catch(() => {
      // 请求失败，取消加载状态
      this.setData({ loading: false });
    });
  },

  /**
   * refreshVenues() —— 刷新场地列表
   * 重置页码为第 1 页，清空现有数据，重新加载。
   */
  refreshVenues() {
    this.setData({
      page: 1,          // 重置为第 1 页
      noMore: false,    // 重置"没有更多"状态
      venues: []        // 清空现有场地列表
    });
    this.loadVenues();  // 重新加载数据
  },

  /**
   * loadMore() —— 加载更多数据（下一页）
   * 当用户滑动到页面底部时触发，加载下一页的数据。
   */
  loadMore() {
    // 只有在不是正在加载、且还有更多数据时才加载
    if (!this.data.loading && !this.data.noMore) {
      this.setData({
        page: this.data.page + 1   // 页码加 1，请求下一页
      });
      this.loadVenues();
    }
  },

  /**
   * onTypeChange() —— 场地类型筛选变化时触发
   *
   * 参数 e 是事件对象，e.detail.value 是用户选择的类型索引（数字）。
   * 通过索引从 venueTypes 数组中取出对应的类型名称。
   */
  onTypeChange(e) {
    // e.detail.value 是用户选中的选项索引（比如 0 表示"全部"，1 表示"公益球场"）
    const type = this.data.venueTypes[e.detail.value];
    this.setData({ selectedType: type });  // 更新选中的类型
    this.refreshVenues();                  // 刷新列表（按新的筛选条件重新加载）
  },

  /**
   * onReset() —— 重置搜索和筛选条件
   * 清空所有筛选条件，恢复到初始状态。
   */
  onReset() {
    this.setData({
      selectedType: '',      // 清空选中的类型
      searchKeyword: ''      // 清空搜索关键词
    });
    this.refreshVenues();    // 刷新列表
  },

  /**
   * onSearchInput() —— 搜索框输入时触发
   * 实时记录用户输入的搜索关键词。
   *
   * e.detail.value 是输入框中当前的文字内容。
   */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  /**
   * onSearch() —— 执行搜索
   * 用户点击搜索按钮时触发，跳转到搜索结果页面。
   *
   * .trim() —— 去掉字符串前后的空格，防止用户只输入了空格。
   */
  onSearch() {
    const keyword = this.data.searchKeyword.trim();  // 获取并去除首尾空格

    // 如果关键词为空，提示用户输入
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'              // 不显示图标，只显示文字提示
      });
      return;  // 直接返回，不执行后续代码
    }

    // 跳转到搜索结果页面，通过 URL 参数传递搜索关键词
    wx.navigateTo({
      url: '/pages/search/search?keyword=' + keyword
    });
  },

  /**
   * goToDetail() —— 跳转到场地详情页
   * 用户点击某个场地时触发，携带场地 ID 跳转到详情页。
   */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;  // 获取点击的场地 ID
    wx.navigateTo({
      url: '/pages/venue-detail/venue-detail?id=' + id  // 跳转到详情页并传递 ID
    });
  }
});
