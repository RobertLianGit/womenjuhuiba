// pages/index/index.js
const api = require('../../utils/api');
const util = require('../../utils/util');

const app = getApp();

Page({
  data: {
    userInfo: null,
    activities: [],
    showAccessModal: false,
    accessCodeInput: '',
    pendingAccessCode: '',
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    if (app.globalData.isLoggedIn) {
      this.loadActivities();
    }
  },

  checkLogin() {
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
      this.loadActivities();
    } else {
      // 等待登录完成
      app.loginCallback = () => {
        this.setData({
          userInfo: app.globalData.userInfo
        });
        this.loadActivities();
      };
    }
  },

  async loadActivities() {
    try {
      wx.showLoading({ title: '加载中' });
      const openid = app.globalData.openid;
      
      // 获取用户相关的活动
      const res = await api.get(`/mp/activities?openid=${openid}`);
      
      const activities = (res.data || []).map(item => ({
        ...item,
        statusText: util.getStatusText(item.status)
      }));

      this.setData({ activities });
    } catch (err) {
      console.error('加载活动失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  goToProfile() {
    if (!app.globalData.isLoggedIn) {
      app.doLogin();
    }
  },

  goToCreate() {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/create/create' });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  // 口令输入相关
  showAccessModal() {
    this.setData({ showAccessModal: true, accessCodeInput: '' });
  },

  closeAccessModal() {
    this.setData({ showAccessModal: false, accessCodeInput: '' });
  },

  onAccessCodeInput(e) {
    this.setData({ accessCodeInput: e.detail.value });
  },

  async confirmAccessCode() {
    const code = this.data.accessCodeInput;
    if (code.length !== 6) {
      wx.showToast({ title: '请输入6位口令', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '验证中' });
      const res = await api.post('/mp/activities/verify-access', { access_code: code });
      
      if (res.data) {
        wx.hideLoading();
        wx.navigateTo({ url: `/pages/detail/detail?id=${res.data.id}` });
        this.closeAccessModal();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '口令错误或活动不存在', icon: 'none' });
    }
  },

  preventTouchMove() {},

  onShareAppMessage() {
    return {
      title: '我们聚会吧 - 轻松组织朋友聚会',
      path: '/pages/index/index'
    };
  }
});
