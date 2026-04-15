/**
 * 邀请码生成工具
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * 生成6位邀请码
 */
export const generateInviteCode = (): string => {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

/**
 * 验证邀请码格式
 */
export const isValidInviteCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase())
}

/**
 * 从 URL 中解析邀请参数
 */
export const parseJoinParams = (): { activityId: string; token: string } | null => {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = (currentPage as any).options || {}
    const { activityId, token } = options
    if (!activityId || !token) return null
    return { activityId, token }
  } catch {
    return null
  }
}
