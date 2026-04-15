/**
 * UUID 管理工具
 * 负责前端本地存储用户身份标识
 */

const STORAGE_KEY = 'party_uuid'

/**
 * 生成新 UUID（v4 格式）
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 获取当前 UUID
 */
export const getUUID = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * 保存 UUID
 */
export const saveUUID = (uuid: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, uuid)
  } catch {}
}

/**
 * 清除 UUID
 */
export const clearUUID = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/**
 * 判断是否已登录
 */
export const isLoggedIn = (): boolean => {
  return !!getUUID()
}
