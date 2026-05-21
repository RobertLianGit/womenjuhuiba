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
      return await getBills(data)
    case 'add':
      return await addBill(data)
    case 'update':
      return await updateBill(data)
    case 'delete':
      return await deleteBill(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

async function getBills(data) {
  const { activity_id } = data
  
  try {
    const res = await db.collection('bills')
      .where({ activity_id })
      .orderBy('created_at', 'asc')
      .get()

    return { success: true, data: res.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function addBill(data) {
  const { activity_id, payer_name, amount, description, passphrase } = data
  
  if (!activity_id || !payer_name || !amount) {
    return { success: false, error: '缺少必填字段' }
  }

  if (!await verifyPassphrase(activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    const result = await db.collection('bills').add({
      data: {
        activity_id,
        payer_name,
        amount: parseFloat(amount),
        description: description || '',
        created_at: db.serverDate()
      }
    })

    return { success: true, data: { id: result._id } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function updateBill(data) {
  const { id, payer_name, amount, description, passphrase } = data
  
  const billRes = await db.collection('bills').doc(id).get()
  if (!billRes.data) {
    return { success: false, error: '账单不存在' }
  }

  if (!await verifyPassphrase(billRes.data.activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('bills').doc(id).update({
      data: {
        payer_name,
        amount: parseFloat(amount),
        description: description || ''
      }
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function deleteBill(data) {
  const { id, passphrase } = data
  
  const billRes = await db.collection('bills').doc(id).get()
  if (!billRes.data) {
    return { success: false, error: '账单不存在' }
  }

  if (!await verifyPassphrase(billRes.data.activity_id, passphrase)) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('bills').doc(id).remove()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
