import { createHmac } from 'crypto';

const HMAC_KEY = process.env.HMAC_SECRET || 'womenjuhuiba-beta-hmac-key-2026';

/**
 * 对口令进行单向哈希，存入数据库用
 * 同一输入始终产生同一输出，可用于 WHERE 条件查询
 * 不可逆：无法从哈希值还原原始口令
 */
export function hashSecret(input: string): string {
  return createHmac('sha256', HMAC_KEY).update(input).digest('hex');
}
