Component({
  data: {
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: '🏠'
      },
      {
        pagePath: '/pages/booking/booking',
        text: '预订',
        icon: '📅'
      },
      {
        pagePath: '/pages/my/my',
        text: '我的',
        icon: '👤'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      // 执行页面跳转
      wx.switchTab({
        url: url
      });
    }
  }
});
