'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { ClipboardCheck, Vote, FileText, UserPlus, LayoutDashboard, Receipt, Share2, Copy, Check, ArrowRight } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; rotate: string }> = {
  collecting: { label: '意愿收集中', bg: 'bg-primary text-primary-foreground', rotate: '-rotate-2' },
  voting:     { label: '投票中', bg: 'bg-accent-blue text-white', rotate: 'rotate-1' },
  plan:       { label: '方案确认中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-2' },
  registering:{ label: '报名中', bg: 'bg-success text-white', rotate: '-rotate-1' },
  started:    { label: '进行中', bg: 'bg-accent-blue text-white', rotate: '-rotate-2' },
  settling:   { label: '结算中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-1' },
  settled:    { label: '已结算', bg: 'bg-muted text-muted-foreground', rotate: '' },
};

const STATUS_ORDER = ['collecting', 'voting', 'plan', 'registering', 'started', 'settling', 'settled'];

const ENTRIES = [
  { key: 'collecting', label: '意愿收集', icon: ClipboardCheck, desc: '收集大家的意愿和想法' },
  { key: 'voting', label: '投票去哪', icon: Vote, desc: '投票决定去哪里' },
  { key: 'plan', label: '方案确认', icon: FileText, desc: '确认活动方案和分段' },
  { key: 'registering', label: '分段报名', icon: UserPlus, desc: '按段报名参加' },
  { key: 'dashboard', label: '组织者看板', icon: LayoutDashboard, desc: '管理参与人员' },
  { key: 'settle', label: '记账结算', icon: Receipt, desc: '分摊费用和转账' },
];

const ACTION_MAP: Record<string, { label: string; next: string }> = {
  collecting: { label: '开始投票', next: 'voting' },
  voting:     { label: '确认方案', next: 'plan' },
  plan:       { label: '开启报名', next: 'registering' },
  registering:{ label: '活动开始', next: 'started' },
  started:    { label: '开始结算', next: 'settling' },
  settling:   { label: '完成结算', next: 'settled' },
};

export default function ActivityPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/activities?id=${id}`)
      .then(r => r.json())
      .then(res => {
        setActivity(res.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const currentIdx = activity ? STATUS_ORDER.indexOf(activity.status) : -1;

  const isOpen = (key: string) => {
    if (!activity) return false;
    if (key === 'collecting') return currentIdx >= 0;
    if (key === 'voting') return currentIdx >= 1;
    if (key === 'plan') return currentIdx >= 2;
    if (key === 'registering') return currentIdx >= 3;
    if (key === 'dashboard') return currentIdx >= 3;
    if (key === 'settle') return currentIdx >= 5;
    return false;
  };

  const handleNextStatus = async () => {
    if (!activity) return;
    const action = ACTION_MAP[activity.status];
    if (!action) return;
    const res = await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action.next }),
    });
    const result = await res.json();
    if (result.data) setActivity(result.data);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/activity?id=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;
  if (!activity) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">活动不存在</div>;

  const st = STATUS_MAP[activity.status] || STATUS_MAP.collecting;
  const action = ACTION_MAP[activity.status];

  const pageHref = (key: string) => {
    const map: Record<string, string> = {
      collecting: `/intention?activity_id=${id}`,
      voting: `/vote?activity_id=${id}`,
      plan: `/plan?activity_id=${id}`,
      registering: `/register?activity_id=${id}`,
      dashboard: `/dashboard?activity_id=${id}`,
      settle: `/settle?activity_id=${id}`,
    };
    return map[key] || '#';
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Status */}
        <section className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <h1 className="text-4xl font-bold">{activity.title}</h1>
            <span className={`inline-block ${st.bg} border-2 border-outline px-3 py-1.5 text-sm font-bold ${st.rotate} shrink-0`}>
              {st.label}
            </span>
          </div>
          <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <p className="text-base mb-3">{activity.description}</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4" />{activity.rough_time}</span>
              <span>组织者：<strong className="text-foreground">{activity.creator_name}</strong></span>
            </div>
          </div>
        </section>

        {/* Action Button */}
        {action && (
          <section className="mb-8">
            <button
              onClick={handleNextStatus}
              className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
              style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
            >
              {action.label} <ArrowRight className="w-5 h-5" />
            </button>
          </section>
        )}

        {/* Entry Cards */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">功能入口</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ENTRIES.map(entry => {
              const open = isOpen(entry.key);
              const Icon = entry.icon;
              return open ? (
                <Link
                  key={entry.key}
                  href={pageHref(entry.key)}
                  className="bg-card border-2 border-outline p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer group"
                  style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                >
                  <Icon className="w-8 h-8 mb-3 text-primary group-hover:text-accent-blue" />
                  <h3 className="font-bold text-base mb-1">{entry.label}</h3>
                  <p className="text-sm text-muted-foreground">{entry.desc}</p>
                </Link>
              ) : (
                <div
                  key={entry.key}
                  className="bg-card border-2 border-outline p-5 opacity-40 cursor-not-allowed"
                >
                  <Icon className="w-8 h-8 mb-3 text-muted-foreground" />
                  <h3 className="font-bold text-base mb-1">{entry.label}</h3>
                  <p className="text-sm text-muted-foreground">尚未开放</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Share */}
        <section>
          <div className="bg-card border-2 border-outline p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <Share2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate flex-1">{`${typeof window !== 'undefined' ? window.location.origin : ''}/activity?id=${id}`}</span>
            <button
              onClick={handleCopyLink}
              className="bg-accent-blue text-white border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
