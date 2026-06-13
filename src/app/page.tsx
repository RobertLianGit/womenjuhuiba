'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, setUserName, isOrganizer, setPassphrase, setAccessCode, getAccessedActivities, getCreatedActivities, markActivityAccessed, addCreatedActivity } from '@/lib/party';
import { Plus, Calendar, PartyPopper, Crown, Users, KeyRound, Copy, Check, Lock } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  creator_id: string;
  status: string;
  created_at: string;
  passphrase: string;
  access_code: string;
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

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createdPassphrase, setCreatedPassphrase] = useState('');
  const [createdActivityId, setCreatedActivityId] = useState('');
  const [createdAccessCode, setCreatedAccessCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', rough_time: '', creator_name: getUserName() || '', access_code: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'joined'>('mine');

  const fetchMyActivities = async () => {
    setLoading(true);
    const all: Activity[] = [];

    // 1. 获取我发起的活动（通过localStorage中的ID列表批量查询）
    const createdIds = getCreatedActivities();
    if (createdIds.length > 0) {
      try {
        const res = await fetch(`/api/activities?ids=${createdIds.join(',')}`);
        const data = await res.json();
        if (data.data) all.push(...data.data);
      } catch { /* ignore */ }
    }

    // 2. 获取我参与的活动（通过已验证的活动ID批量查询）
    const accessedIds = getAccessedActivities().filter(id => !createdIds.includes(id));
    if (accessedIds.length > 0) {
      try {
        const res = await fetch(`/api/activities?ids=${accessedIds.join(',')}`);
        const data = await res.json();
        if (data.data) all.push(...data.data);
      } catch { /* ignore */ }
    }

    setActivities(all);
    setLoading(false);
  };

  useEffect(() => { fetchMyActivities(); }, []);

  const accessedIds = getAccessedActivities();
  const myActivities = activities.filter(a => isOrganizer(a.id));
  const joinedActivities = activities.filter(a => !isOrganizer(a.id) && accessedIds.includes(a.id));
  const displayedActivities = tab === 'mine' ? myActivities : joinedActivities;

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.rough_time || !form.creator_name || !form.access_code) return;
    const uid = getUserId();
    setUserName(form.creator_name);
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, creator_id: uid, creator_name: form.creator_name }),
    });
    const result = await res.json();
    if (result.data) {
      if (result.data.passphrase) {
        setPassphrase(result.data.id, result.data.passphrase);
      }
      if (form.access_code) {
        setAccessCode(result.data.id, form.access_code);
      }
      // Creator auto-accesses their own activity
      markActivityAccessed(result.data.id);
      addCreatedActivity(result.data.id);
      setActivities(prev => [result.data, ...prev]);
      setShowCreateModal(false);
      setForm({ title: '', description: '', rough_time: '', creator_name: form.creator_name, access_code: '' });
      setCreatedPassphrase(result.data.passphrase);
      setCreatedActivityId(result.data.id);
      setCreatedAccessCode(form.access_code);
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

  const handleCopyPassphrase = async () => {
    const act = activities.find(a => a.id === createdActivityId);
    const text = `🎉 聚会活动：${act?.title || ''}\n👤 发起人：${act?.creator_name || ''}\n🔑 活动口令：${createdAccessCode}\n\n📎 活动链接：${window.location.origin}/activity?id=${createdActivityId}\n\n🔑 管理口令（仅组织者使用）：${createdPassphrase}\n\n请妥善保管管理口令，用于管理活动（状态流转、添加分段、记账等）`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShare = async () => {
    const act = activities.find(a => a.id === createdActivityId);
    const text = `🎉 聚会活动：${act?.title || ''}\n👤 发起人：${act?.creator_name || ''}\n🔑 活动口令：${createdAccessCode}\n\n📎 活动链接：${window.location.origin}/activity?id=${createdActivityId}\n\n用活动口令即可加入，快来参与吧！`;
    await navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar activePage="home" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="mb-8">
          <div className="bg-card border-2 border-outline p-10 md:p-14 relative" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="absolute top-4 right-6 w-16 h-16 bg-primary opacity-20 -z-0" />
            <div className="absolute bottom-3 right-20 w-10 h-10 bg-accent-blue opacity-15 -z-0" />
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3">我们聚会吧<span className="text-base font-normal align-super ml-1 text-secondary">Beta</span></h1>
              <p className="text-xl md:text-2xl font-medium text-muted-foreground mb-8">从创建到结算，一站式聚会工具</p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-primary-foreground border-2 border-outline px-8 py-4 text-xl font-bold tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_#0A0A0A] transition-all cursor-pointer"
                  style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-3">
                    <Plus className="w-6 h-6" />创建活动
                  </span>
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-accent-blue text-white border-2 border-outline px-8 py-4 text-xl font-bold tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_#0A0A0A] transition-all cursor-pointer"
                  style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-3">
                    <Lock className="w-6 h-6" />通过口令加入
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-8">
          <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="text-lg font-bold mb-4">怎么用？</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-sm">
              <div className="bg-primary text-primary-foreground border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">1</div>
                <div className="font-medium">创建活动</div>
                <div className="text-xs opacity-80 mt-1">设名称和时间</div>
              </div>
              <div className="bg-accent-blue text-white border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">2</div>
                <div className="font-medium">收集意愿</div>
                <div className="text-xs opacity-80 mt-1">大家想去哪</div>
              </div>
              <div className="bg-success text-white border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">3</div>
                <div className="font-medium">投票决定</div>
                <div className="text-xs opacity-80 mt-1">少数服从多数</div>
              </div>
              <div className="bg-warning text-primary-foreground border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">4</div>
                <div className="font-medium">确认方案</div>
                <div className="text-xs opacity-80 mt-1">分段和时间</div>
              </div>
              <div className="bg-accent-blue text-white border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">5</div>
                <div className="font-medium">报名参加</div>
                <div className="text-xs opacity-80 mt-1">选段填人</div>
              </div>
              <div className="bg-primary text-primary-foreground border-2 border-outline p-3">
                <div className="font-bold text-lg mb-1">6</div>
                <div className="font-medium">记账结算</div>
                <div className="text-xs opacity-80 mt-1">AA不伤感情</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">无需登录，输入昵称即可参与。创建活动时设置活动口令，分享给朋友即可加入。组织者另有管理口令，用于控制活动阶段和管理操作。</p>
          </div>
        </section>

        {/* Tabs */}
        <section>
          <div className="flex items-center gap-1 mb-6 border-2 border-outline w-fit" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <button
              onClick={() => setTab('mine')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer ${tab === 'mine' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            >
              <Crown className="w-4 h-4" />我发起的
              {myActivities.length > 0 && <span className="ml-1 bg-black/10 px-1.5 py-0.5 text-xs">{myActivities.length}</span>}
            </button>
            <button
              onClick={() => setTab('joined')}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer ${tab === 'joined' ? 'bg-accent-blue text-white' : 'bg-card hover:bg-muted'}`}
            >
              <Users className="w-4 h-4" />我参与的
              {joinedActivities.length > 0 && <span className="ml-1 bg-black/10 px-1.5 py-0.5 text-xs">{joinedActivities.length}</span>}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : displayedActivities.length === 0 ? (
            <div className="bg-card border-2 border-outline p-12 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <PartyPopper className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
              <p className="text-xl font-bold mb-2">{tab === 'mine' ? '还没有发起活动' : '还没有参与活动'}</p>
              <p className="text-muted-foreground mb-6">
                {tab === 'mine' ? '点击上方按钮，创建你的第一个聚会活动吧' : '通过朋友分享的活动口令加入聚会'}
              </p>
              {tab === 'joined' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-accent-blue text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer"
                  style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                >
                  <span className="flex items-center gap-2"><Lock className="w-4 h-4" />输入口令加入</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayedActivities.map((act) => {
                const st = STATUS_MAP[act.status] || STATUS_MAP.collecting;
                const isMine = isOrganizer(act.id);
                return (
                  <Link
                    key={act.id}
                    href={`/activity?id=${act.id}`}
                    className="bg-card border-2 border-outline p-5 block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{act.title}</h3>
                      <span className={`inline-block ${st.bg} border-2 border-outline px-2.5 py-1 text-xs font-bold ${st.rotate} shrink-0 ml-3`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{act.rough_time}</span>
                      {isMine && (
                        <span className="flex items-center gap-1 text-primary font-semibold"><Crown className="w-3.5 h-3.5" />组织者</span>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t-2 border-outline/15 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">由 {act.creator_name} 创建于 {new Date(act.created_at).toLocaleDateString('zh-CN')}</span>
                      <Link
                        href={`/dashboard?activity_id=${act.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs font-bold text-accent-blue border-2 border-outline px-2 py-1 hover:bg-accent-blue hover:text-white transition-colors"
                      >
                        看板
                      </Link>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t-2 border-outline/20 text-center text-xs text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-4">
              <a href="/privacy" className="underline hover:text-foreground transition-colors">隐私保护声明</a>
              <a href="/admin" className="underline hover:text-foreground transition-colors">管理后台</a>
            </div>
            <div className="mt-3">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                京ICP备2026027076号
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-card border-2 border-outline w-full max-w-lg p-4 sm:p-8 relative my-4 sm:my-0 max-h-[calc(100vh-2rem)] sm:max-h-none overflow-y-auto sm:overflow-visible" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">创建新活动</h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">你的昵称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.creator_name}
                  onChange={e => setForm(f => ({ ...f, creator_name: e.target.value }))}
                  placeholder="输入你的昵称，方便大家识别"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动名称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="如：周末烧烤派对"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动描述 <span className="text-error">*</span></label>
                <textarea
                  className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="简单描述一下聚会的内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">大致时间 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.rough_time}
                  onChange={e => setForm(f => ({ ...f, rough_time: e.target.value }))}
                  placeholder="如：周末、下周六、12月底"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动口令 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.access_code}
                  onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))}
                  placeholder="设置一个口令，朋友凭此口令加入活动"
                />
                <p className="text-xs text-muted-foreground mt-1">参与者需要输入此口令才能查看和加入活动</p>
              </div>
              <div className="bg-muted border-2 border-outline p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-bold">管理口令自动生成</p>
                  <p className="text-xs text-muted-foreground mt-1">创建后会自动生成6位管理口令，凭此可管理活动状态、添加分段、记账等。活动口令是参与者加入用的，管理口令是组织者管理用的，请注意区分。</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-8">
              <button
                onClick={handleCreate}
                disabled={!form.title || !form.description || !form.rough_time || !form.creator_name || !form.access_code}
                className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                创建活动
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setForm({ title: '', description: '', rough_time: '', creator_name: form.creator_name, access_code: '' }); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passphrase Modal - after creation */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-card border-2 border-outline w-full max-w-lg p-4 sm:p-8 relative my-4 sm:my-0 max-h-[calc(100vh-2rem)] sm:max-h-none overflow-y-auto sm:overflow-visible" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="bg-primary p-2 border-2 border-outline" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">活动已创建</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">请妥善保管以下口令，分享给朋友时记得带上活动口令：</p>

            {/* Access Code - for sharing */}
            <div className="bg-accent-blue/10 border-2 border-accent-blue/30 p-3 sm:p-4 mb-3 sm:mb-4">
              <p className="text-xs text-accent-blue font-bold mb-1">活动口令（分享给参与者）</p>
              <p className="text-xl sm:text-2xl font-bold tracking-[0.2em] text-accent-blue font-mono">{createdAccessCode}</p>
              <p className="text-xs text-muted-foreground mt-1">参与者凭此口令加入活动</p>
            </div>

            {/* Admin Passphrase - for organizer only */}
            <div className="bg-muted border-2 border-outline p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-xs text-muted-foreground font-bold mb-1">管理口令（仅组织者使用）</p>
              <p className="text-xl sm:text-2xl font-bold tracking-[0.2em] text-primary font-mono">{createdPassphrase}</p>
              <p className="text-xs text-muted-foreground mt-1">凭此口令可管理活动所有环节，请勿泄露</p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <button
                onClick={handleCopyShare}
                className="bg-accent-blue text-white border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2 justify-center"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                {copiedShare ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                {copiedShare ? '已复制' : '复制分享信息'}
              </button>
              <button
                onClick={handleCopyPassphrase}
                className="bg-card border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:bg-muted transition-colors cursor-pointer flex items-center gap-2 justify-center"
              >
                {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                {copied ? '已复制' : '复制管理口令'}
              </button>
              <Link
                href={`/activity?id=${createdActivityId}`}
                className="bg-primary text-primary-foreground border-2 border-outline px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-sm sm:text-base hover:bg-primary/90 transition-colors text-center"
              >
                进入活动
              </Link>
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="text-muted-foreground px-4 py-2.5 text-sm hover:text-foreground transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal - enter access_code */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-card border-2 border-outline w-full max-w-md p-4 sm:p-8 relative my-4 sm:my-0" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="bg-accent-blue p-2 border-2 border-outline" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">加入活动</h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">输入组织者分享的活动口令，即可加入活动：</p>
            <div>
              <label className="block text-sm font-bold mb-1">活动口令</label>
              <input
                className="w-full border-2 border-outline bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-base sm:text-lg font-bold font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                placeholder="输入活动口令"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              {joinError && <p className="text-sm text-error mt-2 font-bold">{joinError}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="bg-accent-blue text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                加入活动
              </button>
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer"
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
