// pages/create/create.js
const api = require('../../utils/api');
const util = require('../../utils/util');

const app = getApp();

Page({
  data: {
    name: '',
    description: '',
    activityDate: '',
    location: '',
    generatedAccessCode: '',
    generatedPassphrase: '',
  },

  onLoad() {
    // 生成随机口令
    this.setData({
      generatedAccessCode: util.generateCode(6),
      generatedPassphrase: util.generateCode(6),
    });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ activityDate: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  async submit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入活动名称', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '创建中' });

      const openid = app.globalData.openid;
      const userInfo = app.globalData.userInfo;

      const data = {
        name: this.data.name.trim(),
        description: this.data.description.trim(),
        activity_time: this.data.activityDate || null,
        location: this.data.location.trim(),
        creator_openid: openid,
        creator_name: userInfo.nickName,
        creator_avatar: userInfo.avatarUrl,
        access_code: this.data.generatedAccessCode,
        passphrase: this.data.generatedPassphrase,
      };

      const res = await api.post('/mp/activities', data);

      wx.hideLoading();

      // 显示口令
      wx.showModal({
        title: '创建成功',
        content: `活动口令：${this.data.generatedAccessCode}\n管理口令：${this.data.generatedPassphrase}\n\n请保存好管理口令，用于管理活动`,
        confirmText: '保存口令',
        success: (modalRes) => {
          if (modalRes.confirm) {
            // 复制到剪贴板
            wx.setClipboardData({
              data: `活动：${this.data.name}\n活动口令：${this.data.generatedAccessCode}\n管理口令：${this.data.generatedPassphrase}`,
              success: () => {
                wx.showToast({ title: '已复制' });
              }
            });
          }
          wx.redirectTo({ url: `/pages/detail/detail?id=${res.data.id}` });
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'none' });
      console.error(err);
    }
  }
});
