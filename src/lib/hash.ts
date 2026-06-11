import { createHash } from 'crypto';

/**
 * 对口令进行单向哈希，存入数据库用
 * 使用普通 SHA-256（与数据库中的旧数据一致）
 * 同一输入始终产生同一输出，可用于 WHERE 条件查询
 * 不可逆：无法从哈希值还原原始口令
 */
export function hashSecret(input: string): string {
  // 移除前后空格，确保口令一致性
  const normalized = input.trim();
  return createHash('sha256').update(normalized).digest('hex');
}