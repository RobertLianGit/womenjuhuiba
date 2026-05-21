// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成随机口令
function generateCode(length = 6) {
  const chars = '0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// SHA-256 哈希
function hashSecret(input) {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(input).digest('hex')
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  switch (action) {
    case 'create':
      return await createActivity(data, wxContext)
    case 'getList':
      return await getActivityList(data, wxContext)
    case 'getDetail':
      return await getActivityDetail(data)
    case 'verifyAccess':
      return await verifyAccess(data)
    case 'verifyPassphrase':
      return await verifyPassphrase(data)
    case 'updateStatus':
      return await updateStatus(data)
    default:
      return { success: false, error: '未知操作' }
  }
}

// 创建活动
async function createActivity(data, wxContext) {
  const { name, description, activity_time, location } = data
  
  if (!name) {
    return { success: false, error: '请输入活动名称' }
  }

  const accessCode = generateCode(6)
  const passphrase = generateCode(6)

  try {
    const result = await db.collection('activities').add({
      data: {
        name,
        description: description || '',
        activity_time: activity_time || '',
        location: location || '',
        status: 'collecting',
        creator_openid: wxContext.OPENID,
        creator_name: data.creator_name || '匿名用户',
        creator_avatar: data.creator_avatar || '',
        access_code: accessCode,
        passphrase: hashSecret(passphrase),
        vote_rule: 'single',
        max_votes: 1,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      }
    })

    return {
      success: true,
      data: {
        id: result._id,
        access_code: accessCode,
        passphrase: passphrase  // 仅创建时返回明文
      }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 获取活动列表
async function getActivityList(data, wxContext) {
  const { openid } = data
  
  try {
    // 获取用户创建的活动
    const createdRes = await db.collection('activities')
      .where({
        creator_openid: openid || wxContext.OPENID
      })
      .orderBy('created_at', 'desc')
      .get()

    // 获取用户参与的活动（通过报名记录）
    const regRes = await db.collection('registrations')
      .where({
        user_openid: openid || wxContext.OPENID
      })
      .field({ activity_id: true })
      .get()

    const participatedIds = [...new Set(regRes.data.map(r => r.activity_id))]
    
    let participatedActivities = []
    if (participatedIds.length > 0) {
      const actRes = await db.collection('activities')
        .where({
          _id: _.in(participatedIds)
        })
        .get()
      participatedActivities = actRes.data
    }

    // 合并并去重
    const allActivities = [...createdRes.data, ...participatedActivities]
    const uniqueMap = new Map()
    allActivities.forEach(act => {
      uniqueMap.set(act._id, act)
    })

    return {
      success: true,
      data: Array.from(uniqueMap.values())
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 获取活动详情
async function getActivityDetail(data) {
  const { id, access_code } = data
  
  if (!id && !access_code) {
    return { success: false, error: '缺少活动ID或口令' }
  }

  try {
    let query = {}
    if (id) {
      query._id = id
    } else if (access_code) {
      query.access_code = access_code
    }

    const res = await db.collection('activities').where(query).get()
    
    if (res.data.length === 0) {
      return { success: false, error: '活动不存在' }
    }

    const activity = res.data[0]
    // 不返回哈希后的口令
    delete activity.passphrase

    return { success: true, data: activity }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 验证活动口令
async function verifyAccess(data) {
  const { access_code } = data
  
  try {
    const res = await db.collection('activities')
      .where({ access_code })
      .get()

    if (res.data.length === 0) {
      return { success: false, error: '口令错误或活动不存在' }
    }

    return { success: true, data: res.data[0] }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 验证管理口令
async function verifyPassphrase(data) {
  const { activity_id, passphrase } = data
  
  try {
    const res = await db.collection('activities')
      .doc(activity_id)
      .get()

    if (!res.data) {
      return { success: false, error: '活动不存在' }
    }

    if (res.data.passphrase !== hashSecret(passphrase)) {
      return { success: false, valid: false, error: '管理口令错误' }
    }

    return { success: true, valid: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 更新活动状态
async function updateStatus(data) {
  const { activity_id, status, passphrase } = data
  
  // 先验证管理口令
  const verifyRes = await verifyPassphrase({ activity_id, passphrase })
  if (!verifyRes.success || !verifyRes.valid) {
    return { success: false, error: '管理口令错误' }
  }

  try {
    await db.collection('activities')
      .doc(activity_id)
      .update({
        data: {
          status,
          updated_at: db.serverDate()
        }
      })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
