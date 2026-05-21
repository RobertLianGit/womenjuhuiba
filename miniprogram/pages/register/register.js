// pages/register/register.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    scenes: [],
    selectedScenes: [],
    planContent: '',
    peopleCount: 1,
    notes: '',
    registrations: [],
    totalPeople: 0,
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadData();
  },

  onShow() {
    this.loadRegistrations();
  },

  async loadData() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const [scenesRes, planRes] = await Promise.all([
        api.get(`/mp/scenes?activity_id=${this.data.activityId}`),
        api.get(`/mp/plans?activity_id=${this.data.activityId}`),
      ]);

      const scenes = (scenesRes.data || []).map(s => ({ ...s, selected: false }));
      
      this.setData({
        scenes,
        planContent: planRes.data?.content || '',
      });

      // 检查是否已报名
      await this.loadMyRegistration();

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载数据失败', err);
    }
  },

  async loadRegistrations() {
    try {
      const res = await api.get(`/mp/registrations?activity_id=${this.data.activityId}`);
      const registrations = res.data || [];
      const totalPeople = registrations.reduce((sum, r) => sum + (r.people_count || 1), 0);
      this.setData({ registrations, totalPeople });
    } catch (err) {
      console.error('加载报名列表失败', err);
    }
  },

  async loadMyRegistration() {
    try {
      const openid = app.globalData.openid;
      const res = await api.get(`/mp/registrations?activity_id=${this.data.activityId}&user_openid=${openid}`);
      
      if (res.data && res.data.length > 0) {
        // 已有报名记录，恢复数据
        const myRegs = res.data;
        const scenes = this.data.scenes.map(s => ({
          ...s,
          selected: myRegs.some(r => r.scene_id === s.id)
        }));
        
        this.setData({
          scenes,
          peopleCount: myRegs[0]?.people_count || 1,
          notes: myRegs[0]?.notes || '',
        });
      }
    } catch (err) {
      console.error('加载我的报名失败', err);
    }
  },

  toggleScene(e) {
    const id = e.currentTarget.dataset.id;
    const scenes = this.data.scenes.map(s => {
      if (s.id === id) {
        return { ...s, selected: !s.selected };
      }
      return s;
    });
    const selectedScenes = scenes.filter(s => s.selected).map(s => s.id);
    this.setData({ scenes, selectedScenes });
  },

  onPeopleCountInput(e) {
    this.setData({ peopleCount: parseInt(e.detail.value) || 1 });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  async submit() {
    if (this.data.scenes.length > 0 && this.data.selectedScenes.length === 0) {
      wx.showToast({ title: '请至少选择一个段落', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '提交中' });
      
      const openid = app.globalData.openid;
      const userInfo = app.globalData.userInfo;

      if (this.data.scenes.length === 0) {
        // 无分段，全程参与
        await api.post('/mp/registrations', {
          activity_id: this.data.activityId,
          scene_id: null,
          user_openid: openid,
          user_name: userInfo.nickName,
          user_avatar: userInfo.avatarUrl,
          people_count: this.data.peopleCount,
          notes: this.data.notes,
        });
      } else {
        // 有分段，分别报名
        for (const sceneId of this.data.selectedScenes) {
          await api.post('/mp/registrations', {
            activity_id: this.data.activityId,
            scene_id: sceneId,
            user_openid: openid,
            user_name: userInfo.nickName,
            user_avatar: userInfo.avatarUrl,
            people_count: this.data.peopleCount,
            notes: this.data.notes,
          });
        }
      }

      wx.hideLoading();
      wx.showToast({ title: '报名成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '报名失败', icon: 'none' });
    }
  }
});
