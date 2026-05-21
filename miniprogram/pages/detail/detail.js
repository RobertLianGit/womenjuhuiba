// pages/detail/detail.js
const api = require('../../utils/api');
const util = require('../../utils/util');

const app = getApp();

Page({
  data: {
    activityId: '',
    activity: {},
    stats: {
      intentionCount: 0,
      voteCount: 0,
      registerCount: 0,
    },
    passphraseInput: '',
    isAdmin: false,
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadActivity();
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  async loadActivity() {
    try {
      wx.showLoading({ title: '加载中' });
      const res = await api.get(`/mp/activities/${this.data.activityId}`);
      const activity = {
        ...res.data,
        statusText: util.getStatusText(res.data.status),
      };
      this.setData({ activity });
      wx.setNavigationBarTitle({ title: activity.name });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async loadStats() {
    try {
      const [intentions, votes, registrations] = await Promise.all([
        api.get(`/mp/intentions?activity_id=${this.data.activityId}`),
        api.get(`/mp/vote-proposals?activity_id=${this.data.activityId}`),
        api.get(`/mp/registrations?activity_id=${this.data.activityId}`),
      ]);

      this.setData({
        stats: {
          intentionCount: (intentions.data || []).length,
          voteCount: (votes.data || []).reduce((sum, v) => sum + (v.vote_count || 0), 0),
          registerCount: (registrations.data || []).reduce((sum, r) => sum + (r.people_count || 1), 0),
        }
      });
    } catch (err) {
      console.error('加载统计失败', err);
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
        this.setData({ isAdmin: true });
        wx.showToast({ title: '验证成功', icon: 'success' });
      } else {
        wx.showToast({ title: '口令错误', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '验证失败', icon: 'none' });
    }
  },

  async changeStatus() {
    const statusFlow = ['collecting', 'voting', 'plan', 'registering', 'started', 'settling', 'settled'];
    const currentIndex = statusFlow.indexOf(this.data.activity.status);
    
    if (currentIndex >= statusFlow.length - 1) {
      wx.showToast({ title: '已是最终状态', icon: 'none' });
      return;
    }

    const nextStatus = statusFlow[currentIndex + 1];
    const statusTexts = {
      voting: '进入投票阶段',
      plan: '进入方案确认',
      registering: '开放报名',
      started: '开始活动',
      settling: '进入结算阶段',
      settled: '完成结算',
    };

    wx.showModal({
      title: '确认操作',
      content: `确定要${statusTexts[nextStatus]}吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.patch(`/mp/activities/${this.data.activityId}`, {
              status: nextStatus,
              passphrase: this.data.passphraseInput,
            });
            wx.showToast({ title: '操作成功' });
            this.loadActivity();
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  goToIntention() {
    wx.navigateTo({ url: `/pages/intention/intention?id=${this.data.activityId}` });
  },

  goToVote() {
    wx.navigateTo({ url: `/pages/vote/vote?id=${this.data.activityId}` });
  },

  goToPlan() {
    wx.navigateTo({ url: `/pages/plan/plan?id=${this.data.activityId}` });
  },

  goToRegister() {
    wx.navigateTo({ url: `/pages/register/register?id=${this.data.activityId}` });
  },

  goToDashboard() {
    wx.navigateTo({ url: `/pages/dashboard/dashboard?id=${this.data.activityId}` });
  },

  goToSettle() {
    wx.navigateTo({ url: `/pages/settle/settle?id=${this.data.activityId}` });
  },

  onShareAppMessage() {
    return {
      title: `【${this.data.activity.name}】邀请你参与`,
      path: `/pages/detail/detail?id=${this.data.activityId}`,
    };
  }
});
