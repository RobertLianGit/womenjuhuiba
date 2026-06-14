'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, getPassphrase, setPassphrase, isActivityAccessed } from '@/lib/party';
import { Plus, Vote, BarChart3, Trophy, CheckCircle2, Lightbulb, KeyRound, Calendar, MapPin, Clock } from 'lucide-react';

interface Proposal {
  id: string;
  user_id: string;
  user_name: string;
  location: string | null;
  activity_type: string | null;
  proposed_time: string | null;
  category: string;
  vote_count: number;
}

interface VoteRecord {
  id: string;
  user_id: string;
  proposal_id: string;
}

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  wants_time: string | null;
  estimated_people: number;
}

const CATEGORIES = [
  { value: 'time', label: '时间', icon: Clock, color: 'bg-accent-blue text-white' },
  { value: 'location', label: '地点', icon: MapPin, color: 'bg-primary text-[#0A0A0A]' },
  { value: 'activity', label: '活动形式', icon: Lightbulb, color: 'bg-warning text-[#0A0A0A]' },
] as const;

type Category = typeof CATEGORIES[number]['value'];

function VotePageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const isCreator = isOrganizer(activityId);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('time');
  const [form, setForm] = useState({ location: '', activity_type: '', proposed_time: '', category: 'time' as Category });
  const [tab, setTab] = useState<'vote' | 'result'>('vote');
  const [loading, setLoading] = useState(true);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!activityId) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    if (!isActivityAccessed(activityId) && !isOrganizer(activityId)) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
    ]).then(([propRes, voteRes, intRes]) => {
      setProposals(propRes.data || []);
      setVoteRecords(voteRes.data || []);
      setIntentions(intRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  const userId = getUserId();

  const categoryProposals = proposals.filter(p => p.category === activeCategory);

  const votedProposalIds = new Set(voteRecords.filter(v => v.user_id === userId).map(v => v.proposal_id));

  const topProposals = [...categoryProposals].sort((a, b) => b.vote_count - a.vote_count);

  // Intention summaries
  const timePreferences = intentions
    .filter(i => i.wants_time)
    .reduce<Record<string, string[]>>((acc, item) => {
      item.wants_time!.split(/[、,，\s]+/).filter(Boolean).forEach(t => {
        const key = t.trim();
        if (!acc[key]) acc[key] = [];
        if (!acc[key].includes(item.user_name)) acc[key].push(item.user_name);
      });
      return acc;
    }, {});
  const sortedTimePrefs = Object.entries(timePreferences).sort((a, b) => b[1].length - a[1].length);

  const locationPreferences = intentions
    .filter(i => i.wants)
    .reduce<Record<string, string[]>>((acc, item) => {
      item.wants!.split(/[、,，\s]+/).filter(Boolean).forEach(l => {
        const key = l.trim();
        if (!acc[key]) acc[key] = [];
        if (!acc[key].includes(item.user_name)) acc[key].push(item.user_name);
      });
      return acc;
    }, {});
  const sortedLocationPrefs = Object.entries(locationPreferences).sort((a, b) => b[1].length - a[1].length);

  const handleAddProposal = async () => {
    const cat = form.category;
    if (cat === 'time' && !form.proposed_time) return;
    if (cat === 'location' && !form.location) return;
    if (cat === 'activity' && !form.activity_type) return;

    const res = await fetch('/api/vote-proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        user_id: userId,
        user_name: getUserName(),
        location: cat === 'location' ? form.location : null,
        activity_type: cat === 'activity' ? form.activity_type : null,
        proposed_time: cat === 'time' ? form.proposed_time : null,
        category: cat,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setProposals(prev => [...prev, result.data]);
      setForm({ location: '', activity_type: '', proposed_time: '', category: cat });
    }
  };

  const handleImportFromIntentions = async (type: 'time' | 'location') => {
    const prefs = type === 'time' ? sortedTimePrefs : sortedLocationPrefs;
    const topN = prefs.slice(0, 5);
    let added = 0;
    for (const [name, _people] of topN) {
      const alreadyExists = proposals.some(p =>
        p.category === type && (
          (type === 'time' && p.proposed_time === name) ||
          (type === 'location' && p.location === name)
        )
      );
      if (alreadyExists) continue;
      const res = await fetch('/api/vote-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          user_id: userId,
          user_name: getUserName(),
          location: type === 'location' ? name : null,
          activity_type: null,
          proposed_time: type === 'time' ? name : null,
          category: type,
        }),
      });
      const result = await res.json();
      if (result.data) {
        setProposals(prev => [...prev, result.data]);
        added++;
      }
    }
    if (added > 0) {
      setActiveCategory(type);
      setShowSubmitSuccess(true);
      setTimeout(() => setShowSubmitSuccess(false), 2000);
    }
  };

  const handleVote = async (proposalId: string) => {
    const existing = voteRecords.find(v => v.user_id === userId && v.proposal_id === proposalId);
    if (existing) {
      await fetch(`/api/vote-records?id=${existing.id}`, { method: 'DELETE' });
      setVoteRecords(prev => prev.filter(v => v.id !== existing.id));
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, vote_count: p.vote_count - 1 } : p));
    } else {
      const res = await fetch('/api/vote-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: activityId, user_id: userId, proposal_id: proposalId }),
      });
      const result = await res.json();
      if (result.data) {
        setVoteRecords(prev => [...prev, result.data]);
        setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, vote_count: p.vote_count + 1 } : p));
      }
    }
  };

  if (accessDenied) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
    <p className="text-lg font-bold">请先进入活动</p>
    <a href={`/activity?id=${activityId}${searchParams.get('token') ? '&token=' + searchParams.get('token') : ''}`} className="bg-primary text-[#0A0A0A] font-bold border-2 border-[#0A0A0A] px-6 py-3 shadow-[3px_3px_0_0_#0A0A0A]">进入活动</a>
  </div>;
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

        {/* Intention Summary - Quick Reference */}
        {(sortedTimePrefs.length > 0 || sortedLocationPrefs.length > 0) && (
          <div className="bg-card border-2 border-outline p-4 mb-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-warning" />意愿摘要</h3>
            <div className="flex flex-wrap gap-2">
              {sortedTimePrefs.slice(0, 3).map(([time, people]) => (
                <span key={time} className="bg-accent-blue/10 border-2 border-outline px-2 py-1 text-xs font-medium">
                  🕐 {time} ({people.length}人)
                </span>
              ))}
              {sortedLocationPrefs.slice(0, 3).map(([loc, people]) => (
                <span key={loc} className="bg-primary/10 border-2 border-outline px-2 py-1 text-xs font-medium">
                  📍 {loc} ({people.length}人)
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              {sortedTimePrefs.length > 0 && (
                <button
                  onClick={() => handleImportFromIntentions('time')}
                  className="bg-accent-blue text-white border-2 border-outline px-3 py-1.5 text-xs font-bold hover:bg-accent-blue/80 cursor-pointer"
                >
                  导入热门时间
                </button>
              )}
              {sortedLocationPrefs.length > 0 && (
                <button
                  onClick={() => handleImportFromIntentions('location')}
                  className="bg-primary text-[#0A0A0A] border-2 border-outline px-3 py-1.5 text-xs font-bold hover:bg-primary/80 cursor-pointer"
                >
                  导入热门地点
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-5">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = proposals.filter(p => p.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-1 border-2 border-outline p-2.5 font-bold text-center transition-all cursor-pointer text-sm ${
                  activeCategory === cat.value ? cat.color : 'bg-card hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {cat.label}
                {count > 0 && <span className="ml-1 text-xs">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('vote')}
            className={`px-4 py-2 font-bold border-2 border-outline transition-all cursor-pointer text-sm ${tab === 'vote' ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><Vote className="w-4 h-4" />投票</span>
          </button>
          <button
            onClick={() => setTab('result')}
            className={`px-4 py-2 font-bold border-2 border-outline transition-all cursor-pointer text-sm ${tab === 'result' ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />结果</span>
          </button>
        </div>

        {/* Success Toast */}
        {showSubmitSuccess && (
          <div className="mb-5 bg-success text-white border-2 border-outline p-3 flex items-center gap-2" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm">已导入！</span>
          </div>
        )}

        {/* Vote Tab */}
        {tab === 'vote' && (
          <div className="space-y-5">
            {/* Add Proposal Form */}
            <div className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h3 className="font-bold text-sm mb-3">添加{CATEGORIES.find(c => c.value === activeCategory)?.label}选项</h3>
              <div className="flex gap-2">
                {activeCategory === 'time' && (
                  <input
                    className="flex-1 border-2 border-outline bg-muted px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.proposed_time}
                    onChange={e => setForm(f => ({ ...f, proposed_time: e.target.value }))}
                    placeholder="如：周六下午、7月3号晚"
                    onKeyDown={e => e.key === 'Enter' && handleAddProposal()}
                  />
                )}
                {activeCategory === 'location' && (
                  <input
                    className="flex-1 border-2 border-outline bg-muted px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="如：三里屯、朝阳公园"
                    onKeyDown={e => e.key === 'Enter' && handleAddProposal()}
                  />
                )}
                {activeCategory === 'activity' && (
                  <input
                    className="flex-1 border-2 border-outline bg-muted px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.activity_type}
                    onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}
                    placeholder="如：烧烤、桌游、爬山"
                    onKeyDown={e => e.key === 'Enter' && handleAddProposal()}
                  />
                )}
                <button
                  onClick={handleAddProposal}
                  className="bg-primary text-[#0A0A0A] border-2 border-outline px-4 py-2.5 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer shrink-0"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Proposal List */}
            {categoryProposals.length > 0 ? (
              <div className="space-y-3">
                {categoryProposals.map(p => {
                  const isVoted = votedProposalIds.has(p.id);
                  const label = p.category === 'time' ? p.proposed_time
                    : p.category === 'location' ? p.location
                    : p.activity_type;
                  return (
                    <div
                      key={p.id}
                      className={`bg-card border-2 border-outline p-4 flex items-center justify-between transition-all cursor-pointer ${
                        isVoted ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                      onClick={() => handleVote(p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{label}</span>
                        <span className="text-xs text-muted-foreground">by {p.user_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{p.vote_count} 票</span>
                        <div className={`w-8 h-8 border-2 border-outline flex items-center justify-center font-bold ${
                          isVoted ? 'bg-primary text-[#0A0A0A]' : 'bg-card'
                        }`}>
                          {isVoted ? '✓' : '+'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p className="font-bold">还没有选项</p>
                <p className="text-sm mt-1">添加一些选项让大家来投</p>
              </div>
            )}
          </div>
        )}

        {/* Result Tab */}
        {tab === 'result' && (
          <div className="space-y-5">
            {CATEGORIES.map(cat => {
              const catProps = topProposals.filter(p => p.category === cat.value);
              if (catProps.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.value} className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {cat.label}排名
                  </h3>
                  <div className="space-y-2">
                    {catProps.map((p, idx) => {
                      const label = p.category === 'time' ? p.proposed_time
                        : p.category === 'location' ? p.location
                        : p.activity_type;
                      return (
                        <div key={p.id} className={`flex items-center justify-between p-3 border-2 border-outline ${
                          idx === 0 ? 'bg-warning/20' : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 border-2 border-outline flex items-center justify-center font-bold text-sm ${
                              idx === 0 ? 'bg-warning text-[#0A0A0A]' : 'bg-card'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold">{label}</span>
                          </div>
                          <span className="font-bold">{p.vote_count} 票</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {proposals.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p className="font-bold">还没有投票数据</p>
                <p className="text-sm mt-1">先添加一些选项</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <VotePageContent />
    </Suspense>
  );
}
