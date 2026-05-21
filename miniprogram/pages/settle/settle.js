// pages/settle/settle.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    isAdmin: false,
    passphrase: '',
    passphraseInput: '',
    bills: [],
    participants: [],
    totalAmount: 0,
    avgAmount: 0,
    participantsCount: 0,
    splits: [],
    showAddBillForm: false,
    billDesc: '',
    billAmount: '',
    billPayer: '',
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
      
      const [billsRes, regRes, partRes] = await Promise.all([
        api.get(`/mp/bills?activity_id=${this.data.activityId}`),
        api.get(`/mp/registrations?activity_id=${this.data.activityId}`),
        api.get(`/mp/participants?activity_id=${this.data.activityId}`),
      ]);

      const bills = billsRes.data || [];
      const registrations = regRes.data || [];
      const manualParticipants = partRes.data || [];
      
      // 计算总费用
      const totalAmount = bills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
      
      // 计算参与人数
      const registeredCount = registrations.reduce((sum, r) => sum + (r.people_count || 1), 0);
      const totalCount = registeredCount + manualParticipants.length;
      
      // 计算人均
      const avgAmount = totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : 0;
      
      // 生成分摊明细
      const splits = this.calculateSplits(registrations, manualParticipants, avgAmount);

      this.setData({
        bills,
        participants: [...registrations, ...manualParticipants],
        totalAmount: totalAmount.toFixed(2),
        participantsCount: totalCount,
        avgAmount,
        splits,
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载数据失败', err);
    }
  },

  calculateSplits(registrations, manualParticipants, avgAmount) {
    const splits = [];
    
    // 从报名中提取
    const userMap = new Map();
    registrations.forEach(r => {
      if (!userMap.has(r.user_name)) {
        userMap.set(r.user_name, r.people_count || 1);
      }
    });
    
    userMap.forEach((count, name) => {
      splits.push({
        name,
        amount: (parseFloat(avgAmount) * count).toFixed(2)
      });
    });
    
    // 手动添加的参与者
    manualParticipants.forEach(p => {
      splits.push({
        name: p.name,
        amount: avgAmount
      });
    });
    
    return splits;
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
          passphrase: this.data.passphraseInput 
        });
        wx.showToast({ title: '验证成功', icon: 'success' });
      } else {
        wx.showToast({ title: '口令错误', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '验证失败', icon: 'none' });
    }
  },

  showAddBill() {
    this.setData({ showAddBillForm: true });
  },

  onBillDescInput(e) { this.setData({ billDesc: e.detail.value }); },
  onBillAmountInput(e) { this.setData({ billAmount: e.detail.value }); },
  onBillPayerInput(e) { this.setData({ billPayer: e.detail.value }); },

  async addBill() {
    if (!this.data.billDesc.trim() || !this.data.billAmount || !this.data.billPayer.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '添加中' });
      
      await api.post('/mp/bills', {
        activity_id: this.data.activityId,
        description: this.data.billDesc.trim(),
        amount: parseFloat(this.data.billAmount),
        payer_name: this.data.billPayer.trim(),
        passphrase: this.data.passphrase,
      });

      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      
      this.setData({
        showAddBillForm: false,
        billDesc: '',
        billAmount: '',
        billPayer: '',
      });
      
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  async toggleSettle(e) {
    const id = e.currentTarget.dataset.id;
    const settled = e.currentTarget.dataset.settled;
    
    try {
      await api.patch('/mp/bills', {
        id,
        settled: !settled,
        passphrase: this.data.passphrase,
      });
      
      wx.showToast({ title: settled ? '已取消结算' : '已结算', icon: 'success' });
      this.loadData();
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  }
});
