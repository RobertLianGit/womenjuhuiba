// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const crypto = require('crypto')
function hashSecret(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

async function verifyPassphrase(activityId, passphrase) {
  const res = await db.collection('activities').doc(activityId).get()
  if (!res.data) return false
  return res.data.passphrase === hashSecret(passphrase)
}

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'list':
      return await getParticipants(data)
    case 'add':
      return await addParticipant(data)
    case 'delete':
      return await deleteParticipant(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getParticipants(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('participants')
      .where({ activity_id })
      .orderBy('created_at', 'asc')
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function addParticipant(data) {
  const { activity_id, name, phone, notes, passphrase } = data
  
  if (!activity_id || !name) {
    return { success: false, error: '缺少必填字段' }
  }

  if (!await verifyPassphrase(activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    const result = await db.collection('participants').add({
      data: {
        activity_id,
        name,
        phone: phone || '',
        notes: notes || '',
        created_at: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function deleteParticipant(data) {
  const { id, passphrase } = data
  
  // 获取 participant 关联的 activity_id
  const partRes = await db.collection('participants').doc(id).get()
  if (!partRes.data) {
    return { success: false, error: '参与者不存在' }
  }

  if (!await verifyPassphrase(partRes.data.activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('participants').doc(id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
