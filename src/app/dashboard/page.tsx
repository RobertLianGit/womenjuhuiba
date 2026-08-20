'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, isOrganizer, getPassphrase, isActivityAccessed, markActivityAccessed } from '@/lib/party';
import { Users, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';

interface Participant {
  id: string;
  activity_id: string;
  user_id: string;
  user_name: string;
  scene_id: string | null;
  role: string;
  created_at: string;
}

interface Registration {
  id: string;
  activity_id: string;
  scene_id: string | null;
  user_id: string;
  user_name: string;
  people_count: number;
  notes: string | null;
  created_at: string;
}

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const isCreator = isOrganizer(activityId);

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!activityId) { setAccessDenied(true); setLoading(false); return; }
    if (!isActivityAccessed(activityId) && !isOrganizer(activityId)) { setAccessDenied(true); setLoading(false); return; }
    if (isOrganizer(activityId)) markActivityAccessed(activityId);
    loadData();
  }, [activityId]);

  const loadData = async () => {
    try {
      const [partRes, regRes, sceneRes] = await Promise.all([
        fetch(`/api/participants?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/registrations?activity_id=${activityId}`).then(r => r.json()),
        fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      ]);
      setParticipants(partRes.data || []);
      setRegistrations(regRes.data || []);
      setScenes(sceneRes.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleSyncParticipants = async () => {
    setSyncing(true);
    setErrorMsg('');
    try {
      // For each registration, create/update a participant
      let synced = 0;
      for (const reg of registrations) {
        // Check if participant already exists
        const exists = participants.find(
          p => p.user_id === reg.user_id && (p.scene_id || '') === (reg.scene_id || '')
        );
        if (!exists) {
          const res = await fetch('/api/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: activityId,
              user_id: reg.user_id,
              user_name: reg.user_name,
              scene_id: reg.scene_id || null,
              role: 'participant',
            }),
          });
          const result = await res.json();
          if (result.error) {
            setErrorMsg(`同步 ${reg.user_name} 失败: ${result.error}`);
          } else {
            synced++;
          }
        }
      }

      // Also add the organizer as a participant if not already
      const creatorId = getUserId();
      const creatorExists = participants.find(p => p.user_id === creatorId);
      if (!creatorExists) {
        const creatorName = localStorage.getItem('party_nickname') || '组织者';
        await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: activityId,
            user_id: creatorId,
            user_name: creatorName,
            scene_id: null,
            role: 'organizer',
          }),
        });
        synced++;
      }

      if (!errorMsg) {
        setSuccessMsg(synced > 0 ? `已同步 ${synced} 位参与人` : '所有参与人已同步');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
      loadData();
    } catch {
      setErrorMsg('同步失败，请重试');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const res = await fetch(`/api/participants?id=${participantId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg('已移除');
        setTimeout(() => setSuccessMsg(''), 2000);
        loadData();
      }
    } catch {
      setErrorMsg('操作失败');
    }
  };

  // Group participants by scene
  const sceneMap = new Map(scenes.map(s => [s.id, s]));
  const participantsByScene = new Map<string, Participant[]>();
  const wholeActivityParticipants: Participant[] = [];

  for (const p of participants) {
    if (p.scene_id) {
      if (!participantsByScene.has(p.scene_id)) participantsByScene.set(p.scene_id, []);
      participantsByScene.get(p.scene_id)!.push(p);
    } else {
      wholeActivityParticipants.push(p);
    }
  }

  const totalParticipants = participants.length;
  const unregisteredCount = registrations.filter(
    r => !participants.find(p => p.user_id === r.user_id)
  ).length;

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
          <h1 className="text-2xl font-bold">参与人看板</h1>
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-primary">{totalParticipants}</div>
            <div className="text-xs text-muted-foreground">参与人</div>
          </div>
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-accent-blue">{registrations.length}</div>
            <div className="text-xs text-muted-foreground">已报名</div>
          </div>
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-warning">{unregisteredCount}</div>
            <div className="text-xs text-muted-foreground">未同步</div>
          </div>
        </div>

        {/* Sync Button */}
        {isCreator && unregisteredCount > 0 && (
          <button
            onClick={handleSyncParticipants}
            disabled={syncing}
            className="mb-6 w-full bg-primary text-[#0A0A0A] border-2 border-outline p-4 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            {syncing ? '同步中...' : `同步 ${unregisteredCount} 位已报名参与人`}
          </button>
        )}

        {/* Participants List */}
        {wholeActivityParticipants.length > 0 && (
          <div className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-primary" />全程参与</h2>
            <div className="space-y-2">
              {wholeActivityParticipants.map(p => (
                <div key={p.id} className="bg-muted p-3 border-2 border-outline flex items-center justify-between">
                  <div>
                    <span className="font-bold">{p.user_name}</span>
                    {p.role === 'organizer' && <span className="ml-2 text-xs bg-accent-blue text-white px-2 py-0.5">组织者</span>}
                  </div>
                  {isCreator && p.role !== 'organizer' && (
                    <button onClick={() => handleRemoveParticipant(p.id)} className="text-error text-sm hover:underline cursor-pointer">移除</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants by Scene */}
        {Array.from(participantsByScene.entries()).map(([sceneId, parts]) => {
          const scene = sceneMap.get(sceneId);
          return (
            <div key={sceneId} className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h2 className="font-bold text-lg mb-3">
                {scene?.name || '分段'}
                {scene?.time_range && <span className="text-sm text-muted-foreground ml-2">{scene.time_range}</span>}
              </h2>
              <div className="space-y-2">
                {parts.map(p => (
                  <div key={p.id} className="bg-muted p-3 border-2 border-outline flex items-center justify-between">
                    <span className="font-bold">{p.user_name}</span>
                    {isCreator && (
                      <button onClick={() => handleRemoveParticipant(p.id)} className="text-error text-sm hover:underline cursor-pointer">移除</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">暂无参与人</p>
            <p className="text-sm mt-1">等待大家报名后，点击上方同步按钮</p>
          </div>
        )}
      </main>
    </div>
  );
}
