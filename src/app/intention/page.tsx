'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, getPassphrase, setPassphrase, isActivityAccessed } from '@/lib/party';
import { Send, BarChart3, Clock, Users, MapPin, CheckCircle2, KeyRound } from 'lucide-react';

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  estimated_people: number;
  selected_scenes: string | null;
  created_at: string;
}

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
}

function IntentionPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
    const isCreator = isOrganizer(activityId);
  const [tab, setTab] = useState<'form' | 'summary'>('form');
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [form, setForm] = useState({ user_name: '', wants: '', estimated_people: 1, selected_scenes: [] as string[] });
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    // Check access - redirect to activity page if not granted
    if (!isActivityAccessed(activityId)) {
      window.location.href = `/activity?id=${activityId}`;
      return;
    }
    Promise.all([
      fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([intRes, sceneRes, actRes]) => {
      setIntentions(intRes.data || []);
      setScenes(sceneRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  useEffect(() => {
    const name = getUserName();
    if (name) setForm(f => ({ ...f, user_name: name }));
    const userId = getUserId();
    const existing = intentions.find(i => i.user_id === userId);
    if (existing) {
      setForm({
        user_name: existing.user_name,
        wants: existing.wants || '',
        estimated_people: existing.estimated_people || 1,
        selected_scenes: existing.selected_scenes ? JSON.parse(existing.selected_scenes) : [],
      });
      setSubmitted(true);
    }
  }, [intentions]);

  const handleSubmit = async () => {
    if (!form.user_name) return;
    const userId = getUserId();
    const res = await fetch('/api/intentions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        user_id: userId,
        user_name: form.user_name,
        wants: form.wants || null,
        estimated_people: form.estimated_people,
        selected_scenes: form.selected_scenes.length > 0 ? JSON.stringify(form.selected_scenes) : null,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setSubmitted(true);
      setShowSubmitSuccess(true);
      setTimeout(() => setShowSubmitSuccess(false), 3000);
      setIntentions(prev => {
        const idx = prev.findIndex(i => i.user_id === userId);
        if (idx >= 0) { const arr = [...prev]; arr[idx] = result.data; return arr; }
        return [...prev, result.data];
      });
    }
  };

  const totalPeople = intentions.reduce((sum, i) => sum + (i.estimated_people || 1), 0);

  const wantsList = intentions.filter(i => i.wants).map(i => ({ name: i.user_name, wants: i.wants! }));

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">意愿收集</h1>
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

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('form')}
            className={`px-5 py-2.5 font-bold border-2 border-outline transition-all cursor-pointer ${tab === 'form' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><Send className="w-4 h-4" />填写意愿</span>
          </button>
          <button
            onClick={() => setTab('summary')}
            className={`px-5 py-2.5 font-bold border-2 border-outline transition-all cursor-pointer ${tab === 'summary' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />汇总看板</span>
          </button>
        </div>

        {/* Submit Success Toast */}
        {showSubmitSuccess && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3 animate-pulse" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">提交成功！</p>
              <p className="text-sm opacity-90">你的意愿已记录，可随时更新</p>
            </div>
          </div>
        )}

        {/* Progress Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-2xl font-bold text-primary">{intentions.length}</div>
            <div className="text-xs font-medium text-muted-foreground mt-1">已表态人数</div>
          </div>
          <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-2xl font-bold text-accent-blue">{totalPeople}</div>
            <div className="text-xs font-medium text-muted-foreground mt-1">预计总人数</div>
          </div>
          <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-2xl font-bold text-success">{wantsList.length}</div>
            <div className="text-xs font-medium text-muted-foreground mt-1">想去的地方</div>
          </div>
        </div>

        {/* Form Tab */}
        {tab === 'form' && (
          <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-1">你的昵称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.user_name}
                  onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
                  placeholder="输入昵称"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">想去哪</label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.wants}
                  onChange={e => setForm(f => ({ ...f, wants: e.target.value }))}
                  placeholder="说说你想去的地方或活动形式"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">预计人数</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, estimated_people: Math.max(1, f.estimated_people - 1) }))}
                    className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer"
                  >-</button>
                  <span className="text-2xl font-bold w-12 text-center">{form.estimated_people}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, estimated_people: f.estimated_people + 1 }))}
                    className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer"
                  >+</button>
                </div>
              </div>
              {scenes.length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-2">参与时间段（多选）</label>
                  <div className="space-y-2">
                    {scenes.map(scene => (
                      <label key={scene.id} className="flex items-center gap-3 bg-muted border-2 border-outline p-3 cursor-pointer hover:bg-surface-container-high transition-colors">
                        <input
                          type="checkbox"
                          checked={form.selected_scenes.includes(scene.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setForm(f => ({ ...f, selected_scenes: [...f.selected_scenes, scene.id] }));
                            } else {
                              setForm(f => ({ ...f, selected_scenes: f.selected_scenes.filter(s => s !== scene.id) }));
                            }
                          }}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="font-medium">{scene.name}</span>
                        {scene.time_range && <span className="text-sm text-muted-foreground">{scene.time_range}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!form.user_name}
              className="mt-6 bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {submitted ? '更新意愿' : '提交意愿'}
            </button>
          </div>
        )}

        {/* Summary Tab */}
        {tab === 'summary' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border-2 border-outline p-5 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-4xl font-bold">{intentions.length}</div>
                <div className="text-sm text-muted-foreground font-medium">已表态人数</div>
              </div>
              <div className="bg-card border-2 border-outline p-5 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <Users className="w-8 h-8 mx-auto mb-2 text-accent-blue" />
                <div className="text-4xl font-bold">{totalPeople}</div>
                <div className="text-sm text-muted-foreground font-medium">预计总人数</div>
              </div>
              <div className="bg-card border-2 border-outline p-5 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <MapPin className="w-8 h-8 mx-auto mb-2 text-success" />
                <div className="text-4xl font-bold">{wantsList.length}</div>
                <div className="text-sm text-muted-foreground font-medium">想去的地方</div>
              </div>
            </div>

            {/* Wants List */}
            {wantsList.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />想去的地方</h3>
                <div className="space-y-2">
                  {wantsList.map((w, i) => (
                    <div key={i} className="bg-muted border-2 border-outline p-3 flex items-center gap-3">
                      <span className="font-bold text-primary">{w.name}</span>
                      <span>{w.wants}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scene Distribution */}
            {scenes.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-accent-blue" />时间段分布</h3>
                <div className="space-y-3">
                  {scenes.map(scene => {
                    const count = intentions.filter(i => {
                      if (!i.selected_scenes) return false;
                      const ids: string[] = JSON.parse(i.selected_scenes);
                      return ids.includes(scene.id);
                    }).length;
                    const pct = intentions.length > 0 ? (count / intentions.length) * 100 : 0;
                    return (
                      <div key={scene.id} className="flex items-center gap-3">
                        <span className="font-medium w-24 shrink-0">{scene.name}</span>
                        <div className="flex-1 bg-muted border-2 border-outline h-8 relative overflow-hidden">
                          <div className="bg-primary h-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-bold w-16 text-right">{count} 人</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Intention Details */}
            {intentions.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3">意愿明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-outline">
                        <th className="text-left py-2 px-3 font-bold">昵称</th>
                        <th className="text-left py-2 px-3 font-bold">想去哪</th>
                        <th className="text-center py-2 px-3 font-bold">人数</th>
                        <th className="text-left py-2 px-3 font-bold">时间段</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentions.map(i => {
                        const sceneNames = i.selected_scenes
                          ? (JSON.parse(i.selected_scenes) as string[]).map(sid => scenes.find(s => s.id === sid)?.name).filter(Boolean).join('、')
                          : '-';
                        return (
                          <tr key={i.id} className="border-b border-outline/30 hover:bg-muted transition-colors">
                            <td className="py-2 px-3 font-medium">{i.user_name}</td>
                            <td className="py-2 px-3">{i.wants || '-'}</td>
                            <td className="py-2 px-3 text-center font-bold">{i.estimated_people}</td>
                            <td className="py-2 px-3">{sceneNames}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Organizer Actions */}
            {isCreator && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="text-lg font-bold mb-3">组织者操作</h3>
                <button
                  onClick={async () => {
                    if (!confirm('确定提前结束意愿收集？结束后将进入投票阶段。')) return;
                    const passphrase = getPassphrase(activityId);
                    const res = await fetch(`/api/activities/${activityId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'voting', passphrase }),
                    });
                    if (res.ok) {
                      window.location.href = `/vote?activity_id=${activityId}`;
                    } else {
                      const result = await res.json();
                      alert(result.error || '操作失败，请重试');
                    }
                  }}
                  className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                >
                  提前结束收集，进入投票
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function IntentionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-lg">加载中...</p></div>}>
      <IntentionPageContent />
    </Suspense>
  );
}
