/**
 * API 服务 - 小程序专用
 * 使用微信云开发云函数
 */

const util = require('./util');

/**
 * 调用云函数
 */
function callFunction(name, action, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: { action, data },
      success: (res) => {
        if (res.result && res.result.success !== false) {
          resolve(res.result);
        } else {
          reject(res.result || { error: '云函数调用失败' });
        }
      },
      fail: (err) => {
        reject({ error: '云函数调用失败', detail: err });
      }
    });
  });
}

// ==================== 活动相关 ====================

/**
 * 创建活动
 */
function createActivity(data) {
  return callFunction('activities', 'create', {
    title: data.title,
    description: data.description,
    rough_time: data.rough_time,
    creator_openid: util.getUserId(),
    creator_name: data.creator_name,
    creator_avatar: data.creator_avatar,
    access_code: data.access_code,
    passphrase: data.passphrase
  });
}

/**
 * 通过口令加入活动
 */
function joinByAccessCode(accessCode) {
  return callFunction('activities', 'join', { access_code: accessCode });
}

/**
 * 获取活动详情
 */
function getActivity(id) {
  return callFunction('activities', 'get', { id });
}

/**
 * 获取活动列表（通过ID数组）
 */
function getActivitiesByIds(ids) {
  if (!ids || ids.length === 0) {
    return Promise.resolve({ data: [] });
  }
  return callFunction('activities', 'listByIds', { ids });
}

/**
 * 获取我创建的活动
 */
function getMyCreatedActivities() {
  return callFunction('activities', 'listByCreator', { 
    creator_openid: util.getUserId() 
  });
}

/**
 * 获取我参与的活动
 */
function getMyJoinedActivities() {
  return callFunction('activities', 'listByParticipant', { 
    user_openid: util.getUserId() 
  });
}

/**
 * 更新活动状态
 */
function updateActivityStatus(id, status, passphrase) {
  return callFunction('activities', 'updateStatus', { id, status, passphrase });
}

/**
 * 验证管理口令
 */
function verifyPassphrase(id, passphrase) {
  return callFunction('activities', 'verifyPassphrase', { id, passphrase });
}

// ==================== 意愿相关 ====================

/**
 * 提交意愿
 */
function submitIntention(data) {
  return callFunction('intentions', 'submit', {
    activity_id: data.activity_id,
    user_openid: util.getUserId(),
    user_name: data.user_name,
    user_avatar: data.user_avatar,
    available_date: data.available_date,
    available_time: data.available_time,
    preferred_locations: data.preferred_locations,
    preferred_activities: data.preferred_activities,
    notes: data.notes
  });
}

/**
 * 获取意愿列表
 */
function getIntentions(activityId) {
  return callFunction('intentions', 'list', { activity_id: activityId });
}

// ==================== 投票相关 ====================

/**
 * 提交投票方案
 */
function submitVoteProposal(data) {
  return callFunction('voteProposals', 'create', {
    activity_id: data.activity_id,
    title: data.title,
    description: data.description,
    creator_openid: util.getUserId(),
    creator_name: data.user_name
  });
}

/**
 * 获取投票方案列表
 */
function getVoteProposals(activityId) {
  return callFunction('voteProposals', 'list', { activity_id: activityId });
}

/**
 * 提交投票
 */
function submitVote(data) {
  return callFunction('voteRecords', 'submit', {
    activity_id: data.activity_id,
    user_openid: util.getUserId(),
    user_name: data.user_name,
    proposal_ids: data.proposal_ids
  });
}

/**
 * 获取投票记录
 */
function getVoteRecords(activityId) {
  return callFunction('voteRecords', 'list', { 
    activity_id: activityId,
    user_openid: util.getUserId()
  });
}

/**
 * 确认投票方案（更新活动状态）
 */
function confirmVoteProposal(activityId, proposalId, passphrase) {
  return callFunction('activities', 'updateStatus', { 
    id: activityId,
    status: 'plan',
    confirmed_proposal_id: proposalId,
    passphrase
  });
}

// ==================== 方案相关 ====================

/**
 * 获取分段列表
 */
