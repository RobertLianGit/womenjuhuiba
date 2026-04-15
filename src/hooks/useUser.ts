import { useState, useEffect } from 'react'
import { getUUID, saveUUID, generateUUID } from '../utils/uuid'
import { request } from '../utils/api'
import { API } from '../config'

export interface UserInfo {
  uuid: string
  display_name: string
  recovery_email: string | null
  email_verified: boolean
}

export const useUser = () => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化用户
  const initUser = async () => {
    let uuid = getUUID()

    // 如果没有 UUID，先生成
    if (!uuid) {
      uuid = generateUUID()
      saveUUID(uuid)
    }

    // 查询云端用户信息
    const res = await request<UserInfo>(API.user, {
      action: 'get',
      uuid,
    })

    if (res.success && res.data) {
      setUser(res.data)
    } else {
      // 云端无记录，说明是新用户但还没设置显示名
      setUser(null)
    }

    setLoading(false)
  }

  // 设置显示名（注册/登录）
  const setDisplayName = async (name: string): Promise<boolean> => {
    const uuid = getUUID()
    if (!uuid) return false

    const res = await request(API.user, {
      action: 'register',
      uuid,
      display_name: name,
    })

    if (res.success) {
      setUser({
        uuid,
        display_name: name,
        recovery_email: null,
        email_verified: false,
      })
      return true
    }
    return false
  }

  useEffect(() => {
    initUser()
  }, [])

  return {
    user,
    loading,
    setDisplayName,
    isLoggedIn: !!user?.display_name,
  }
}
