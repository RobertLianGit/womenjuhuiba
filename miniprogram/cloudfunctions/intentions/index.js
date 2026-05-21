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
      return await getIntentions(data)
    case 'submit':
      return await submitIntention(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getIntentions(data) {
  const { activity_id, user_openid } = data
  
  try {
    let query = db.collection('intentions').where({ activity_id })
    
    if (user_openid) {
      query = query.where({ user_openid })
    }

    const res = await query.orderBy('created_at', 'asc').get()
    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function submitIntention(data) {
  const { activity_id, user_openid, user_name, user_avatar, available_date, available_time, preferred_locations, preferred_activities, notes } = data
  
  if (!activity_id || !user_openid || !user_name) {
    return { success: false, error: '缺少必填字段' }
  }

  try {
    // 查找是否已存在
    const existRes = await db.collection('intentions')
      .where({ activity_id, user_openid })
      .get()

    const intentionData = {
      user_name,
      user_avatar: user_avatar || '',
      available_date: available_date || '',
      available_time: available_time || '',
      preferred_locations: preferred_locations || '',
      preferred_activities: preferred_activities || '',
      notes: notes || '',
      updated_at: db.serverDate()
    }

    if (existRes.data.length > 0) {
      // 更新
      await db.collection('intentions')
        .doc(existRes.data[0]._id)
        .update({ data: intentionData })
      
      return { success: true, data: { id: existRes.data[0]._id } }
    } else {
      // 新建
      const result = await db.collection('intentions').add({
        data: {
          activity_id,
          user_openid,
          ...intentionData,
          created_at: db.serverDate()
        }
      })
      
      return { success: true, data: { id: result._id } }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
