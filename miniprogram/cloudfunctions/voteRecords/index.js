// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'list':
      return await getVoteRecords(data)
    case 'submit':
      return await submitVote(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getVoteRecords(data) {
  const { activity_id, user_openid } = data
  
  try {
    let query = db.collection('vote_records').where({ activity_id })
    
    if (user_openid) {
      query = query.where({ user_openid })
    }

    const res = await query.get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function submitVote(data) {
  const { activity_id, user_openid, user_name, proposal_ids } = data
  
  if (!activity_id || !user_openid || !proposal_ids || proposal_ids.length === 0) {
    return { success: false, error: '缺少必填字段' }
  }

  try {
    // 查找是否已投票
    const existRes = await db.collection('vote_records')
      .where({ activity_id, user_openid })
      .get()

    const oldProposalIds = existRes.data.length > 0 ? (existRes.data[0].proposal_ids || []) : []

    // 更新或创建投票记录
    if (existRes.data.length > 0) {
      await db.collection('vote_records')
        .doc(existRes.data[0]._id)
        .update({
          data: {
            proposal_ids,
            user_name,
            updated_at: db.serverDate()
          }
        })
    } else {
      await db.collection('vote_records').add({
        data: {
          activity_id,
          user_openid,
          user_name,
          proposal_ids,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })
    }

    // 更新方案票数
    const toRemove = oldProposalIds.filter(id => !proposal_ids.includes(id))
    const toAdd = proposal_ids.filter(id => !oldProposalIds.includes(id))

    for (const id of toRemove) {
      const proposal = await db.collection('vote_proposals').doc(id).get()
      if (proposal.data) {
        await db.collection('vote_proposals').doc(id).update({
          data: { vote_count: Math.max(0, (proposal.data.vote_count || 0) - 1) }
        })
      }
    }

    for (const id of toAdd) {
      const proposal = await db.collection('vote_proposals').doc(id).get()
      if (proposal.data) {
        await db.collection('vote_proposals').doc(id).update({
          data: { vote_count: (proposal.data.vote_count || 0) + 1 }
        })
      }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
