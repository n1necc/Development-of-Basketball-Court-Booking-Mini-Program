/**
 * ========================================
 * 文件名：app.js
 * 文件说明：这是整个微信小程序的"入口文件"，也叫"应用级文件"。
 *
 * 什么是入口文件？
 *   就像一栋大楼的大门，所有人进大楼都要先经过大门。
 *   小程序启动时，最先运行的就是这个文件。
 *
 * 这个文件的主要作用：
 *   1. 定义全局数据（globalData）—— 所有页面都能访问的公共数据，
 *      比如用户信息、登录凭证（token）、服务器地址等。
 *   2. 处理用户登录 —— 向服务器发送登录请求，保存登录状态。
 *   3. 获取用户信息 —— 从服务器拉取当前登录用户的资料。
 *   4. 封装通用网络请求方法 —— 其他页面调用 app.request() 就能
 *      方便地向服务器发送请求，不用每次都写重复的代码。
 *
 * 关键概念解释：
 *   - App() ：微信提供的函数，用来注册（创建）一个小程序实例。
 *     整个小程序只能调用一次 App()。
 *   - globalData ：一个普通的 JavaScript 对象，用来存放全局共享的数据。
 *   - token ：登录凭证，就像你的"通行证"，每次向服务器请求数据时
 *     都要带上它，服务器才知道你是谁。
 *   - wx.request() ：微信提供的发送网络请求的方法，类似于浏览器中的 fetch。
 *   - Promise ：JavaScript 中处理"异步操作"的方式。异步操作就是
 *     "发出请求后不用等结果，等结果回来了再处理"，比如网络请求。
 * ========================================
 */

/**
 * App() —— 注册小程序。
 * 括号里传入一个对象 {}，对象里包含小程序的全局数据和各种方法。
 */
