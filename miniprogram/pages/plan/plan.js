// pages/plan/plan.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    isAdmin: false,
    passphrase: '',
    scenes: [],
    planContent: '',
    voteResults: [],
    promptTemplate: '',
    showSceneModal: false,
    editingScene: null,
    sceneName: '',
    sceneTime: '',
    sceneLocation: '',
    sceneDesc: '',
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadData();
    this.generatePrompt();
  },

  async loadData() {
    try {
      wx.showLoading({ title: '加载中' });
      
      const [scenesRes, planRes, votesRes] = await Promise.all([
        api.get(`/mp/scenes?activity_id=${this.data.activityId}`),
        api.get(`/mp/plans?activity_id=${this.data.activityId}`),
        api.get(`/mp/vote-proposals?activity_id=${this.data.activityId}`),
      ]);

      this.setData({
        scenes: scenesRes.data || [],
        planContent: planRes.data?.content || '',
        voteResults: (votesRes.data || []).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)),
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载数据失败', err);
    }
  },

  generatePrompt() {
    const prompt = `请帮我完善这次朋友聚会的方案。

活动信息：
- 活动名称：${this.data.activityName || '待定'}
- 参与人数：待确认

投票结果：
${this.data.voteResults.map((v, i) => `${i + 1}. ${v.title}（${v.vote_count}票）`).join('\n')}

请根据以上信息，帮我：
1. 确定最佳活动时间
2. 推荐具体活动地点
3. 规划活动流程
4. 提供预算参考`;

    this.setData({ promptTemplate: prompt });
  },

  copyPrompt() {
    wx.setClipboardData({
      data: this.data.promptTemplate,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  onPlanInput(e) {
    this.setData({ planContent: e.detail.value });
  },

  showAddScene() {
    this.setData({
      showSceneModal: true,
      editingScene: null,
      sceneName: '',
      sceneTime: '',
      sceneLocation: '',
      sceneDesc: '',
    });
  },

  editScene(e) {
    const index = e.currentTarget.dataset.index;
    const scene = this.data.scenes[index];
    this.setData({
      showSceneModal: true,
      editingScene: scene,
      sceneName: scene.name,
      sceneTime: scene.start_time || '',
      sceneLocation: scene.location || '',
      sceneDesc: scene.description || '',
    });
  },

  async deleteScene(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个分段吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.delete(`/mp/scenes?id=${id}&passphrase=${this.data.passphrase}`);
            wx.showToast({ title: '删除成功' });
            this.loadData();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  closeSceneModal() {
    this.setData({ showSceneModal: false });
  },

  onSceneNameInput(e) { this.setData({ sceneName: e.detail.value }); },
  onSceneTimeInput(e) { this.setData({ sceneTime: e.detail.value }); },
  onSceneLocationInput(e) { this.setData({ sceneLocation: e.detail.value }); },
  onSceneDescInput(e) { this.setData({ sceneDesc: e.detail.value }); },

  async saveScene() {
    if (!this.data.sceneName.trim()) {
      wx.showToast({ title: '请输入分段名称', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中' });
      
      if (this.data.editingScene) {
        await api.patch('/mp/scenes', {
          id: this.data.editingScene.id,
          name: this.data.sceneName,
          start_time: this.data.sceneTime,
          location: this.data.sceneLocation,
          description: this.data.sceneDesc,
          passphrase: this.data.passphrase,
        });
      } else {
        await api.post('/mp/scenes', {
          activity_id: this.data.activityId,
          name: this.data.sceneName,
          start_time: this.data.sceneTime,
          location: this.data.sceneLocation,
          description: this.data.sceneDesc,
          passphrase: this.data.passphrase,
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.closeSceneModal();
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  async savePlan() {
    try {
      wx.showLoading({ title: '保存中' });
      
      await api.post('/mp/plans', {
        activity_id: this.data.activityId,
        content: this.data.planContent,
        passphrase: this.data.passphrase,
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  preventTouchMove() {}
});
