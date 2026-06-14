'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, setUserName, isOrganizer, setPassphrase, setAccessCode, getAccessedActivities, getCreatedActivities, markActivityAccessed, addCreatedActivity } from '@/lib/party';
import { Plus, Calendar, PartyPopper, Crown, Users, Copy, Check, Archive } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  creator_id: string;
  status: string;
  created_at: string;
  access_token?: string;
  archived?: boolean;
}

const STATUS_MAP: Record<string, { label: string; bg: string; rotate: string }> = {
  collecting: { label: '讨论中', bg: 'bg-primary text-[#0A0A0A]', rotate: '-rotate-2' },
  voting:     { label: '投票中', bg: 'bg-accent-blue text-white', rotate: 'rotate-1' },
  plan:       { label: '方案确认中', bg: 'bg-warning text-[#0A0A0A]', rotate: 'rotate-2' },
  registering:{ label: '报名中', bg: 'bg-success text-white', rotate: '-rotate-1' },
  started:    { label: '已成行', bg: 'bg-accent-blue text-white', rotate: '-rotate-2' },
  settling:   { label: '结算中', bg: 'bg-warning text-[#0A0A0A]', rotate: 'rotate-1' },
  settled:    { label: '已结束', bg: 'bg-muted text-muted-foreground', rotate: '' },
};

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [archivedActivities, setArchivedActivities] = useState<Activity[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [createdPassphrase, setCreatedPassphrase] = useState('');
  const [createdActivityId, setCreatedActivityId] = useState('');
  const [createdAccessCode, setCreatedAccessCode] = useState('');
  const [createdAccessToken, setCreatedAccessToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', rough_time: '', creator_name: getUserName() || '', access_code: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'joined' | 'archived'>('mine');

  const fetchMyActivities = async () => {
    setLoading(true);
    const all: Activity[] = [];
    const archivedList: Activity[] = [];
    const uid = getUserId();

    const createdIds = getCreatedActivities();
    if (createdIds.length > 0) {
      try {
        const res = await fetch(`/api/activities?ids=${createdIds.join(',')}&user_id=${uid}&include_archived=true`);
        const data = await res.json();
        if (data.data) {
          data.data.forEach((a: Activity) => {
            if (a.archived) archivedList.push(a);
            else all.push(a);
          });
        }
      } catch { /* ignore */ }
    }

    const accessedIds = getAccessedActivities().filter(id => !createdIds.includes(id));
    if (accessedIds.length > 0) {
      try {
        const res = await fetch(`/api/activities?ids=${accessedIds.join(',')}&user_id=${uid}&include_archived=true`);
        const data = await res.json();
        if (data.data) {
          data.data.forEach((a: Activity) => {
            if (a.archived) archivedList.push(a);
            else all.push(a);
          });
        }
      } catch { /* ignore */ }
    }

    setActivities(all);
    setArchivedActivities(archivedList);
    setLoading(false);
  };

  useEffect(() => { fetchMyActivities(); }, []);

  const accessedIds = getAccessedActivities();
  const myActivities = activities.filter(a => isOrganizer(a.id));
  const joinedActivities = activities.filter(a => !isOrganizer(a.id) && accessedIds.includes(a.id));
  const displayedActivities = tab === 'mine' ? myActivities : tab === 'joined' ? joinedActivities : archivedActivities;

  const handleCreate = async () => {
    if (!form.title.trim() || !form.creator_name.trim()) return;
    const uid = getUserId();
    setUserName(form.creator_name.trim());
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, title: form.title.trim(), creator_name: form.creator_name.trim(), creator_id: uid }),
    });
    const result = await res.json();
    if (result.data) {
      if (result.data.passphrase) {
        setPassphrase(result.data.id, result.data.passphrase);
      }
      if (result.data.access_code) {
        setAccessCode(result.data.id, result.data.access_code);
      }
      markActivityAccessed(result.data.id);
      addCreatedActivity(result.data.id);

      setActivities(prev => [result.data, ...prev]);
      setShowCreateModal(false);
      setForm(prev => ({ title: '', description: '', rough_time: '', creator_name: prev.creator_name, access_code: '' }));
      setCreatedPassphrase(result.data.passphrase);
      setCreatedActivityId(result.data.id);
      setCreatedAccessCode(result.data.access_code);
      setCreatedAccessToken(result.data.access_token || '');
      setShowPassphraseModal(true);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinError('');
    try {
      const res = await fetch(`/api/activities?access_code=${encodeURIComponent(joinCode.trim())}`);
      const data = await res.json();
      if (data.error) {
        setJoinError(data.error);
        return;
      }
      if (data.data) {
        setAccessCode(data.data.id, joinCode.trim());
        markActivityAccessed(data.data.id);
        setShowJoinModal(false);
        setJoinCode('');
        setActivities(prev => prev.some(a => a.id === data.data.id) ? prev : [data.data, ...prev]);
      }
    } catch {
      setJoinError('网络错误，请重试');
    }
  };

  const getShareLink = () => {
    if (createdAccessToken) {
      return `${window.location.origin}/activity?token=${createdAccessToken}`;
    }
    return `${window.location.origin}/activity?id=${createdActivityId}`;
  };

  const handleCopyPassphrase = async () => {
    const text = `🎉 聚会活动已创建！\n\n📎 活动链接：${getShareLink()}\n🔑 活动口令：${createdAccessCode}\n\n🔑 管理口令（仅组织者）：${createdPassphrase}\n\n请妥善保管管理口令！`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShare = async () => {
    const text = `🎉 朋友，来聚会吧！\n\n点击链接直接加入：\n${getShareLink()}\n\n没有链接？输入活动口令：${createdAccessCode}`;
    await navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background text-foreground font-sans">
      <Navbar activePage="home" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <section className="mb-6">
          <div className="bg-card border-2 border-outline p-6 sm:p-10 md:p-14 relative" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="absolute top-4 right-6 w-16 h-16 bg-primary opacity-20 -z-0" />
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 sm:mb-3">
                我们聚会吧
                <span className="text-xs font-normal ml-1 text-secondary bg-muted px-1.5 py-0.5 rounded">Beta</span>
              </h1>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-muted-foreground mb-6 sm:mb-8">
                让每一次聚会都不再只是"下次一定"
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-[#0A0A0A] border-2 border-outline px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_#0A0A0A] transition-all cursor-pointer min-h-[44px]"
                  style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-2 sm:gap-3">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />创建并邀请朋友
                  </span>
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-accent-blue text-white border-2 border-outline px-6 sm:px-8 py-3 sm:py-4 text-lg sm:text-xl font-bold tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_#0A0A0A] transition-all cursor-pointer min-h-[44px]"
                  style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-2 sm:gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />通过口令加入
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* One-liner instead of 5-step tutorial */}
        <section className="mb-6">
          <div className="bg-muted border-2 border-outline p-3 sm:p-4 text-sm text-muted-foreground" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            先发起，细节可以之后再定。创建后分享链接，朋友点击即可参与。
          </div>
        </section>

        {/* Tabs */}
        <section>
          <div className="flex items-center gap-1 mb-6 border-2 border-outline w-fit" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <button
              onClick={() => setTab('mine')}
              className={`px-4 sm:px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer min-h-[44px] ${tab === 'mine' ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
            >
              <Crown className="w-4 h-4" />我发起的
              {myActivities.length > 0 && <span className="ml-1 bg-black/10 px-1.5 py-0.5 text-xs">{myActivities.length}</span>}
            </button>
            <button
              onClick={() => setTab('joined')}
              className={`px-4 sm:px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer min-h-[44px] ${tab === 'joined' ? 'bg-accent-blue text-white' : 'bg-card hover:bg-muted'}`}
            >
              <Users className="w-4 h-4" />我参与的
              {joinedActivities.length > 0 && <span className="ml-1 bg-black/10 px-1.5 py-0.5 text-xs">{joinedActivities.length}</span>}
            </button>
            <button
              onClick={() => setTab('archived')}
              className={`px-4 sm:px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer min-h-[44px] ${tab === 'archived' ? 'bg-foreground text-background' : 'bg-card hover:bg-muted'}`}
            >
              <Archive className="w-4 h-4" />历史活动
              {archivedActivities.length > 0 && <span className="ml-1 bg-black/10 px-1.5 py-0.5 text-xs">{archivedActivities.length}</span>}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : displayedActivities.length === 0 ? (
            <div className="bg-card border-2 border-outline p-8 sm:p-12 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <PartyPopper className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-primary opacity-60" />
              <p className="text-lg sm:text-xl font-bold mb-2">{tab === 'mine' ? '还没有发起活动' : tab === 'joined' ? '还没有参与活动' : '还没有历史活动'}</p>
              <p className="text-muted-foreground mb-6">
                {tab === 'mine' ? '点击上方按钮，创建你的第一个聚会吧' : tab === 'joined' ? '通过朋友分享的链接或口令加入聚会' : '归档的活动会显示在这里'}
              </p>
              {tab === 'joined' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-accent-blue text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer min-h-[44px]"
                  style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-2"><Users className="w-4 h-4" />输入口令加入</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {displayedActivities.map((act) => {
                const st = STATUS_MAP[act.status] || STATUS_MAP.collecting;
                const isMine = isOrganizer(act.id);
                return (
                  <Link
                    key={act.id}
                    href={`/activity?id=${act.id}`}
                    className="bg-card border-2 border-outline p-4 sm:p-5 block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <h3 className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors">{act.title}</h3>
                      <span className={`inline-block ${st.bg} border-2 border-outline px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-bold ${st.rotate} shrink-0 ml-2 sm:ml-3`}>
                        {st.label}
                      </span>
                    </div>
                    {act.rough_time && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{act.rough_time}</span>
                      </div>
                    )}
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t-2 border-outline/15 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{isMine ? '你发起的' : `由 ${act.creator_name} 发起`}</span>
                      {isMine && (
                        <span className="flex items-center gap-1 text-xs font-bold text-primary"><Crown className="w-3 h-3" />组织者</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 sm:mt-12 pt-6 border-t-2 border-outline/20 text-center text-xs text-muted-foreground pb-[env(safe-area-inset-bottom)]">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-4">
              <a href="/poster.png" target="_blank" download className="underline hover:text-foreground transition-colors">下载宣传海报</a>
              <span className="text-outline/30">|</span>
              <a href="/privacy" className="underline hover:text-foreground transition-colors">隐私保护声明</a>
            </div>
            <div className="mt-3">
              微信公众号搜索<span className="font-bold mx-1">"连通社"</span>留言提出使用问题
            </div>
            <div className="mt-2">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                京ICP备2026027076号
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Create Modal - Simplified */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card border-2 border-outline w-full sm:max-w-lg sm:rounded-none p-5 sm:p-8 relative max-h-[90dvh] overflow-y-auto" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">创建活动</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">你的昵称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                  value={form.creator_name}
                  onChange={e => setForm(f => ({ ...f, creator_name: e.target.value }))}
                  placeholder="输入你的昵称"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动名称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="如：周末烧烤派对"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">时间范围 <span className="text-muted-foreground text-xs font-normal">可选</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px]"
                  value={form.rough_time}
                  onChange={e => setForm(f => ({ ...f, rough_time: e.target.value }))}
                  placeholder="如：周末、下周六、12月底"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动说明 <span className="text-muted-foreground text-xs font-normal">可选</span></label>
                <textarea
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="简单描述一下聚会的内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">自定义活动口令 <span className="text-muted-foreground text-xs font-normal">可选，不填则自动生成</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[44px] tracking-widest"
                  value={form.access_code ?? ''}
                  onChange={e => setForm(f => ({ ...f, access_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="6位数字，如 888888"
                  maxLength={6}
                />
              </div>
              <div className="bg-muted border-2 border-outline p-3 text-sm text-muted-foreground">
                {form.access_code ? '你自定义了活动口令，管理口令仍会自动生成。' : '活动口令和管理口令会自动生成。'}创建后可直接分享链接，朋友点击即可加入，无需再输口令。
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={!form.title || !form.creator_name}
                className="flex-1 bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                创建并邀请朋友
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setForm(prev => ({ title: '', description: '', rough_time: '', creator_name: prev.creator_name, access_code: '' })); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer min-h-[44px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passphrase Modal - after creation */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card border-2 border-outline w-full sm:max-w-lg p-5 sm:p-8 relative max-h-[90dvh] overflow-y-auto" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary p-2 border-2 border-outline" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">活动已创建！</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">分享下面的链接给朋友，他们点击即可直接加入：</p>

            {/* Share link */}
            <div className="bg-primary/10 border-2 border-primary/30 p-4 mb-4">
              <p className="text-xs text-primary font-bold mb-2">分享链接（点击即可加入）</p>
              <p className="text-sm font-bold break-all">{getShareLink()}</p>
            </div>

            {/* Access Code - backup */}
            <div className="bg-muted border-2 border-outline p-4 mb-3">
              <p className="text-xs text-muted-foreground font-bold mb-1">活动口令（备用，链接打不开时使用）</p>
              <p className="text-xl font-bold tracking-[0.2em] font-mono">{createdAccessCode}</p>
            </div>

            {/* Admin Passphrase */}
            <div className="bg-muted border-2 border-outline p-4 mb-4">
              <p className="text-xs text-muted-foreground font-bold mb-1">管理口令（仅组织者使用，请勿泄露）</p>
              <p className="text-xl font-bold tracking-[0.2em] text-primary font-mono">{createdPassphrase}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleCopyShare}
                className="bg-accent-blue text-white border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2 justify-center min-h-[44px]"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                {copiedShare ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                {copiedShare ? '已复制' : '复制分享信息'}
              </button>
              <button
                onClick={handleCopyPassphrase}
                className="bg-card border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:bg-muted transition-colors cursor-pointer flex items-center gap-2 justify-center min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                {copied ? '已复制' : '复制管理口令'}
              </button>
              <Link
                href={`/activity?id=${createdActivityId}`}
                className="bg-primary text-[#0A0A0A] border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:bg-primary/90 transition-colors text-center flex items-center justify-center min-h-[44px]"
              >
                进入活动
              </Link>
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="text-muted-foreground px-4 py-2.5 text-sm hover:text-foreground transition-colors cursor-pointer min-h-[44px] flex items-center"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card border-2 border-outline w-full sm:max-w-md p-5 sm:p-8 relative" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-blue p-2 border-2 border-outline" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">加入活动</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">输入组织者分享的活动口令：</p>
            <div>
              <label className="block text-sm font-bold mb-1">活动口令</label>
              <input
                className="w-full border-2 border-outline bg-muted px-4 py-3 text-lg font-bold font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-accent-blue/30 min-h-[44px]"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                placeholder="输入活动口令"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              {joinError && <p className="text-sm text-error mt-2 font-bold">{joinError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="flex-1 bg-accent-blue text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                加入活动
              </button>
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer min-h-[44px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
