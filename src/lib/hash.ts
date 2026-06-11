import { createHmac } from 'crypto';

/**
 * 固定密钥，确保所有环境（开发、生产）哈希一致
 * 注意：此密钥是公开的（在代码中），安全性依赖于 HMAC 单向特性
 * 如果需要更高安全性，请在部署时确保 HMAC_SECRET 环境变量一致
 */
const HMAC_KEY = 'womenjuhuiba-beta-fixed-key-20260211';

/**
 * 对口令进行单向哈希，存入数据库用
 * 同一输入始终产生同一输出，可用于 WHERE 条件查询
 * 不可逆：无法从哈希值还原原始口令
 */
export function hashSecret(input: string): string {
  // 移除前后空格，确保口令一致性
  const normalized = input.trim();
  return createHmac('sha256', HMAC_KEY).update(normalized).digest('hex');
}
