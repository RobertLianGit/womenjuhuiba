// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// SHA-256 哈希
function hashSecret(input) {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(input).digest('hex')
}

// 验证管理口令
async function verifyPassphrase(activityId, passphrase) {
  const res = await db.collection('activities').doc(activityId).get()
  if (!res.data) return false
  return res.data.passphrase === hashSecret(passphrase)
}

exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'list':
      return await getScenes(data)
    case 'create':
      return await createScene(data)
    case 'update':
      return await updateScene(data)
    case 'delete':
      return await deleteScene(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getScenes(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('scenes')
      .where({ activity_id })
      .orderBy('created_at', 'asc')
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function createScene(data) {
  const { activity_id, name, start_time, location, description, passphrase } = data
  
  if (!activity_id || !name) {
    return { success: false, error: '缺少必填字段' }
  }

  // 验证管理口令
  if (!await verifyPassphrase(activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    const result = await db.collection('scenes').add({
      data: {
        activity_id,
        name,
        start_time: start_time || '',
        location: location || '',
        description: description || '',
        created_at: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function updateScene(data) {
  const { id, name, start_time, location, description, passphrase } = data
  
  // 获取 scene 关联的 activity_id
  const sceneRes = await db.collection('scenes').doc(id).get()
  if (!sceneRes.data) {
    return { success: false, error: '分段不存在' }
  }

  // 验证管理口令
  if (!await verifyPassphrase(sceneRes.data.activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('scenes').doc(id).update({
      data: {
        name,
        start_time: start_time || '',
        location: location || '',
        description: description || ''
      }
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function deleteScene(data) {
  const { id, passphrase } = data
  
  // 获取 scene 关联的 activity_id
  const sceneRes = await db.collection('scenes').doc(id).get()
  if (!sceneRes.data) {
    return { success: false, error: '分段不存在' }
  }

  // 验证管理口令
  if (!await verifyPassphrase(sceneRes.data.activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('scenes').doc(id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
