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
