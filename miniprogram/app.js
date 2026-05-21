// app.js
App({
  onLaunch() {
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

  // 微信登录
  wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            // 调用后端获取 openid
            wx.request({
              url: `${require('./utils/config').API_BASE}/mp-login`,
              method: 'POST',
              data: { code: res.code },
              success: (response) => {
                if (response.data && response.data.openid) {
                  const openid = response.data.openid;
                  this.globalData.openid = openid;
                  wx.setStorageSync('openid', openid);
                  resolve(openid);
                } else {
                  reject(new Error('获取openid失败'));
                }
              },
              fail: reject
            });
          } else {
            reject(new Error('wx.login失败'));
          }
        },
        fail: reject
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
