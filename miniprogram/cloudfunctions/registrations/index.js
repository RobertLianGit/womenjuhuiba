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
      return await getRegistrations(data)
    case 'submit':
      return await submitRegistration(data)
    case 'delete':
      return await deleteRegistration(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getRegistrations(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('registrations')
      .where({ activity_id })
      .orderBy('created_at', 'asc')
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function submitRegistration(data) {
  const { activity_id, scene_id, user_openid, user_name, user_avatar, people_count, notes } = data
  
  if (!activity_id || !user_openid || !user_name) {
    return { success: false, error: '缺少必填字段' }
  }

  try {
    // 查找是否已报名该分段
    let query = db.collection('registrations').where({
      activity_id,
      user_openid
    })

    if (scene_id) {
      query = query.where({ scene_id })
    } else {
      query = query.where({ scene_id: _.exists(false) })
    }

    const existRes = await query.get()

    const regData = {
      user_name,
      user_avatar: user_avatar || '',
      people_count: people_count || 1,
      notes: notes || '',
      updated_at: db.serverDate()
    }

    if (existRes.data.length > 0) {
      await db.collection('registrations')
        .doc(existRes.data[0]._id)
        .update({ data: regData })
      
      return { success: true, data: { id: existRes.data[0]._id } }
    } else {
      const result = await db.collection('registrations').add({
        data: {
          activity_id,
          scene_id: scene_id || null,
          user_openid,
          ...regData,
          created_at: db.serverDate()
        }
      })
      
      return { success: true, data: { id: result._id } }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function deleteRegistration(data) {
  const { id } = data
  
  try {
    await db.collection('registrations').doc(id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
