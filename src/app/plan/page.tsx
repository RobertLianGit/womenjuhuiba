'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, getPassphrase, isActivityAccessed, markActivityAccessed } from '@/lib/party';
import { CheckCircle2, Clock, MapPin, Users, Plus, Trash2, Loader2 } from 'lucide-react';

interface Proposal {
  id: string;
  activity_id: string;
  user_id: string;
  user_name: string;
  location: string | null;
  proposed_time: string | null;
  category: string;
  proposal_name: string;
  created_at: string;
}

interface Scene {
  id: string;
  activity_id: string;
  name: string;
  time_range: string | null;
  location: string | null;
}

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  wants_time: string | null;
  rsvp: string;
  estimated_people: number;
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <PlanPageContent />
    </Suspense>
  );
}

function PlanPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const isCreator = isOrganizer(activityId);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [voterNames, setVoterNames] = useState<Record<string, string[]>>({});
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Add scene form
  const [addSceneForm, setAddSceneForm] = useState({ name: '', time_range: '', location: '' });
  const [addingScene, setAddingScene] = useState(false);
  const [addError, setAddError] = useState('');

  // Success/error messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Confirm plan dialog
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!activityId) { setAccessDenied(true); setLoading(false); return; }
    if (!isActivityAccessed(activityId) && !isOrganizer(activityId)) { setAccessDenied(true); setLoading(false); return; }
    if (isOrganizer(activityId)) markActivityAccessed(activityId);
    loadData();
  }, [activityId]);

  const loadData = async () => {
    try {
      const [propRes, voteRes, intRes, sceneRes] = await Promise.all([
        fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      ]);
      setProposals(propRes.data || []);
      setVoteCounts(voteRes.vote_counts || {});
      setVoterNames(voteRes.voter_names || {});
      setIntentions(intRes.data || []);
      setScenes(sceneRes.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleAddScene = async () => {
    setAddingScene(true);
    setAddError('');
    const passphrase = getPassphrase(activityId);
    if (!passphrase) {
      setAddError('缺少管理口令，无法添加');
      setAddingScene(false);
      return;
    }
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          name: addSceneForm.name,
          time_range: addSceneForm.time_range || null,
          location: addSceneForm.location || null,
          passphrase,
        }),
      });
      const result = await res.json();
      if (result.error) {
        setAddError(result.error);
      } else {
        setAddSceneForm({ name: '', time_range: '', location: '' });
        setSuccessMsg('分段已添加');
        setTimeout(() => setSuccessMsg(''), 2000);
        loadData();
      }
    } catch {
      setAddError('网络错误，请重试');
    } finally {
      setAddingScene(false);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    const passphrase = getPassphrase(activityId);
    if (!passphrase) { setErrorMsg('缺少管理口令'); return; }
    try {
      const res = await fetch(`/api/scenes?id=${sceneId}&passphrase=${passphrase}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg('已删除');
        setTimeout(() => setSuccessMsg(''), 2000);
        loadData();
      }
    } catch {
      setErrorMsg('网络错误');
    }
  };

  const handleConfirmPlan = async () => {
    setConfirming(true);
    setErrorMsg('');
    const passphrase = getPassphrase(activityId);
    if (!passphrase) {
      setErrorMsg('缺少管理口令');
      setConfirming(false);
      return;
    }
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'registering', passphrase }),
      });
      const result = await res.json();
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg('方案已确认！已进入报名阶段');
        setTimeout(() => setSuccessMsg(''), 3000);
        loadData();
      }
    } catch {
      setErrorMsg('网络错误');
    } finally {
      setConfirming(false);
    }
  };

  const handleImportVoteResult = async (proposal: Proposal) => {
    const passphrase = getPassphrase(activityId);
    if (!passphrase) { setErrorMsg('缺少管理口令'); return; }
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          name: proposal.proposal_name || proposal.location || '活动',
          time_range: proposal.proposed_time || null,
          location: proposal.location || null,
          passphrase,
        }),
      });
      const result = await res.json();
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg('已导入为分段');
        setTimeout(() => setSuccessMsg(''), 2000);
        loadData();
      }
    } catch {
      setErrorMsg('网络错误');
    }
  };

  // Aggregate data using proposal_id (not voted_proposal_ids)
  const sortedProposals = [...proposals].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));

  // RSVP counts
  const rsvpCounts = {
    can_join: intentions.filter(i => i.rsvp === 'can_join').length,
    depends: intentions.filter(i => i.rsvp === 'depends').length,
    unsure: intentions.filter(i => !i.rsvp || i.rsvp === 'unsure').length,
  };

  // Time/Location preferences from intentions
  const timePrefs = intentions.filter(i => i.wants_time).reduce<Record<string, number>>((acc, i) => {
    i.wants_time!.split(/[、,，\s]+/).filter(Boolean).forEach(t => { acc[t.trim()] = (acc[t.trim()] || 0) + 1; });
    return acc;
  }, {});
  const sortedTimePrefs = Object.entries(timePrefs).sort((a, b) => b[1] - a[1]);

  const locPrefs = intentions.filter(i => i.wants).reduce<Record<string, number>>((acc, i) => {
    i.wants!.split(/[、,，\s]+/).filter(Boolean).forEach(l => { acc[l.trim()] = (acc[l.trim()] || 0) + 1; });
    return acc;
  }, {});
  const sortedLocPrefs = Object.entries(locPrefs).sort((a, b) => b[1] - a[1]);

  if (accessDenied) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-lg font-bold">需要先进入活动</p>
      <a href={`/activity?id=${activityId}`} className="mt-2 px-6 py-3 bg-primary text-[#0A0A0A] font-bold border-2 border-[#0A0A0A] shadow-[3px_3px_0_#0A0A0A] hover:shadow-[1px_1px_0_#0A0A0A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">进入活动</a>
    </div>
  );
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">方案确认</h1>
          <div className="flex items-center gap-2">
            <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
              返回活动
            </Link>
          </div>
        </div>

        {/* Success Toast */}
        {successMsg && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        {/* Error Toast */}
        {errorMsg && (
          <div className="mb-6 bg-destructive text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <span className="font-bold">⚠ {errorMsg}</span>
          </div>
        )}

        {/* Reference Data */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-success">{rsvpCounts.can_join}</div>
            <div className="text-xs text-muted-foreground">可以参加</div>
          </div>
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-warning">{rsvpCounts.depends}</div>
            <div className="text-xs text-muted-foreground">看时间</div>
          </div>
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-muted-foreground">{rsvpCounts.unsure}</div>
            <div className="text-xs text-muted-foreground">不确定</div>
          </div>
        </div>

        {/* Vote Results - using proposal_id aggregation */}
        {sortedProposals.length > 0 && (
          <div className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" />投票排名</h2>
            <div className="space-y-3">
              {sortedProposals.map((proposal, idx) => {
                const count = voteCounts[proposal.id] || 0;
                const voters = voterNames[proposal.id] || [];
                return (
                  <div key={proposal.id} className="bg-muted p-4 border-2 border-outline flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-lg">🏆</span>}
                        <span className="font-bold">
                          {proposal.proposed_time && `${proposal.proposed_time}`}
                          {proposal.proposed_time && proposal.location && ' · '}
                          {proposal.location && proposal.location}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {proposal.category === 'time' ? '时间' : proposal.category === 'location' ? '地点' : '活动'}方案
                        {voters.length > 0 && ` · ${voters.join('、')}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-sm text-muted-foreground ml-1">票</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hot Times & Locations from Intentions */}
        {(sortedTimePrefs.length > 0 || sortedLocPrefs.length > 0) && (
          <div className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="font-bold text-lg mb-4">意愿热度</h2>
            {sortedTimePrefs.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1"><Clock className="w-4 h-4" />热门时间</h3>
                <div className="space-y-1">
                  {sortedTimePrefs.slice(0, 5).map(([time, count]) => (
                    <div key={time} className="flex items-center justify-between bg-muted p-2 border border-outline text-sm">
                      <span>{time}</span>
                      <span className="font-bold">{count} 人</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sortedLocPrefs.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" />热门地点</h3>
                <div className="space-y-1">
                  {sortedLocPrefs.slice(0, 5).map(([loc, count]) => (
                    <div key={loc} className="flex items-center justify-between bg-muted p-2 border border-outline text-sm">
                      <span>{loc}</span>
                      <span className="font-bold">{count} 人</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scenes (Registration Segments) */}
        <div className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <h2 className="font-bold text-lg mb-4">分段报名</h2>
          {scenes.length > 0 ? (
            <div className="space-y-3">
              {scenes.map(scene => (
                <div key={scene.id} className="bg-muted p-4 border-2 border-outline">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">{scene.name}</span>
                      {scene.time_range && <span className="text-sm text-muted-foreground ml-2">{scene.time_range}</span>}
                      {scene.location && <span className="text-sm text-muted-foreground ml-2">{scene.location}</span>}
                    </div>
                    {isCreator && (
                      <button onClick={() => handleDeleteScene(scene.id)} className="text-error hover:bg-error/10 p-2 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">暂无分段，添加一个或从投票结果导入</p>
          )}

          {/* Quick import from vote results */}
          {sortedProposals.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold mb-2">从投票结果导入：</p>
              <div className="flex flex-wrap gap-2">
                {sortedProposals.filter(p => (voteCounts[p.id] || 0) > 0).map(proposal => (
                  <button
                    key={proposal.id}
                    onClick={() => handleImportVoteResult(proposal)}
                    className="bg-muted border-2 border-outline px-3 py-2 text-sm font-bold hover:bg-primary hover:text-[#0A0A0A] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    {proposal.proposed_time || proposal.location || '方案'} ({voteCounts[proposal.id] || 0}票)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Scene Form */}
          {isCreator && (
            <div className="mt-4 border-t-2 border-outline pt-4">
              <p className="text-sm font-bold mb-3">手动添加分段：</p>
              <div className="space-y-3">
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="分段名称（如：聚餐、K歌）"
                  value={addSceneForm.name}
                  onChange={e => setAddSceneForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border-2 border-outline bg-muted px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="时间"
                    value={addSceneForm.time_range}
                    onChange={e => setAddSceneForm(f => ({ ...f, time_range: e.target.value }))}
                  />
                  <input
                    className="border-2 border-outline bg-muted px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="地点"
                    value={addSceneForm.location}
                    onChange={e => setAddSceneForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
              </div>
              {addError && <p className="text-error text-sm font-bold mt-2">⚠ {addError}</p>}
              <button
                onClick={handleAddScene}
                disabled={addingScene || !addSceneForm.name}
                className="mt-3 bg-primary text-[#0A0A0A] border-2 border-outline px-4 py-2 font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                {addingScene ? '添加中...' : '添加分段'}
              </button>
            </div>
          )}
        </div>

        {/* Confirm Plan Button */}
        {isCreator && (
          <button
            onClick={handleConfirmPlan}
            disabled={confirming}
            className="w-full bg-primary text-[#0A0A0A] border-2 border-outline p-4 font-bold text-lg hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {confirming ? <><Loader2 className="w-5 h-5 inline animate-spin mr-2" />确认中...</> : '确认方案，开放报名'}
          </button>
        )}
      </main>
    </div>
  );
}
