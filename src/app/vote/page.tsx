'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, getPassphrase, setPassphrase } from '@/lib/party';
import { Plus, Vote, BarChart3, Trophy, CheckCircle2, Lightbulb, Settings2, RefreshCw, KeyRound } from 'lucide-react';

interface Proposal {
  id: string;
  user_id: string;
  user_name: string;
  location: string;
  activity_type: string | null;
  created_at: string;
}

interface VoteRecord {
  id: string;
  user_id: string;
  user_name: string;
  voted_proposal_ids: string;
  created_at: string;
}

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  estimated_people: number;
}

const COLORS = ['bg-primary', 'bg-accent-blue', 'bg-success', 'bg-warning', 'bg-purple-500', 'bg-orange-500'];

function VotePageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [activityPassphrase, setActivityPassphrase] = useState<string | null>(null);
  const isCreator = isOrganizer(activityId, activityPassphrase);
  const [tab, setTab] = useState<'vote' | 'submit' | 'result'>('vote');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [proposalForm, setProposalForm] = useState({ location: '', activity_type: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoteSuccess, setShowVoteSuccess] = useState(false);
  const [showProposalSuccess, setShowProposalSuccess] = useState(false);

  // Vote rules
  const [voteMode, setVoteMode] = useState<'single' | 'multi'>('multi');
  const [maxSelections, setMaxSelections] = useState(3);
  const [showRulesSetup, setShowRulesSetup] = useState(false);

  const userId = getUserId();

  const fetchData = async () => {
    if (!activityId) return;
    const [propRes, voteRes, actRes, intRes] = await Promise.all([
      fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
      fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
    ]);
    setProposals(propRes.data || []);
    setVoteRecords(voteRes.data || []);
    setIntentions(intRes.data || []);
    if (actRes.data) {
      setActivityPassphrase(actRes.data.passphrase);
      if (actRes.data.vote_type) {
        setVoteMode(actRes.data.vote_type as 'single' | 'multi');
      }
      if (actRes.data.max_votes) {
        setMaxSelections(actRes.data.max_votes);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  // Auto-poll every 10 seconds for real-time updates
  useEffect(() => {
    if (!activityId) return;
    const interval = setInterval(() => {
      Promise.all([
        fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
      ]).then(([propRes, voteRes, intRes]) => {
        setProposals(propRes.data || []);
        setVoteRecords(voteRes.data || []);
        setIntentions(intRes.data || []);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [activityId]);

  // Check if user already voted
  const existingVote = voteRecords.find(v => v.user_id === userId);
  const alreadyVoted = !!existingVote;

  // Auto-import intentions as proposals on first load
  const intentionsNotInProposals = intentions.filter(i =>
    i.wants && !proposals.some(p => p.location === i.wants)
  );

  const handleImportIntentions = async () => {
    let added = 0;
    for (const intention of intentionsNotInProposals) {
      if (!intention.wants) continue;
      const res = await fetch('/api/vote-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          user_id: intention.user_id,
          user_name: intention.user_name,
          location: intention.wants,
          activity_type: null,
        }),
      });
      const result = await res.json();
      if (result.data) added++;
    }
    if (added > 0) {
      // Refresh proposals
      const propRes = await fetch(`/api/vote-proposals?activity_id=${activityId}`);
      const propData = await propRes.json();
      setProposals(propData.data || []);
    }
  };

  const handleAddProposal = async () => {
    if (!proposalForm.location) return;
    const userName = getUserName() || '匿名';
    const res = await fetch('/api/vote-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        user_id: userId,
        user_name: userName,
        location: proposalForm.location,
        activity_type: proposalForm.activity_type || null,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setProposals(prev => [...prev, result.data]);
      setProposalForm({ location: '', activity_type: '' });
      setShowProposalSuccess(true);
      setTimeout(() => setShowProposalSuccess(false), 3000);
      // Switch back to vote tab
      setTab('vote');
    }
  };

  const handleVote = async () => {
    if (selectedIds.length === 0) return;
    const userName = getUserName() || '匿名';
    const res = await fetch('/api/vote-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        user_id: userId,
        user_name: userName,
        voted_proposal_ids: JSON.stringify(selectedIds),
      }),
    });
    const result = await res.json();
    if (result.data) {
      setVoteRecords(prev => {
        const idx = prev.findIndex(v => v.user_id === userId);
        if (idx >= 0) { const arr = [...prev]; arr[idx] = result.data; return arr; }
        return [...prev, result.data];
      });
      setShowVoteSuccess(true);
      setTimeout(() => setShowVoteSuccess(false), 3000);
    }
  };

  // Calculate vote counts
  const voteCounts: Record<string, number> = {};
  proposals.forEach(p => { voteCounts[p.id] = 0; });
  voteRecords.forEach(v => {
    try {
      const ids: string[] = JSON.parse(v.voted_proposal_ids);
      ids.forEach(id => { voteCounts[id] = (voteCounts[id] || 0) + 1; });
    } catch { /* skip */ }
  });

  const maxVotes = Math.max(...Object.values(voteCounts), 1);
  const sortedProposals = [...proposals].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));

  // Selection limits
  const maxAllowed = voteMode === 'single' ? 1 : maxSelections;
  const atLimit = selectedIds.length >= maxAllowed;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">投票去哪</h1>
            {isCreator && <span className="bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">组织者</span>}
          </div>
          <div className="flex items-center gap-3">
            {!isCreator && (
              <button
                onClick={() => {
                  const input = prompt('请输入管理口令：');
                  if (!input?.trim()) return;
                  fetch(`/api/activities/${activityId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'verify', passphrase: input.trim() }),
                  }).then(r => r.json()).then(result => {
                    if (result.error) { alert('口令验证失败'); }
                    else { setPassphrase(activityId, input.trim()); window.location.reload(); }
                  });
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground border-2 border-outline px-2 py-1 hover:bg-muted cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />验证口令
              </button>
            )}
            <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
              返回活动
            </Link>
          </div>
        </div>

        {/* Vote Rules Info */}
        <div className="bg-muted border-2 border-outline p-4 mb-6 flex items-center justify-between" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <span className="font-bold text-sm">
                {voteMode === 'single' ? '单选投票' : `多选投票（最多选 ${maxSelections} 项）`}
              </span>
              <span className="text-sm text-muted-foreground ml-3">{proposals.length} 个方案 · {voteRecords.length} 人已投票</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <button
                onClick={() => setShowRulesSetup(!showRulesSetup)}
                className="text-sm font-bold text-primary border-2 border-outline px-3 py-1.5 hover:bg-muted cursor-pointer"
              >
                设置规则
              </button>
            )}
            <button
              onClick={() => fetchData()}
              className="text-sm font-bold border-2 border-outline px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />刷新
            </button>
          </div>
        </div>

        {/* Rules Setup (Organizer only) */}
        {isCreator && showRulesSetup && (
          <div className="bg-card border-2 border-outline p-6 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings2 className="w-5 h-5" />投票规则设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">投票方式</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setVoteMode('single')}
                    className={`px-4 py-2 font-bold border-2 border-outline cursor-pointer ${voteMode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
                  >单选</button>
                  <button
                    onClick={() => setVoteMode('multi')}
                    className={`px-4 py-2 font-bold border-2 border-outline cursor-pointer ${voteMode === 'multi' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
                  >多选</button>
                </div>
              </div>
              {voteMode === 'multi' && (
                <div>
                  <label className="block text-sm font-bold mb-2">最多可选几项</label>
                  <div className="flex items-center gap-3">
                    {[2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setMaxSelections(n)}
                        className={`w-10 h-10 font-bold border-2 border-outline cursor-pointer ${maxSelections === n ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">投票规则在本页面有效，组织者确认方案后进入下一阶段</p>
              <button
                onClick={async () => {
                  if (!activityId) return;
                  const pp = getPassphrase(activityId);
                  const res = await fetch(`/api/activities/${activityId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vote_type: voteMode, max_votes: maxSelections, passphrase: pp }),
                  });
                  if (res.ok) {
                    setShowRulesSetup(false);
                  } else {
                    const data = await res.json();
                    alert(data.error || '保存失败');
                  }
                }}
                className="mt-3 bg-primary text-primary-foreground border-2 border-outline px-5 py-2 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >保存规则</button>
            </div>
          </div>
        )}

        {/* Auto-import intentions hint */}
        {intentionsNotInProposals.length > 0 && proposals.length === 0 && (
          <div className="bg-warning border-2 border-outline p-4 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">有 {intentionsNotInProposals.length} 个意愿尚未加入投票</p>
                <p className="text-xs text-muted-foreground mt-1">大家在意愿收集中提到的想法可以一键导入为投票方案</p>
              </div>
              <button
                onClick={handleImportIntentions}
                className="bg-primary text-primary-foreground border-2 border-outline px-4 py-2 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                一键导入
              </button>
            </div>
          </div>
        )}

        {/* Success Toasts */}
        {showVoteSuccess && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">投票成功！</p>
              <p className="text-sm opacity-90">可切换到「结果」查看实时票数</p>
            </div>
          </div>
        )}
        {showProposalSuccess && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">方案已添加！</p>
              <p className="text-sm opacity-90">已自动回到投票页面</p>
            </div>
          </div>
        )}

        {/* Tab Switcher - vote first */}
        <div className="flex gap-2 mb-8">
          {(['vote', 'submit', 'result'] as const).map(t => {
            const labels = { vote: '投票', submit: '提方案', result: '结果' };
            const icons = { vote: Vote, submit: Plus, result: BarChart3 };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 font-bold border-2 border-outline transition-all cursor-pointer ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
              >
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{labels[t]}</span>
              </button>
            );
          })}
        </div>

        {/* Vote Tab (default) */}
        {tab === 'vote' && (
          <div className="space-y-6">
            {proposals.length === 0 ? (
              <div className="bg-card border-2 border-outline p-8 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-bold mb-2">还没有投票方案</p>
                <p className="text-muted-foreground mb-4">点击「提方案」添加你想去的地方，或导入意愿收集中的想法</p>
                {intentionsNotInProposals.length > 0 && (
                  <button
                    onClick={handleImportIntentions}
                    className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                  >
                    导入 {intentionsNotInProposals.length} 个意愿方案
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {proposals.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    const cannotSelect = !isSelected && atLimit;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (cannotSelect) return;
                          if (isSelected) {
                            setSelectedIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setSelectedIds(prev => [...prev, p.id]);
                          }
                        }}
                        className={`w-full text-left bg-card border-2 border-outline p-4 transition-all ${cannotSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'border-primary' : 'hover:bg-muted'}`}
                        style={{ boxShadow: isSelected ? '4px 4px 0 #FF4DB8' : '3px 3px 0 #0A0A0A' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 border-2 border-outline flex items-center justify-center ${isSelected ? 'bg-primary' : 'bg-card'}`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-lg">{p.location}</span>
                            {p.activity_type && <span className="ml-3 text-muted-foreground">{p.activity_type}</span>}
                          </div>
                          <span className="text-sm font-bold">{voteCounts[p.id] || 0} 票</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* "I have a new idea" entry */}
                <button
                  onClick={() => setTab('submit')}
                  className="w-full bg-card border-2 border-dashed border-outline p-4 text-center hover:bg-muted transition-colors cursor-pointer flex items-center justify-center gap-2 text-muted-foreground"
                >
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-bold">我有其他新想法，去提方案</span>
                </button>

                {/* Vote action */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    已选 {selectedIds.length}/{maxAllowed} 项
                    {alreadyVoted && ' · 你已投过票，再次提交将覆盖'}
                  </span>
                  <button
                    onClick={handleVote}
                    disabled={selectedIds.length === 0}
                    className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                  >
                    {alreadyVoted ? '更新投票' : '提交投票'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {tab === 'submit' && (
          <div className="space-y-6">
            {/* Import from intentions */}
            {intentionsNotInProposals.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning" />从意愿导入</h3>
                <p className="text-sm text-muted-foreground mb-3">以下想法来自意愿收集阶段，点击可快速添加为方案</p>
                <div className="space-y-2">
                  {intentionsNotInProposals.map(i => (
                    <button
                      key={i.id}
                      onClick={async () => {
                        if (!i.wants) return;
                        const res = await fetch('/api/vote-proposals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            activity_id: activityId,
                            user_id: i.user_id,
                            user_name: i.user_name,
                            location: i.wants,
                            activity_type: null,
                          }),
                        });
                        const result = await res.json();
                        if (result.data) {
                          setProposals(prev => [...prev, result.data]);
                        }
                      }}
                      className="w-full text-left bg-muted border-2 border-outline p-3 hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-primary">{i.user_name}</span>
                      <span className="mx-2">想去：</span>
                      <span className="font-medium">{i.wants}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h3 className="text-lg font-bold mb-4">添加新方案</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">地点 <span className="text-error">*</span></label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={proposalForm.location}
                    onChange={e => setProposalForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="如：望京烧烤"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">活动形式</label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={proposalForm.activity_type}
                    onChange={e => setProposalForm(f => ({ ...f, activity_type: e.target.value }))}
                    placeholder="如：户外烧烤、密室逃脱"
                  />
                </div>
              </div>
              <button
                onClick={handleAddProposal}
                disabled={!proposalForm.location}
                className="mt-4 bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
              >
                提交方案
              </button>
            </div>

            {/* Existing proposals */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold">已有方案 ({proposals.length})</h3>
              {proposals.map(p => (
                <div key={p.id} className="bg-card border-2 border-outline p-4" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg">{p.location}</span>
                      {p.activity_type && <span className="ml-3 text-muted-foreground">{p.activity_type}</span>}
                    </div>
                    <span className="text-sm text-muted-foreground">by {p.user_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Tab */}
        {tab === 'result' && (
          <div className="space-y-6">
            <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-warning" />投票结果</h3>
              {sortedProposals.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">暂无投票数据</p>
              ) : (
                <div className="space-y-4">
                  {sortedProposals.map((p, i) => {
                    const count = voteCounts[p.id] || 0;
                    const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold flex items-center gap-2">
                            {i === 0 && <Trophy className="w-4 h-4 text-warning" />}
                            {p.location}
                          </span>
                          <span className="font-bold">{count} 票</span>
                        </div>
                        <div className="bg-muted border-2 border-outline h-8 relative overflow-hidden">
                          <div className={`${COLORS[i % COLORS.length]} h-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Voter details */}
            {voteRecords.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3">投票明细 ({voteRecords.length} 人)</h3>
                <div className="space-y-2">
                  {voteRecords.map(v => {
                    let votedNames: string[] = [];
                    try { votedNames = JSON.parse(v.voted_proposal_ids); } catch { /* skip */ }
                    return (
                      <div key={v.id} className="bg-muted border-2 border-outline p-3 text-sm">
                        <span className="font-bold">{v.user_name}</span>
                        <span className="mx-2">→</span>
                        <span>{votedNames.map(id => proposals.find(p => p.id === id)?.location).filter(Boolean).join('、') || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Organizer: Confirm and advance */}
            {isCreator && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3">组织者操作</h3>
                <p className="text-sm text-muted-foreground mb-4">确认最终方案后进入方案设置阶段，参与者将无法继续投票。</p>
                <button
                  onClick={async () => {
                    if (sortedProposals.length === 0) return;
                    if (!confirm(`确定以「${sortedProposals[0].location}」为最终方案？`)) return;
                    const passphrase = getPassphrase(activityId);
                    const res = await fetch(`/api/activities/${activityId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'plan', passphrase }),
                    });
                    if (res.ok) {
                      window.location.href = `/plan?activity_id=${activityId}`;
                    } else {
                      const result = await res.json();
                      alert(result.error || '操作失败，请重试');
                    }
                  }}
                  className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                >
                  确认方案，进入方案设置
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VotePage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><VotePageContent /></Suspense>;
}
