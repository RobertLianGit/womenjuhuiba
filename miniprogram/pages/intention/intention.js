// pages/intention/intention.js
const api = require('../../utils/api');

const app = getApp();

Page({
  data: {
    activityId: '',
    availableDate: '',
    availableTime: '',
    locationOptions: [
      { value: '市中心', active: false },
      { value: '郊区', active: false },
      { value: '公园', active: false },
      { value: '商场', active: false },
      { value: '餐厅', active: false },
      { value: 'KTV', active: false },
    ],
    activityOptions: [
      { value: '吃饭', active: false },
      { value: '唱歌', active: false },
      { value: '爬山', active: false },
      { value: '桌游', active: false },
      { value: '电影', active: false },
      { value: '露营', active: false },
    ],
    customLocation: '',
    customActivity: '',
    notes: '',
    intentions: [],
  },

  onLoad(options) {
    this.setData({ activityId: options.id });
    this.loadIntentions();
    this.loadMyIntention();
  },

  async loadIntentions() {
    try {
      const res = await api.get(`/mp/intentions?activity_id=${this.data.activityId}`);
      this.setData({ intentions: res.data || [] });
    } catch (err) {
      console.error('加载意愿列表失败', err);
    }
  },

  async loadMyIntention() {
    try {
      const openid = app.globalData.openid;
      const res = await api.get(`/mp/intentions?activity_id=${this.data.activityId}&user_openid=${openid}`);
      if (res.data && res.data.length > 0) {
        const myIntention = res.data[0];
        this.setData({
          availableDate: myIntention.available_date || '',
          availableTime: myIntention.available_time || '',
          notes: myIntention.notes || '',
        });
        // 恢复已选项
        if (myIntention.preferred_locations) {
          const locs = myIntention.preferred_locations.split(',');
          const options = this.data.locationOptions.map(opt => ({
            ...opt,
            active: locs.includes(opt.value)
          }));
          this.setData({ locationOptions: options });
        }
        if (myIntention.preferred_activities) {
          const acts = myIntention.preferred_activities.split(',');
          const options = this.data.activityOptions.map(opt => ({
            ...opt,
            active: acts.includes(opt.value)
          }));
          this.setData({ activityOptions: options });
        }
      }
    } catch (err) {
      console.error('加载我的意愿失败', err);
    }
  },

  onDateChange(e) {
    this.setData({ availableDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ availableTime: e.detail.value });
  },

  toggleLocation(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.locationOptions;
    options[index].active = !options[index].active;
    this.setData({ locationOptions: options });
  },

  toggleActivity(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.activityOptions;
    options[index].active = !options[index].active;
    this.setData({ activityOptions: options });
  },

  onCustomLocationInput(e) {
    this.setData({ customLocation: e.detail.value });
  },

  onCustomActivityInput(e) {
    this.setData({ customActivity: e.detail.value });
  },

  addCustomLocation() {
    if (!this.data.customLocation.trim()) return;
    const options = this.data.locationOptions;
    options.push({ value: this.data.customLocation.trim(), active: true });
    this.setData({ locationOptions: options, customLocation: '' });
  },

  addCustomActivity() {
    if (!this.data.customActivity.trim()) return;
    const options = this.data.activityOptions;
    options.push({ value: this.data.customActivity.trim(), active: true });
    this.setData({ activityOptions: options, customActivity: '' });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  async submit() {
    const selectedLocations = this.data.locationOptions
      .filter(opt => opt.active)
      .map(opt => opt.value)
      .join(',');

    const selectedActivities = this.data.activityOptions
      .filter(opt => opt.active)
      .map(opt => opt.value)
      .join(',');

    if (!selectedLocations && !selectedActivities) {
      wx.showToast({ title: '请至少选择一项偏好', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '提交中' });
      
      const userInfo = app.globalData.userInfo;
      const openid = app.globalData.openid;

      await api.post('/mp/intentions', {
        activity_id: this.data.activityId,
        user_openid: openid,
        user_name: userInfo.nickName,
        user_avatar: userInfo.avatarUrl,
        available_date: this.data.availableDate,
        available_time: this.data.availableTime,
        preferred_locations: selectedLocations,
        preferred_activities: selectedActivities,
        notes: this.data.notes,
      });

      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  }
});