function getScenes(activityId) {
  return callFunction('scenes', 'list', { activity_id: activityId });
}

/**
 * 添加分段
 */
function addScene(data, passphrase) {
  return callFunction('scenes', 'add', {
    activity_id: data.activity_id,
    name: data.name,
    time_range: data.time_range,
    location: data.location,
    description: data.description,
    sort_order: data.sort_order || 0,
    passphrase
  });
}

/**
 * 更新分段
 */
function updateScene(data, passphrase) {
  return callFunction('scenes', 'update', {
    id: data.id,
    name: data.name,
    time_range: data.time_range,
    location: data.location,
    description: data.description,
    passphrase
  });
}

/**
 * 删除分段
 */
function deleteScene(id, passphrase) {
  return callFunction('scenes', 'delete', { id, passphrase });
}

/**
 * 保存方案内容
 */
function savePlan(data, passphrase) {
  return callFunction('plans', 'save', {
    activity_id: data.activity_id,
    content: data.content,
    passphrase
  });
}

/**
 * 获取方案内容
 */
function getPlan(activityId) {
  return callFunction('plans', 'get', { activity_id: activityId });
}

// ==================== 报名相关 ====================

/**
 * 提交报名
 */
function submitRegistration(data) {
  return callFunction('registrations', 'submit', {
    activity_id: data.activity_id,
    scene_id: data.scene_id || null,
    user_openid: util.getUserId(),
    user_name: data.user_name,
    user_avatar: data.user_avatar,
    people_count: data.people_count || 1,
    notes: data.notes
  });
}

/**
 * 获取报名列表
 */
function getRegistrations(activityId) {
  return callFunction('registrations', 'list', { activity_id: activityId });
}

/**
 * 取消报名
 */
function cancelRegistration(id) {
  return callFunction('registrations', 'delete', { id });
}

// ==================== 参与者相关 ====================

/**
 * 获取参与者列表
 */
function getParticipants(activityId) {
  return callFunction('participants', 'list', { activity_id: activityId });
}

/**
 * 手动添加参与者
 */
function addParticipant(data, passphrase) {
  return callFunction('participants', 'add', {
    activity_id: data.activity_id,
    name: data.name,
    phone: data.phone,
    notes: data.notes,
    passphrase
  });
}

/**
 * 删除参与者
 */
function deleteParticipant(id, passphrase) {
  return callFunction('participants', 'delete', { id, passphrase });
}

// ==================== 账单相关 ====================

/**
 * 添加账单
 */
function addBill(data, passphrase) {
  return callFunction('bills', 'add', {
    activity_id: data.activity_id,
    description: data.description,
    amount: data.amount,
    payer_name: data.payer_name,
    passphrase
  });
}

/**
 * 获取账单列表
 */
function getBills(activityId) {
  return callFunction('bills', 'list', { activity_id: activityId });
}

/**
 * 更新账单
 */
function updateBill(id, data, passphrase) {
  return callFunction('bills', 'update', { 
    id, 
    payer_name: data.payer_name,
    amount: data.amount,
    description: data.description,
    passphrase 
  });
}

/**
 * 删除账单
 */
function deleteBill(id, passphrase) {
  return callFunction('bills', 'delete', { id, passphrase });
}

module.exports = {
  // 活动
  createActivity,
  joinByAccessCode,
  getActivity,
  getActivitiesByIds,
  getMyCreatedActivities,
  getMyJoinedActivities,
  updateActivityStatus,
  verifyPassphrase,
  
  // 意愿
  submitIntention,
  getIntentions,
  
  // 投票
  submitVoteProposal,
  getVoteProposals,
  submitVote,
  getVoteRecords,
  confirmVoteProposal,
  
  // 方案
  getScenes,
  addScene,
  updateScene,
  deleteScene,
  savePlan,
  getPlan,
  
  // 报名
  submitRegistration,
  getRegistrations,
  cancelRegistration,
  
  // 参与者
  getParticipants,
  addParticipant,
  deleteParticipant,
  
  // 账单
  addBill,
  getBills,
  updateBill,
  deleteBill
};
