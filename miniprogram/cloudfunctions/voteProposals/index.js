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
      return await getProposals(data)
    case 'create':
      return await createProposal(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getProposals(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('vote_proposals')
      .where({ activity_id })
      .orderBy('vote_count', 'desc')
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function createProposal(data) {
  const { activity_id, title, description, creator_openid, creator_name } = data
  
  if (!activity_id || !title) {
    return { success: false, error: '缺少必填字段' }
  }

  try {
    const result = await db.collection('vote_proposals').add({
      data: {
        activity_id,
        title,
        description: description || '',
        creator_openid: creator_openid || '',
        creator_name: creator_name || '',
        vote_count: 0,
        created_at: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
