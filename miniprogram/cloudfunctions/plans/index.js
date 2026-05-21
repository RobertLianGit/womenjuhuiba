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
    case 'get':
      return await getPlan(data)
    case 'save':
      return await savePlan(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getPlan(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('plans')
      .where({ activity_id })
      .limit(1)
      .get()

    if (res.data.length > 0) {
      return { success: true, data: res.data[0] }
    } else {
      return { success: true, data: null }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function savePlan(data) {
  const { activity_id, content, passphrase } = data
  
  if (!activity_id || !content) {
    return { success: false, error: '缺少必填字段' }
  }

  if (!await verifyPassphrase(activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    // 查找是否已存在方案
    const existRes = await db.collection('plans')
      .where({ activity_id })
      .limit(1)
      .get()

    if (existRes.data.length > 0) {
      await db.collection('plans')
        .doc(existRes.data[0]._id)
        .update({
          data: { content, updated_at: db.serverDate() }
        })
      
      return { success: true, data: { id: existRes.data[0]._id } }
    } else {
      const result = await db.collection('plans').add({
        data: {
          activity_id,
          content,
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })
      
      return { success: true, data: { id: result._id } }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
