'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId } from '@/lib/party';
import {
  ClipboardCheck, Vote, FileText, UserPlus, LayoutDashboard, Receipt,
  Share2, Copy, Check, ArrowRight, Crown, Calendar, ChevronRight,
  Send, CheckCircle2, BarChart3, UserCheck
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  creator_id: string;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; rotate: string; desc: string }> = {
  collecting: { label: '意愿收集中', bg: 'bg-primary text-primary-foreground', rotate: '-rotate-2', desc: '大家正在填写参与意愿' },
  voting:     { label: '投票中', bg: 'bg-accent-blue text-white', rotate: 'rotate-1', desc: '正在投票决定去哪里' },
  plan:       { label: '方案确认中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-2', desc: '组织者正在确认活动方案' },
  registering:{ label: '报名中', bg: 'bg-success text-white', rotate: '-rotate-1', desc: '选择参与的分段报名' },
  started:    { label: '进行中', bg: 'bg-accent-blue text-white', rotate: '-rotate-2', desc: '活动正在进行' },
  settling:   { label: '结算中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-1', desc: '正在记账分摊费用' },
  settled:    { label: '已结算', bg: 'bg-muted text-muted-foreground', rotate: '', desc: '活动费用已结清' },
};

const STATUS_ORDER = ['collecting', 'voting', 'plan', 'registering', 'started', 'settling', 'settled'];

const ACTION_MAP: Record<string, { label: string; next: string }> = {
  collecting: { label: '开始投票', next: 'voting' },
  voting:     { label: '确认方案', next: 'plan' },
  plan:       { label: '开启报名', next: 'registering' },
  registering:{ label: '活动开始', next: 'started' },
  started:    { label: '开始结算', next: 'settling' },
  settling:   { label: '完成结算', next: 'settled' },
};

// What a participant can do at each phase
const PARTICIPANT_ACTION: Record<string, { label: string; href: string; icon: typeof ClipboardCheck; color: string }> = {
  collecting: { label: '填写意愿', href: '/intention', icon: Send, color: 'bg-primary text-primary-foreground' },
  voting:     { label: '去投票', href: '/vote', icon: Vote, color: 'bg-accent-blue text-white' },
  plan:       { label: '查看方案', href: '/plan', icon: FileText, color: 'bg-warning text-primary-foreground' },
  registering:{ label: '去报名', href: '/register', icon: UserCheck, color: 'bg-success text-white' },
  started:    { label: '查看活动', href: '/register', icon: CheckCircle2, color: 'bg-accent-blue text-white' },
  settling:   { label: '查看账单', href: '/settle', icon: Receipt, color: 'bg-warning text-primary-foreground' },
  settled:    { label: '查看结算', href: '/settle', icon: Receipt, color: 'bg-muted text-muted-foreground' },
};

// Organizer entries (all function entries)
const ORGANIZER_ENTRIES = [
  { key: 'collecting', label: '意愿收集', icon: ClipboardCheck, desc: '收集大家的意愿和想法', minStatus: 0 },
  { key: 'voting', label: '投票去哪', icon: Vote, desc: '投票决定去哪里', minStatus: 1 },
  { key: 'plan', label: '方案确认', icon: FileText, desc: '确认活动方案和分段', minStatus: 2 },
  { key: 'registering', label: '分段报名', icon: UserPlus, desc: '按段报名参加', minStatus: 3 },
  { key: 'dashboard', label: '组织者看板', icon: LayoutDashboard, desc: '管理参与人员', minStatus: 3 },
  { key: 'settle', label: '记账结算', icon: Receipt, desc: '分摊费用和转账', minStatus: 5 },
];

export default function ActivityPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = getUserId();

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

  const isCreator = activity ? activity.creator_id === userId : false;
  const currentIdx = activity ? STATUS_ORDER.indexOf(activity.status) : -1;

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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;
  if (!activity) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">活动不存在</div>;

  const st = STATUS_MAP[activity.status] || STATUS_MAP.collecting;
  const action = ACTION_MAP[activity.status];
  const participantAction = PARTICIPANT_ACTION[activity.status];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Status */}
        <section className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <h1 className="text-4xl font-bold">{activity.title}</h1>
            <span className={`inline-block ${st.bg} border-2 border-outline px-3 py-1.5 text-sm font-bold ${st.rotate} shrink-0`}>
              {st.label}
            </span>
          </div>
          <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <p className="text-base mb-3">{activity.description}</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{activity.rough_time}</span>
              <span className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" />
                组织者：<strong className="text-foreground">{activity.creator_name}</strong>
                {isCreator && <span className="text-primary text-xs ml-1">（你）</span>}
              </span>
            </div>
          </div>
        </section>

        {/* ===== PARTICIPANT VIEW ===== */}
        {!isCreator && (
          <>
            {/* Current Phase Action Card — prominent, clear */}
            <section className="mb-8">
              <div className="bg-card border-2 border-outline p-6 relative" style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
                <div className="mb-4">
                  <p className="text-sm font-bold text-muted-foreground mb-1">当前阶段</p>
                  <p className="text-lg font-bold">{st.label}</p>
                  <p className="text-sm text-muted-foreground">{st.desc}</p>
                </div>
                {participantAction && (
                  <Link
                    href={`${participantAction.href}?activity_id=${id}`}
                    className={`inline-flex items-center gap-3 ${participantAction.color} border-2 border-outline px-8 py-4 text-lg font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer`}
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    {(() => { const Icon = participantAction.icon; return <Icon className="w-5 h-5" />; })()}
                    {participantAction.label}
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </section>

            {/* Share Link */}
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
          </>
        )}

        {/* ===== ORGANIZER VIEW ===== */}
        {isCreator && (
          <>
            {/* Phase Progress Bar */}
            <section className="mb-6">
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-muted-foreground">活动进度</p>
                  <span className={`inline-block ${st.bg} border-2 border-outline px-2.5 py-1 text-xs font-bold ${st.rotate}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {STATUS_ORDER.slice(0, -1).map((s, idx) => {
                    const isActive = idx === currentIdx;
                    const isDone = idx < currentIdx;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`h-3 flex-1 border-2 border-outline ${isDone ? 'bg-success' : isActive ? 'bg-primary' : 'bg-muted'}`} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] font-medium text-muted-foreground">
                  <span>意愿</span><span>投票</span><span>方案</span><span>报名</span><span>进行</span><span>结算</span>
                </div>
              </div>
            </section>

            {/* Action Button — Organizer Only */}
            {action && (
              <section className="mb-6">
                <button
                  onClick={handleNextStatus}
                  className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
                  style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                >
                  {action.label} <ArrowRight className="w-5 h-5" />
                </button>
              </section>
            )}

            {/* Entry Cards — All Function Entries */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">功能入口</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ORGANIZER_ENTRIES.map(entry => {
                  const open = currentIdx >= entry.minStatus;
                  const isCurrentPhase = entry.key === activity.status;
                  const Icon = entry.icon;
                  return open ? (
                    <Link
                      key={entry.key}
                      href={pageHref(entry.key)}
                      className={`bg-card border-2 border-outline p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer group relative ${isCurrentPhase ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                    >
                      {isCurrentPhase && (
                        <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 border border-outline">当前</span>
                      )}
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

            {/* Share Link */}
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
          </>
        )}
      </main>
    </div>
  );
}
