// pages/dashboard/dashboard.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    isAdmin: false,
    passphrase: '',
    passphraseInput: '',
    registrations: [],
    manualParticipants: [],
    stats: {
      registered: 0,
      manual: 0,
      total: 0,
    },
    showAddParticipant: false,
    newName: '',
    newPhone: '',
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const [regRes, partRes] = await Promise.all([
        api.get(`/mp/registrations?activity_id=${this.data.activityId}`),
        api.get(`/mp/participants?activity_id=${this.data.activityId}`),
      ]);

      const registrations = regRes.data || [];
      const manualParticipants = partRes.data || [];
      
      // 统计人数
      const registeredCount = registrations.reduce((sum, r) => sum + (r.people_count || 1), 0);
      const manualCount = manualParticipants.length;

      this.setData({
        registrations,
        manualParticipants,
        stats: {
          registered: registeredCount,
          manual: manualCount,
          total: registeredCount + manualCount,
        }
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载数据失败', err);
    }
  },

  onPassphraseInput(e) {
    this.setData({ passphraseInput: e.detail.value });
  },

  async verifyPassphrase() {
    if (!this.data.passphraseInput) {
      wx.showToast({ title: '请输入管理口令', icon: 'none' });
      return;
    }

    try {
      const res = await api.post(`/mp/activities/${this.data.activityId}/verify-passphrase`, {
        passphrase: this.data.passphraseInput,
      });

      if (res.valid) {
        this.setData({ 
          isAdmin: true, 
          passphrase: this.data.passphraseInput,
          showAddParticipant: true 
        });
        wx.showToast({ title: '验证成功', icon: 'success' });
      } else {
        wx.showToast({ title: '口令错误', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '验证失败', icon: 'none' });
    }
  },

  showAddForm() {
    this.setData({ showAddParticipant: true });
  },

  onNameInput(e) {
    this.setData({ newName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ newPhone: e.detail.value });
  },

  async addParticipant() {
    if (!this.data.newName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '添加中' });
      
      await api.post('/mp/participants', {
        activity_id: this.data.activityId,
        name: this.data.newName.trim(),
        phone: this.data.newPhone.trim(),
        passphrase: this.data.passphrase,
      });

      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      
      this.setData({
        newName: '',
        newPhone: '',
        showAddParticipant: false,
      });
      
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  async deleteParticipant(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个参与者吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.delete(`/mp/participants?id=${id}&passphrase=${this.data.passphrase}`);
            wx.showToast({ title: '删除成功' });
            this.loadData();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
