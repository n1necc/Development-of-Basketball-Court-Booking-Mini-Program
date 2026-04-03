/**
 * ========================================
 * 文件名：pages/profile/profile.js
 * 文件说明：个人信息编辑页面的逻辑文件
 *
 * 这个页面的主要功能：
 *   1. 显示用户当前的个人信息
 *   2. 支持上传和预览头像
 *   3. 支持编辑用户名和手机号
 *   4. 验证输入信息并保存到服务器
 * ========================================
 */

// 获取全局应用实例
const app = getApp();

/**
 * Page() —— 注册个人信息页面
 */
Page({

  /**
   * data —— 页面数据
   */
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      phone: '',
      balance: 0
    },
    isSaving: false,      // 是否正在保存
    errorMessage: '',     // 错误提示信息
    successMessage: ''    // 成功提示信息
  },

  /**
   * onLoad() —— 页面加载时执行
   */
  onLoad() {
    this.loadUserInfo();
  },

  /**
   * onShow() —— 页面显示时执行
   */
  onShow() {
    this.loadUserInfo();
  },

  /**
   * loadUserInfo() —— 加载用户信息
   */
  loadUserInfo() {
    app.getUserInfo().then(userInfo => {
      this.setData({ userInfo });
    }).catch(() => {
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

  /**
   * chooseAvatar() —— 选择头像
   */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取临时文件路径
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 读取文件并转换为 base64
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (fileRes) => {
            // 生成 base64 图片 URL
            const base64Url = `data:image/jpeg;base64,${fileRes.data}`;
            this.setData({
              'userInfo.avatarUrl': base64Url
            });
          },
          fail: (err) => {
            console.log('读取文件失败:', err);
            wx.showToast({
              title: '头像处理失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.log('选择头像失败:', err);
      }
    });
  },

  /**
   * onNickNameChange() —— 用户名输入变化
   * @param {Object} e - 事件对象
   */
  onNickNameChange(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
  },

  /**
   * onPhoneChange() —— 手机号输入变化
   * @param {Object} e - 事件对象
   */
  onPhoneChange(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    });
  },

  /**
   * validateForm() —— 验证表单
   * @returns {Object} 验证结果 { isValid: boolean, message: string }
   */
  validateForm() {
    const { nickName, phone } = this.data.userInfo;

    // 验证用户名
    if (!nickName || nickName.trim() === '') {
      return { isValid: false, message: '请输入用户名' };
    }

    if (nickName.length > 20) {
      return { isValid: false, message: '用户名不能超过20个字符' };
    }

    // 验证手机号
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return { isValid: false, message: '请输入正确的手机号' };
    }

    return { isValid: true, message: '' };
  },

  /**
   * saveProfile() —— 保存个人信息
   */
  saveProfile() {
    // 验证表单
    const validation = this.validateForm();
    if (!validation.isValid) {
      this.setData({ errorMessage: validation.message });
      setTimeout(() => {
        this.setData({ errorMessage: '' });
      }, 3000);
      return;
    }

    // 显示加载状态
    this.setData({ isSaving: true });

    // 调用更新用户信息接口
    app.request({
      url: '/auth/update-profile',
      method: 'POST',
      data: {
        nickName: this.data.userInfo.nickName,
        avatarUrl: this.data.userInfo.avatarUrl,
        phone: this.data.userInfo.phone
      }
    }).then(() => {
      // 保存成功
      this.setData({
        isSaving: false,
        successMessage: '保存成功'
      });
      
      // 3秒后清除成功提示
      setTimeout(() => {
        this.setData({ successMessage: '' });
      }, 3000);
      
      // 重新加载用户信息
      this.loadUserInfo();
      
      // 刷新全局用户信息
      app.getUserInfo();
    }).catch((err) => {
      // 保存失败
      this.setData({
        isSaving: false,
        errorMessage: err || '保存失败'
      });
      
      // 3秒后清除错误提示
      setTimeout(() => {
        this.setData({ errorMessage: '' });
      }, 3000);
    });
  }
});