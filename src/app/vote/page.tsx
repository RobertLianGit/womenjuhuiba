'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer } from '@/lib/party';
import { Plus, Vote, BarChart3, Trophy, CheckCircle2 } from 'lucide-react';

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

const COLORS = ['bg-primary', 'bg-accent-blue', 'bg-success', 'bg-warning', 'bg-purple-500', 'bg-orange-500'];

function VotePageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [activityPassphrase, setActivityPassphrase] = useState<string | null>(null);
  const isCreator = isOrganizer(activityId, activityPassphrase);
  const [tab, setTab] = useState<'submit' | 'vote' | 'result'>('submit');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [proposalForm, setProposalForm] = useState({ location: '', activity_type: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([propRes, voteRes, actRes]) => {
      setProposals(propRes.data || []);
      setVoteRecords(voteRes.data || []);
      if (actRes.data) setActivityPassphrase(actRes.data.passphrase);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  const userId = getUserId();

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
      setSelectedIds([]);
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
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8">
          {(['submit', 'vote', 'result'] as const).map(t => {
            const labels = { submit: '提交方案', vote: '投票', result: '结果' };
            const icons = { submit: Plus, vote: Vote, result: BarChart3 };
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

        {/* Submit Tab */}
        {tab === 'submit' && (
          <div className="space-y-6">
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

        {/* Vote Tab */}
        {tab === 'vote' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {proposals.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedIds(prev =>
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      );
                    }}
                    className={`w-full text-left bg-card border-2 border-outline p-4 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary-container' : 'hover:bg-muted'}`}
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">已选 {selectedIds.length} 项</span>
              <button
                onClick={handleVote}
                disabled={selectedIds.length === 0}
                className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
              >
                提交投票
              </button>
            </div>
          </div>
        )}

        {/* Result Tab */}
        {tab === 'result' && (
          <div className="space-y-6">
            <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-warning" />投票结果</h3>
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
                    const res = await fetch(`/api/activities/${activityId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'plan' }),
                    });
                    if (res.ok) window.location.href = `/plan?activity_id=${activityId}`;
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
