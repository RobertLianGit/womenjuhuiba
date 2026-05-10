'use client';

import { useState } from 'react';
import { isOrganizer, setPassphrase } from '@/lib/party';
import { KeyRound, Check, Shield } from 'lucide-react';

interface PassphraseVerifierProps {
  activityId: string;
  onVerified?: () => void;
  compact?: boolean;
}

export function PassphraseVerifier({ activityId, onVerified, compact }: PassphraseVerifierProps) {
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isOrganizerNow = isOrganizer(activityId, null);

  if (isOrganizerNow) {
    return compact ? (
      <span className="inline-flex items-center gap-1 bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">
        <Shield className="w-3 h-3" />组织者
      </span>
    ) : null;
  }

  if (success) {
    return (
      <div className="bg-success text-white border-2 border-outline p-3 flex items-center gap-2 text-sm font-bold">
        <Check className="w-4 h-4" />已验证为组织者
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className={compact
          ? "inline-flex items-center gap-1 text-xs font-bold text-muted-foreground border-2 border-outline px-2 py-1 hover:bg-muted cursor-pointer"
          : "bg-card border-2 border-outline px-4 py-2 font-bold text-sm flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
        }
        style={compact ? {} : { boxShadow: '4px 4px 0 #0A0A0A' }}
      >
        <KeyRound className={compact ? "w-3 h-3" : "w-4 h-4"} />
        {compact ? '验证口令' : '输入管理口令'}
      </button>
    );
  }

  return (
    <div className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">输入管理口令</span>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border-2 border-outline bg-muted px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          placeholder="6位管理口令"
          maxLength={10}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
        />
        <button
          onClick={handleVerify}
          disabled={!input.trim()}
          className="bg-primary text-primary-foreground border-2 border-outline px-4 py-2 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          验证
        </button>
        <button
          onClick={() => { setShowInput(false); setInput(''); setError(''); }}
          className="bg-card border-2 border-outline px-3 py-2 font-bold text-sm cursor-pointer hover:bg-muted"
        >
          取消
        </button>
      </div>
      {error && <p className="text-error text-xs font-bold mt-2">{error}</p>}
    </div>
  );

  function handleVerify() {
    if (!input.trim()) return;
    // Verify by trying a PATCH with the passphrase
    fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'verify', passphrase: input.trim() }),
    })
      .then(r => r.json())
      .then(result => {
        if (result.error) {
          setError('口令验证失败，请检查后重试');
        } else {
          setPassphrase(activityId, input.trim());
          setSuccess(true);
          onVerified?.();
        }
      })
      .catch(() => {
        setError('验证失败，请稍后重试');
      });
  }
}
