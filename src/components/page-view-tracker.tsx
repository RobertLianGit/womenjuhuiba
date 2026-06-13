'use client';

import { useEffect } from 'react';

export function PageViewTracker() {
  useEffect(() => {
    // 获取或创建 visitor_id
    let vid = localStorage.getItem('pv_vid');
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem('pv_vid', vid);
    }

    // 上报 PV
    fetch('/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || null,
        visitor_id: vid,
      }),
    }).catch(() => {
      // 静默失败，不影响用户体验
    });
  }, []);

  return null;
}