App({

  /**
   * globalData —— 全局数据对象
   * 这里存放的数据可以在任何页面通过 getApp().globalData 来访问。
   * 就像一个"公共储物柜"，所有页面都能从里面拿东西或放东西。
   */
  globalData: {
    userInfo: null,       // 用户信息（昵称、头像等），初始为 null 表示还没有获取到
    token: null,          // 登录凭证，初始为 null 表示用户还没有登录
    baseUrl: 'http://localhost:3000/api',  // 后端服务器的基础地址（所有接口请求都以这个地址开头）
    systemStatus: 'active',  // 系统状态：active-正常，maintenance-维护中
    maintenanceMessage: '系统维护中，请稍后再试'  // 维护模式提示信息
  },

  /**
   * onLaunch() —— 小程序启动时自动执行的函数（生命周期函数）
   *
   * 什么是生命周期函数？
   *   小程序从启动到关闭会经历不同的阶段，每个阶段微信会自动调用
   *   对应的函数，这些函数就叫"生命周期函数"。
   *   onLaunch 在小程序第一次启动时执行，而且只执行一次。
   *
   * 这里的逻辑：
   *   检查手机本地是否保存了之前的登录凭证（token），
   *   如果有，说明用户之前登录过，就恢复登录状态并获取用户信息。
   */
  onLaunch() {
    // wx.getStorageSync('token') —— 从手机本地存储中同步读取名为 'token' 的数据
    // 本地存储就像手机里的一个小笔记本，可以保存一些数据，下次打开小程序还在
    const token = wx.getStorageSync('token');

    // 如果 token 存在（不为空），说明用户之前登录过
    if (token) {
      this.globalData.token = token;  // 把 token 放到全局数据中，方便其他地方使用
      this.getUserInfo();             // 调用下面定义的方法，从服务器获取用户信息
    }
    
    // 检查系统状态
    this.checkSystemStatus();
  },

  /**
   * checkSystemStatus() —— 检查系统状态
   *
   * 这个方法会向服务器请求当前系统状态，
   * 如果系统处于维护模式，会在全局数据中保存状态和提示信息。
   *
   * 返回值：返回一个 Promise 对象
   */
  checkSystemStatus() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + '/venues/system-status',
        method: 'GET',
        
        success: (res) => {
          if (res.data.code === 200) {
            // 保存系统状态到全局数据
            this.globalData.systemStatus = res.data.data.status;
            if (res.data.data.message) {
              this.globalData.maintenanceMessage = res.data.data.message;
            }
            
            // 如果系统处于维护模式，弹出提示
            if (res.data.data.status === 'maintenance') {
              wx.showModal({
                title: '系统维护',
                content: res.data.data.message || '系统维护中，请稍后再试',
                showCancel: false,  // 不显示取消按钮
                confirmText: '我知道了'
              });
            }
            
            resolve(res.data.data);
          } else {
            reject(res.data.msg);
          }
        },
        
        fail: reject  // 网络请求失败
      });
    });
  },

  /**
   * isSystemInMaintenance() —— 检查系统是否处于维护模式
   *
   * 这个方法会返回系统当前是否处于维护模式。
   * 如果系统处于维护模式，还会弹出提示信息。
   *
   * 返回值：返回 true（维护中）或 false（正常）
   */
  isSystemInMaintenance() {
    if (this.globalData.systemStatus === 'maintenance') {
      // 系统处于维护模式，弹出提示
      wx.showModal({
        title: '系统维护',
        content: this.globalData.maintenanceMessage,
        showCancel: false,
        confirmText: '我知道了'
      });
      return true;
    }
    return false;
  },

  /**
   * login() —— 登录方法
   * 参数说明：
   *   - code ：微信登录时获取的临时凭证码，用来在服务器端换取用户身份
   *   - userInfo ：用户的基本信息（昵称、头像等）
   *
   * 返回值：返回一个 Promise 对象
   *   - 登录成功时，Promise 会 resolve（成功），并返回服务器给的数据
   *   - 登录失败时，Promise 会 reject（失败），并返回错误信息
   *
   * 整体流程：
   *   1. 向服务器发送登录请求，把 code 和用户信息传过去
   *   2. 服务器验证通过后，返回 token（登录凭证）和用户信息
   *   3. 把 token 保存到全局数据和本地存储中
   */
  login(code, userInfo) {
    // 创建并返回一个 Promise（承诺）
    // resolve 表示"成功了，把结果给你"
    // reject 表示"失败了，把错误告诉你"
    return new Promise((resolve, reject) => {

      // wx.request() —— 向服务器发送网络请求
      wx.request({
        url: this.globalData.baseUrl + '/auth/login',  // 请求地址：基础地址 + 登录接口路径
        method: 'POST',                                 // 请求方式：POST（向服务器提交数据时常用）
        data: {                                          // 要发送给服务器的数据
          code,                                          // 微信登录凭证码
          nickName: userInfo.nickName,                   // 用户昵称
          avatarUrl: userInfo.avatarUrl                  // 用户头像地址
        },

        // success —— 请求成功时执行的回调函数（服务器有响应就算成功，不管返回的是什么）
        success: (res) => {
          // res.data 是服务器返回的数据
          // res.data.code === 200 表示服务器处理成功（200 是约定的成功状态码）
          if (res.data.code === 200) {
            // 把服务器返回的 token 和用户信息保存到全局数据中
            this.globalData.token = res.data.data.token;
            this.globalData.userInfo = res.data.data.user;

            // wx.setStorageSync() —— 把 token 保存到手机本地存储
            // 这样下次打开小程序时不用重新登录
            wx.setStorageSync('token', res.data.data.token);

            // 登录成功，把数据传出去
            resolve(res.data.data);
          } else {
            // 服务器返回了错误信息（比如 code 无效等）
            reject(res.data.msg);
          }
        },

        // fail —— 请求失败时执行（比如没有网络、服务器挂了等）
        fail: reject
      });
    });
  },

  /**
   * getUserInfo() —— 获取当前登录用户的信息
   *
   * 这个方法会向服务器请求用户资料，并把结果保存到全局数据中。
   * 需要携带 token（登录凭证），服务器才能识别是哪个用户。
   *
   * 返回值：返回一个 Promise 对象
   */
  getUserInfo() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + '/auth/userinfo',  // 获取用户信息的接口地址
        method: 'GET',                                     // 请求方式：GET（从服务器获取数据时常用）

        // header —— 请求头，用来携带额外信息
        header: {
          // Authorization —— 授权字段，把 token 放在这里
          // 'Bearer ' 是一种标准的 token 传递格式，后面跟上实际的 token 值
          'Authorization': 'Bearer ' + this.globalData.token
        },

        success: (res) => {
          if (res.data.code === 200) {
            // 把获取到的用户信息保存到全局数据中
            this.globalData.userInfo = res.data.data;
            resolve(res.data.data);  // 成功，返回用户信息
          } else {
            reject(res.data.msg);    // 失败，返回错误信息
          }
        },

        fail: reject  // 网络请求失败
      });
    });
  },

  /**
   * request() —— 通用网络请求方法（封装方法）
   *
   * 为什么要封装？
   *   每次向服务器请求数据都要写 wx.request()、设置请求头、处理错误……
   *   代码会非常重复。把这些重复的部分提取出来写成一个通用方法，
   *   其他页面只需要调用 app.request() 并传入简单的参数就行了。
   *   这就是"封装"——把复杂的东西包装起来，对外提供简单的使用方式。
   *
   * 参数说明：
   *   - options ：一个对象，包含以下属性：
   *     - url ：接口路径（不需要写完整地址，会自动拼接 baseUrl）
   *     - method ：请求方式，默认为 'GET'
   *     - data ：要发送的数据，默认为空对象 {}
   *     - header ：额外的请求头（可选）
   *     - requireAuth ：是否需要登录，默认为 true
   *
   * 返回值：返回一个 Promise 对象
   *   - 成功时返回服务器数据中的 data 部分
   *   - 失败时弹出提示并返回错误信息
   */
  request(options) {
    return new Promise((resolve, reject) => {
      // 构建请求头
      const header = { ...options.header };
      
      // 如果需要认证且用户已登录，添加 Authorization 头
      if (options.requireAuth !== false && this.globalData.token) {
        header['Authorization'] = 'Bearer ' + this.globalData.token;
      }

      wx.request({
        // 拼接完整的请求地址：基础地址 + 接口路径
        url: this.globalData.baseUrl + options.url,

        // 如果调用时没有指定请求方式，默认使用 'GET'
        method: options.method || 'GET',

        // 如果调用时没有传数据，默认为空对象
        data: options.data || {},

        // 请求头
        header: header,

        // 请求成功的回调
        success: (res) => {
          if (res.data.code === 200) {
            // 服务器处理成功，返回数据
            resolve(res.data.data);
          } else if (res.data.code === 401) {
            // 未授权错误，可能是 token 过期
            if (options.requireAuth !== false) {
              wx.showToast({
                title: '登录已过期，请重新登录',
                icon: 'none'
              });
              // 清除本地存储的 token
              wx.removeStorageSync('token');
              this.globalData.token = null;
              this.globalData.userInfo = null;
            }
            reject(res.data.msg);
          } else {
            // 服务器返回了其他错误，弹出提示框告诉用户
            wx.showToast({
              title: res.data.msg,   // 显示服务器返回的错误信息
              icon: 'none'           // 不显示图标，只显示文字
            });
            reject(res.data.msg);    // 把错误信息传出去
          }
        },

        // 请求失败的回调（网络问题等）
        fail: (err) => {
          // 弹出"网络请求失败"的提示
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          });
          reject(err);  // 把错误信息传出去
        }
      });
    });
  }
});
