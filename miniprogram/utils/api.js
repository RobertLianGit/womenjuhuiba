/**
 * API 服务 - 小程序专用
 * 使用 mp_ 前缀的数据表
 */

const util = require('../utils/util');

// API 基础地址 - 部署后替换为实际域名
const API_BASE = 'https://happytime.coze.site';

/**
 * 封装请求方法
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        reject({ error: '网络请求失败', detail: err });
      }
    });
  });
}

// ==================== 活动相关 ====================

/**
 * 创建活动
 */
function createActivity(data) {
  return request({
    url: '/api/mp/activities',
    method: 'POST',
    data: {
      title: data.title,
      description: data.description,
      rough_time: data.rough_time,
      creator_openid: util.getUserId(),
      creator_name: data.creator_name,
      creator_avatar: data.creator_avatar,
      access_code: data.access_code,
      passphrase: data.passphrase
    }
  });
}

/**
 * 通过口令加入活动
 */
function joinByAccessCode(accessCode) {
  return request({
    url: `/api/mp/activities?access_code=${encodeURIComponent(accessCode)}`
  });
}

/**
 * 获取活动详情
 */
function getActivity(id) {
  return request({
    url: `/api/mp/activities/${id}`
  });
}

/**
 * 获取活动列表（通过ID数组）
 */
function getActivitiesByIds(ids) {
  if (!ids || ids.length === 0) {
    return Promise.resolve({ data: [] });
  }
  return request({
    url: `/api/mp/activities?ids=${ids.join(',')}`
  });
}

/**
 * 获取我创建的活动
 */
function getMyCreatedActivities() {
  const ids = util.getCreatedActivities();
  return getActivitiesByIds(ids);
}

/**
 * 获取我参与的活动
 */
function getMyJoinedActivities() {
  const ids = util.getAccessedActivities();
  return getActivitiesByIds(ids);
}

/**
 * 更新活动状态
 */
function updateActivityStatus(id, status, passphrase) {
  return request({
    url: `/api/mp/activities/${id}`,
    method: 'PATCH',
    data: { status, passphrase }
  });
}

/**
 * 验证管理口令
 */
function verifyPassphrase(id, passphrase) {
  return request({
    url: `/api/mp/activities/${id}`,
    method: 'PATCH',
    data: { status: 'verify', passphrase }
  });
}

// ==================== 意愿相关 ====================

/**
 * 提交意愿
 */
function submitIntention(data) {
  return request({
    url: '/api/mp/intentions',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      user_openid: util.getUserId(),
      user_name: data.user_name,
      user_avatar: data.user_avatar,
      wants: data.wants,
      estimated_people: data.estimated_people,
      notes: data.notes
    }
  });
}

/**
 * 获取意愿列表
 */
function getIntentions(activityId) {
  return request({
    url: `/api/mp/intentions?activity_id=${activityId}`
  });
}

// ==================== 投票相关 ====================

/**
 * 提交投票方案
 */
function submitVoteProposal(data) {
  return request({
    url: '/api/mp/vote-proposals',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      user_openid: util.getUserId(),
      user_name: data.user_name,
      user_avatar: data.user_avatar,
      location: data.location,
      description: data.description
    }
  });
}

/**
 * 获取投票方案列表
 */
function getVoteProposals(activityId) {
  return request({
    url: `/api/mp/vote-proposals?activity_id=${activityId}`
  });
}

/**
 * 提交投票
 */
function submitVote(data) {
  return request({
    url: '/api/mp/vote-records',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      user_openid: util.getUserId(),
      user_name: data.user_name,
      user_avatar: data.user_avatar,
      proposal_ids: data.proposal_ids
    }
  });
}

/**
 * 获取投票记录
 */
function getVoteRecords(activityId) {
  return request({
    url: `/api/mp/vote-records?activity_id=${activityId}`
  });
}

/**
 * 确认投票方案
 */
function confirmVoteProposal(activityId, proposalId, passphrase) {
  return request({
    url: `/api/mp/activities/${activityId}`,
    method: 'PATCH',
    data: { 
      status: 'plan',
      confirmed_proposal_id: proposalId,
      passphrase
    }
  });
}

// ==================== 方案相关 ====================

/**
 * 获取分段列表
 */
function getScenes(activityId) {
  return request({
    url: `/api/mp/scenes?activity_id=${activityId}`
  });
}

/**
 * 添加分段
 */
function addScene(data, passphrase) {
  return request({
    url: '/api/mp/scenes',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      name: data.name,
      time_range: data.time_range,
      location: data.location,
      description: data.description,
      sort_order: data.sort_order || 0,
      passphrase
    }
  });
}

/**
 * 更新分段
 */
function updateScene(data, passphrase) {
  return request({
    url: `/api/mp/scenes/${data.id}`,
    method: 'PUT',
    data: {
      name: data.name,
      time_range: data.time_range,
      location: data.location,
      description: data.description,
      passphrase
    }
  });
}

/**
 * 删除分段
 */
function deleteScene(id, passphrase) {
  return request({
    url: `/api/mp/scenes/${id}`,
    method: 'DELETE',
    data: { passphrase }
  });
}

/**
 * 保存方案内容
 */
function savePlan(data, passphrase) {
  return request({
    url: '/api/mp/plans',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      content: data.content,
      passphrase
    }
  });
}

/**
 * 获取方案内容
 */
function getPlan(activityId) {
  return request({
    url: `/api/mp/plans?activity_id=${activityId}`
  });
}

// ==================== 报名相关 ====================

/**
 * 提交报名
 */
function submitRegistration(data) {
  return request({
    url: '/api/mp/registrations',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      scene_id: data.scene_id || null,
      user_openid: util.getUserId(),
      user_name: data.user_name,
      user_avatar: data.user_avatar,
      people_count: data.people_count || 1,
      notes: data.notes
    }
  });
}

/**
 * 获取报名列表
 */
function getRegistrations(activityId) {
  return request({
    url: `/api/mp/registrations?activity_id=${activityId}`
  });
}

/**
 * 取消报名
 */
function cancelRegistration(id) {
  return request({
    url: `/api/mp/registrations/${id}`,
    method: 'DELETE'
  });
}

// ==================== 参与者相关 ====================

/**
 * 获取参与者列表
 */
function getParticipants(activityId) {
  return request({
    url: `/api/mp/participants?activity_id=${activityId}`
  });
}

/**
 * 手动添加参与者
 */
function addParticipant(data, passphrase) {
  return request({
    url: '/api/mp/participants',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      name: data.name,
      phone: data.phone,
      notes: data.notes,
      passphrase
    }
  });
}

/**
 * 删除参与者
 */
function deleteParticipant(id, passphrase) {
  return request({
    url: `/api/mp/participants/${id}`,
    method: 'DELETE',
    data: { passphrase }
  });
}

// ==================== 账单相关 ====================

/**
 * 添加账单
 */
function addBill(data, passphrase) {
  return request({
    url: '/api/mp/bills',
    method: 'POST',
    data: {
      activity_id: data.activity_id,
      description: data.description,
      amount: data.amount,
      payer_name: data.payer_name,
      payer_openid: data.payer_openid,
      passphrase
    }
  });
}

/**
 * 获取账单列表
 */
function getBills(activityId) {
  return request({
    url: `/api/mp/bills?activity_id=${activityId}`
  });
}

/**
 * 更新账单结算状态
 */
function updateBillSettled(id, settled, passphrase) {
  return request({
    url: `/api/mp/bills/${id}`,
    method: 'PATCH',
    data: { settled, passphrase }
  });
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
  updateBillSettled
};
