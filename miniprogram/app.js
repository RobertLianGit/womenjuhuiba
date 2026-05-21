// app.js
App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // 替换为你的云开发环境ID
        traceUser: true
      });
    }

    // 检查登录状态
    this.checkLogin();
  },

  globalData: {
    userInfo: null,
    openid: null,
    isLoggedIn: false
  },

  // 检查登录状态
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    if (userInfo && openid) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.isLoggedIn = true;
    }
  },

  // 微信登录（通过云函数获取openid）
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: (res) => {
          if (res.result && res.result.openid) {
            const openid = res.result.openid;
            this.globalData.openid = openid;
            wx.setStorageSync('openid', openid);
            resolve(openid);
          } else {
            reject(new Error('获取openid失败'));
          }
        },
        fail: (err) => {
          console.error('云函数login调用失败', err);
          reject(new Error('登录失败'));
        }
      });
    });
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善活动参与信息',
        success: (res) => {
          this.globalData.userInfo = res.userInfo;
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(res.userInfo);
        },
        fail: reject
      });
    });
  },

  // 确保已登录
  async ensureLogin() {
    if (this.globalData.isLoggedIn) {
      return true;
    }
    
    try {
      await this.wxLogin();
      this.globalData.isLoggedIn = true;
      return true;
    } catch (e) {
      console.error('登录失败', e);
      return false;
    }
  }
});
