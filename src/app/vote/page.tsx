'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, isActivityAccessed, markActivityAccessed } from '@/lib/party';
import { Vote, Plus, Clock, MapPin, Tag, ChevronDown, ChevronUp, X, CheckCircle2, Loader2 } from 'lucide-react';

interface Proposal {
  id: string;
  activity_id: string;
  user_id: string;
  user_name: string;
  location: string | null;
  proposed_time: string | null;
  category: string;
  created_at: string;
}

interface VoteRecord {
  id: string;
  activity_id: string;
  user_id: string;
  user_name: string;
  proposal_id: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Clock }> = {
  location: { label: '去哪里', icon: MapPin },
  time: { label: '什么时间', icon: Clock },
  activity_type: { label: '做什么', icon: Tag },
};

export default function VotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <VotePageContent />
    </Suspense>
  );
}

function VotePageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const isCreator = isOrganizer(activityId);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [voterNames, setVoterNames] = useState<Record<string, string[]>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addCategory, setAddCategory] = useState('location');

  // Add proposal form
  const [newProposal, setNewProposal] = useState({ location: '', proposed_time: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Vote states
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const userId = getUserId();

  useEffect(() => {
    if (!activityId) { setAccessDenied(true); setLoading(false); return; }
    if (!isActivityAccessed(activityId) && !isOrganizer(activityId)) { setAccessDenied(true); setLoading(false); return; }
    if (isOrganizer(activityId)) markActivityAccessed(activityId);
    loadData();
  }, [activityId]);

  const loadData = async () => {
    try {
      const [propRes, voteRes] = await Promise.all([
        fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
      ]);
      setProposals(propRes.data || []);
      setVoteRecords(voteRes.data || []);
      setVoteCounts(voteRes.vote_counts || {});
      setVoterNames(voteRes.voter_names || {});

      // Determine my votes
      const myVoted = new Set<string>();
      for (const record of voteRes.data || []) {
        if (record.user_id === userId && record.proposal_id) {
          myVoted.add(record.proposal_id);
        }
      }
      setMyVotes(myVoted);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: string) => {
    setVotingProposalId(proposalId);
    setVoteErrors(prev => { const n = { ...prev }; delete n[proposalId]; return n; });

    try {
      const userName = getUserName() || '匿名';
      const res = await fetch('/api/vote-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          user_id: userId,
          user_name: userName,
          proposal_id: proposalId,
        }),
      });
      const result = await res.json();

      if (result.error) {
        setVoteErrors(prev => ({ ...prev, [proposalId]: result.error }));
        return;
      }

      // Toggle vote state
      if (result.data?.action === 'unvoted') {
        setMyVotes(prev => { const n = new Set(prev); n.delete(proposalId); return n; });
        setVoteCounts(prev => ({ ...prev, [proposalId]: Math.max(0, (prev[proposalId] || 1) - 1) }));
        setSuccessMessage('已取消投票');
      } else {
        setMyVotes(prev => new Set(prev).add(proposalId));
        setVoteCounts(prev => ({ ...prev, [proposalId]: (prev[proposalId] || 0) + 1 }));
        setSuccessMessage('投票成功！');
      }
      setTimeout(() => setSuccessMessage(''), 2000);

      // Reload to get accurate counts
      loadData();
    } catch {
      setVoteErrors(prev => ({ ...prev, [proposalId]: '网络错误，请重试' }));
    } finally {
      setVotingProposalId(null);
    }
  };

  const handleAddProposal = async () => {
    setAddSubmitting(true);
    setAddError('');
    const userName = getUserName() || '匿名';
    const body: Record<string, string> = {
      activity_id: activityId,
      user_id: userId,
      user_name: userName,
      category: addCategory,
    };
    if (newProposal.location) body.location = newProposal.location;
    if (newProposal.proposed_time) body.proposed_time = newProposal.proposed_time;

    // Auto-generate a name
    body.proposal_name = `${newProposal.proposed_time || ''}${newProposal.location ? ' · ' + newProposal.location : ''}`;

    try {
      const res = await fetch('/api/vote-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result.error) {
        setAddError(result.error);
      } else {
        setShowAddForm(false);
        setNewProposal({ location: '', proposed_time: '' });
        loadData();
        setSuccessMessage('方案已添加');
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch {
      setAddError('网络错误，请重试');
    } finally {
      setAddSubmitting(false);
    }
  };

  // Group proposals by category
  const groupedProposals = proposals.reduce<Record<string, Proposal[]>>((acc, p) => {
    const cat = p.category || 'location';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const categoryOrder = ['time', 'location', 'activity_type'];
  const orderedCategories = categoryOrder.filter(c => groupedProposals[c]).concat(
    Object.keys(groupedProposals).filter(c => !categoryOrder.includes(c))
  );

  if (accessDenied) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-lg font-bold">需要先进入活动</p>
      <p className="text-muted-foreground text-sm">请通过活动链接或口令先进入活动页面</p>
      <a href={`/activity?id=${activityId}`} className="mt-2 px-6 py-3 bg-primary text-[#0A0A0A] font-bold border-2 border-[#0A0A0A] shadow-[3px_3px_0_#0A0A0A] hover:shadow-[1px_1px_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">进入活动</a>
    </div>
  );
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">投票</h1>
          <div className="flex items-center gap-2">
            {isCreator && <span className="bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">组织者</span>}
            <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
              返回活动
            </Link>
          </div>
        </div>

        {/* Success Toast */}
        {successMessage && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Add Proposal Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="mb-6 w-full bg-card border-2 border-outline p-4 font-bold hover:bg-muted transition-colors cursor-pointer flex items-center justify-center gap-2"
          style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
        >
          <Plus className="w-5 h-5" />
          {showAddForm ? '收起' : '添加新选项'}
        </button>

        {/* Add Proposal Form */}
        {showAddForm && (
          <div className="mb-6 bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h3 className="font-bold mb-4">添加投票选项</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">类别</label>
                <div className="flex gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setAddCategory(key)}
                      className={`px-3 py-2 border-2 border-outline font-bold text-sm cursor-pointer transition-all ${addCategory === key ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(addCategory === 'location' || addCategory === 'activity_type') && (
                <div>
                  <label className="block text-sm font-bold mb-1">{addCategory === 'location' ? '地点' : '活动'}</label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={newProposal.location}
                    onChange={e => setNewProposal(p => ({ ...p, location: e.target.value }))}
                    placeholder={addCategory === 'location' ? '如：海底捞、KTV' : '如：桌游、烧烤'}
                  />
                </div>
              )}
              {(addCategory === 'time' || addCategory === 'location' || addCategory === 'activity_type') && (
                <div>
                  <label className="block text-sm font-bold mb-1">时间</label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={newProposal.proposed_time}
                    onChange={e => setNewProposal(p => ({ ...p, proposed_time: e.target.value }))}
                    placeholder="如：周六18:00、周日下午"
                  />
                </div>
              )}
            </div>
            {addError && <p className="text-error text-sm font-bold mt-3">⚠ {addError}</p>}
            <button
              onClick={handleAddProposal}
              disabled={addSubmitting || (!newProposal.location && !newProposal.proposed_time)}
              className="mt-4 bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {addSubmitting ? '添加中...' : '添加选项'}
            </button>
          </div>
        )}

        {/* Proposals by Category */}
        {orderedCategories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Vote className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">还没有投票选项</p>
            <p className="text-sm mt-1">点击上方添加选项开始投票</p>
          </div>
        )}

        {orderedCategories.map(category => {
          const catInfo = CATEGORY_LABELS[category] || { label: category, icon: Tag };
          const CatIcon = catInfo.icon;
          const catProposals = groupedProposals[category].sort((a, b) =>
            (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0)
          );

          return (
            <div key={category} className="mb-6">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <CatIcon className="w-5 h-5 text-primary" />
                {catInfo.label}
              </h2>
              <div className="space-y-3">
                {catProposals.map(proposal => {
                  const count = voteCounts[proposal.id] || 0;
                  const isVoted = myVotes.has(proposal.id);
                  const isVoting = votingProposalId === proposal.id;
                  const voteError = voteErrors[proposal.id];
                  const voters = voterNames[proposal.id] || [];

                  return (
                    <div
                      key={proposal.id}
                      className={`bg-card border-2 border-outline p-4 transition-all cursor-pointer ${isVoted ? 'ring-2 ring-primary' : ''}`}
                      style={{ boxShadow: isVoted ? '4px 4px 0 #FF4DB8' : '4px 4px 0 #0A0A0A' }}
                      onClick={() => handleVote(proposal.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-base">
                            {proposal.proposed_time && <span>{proposal.proposed_time}</span>}
                            {proposal.proposed_time && proposal.location && <span className="mx-1">·</span>}
                            {proposal.location && <span>{proposal.location}</span>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            由 {proposal.user_name} 提出
                          </div>
                          {voters.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              投票人: {voters.join('、')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-xs text-muted-foreground">票</div>
                          </div>
                          {isVoting ? (
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          ) : isVoted ? (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-[#0A0A0A] font-bold text-sm">✓</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 border-2 border-outline rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      {voteError && (
                        <p className="text-error text-sm font-bold mt-2" onClick={e => e.stopPropagation()}>⚠ {voteError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
