/**
 * 口令工具函数
 *
 * access_code 和 passphrase 均以明文存储在数据库中
 * API 返回时会脱敏（移除口令字段），前端无法获取
 * 验证时直接明文比对
 */

/** 对口令做 trim 处理，去除前后空格 */
export function normalizeSecret(input: string): string {
  return input.trim();
}
