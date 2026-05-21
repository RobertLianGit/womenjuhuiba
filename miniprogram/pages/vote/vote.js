// pages/vote/vote.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    currentTab: 'vote',
    proposals: [],
    selectedProposals: [],
    voteRule: 'single',
    maxVotes: 1,
    newTitle: '',
    newDescription: '',
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadProposals();
    this.loadActivityInfo();
    this.loadMyVotes();
  },

  onShow() {
    this.loadProposals();
  },

  async loadActivityInfo() {
    try {
      const res = await api.get(`/mp/activities/${this.data.activityId}`);
      this.setData({
        voteRule: res.data.vote_rule || 'single',
        maxVotes: res.data.max_votes || 1,
      });
    } catch (err) {
      console.error('加载活动信息失败', err);
    }
  },

  async loadProposals() {
    try {
      const res = await api.get(`/mp/vote-proposals?activity_id=${this.data.activityId}`);
      const proposals = (res.data || []).map(p => ({ ...p, selected: false }));
      this.setData({ proposals });
    } catch (err) {
      console.error('加载方案失败', err);
    }
  },

  async loadMyVotes() {
    try {
      const openid = app.globalData.openid;
      const res = await api.get(`/mp/vote-records?activity_id=${this.data.activityId}&user_openid=${openid}`);
      if (res.data && res.data.length > 0) {
        const myVotes = res.data.map(v => v.proposal_id);
        const proposals = this.data.proposals.map(p => ({
          ...p,
          selected: myVotes.includes(p.id)
        }));
        this.setData({ 
          proposals,
          selectedProposals: myVotes
        });
      }
    } catch (err) {
      console.error('加载我的投票失败', err);
    }
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab });
  },

  toggleProposal(e) {
    const index = e.currentTarget.dataset.index;
    const proposals = this.data.proposals;
    
    if (this.data.voteRule === 'single') {
      // 单选
      proposals.forEach((p, i) => {
        p.selected = i === index ? !p.selected : false;
      });
    } else {
      // 多选
      if (!proposals[index].selected && this.data.selectedProposals.length >= this.data.maxVotes) {
        wx.showToast({ title: `最多投${this.data.maxVotes}票`, icon: 'none' });
        return;
      }
      proposals[index].selected = !proposals[index].selected;
    }

    const selectedProposals = proposals.filter(p => p.selected).map(p => p.id);
    this.setData({ proposals, selectedProposals });
  },

  onTitleInput(e) {
    this.setData({ newTitle: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ newDescription: e.detail.value });
  },

  async submit() {
    if (this.data.currentTab === 'vote') {
      await this.submitVote();
    } else {
      await this.submitProposal();
    }
  },

  async submitVote() {
    if (this.data.selectedProposals.length === 0) {
      wx.showToast({ title: '请选择至少一个方案', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '提交中' });
      
      const openid = app.globalData.openid;
      const userInfo = app.globalData.userInfo;

      // 提交投票记录
      for (const proposalId of this.data.selectedProposals) {
        await api.post('/mp/vote-records', {
          activity_id: this.data.activityId,
          proposal_id: proposalId,
          user_openid: openid,
          user_name: userInfo.nickName,
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '投票成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '投票失败', icon: 'none' });
    }
  },

  async submitProposal() {
    if (!this.data.newTitle.trim()) {
      wx.showToast({ title: '请输入方案标题', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '提交中' });
      
      const openid = app.globalData.openid;
      const userInfo = app.globalData.userInfo;

      await api.post('/mp/vote-proposals', {
        activity_id: this.data.activityId,
        title: this.data.newTitle.trim(),
        description: this.data.newDescription.trim(),
        creator_openid: openid,
        creator_name: userInfo.nickName,
      });

      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      
      this.setData({ 
        currentTab: 'vote',
        newTitle: '',
        newDescription: ''
      });
      this.loadProposals();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  }
});
