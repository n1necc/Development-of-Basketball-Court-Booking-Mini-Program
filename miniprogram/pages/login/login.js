/**
 * ========================================
 * 文件名：pages/login/login.js
 * 文件说明：这是"登录"页面的逻辑文件。
 *
 * 登录是用户使用小程序的重要步骤。只有登录后，用户才能进行
 * 预订场地、收藏场馆、查看订单等操作。
 *
 * 微信小程序的登录流程（简化版）：
 *   1. 调用 wx.login() 获取一个临时的 code（登录凭证码）
 *   2. 调用 wx.getUserProfile() 获取用户的昵称和头像等信息
 *   3. 把 code 和用户信息发送给我们的服务器
 *   4. 服务器用 code 去微信服务器换取用户的唯一标识（openid）
 *   5. 服务器返回一个 token（登录凭证）给小程序
 *   6. 小程序保存 token，后续请求都带上它来证明身份
 *
 * 关键概念解释：
 *   - wx.login() ：微信提供的登录方法，会返回一个临时 code。
 *   - wx.getUserProfile() ：获取用户信息（昵称、头像），需要用户手动授权。
 *   - wx.canIUse() ：检测当前微信版本是否支持某个功能。
 *     因为 getUserProfile 是较新的接口，旧版本微信可能不支持。
 *   - wx.showLoading() / wx.hideLoading() ：显示/隐藏加载提示框。
 *   - wx.showModal() ：弹出一个带按钮的对话框，让用户做选择。
 *   - wx.showToast() ：弹出一个短暂的提示信息（几秒后自动消失）。
 *   - getCurrentPages() ：获取当前页面栈（所有已打开的页面列表）。
 *   - wx.navigateBack() ：返回上一个页面。
 *   - wx.switchTab() ：跳转到底部导航栏中的页面。
 * ========================================
 */

// 获取全局应用实例
const app = getApp();

/**
 * Page() —— 注册登录页面
 */
Page({

  /**
   * data —— 页面数据
   */
  data: {
    /**
     * canIUseGetUserProfile —— 当前微信版本是否支持 getUserProfile 接口
     * wx.canIUse('getUserProfile') 会返回 true 或 false。
     * 如果不支持，登录时会使用默认的用户信息（昵称为"微信用户"）。
     */
    canIUseGetUserProfile: wx.canIUse('getUserProfile')
  },

  /**
   * onLogin() —— 微信登录方法（用户点击"登录"按钮时触发）
   *
   * 整体流程：
   *   1. 显示"登录中..."的加载提示
   *   2. 调用 wx.login() 获取临时 code
   *   3. 尝试获取用户信息
   *   4. 调用 doLogin() 完成实际的登录操作
   *   5. 后端会自动生成随机头像和用户名
   */
  onLogin() {
    // 显示加载提示框，告诉用户正在登录
    wx.showLoading({ title: '登录中...' });

    // 调用 wx.login() 获取临时登录凭证 code
    wx.login({
      success: (res) => {
        if (res.code) {
          // 尝试获取用户信息（可选）
          // 由于后端已经实现了随机生成头像和用户名的功能
          // 这里我们直接登录，不传用户信息，让后端自动生成
          this.doLogin(res.code, {});
        } else {
          wx.hideLoading();
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    });
  },

  /**
   * getCodeAndLogin() —— 获取 code 并登录
   * @param {Object} userInfo - 用户信息对象
   */
  getCodeAndLogin(userInfo) {
    // 显示加载提示框，告诉用户正在登录
    wx.showLoading({ title: '登录中...' });

    // 调用 wx.login() 获取临时登录凭证 code
    wx.login({
      // 获取 code 成功的回调
      success: (res) => {
        // 检查是否成功获取到 code
        if (res.code) {
          // 拿到了 code 和用户信息，调用 doLogin() 执行登录
          this.doLogin(res.code, userInfo);
        } else {
          // 获取 code 失败
          wx.hideLoading();
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      },

      // wx.login() 调用失败（一般是系统级错误）
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * doLogin() —— 执行实际的登录操作
   *
   * 参数说明：
   *   - code ：wx.login() 获取的临时登录凭证
   *   - userInfo ：用户信息对象（包含 nickName 昵称和 avatarUrl 头像地址）
   *
   * 这个方法调用 app.js 中定义的 app.login() 方法，
   * 把 code 和用户信息发送给服务器完成登录。
   *
   * 登录成功后：
   *   - 如果是从其他页面跳转过来的（比如预订时发现未登录），就返回上一页
   *   - 如果是直接打开的登录页，就跳转到首页
   */
  doLogin(code, userInfo) {
    // 显示加载提示
    wx.showLoading({ title: '登录中...' });

    // 调用 app.js 中的 login 方法，发送登录请求到服务器
    app.login(code, userInfo).then((res) => {
      // 登录成功
      console.log('登录成功，返回的用户信息:', res.user);
      wx.hideLoading();  // 隐藏加载提示

      // 显示"登录成功"的提示
      wx.showToast({
        title: '登录成功',
        icon: 'success'    // 显示成功的对勾图标
      });

      // 延迟 1.5 秒后跳转页面（让用户看到"登录成功"的提示）
      // setTimeout 是 JavaScript 的定时器，第二个参数 1500 表示 1500 毫秒（1.5 秒）
      setTimeout(() => {
        // getCurrentPages() 获取当前所有已打开的页面
        // 页面栈是一个数组，最后一个元素是当前页面
        const pages = getCurrentPages();

        if (pages.length > 1) {
          // 如果页面栈中有多个页面，说明是从其他页面跳转来的
          // 返回上一个页面（比如用户在预订时被要求登录，登录后返回预订页）
          wx.navigateBack();
        } else {
          // 如果页面栈中只有登录页一个页面，跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }, 1500);

    }).catch((err) => {
      // 登录失败
      wx.hideLoading();
      wx.showToast({
        title: err || '登录失败',  // 显示服务器返回的错误信息，如果没有则显示"登录失败"
        icon: 'none'
      });
    });
  }
});
