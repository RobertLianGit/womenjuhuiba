const USER_ID_KEY = 'party_user_id';
const USER_NAME_KEY = 'party_user_name';

export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getUserName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_NAME_KEY) || '';
}

export function setUserName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_NAME_KEY, name);
}

import { useEffect, useState } from 'react';

export function useUserId(): string {
  const [id, setId] = useState('');
  useEffect(() => { setId(getUserId()); }, []);
  return id;
}

export function useUserName(): string {
  const [name, setName] = useState('');
  useEffect(() => { setName(getUserName()); }, []);
  return name;
}

// ===== 管理口令 =====
const PASSPHRASE_PREFIX = 'party_pass_';

/** 获取某活动的管理口令（localStorage） */
export function getPassphrase(activityId: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PASSPHRASE_PREFIX + activityId) || '';
}

/** 保存某活动的管理口令到 localStorage */
export function setPassphrase(activityId: string, passphrase: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PASSPHRASE_PREFIX + activityId, passphrase);
}

/** 清除某活动的管理口令 */
export function clearPassphrase(activityId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PASSPHRASE_PREFIX + activityId);
}

/** 判断当前用户是否为某活动的组织者（localStorage中存有管理口令即为组织者） */
export function isOrganizer(activityId: string, _activityPassphrase?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  return !!getPassphrase(activityId);
}

/** 生成6位随机口令（大写字母+数字） */
export function generatePassphrase(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===== 活动口令（access_code） =====
const ACCESS_PREFIX = 'party_access_';

/** 记住已通过验证的活动（用户输入了正确的活动口令） */
export function markActivityAccessed(activityId: string): void {
  if (typeof window === 'undefined') return;
  const accessed = getAccessedActivities();
  if (!accessed.includes(activityId)) {
    accessed.push(activityId);
    localStorage.setItem('party_accessed_activities', JSON.stringify(accessed));
  }
}

/** 获取已通过活动口令验证的活动ID列表 */
export function getAccessedActivities(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('party_accessed_activities') || '[]');
  } catch {
    return [];
  }
}

/** 判断用户是否已通过某活动的口令验证 */
export function isActivityAccessed(activityId: string): boolean {
  return getAccessedActivities().includes(activityId);
}

// ===== 我发起的活动 =====
const CREATED_KEY = 'party_created_activities';

/** 记录自己创建的活动ID */
export function addCreatedActivity(activityId: string): void {
  if (typeof window === 'undefined') return;
  const ids = getCreatedActivities();
  if (!ids.includes(activityId)) {
    ids.push(activityId);
    localStorage.setItem(CREATED_KEY, JSON.stringify(ids));
  }
}

/** 获取自己创建的活动ID列表 */
export function getCreatedActivities(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CREATED_KEY) || '[]');
  } catch {
    return [];
  }
}
