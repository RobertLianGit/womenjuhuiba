/**
 * 工具函数
 */

/**
 * 生成UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 获取或创建用户ID
 */
function getUserId() {
  let userId = wx.getStorageSync('mp_user_id');
  if (!userId) {
    userId = generateUUID();
    wx.setStorageSync('mp_user_id', userId);
  }
  return userId;
}

/**
 * 获取用户信息（从微信）
 */
function getUserInfo() {
  return wx.getStorageSync('mp_user_info') || null;
}

/**
 * 设置用户信息
 */
function setUserInfo(info) {
  wx.setStorageSync('mp_user_info', info);
}

/**
 * 获取用户昵称
 */
function getUserName() {
  const info = getUserInfo();
  return info ? info.nickName : '匿名用户';
}

/**
 * 获取用户头像
 */
function getUserAvatar() {
  const info = getUserInfo();
  return info ? info.avatarUrl : '';
}

/**
 * 保存活动口令
 */
function saveAccessCode(activityId, accessCode) {
  const codes = wx.getStorageSync('mp_access_codes') || {};
  codes[activityId] = accessCode;
  wx.setStorageSync('mp_access_codes', codes);
}

/**
 * 获取活动口令
 */
function getAccessCode(activityId) {
  const codes = wx.getStorageSync('mp_access_codes') || {};
  return codes[activityId] || null;
}

/**
 * 保存管理口令
 */
function savePassphrase(activityId, passphrase) {
  const codes = wx.getStorageSync('mp_passphrases') || {};
  codes[activityId] = passphrase;
  wx.setStorageSync('mp_passphrases', codes);
}

/**
 * 获取管理口令
 */
function getPassphrase(activityId) {
  const codes = wx.getStorageSync('mp_passphrases') || {};
  return codes[activityId] || null;
}

/**
 * 判断是否为组织者
 */
function isOrganizer(activityId) {
  return !!getPassphrase(activityId);
}

/**
 * 标记活动已访问
 */
function markActivityAccessed(activityId) {
  const ids = wx.getStorageSync('mp_accessed_activities') || [];
  if (!ids.includes(activityId)) {
    ids.push(activityId);
    wx.setStorageSync('mp_accessed_activities', ids);
  }
}

/**
 * 获取已访问的活动ID列表
 */
function getAccessedActivities() {
  return wx.getStorageSync('mp_accessed_activities') || [];
}

/**
 * 添加已创建的活动
 */
function addCreatedActivity(activityId) {
  const ids = wx.getStorageSync('mp_created_activities') || [];
  if (!ids.includes(activityId)) {
    ids.push(activityId);
    wx.setStorageSync('mp_created_activities', ids);
  }
}

/**
 * 获取已创建的活动ID列表
 */
function getCreatedActivities() {
  return wx.getStorageSync('mp_created_activities') || [];
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * 格式化时间
 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * 获取状态文字
 */
function getStatusText(status) {
  const statusMap = {
    'collecting': '意愿收集中',
    'voting': '投票进行中',
    'plan': '方案确认中',
    'registering': '开放报名',
    'started': '活动已开始',
    'settling': '记账结算中',
    'settled': '已结算'
  };
  return statusMap[status] || status;
}

/**
 * 获取状态样式类
 */
function getStatusClass(status) {
  return `status-${status}`;
}

/**
 * 显示加载
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示提示
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

/**
 * 显示成功
 */
function showSuccess(title) {
  wx.showToast({ title, icon: 'success', duration: 2000 });
}

/**
 * 显示错误
 */
function showError(title) {
  wx.showToast({ title, icon: 'error', duration: 2000 });
}

/**
 * 生成随机口令码
 * @param {number} length - 口令长度，默认6位
 */
function generateCode(length = 6) {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

module.exports = {
  generateUUID,
  getUserId,
  getUserInfo,
  setUserInfo,
  getUserName,
  getUserAvatar,
  saveAccessCode,
  getAccessCode,
  savePassphrase,
  getPassphrase,
  isOrganizer,
  markActivityAccessed,
  getAccessedActivities,
  addCreatedActivity,
  getCreatedActivities,
  formatDate,
  formatTime,
  getStatusText,
  getStatusClass,
  showLoading,
  hideLoading,
  showToast,
  showSuccess,
  showError,
  generateCode,
  debounce
};
