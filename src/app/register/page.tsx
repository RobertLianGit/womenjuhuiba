'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, setPassphrase, isActivityAccessed } from '@/lib/party';
import { UserPlus, X, Check, AlertCircle, FileText, KeyRound } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
}

interface Registration {
  id: string;
  scene_id: string;
  user_id: string;
  user_name: string;
  people_count: number;
  notes: string | null;
}

interface Plan {
  content: string;
}

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  estimated_people: number;
}

export default function RegisterPage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><RegisterContent /></Suspense>;
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [form, setForm] = useState({ user_name: '', selected_whole: true, selected_scenes: [] as string[], people_count: 1, notes: '' });
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [autoRegistered, setAutoRegistered] = useState(false);
  const [activityPassphrase, setActivityPassphrase] = useState<string | null>(null);

  const userId = getUserId();
  const isCreator = isOrganizer(activityId);

  useEffect(() => {
    if (!activityId) return;
    if (!isActivityAccessed(activityId)) {
      window.location.href = `/activity?id=${activityId}`;
      return;
    }
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/registrations?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/plans?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, regRes, planRes, intRes, actRes]) => {
      const sceneData = sceneRes.data || [];
      const regData = regRes.data || [];
      setScenes(sceneData);
      setRegistrations(regData);
      if (planRes.data) {
        setPlan({ content: planRes.data.content || '' });
      }
      setIntentions(intRes.data || []);
      if (actRes.data) setActivityPassphrase(actRes.data.passphrase);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  useEffect(() => {
    const name = getUserName();
    if (name) setForm(f => ({ ...f, user_name: name }));
  }, []);

  // Auto-register intention submitters
  useEffect(() => {
    if (autoRegistered || intentions.length === 0) return;
    // Need scenes OR no scenes (whole-activity mode)
    if (scenes.length > 0 && scenes.length === 0) return;

    const registerIntentionUsers = async () => {
      for (const intention of intentions) {
        const existingRegs = registrations.filter(r => r.user_id === intention.user_id);
        if (existingRegs.length > 0) continue;

        if (scenes.length > 0) {
          // Register for all scenes
          for (const scene of scenes) {
            await fetch('/api/registrations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activity_id: activityId,
                scene_id: scene.id,
                user_id: intention.user_id,
                user_name: intention.user_name,
                people_count: intention.estimated_people || 1,
                notes: null,
              }),
            });
          }
        } else {
          // Whole-activity registration
          await fetch('/api/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: activityId,
              user_id: intention.user_id,
              user_name: intention.user_name,
              people_count: intention.estimated_people || 1,
              notes: null,
            }),
          });
        }
      }

      // Refresh registrations
      const res = await fetch(`/api/registrations?activity_id=${activityId}`);
      const data = await res.json();
      setRegistrations(data.data || []);
      setAutoRegistered(true);
    };

    registerIntentionUsers();
  }, [scenes, intentions, registrations, autoRegistered, activityId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSubmit = async () => {
    if (!form.user_name) return;
    const hasScenes = scenes.length > 0;
    if (hasScenes && form.selected_scenes.length === 0) return;
    if (!hasScenes && !form.selected_whole) return;

    try {
      if (hasScenes) {
        for (const sceneId of form.selected_scenes) {
          const res = await fetch('/api/registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: activityId,
              scene_id: sceneId,
              user_id: userId,
              user_name: form.user_name,
              people_count: form.people_count,
              notes: form.notes || null,
            }),
          });
          const result = await res.json();
          if (result.error) {
            showToast('报名失败：' + result.error);
            return;
          }
        }
      } else {
        // Whole-activity registration (no scenes)
        const res = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: activityId,
            user_id: userId,
            user_name: form.user_name,
            people_count: form.people_count,
            notes: form.notes || null,
          }),
        });
        const result = await res.json();
        if (result.error) {
          showToast('报名失败：' + result.error);
          return;
        }
      }

      // Refresh
      const res = await fetch(`/api/registrations?activity_id=${activityId}`);
      const data = await res.json();
      setRegistrations(data.data || []);
      setForm(f => ({ ...f, selected_scenes: [], selected_whole: false, notes: '' }));
      showToast('报名成功！');
    } catch {
      showToast('网络错误，请重试');
    }
  };

  const handleCancel = async (regId: string) => {
    await fetch(`/api/registrations?id=${regId}`, { method: 'DELETE' });
    setRegistrations(prev => prev.filter(r => r.id !== regId));
    setShowCancelConfirm(null);
    showToast('已取消报名');
  };

  const sceneColors = ['bg-primary text-primary-foreground', 'bg-accent-blue text-white', 'bg-warning text-primary-foreground', 'bg-success text-white'];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">分段报名</h1>
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

        {/* Plan Content */}
        {plan && plan.content && (
          <section className="mb-8">
            <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />活动方案</h2>
              <div className="bg-muted border-2 border-outline p-4 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {plan.content}
              </div>
            </div>
          </section>
        )}

        {/* Empty Scene Prompt */}
        {scenes.length === 0 && !loading && (
          <section className="mb-8">
            <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-accent-blue" />活动尚未分段</h2>
              <p className="text-muted-foreground mb-4">组织者还未设置分段安排，你可以直接报名「全程参与」，也可以在方案确认页面了解详情。</p>
              <Link href={`/plan?activity_id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors inline-block">
                查看方案确认 →
              </Link>
            </div>
          </section>
        )}

        {/* Scene Summary */}
        {scenes.length > 0 && (
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenes.map((scene, i) => {
              const regCount = registrations.filter(r => r.scene_id === scene.id).length;
              return (
                <div key={scene.id} className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <span className={`${sceneColors[i % sceneColors.length]} border-2 border-outline px-3 py-1 font-bold text-sm`}>{scene.name}</span>
                  {scene.time_range && <span className="ml-2 text-sm text-muted-foreground">{scene.time_range}</span>}
                  {scene.location && <div className="text-sm mt-2">{scene.location}</div>}
                  <div className="mt-2 text-sm font-bold">{regCount} 人已报名</div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Registration Form */}
        <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />报名</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">你的昵称 <span className="text-error">*</span></label>
              <input
                className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.user_name}
                onChange={e => setForm(f => ({ ...f, user_name: e.target.value }))}
                placeholder="输入昵称"
              />
            </div>
            {scenes.length > 0 ? (
              <div>
                <label className="block text-sm font-bold mb-2">选择参加的段 <span className="text-error">*</span></label>
                <div className="space-y-2">
                  {scenes.map((scene, i) => (
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
                      <span className={`${sceneColors[i % sceneColors.length]} border-2 border-outline px-2 py-0.5 text-xs font-bold`}>{scene.name}</span>
                      {scene.time_range && <span className="text-sm text-muted-foreground">{scene.time_range}</span>}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold mb-2">全程参与 <span className="text-error">*</span></label>
                <label className="flex items-center gap-3 bg-muted border-2 border-outline p-3 cursor-pointer hover:bg-surface-container-high transition-colors">
                  <input
                    type="checkbox"
                    checked={form.selected_whole}
                    onChange={e => setForm(f => ({ ...f, selected_whole: e.target.checked }))}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="bg-primary text-primary-foreground border-2 border-outline px-2 py-0.5 text-xs font-bold">全程参与</span>
                  <span className="text-sm text-muted-foreground">参加活动全部内容</span>
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold mb-1">参与人数</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, people_count: Math.max(1, f.people_count - 1) }))} className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer">-</button>
                <span className="text-2xl font-bold w-12 text-center">{form.people_count}</span>
                <button onClick={() => setForm(f => ({ ...f, people_count: f.people_count + 1 }))} className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer">+</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">备注</label>
              <textarea
                className="w-full border-2 border-outline bg-muted px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="过敏、忌口等..."
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!form.user_name || (scenes.length > 0 ? form.selected_scenes.length === 0 : !form.selected_whole)}
            className="mt-5 bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
          >
            提交报名
          </button>
        </div>

        {/* Registered List */}
        <section>
          <h2 className="text-xl font-bold mb-4">已报名列表</h2>
          {/* Whole-activity registrations (no scenes) */}
          {scenes.length === 0 && registrations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground border-2 border-outline px-3 py-1 text-sm">全程参与</span>
                <span className="text-sm text-muted-foreground font-normal">{registrations.length} 人</span>
              </h3>
              <div className="space-y-2">
                {registrations.map(reg => (
                  <div key={reg.id} className="bg-card border-2 border-outline p-3 flex items-center gap-3" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                    <span className="font-bold">{reg.user_name}</span>
                    <span className="text-sm text-muted-foreground">x{reg.people_count}</span>
                    {reg.notes && <span className="text-sm text-muted-foreground">({reg.notes})</span>}
                    <div className="flex-1" />
                    {reg.user_id === userId && (
                      <button
                        onClick={() => setShowCancelConfirm(reg.id)}
                        className="text-error border-2 border-outline p-1.5 hover:bg-muted cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Per-scene registrations */}
          {scenes.map((scene, i) => {
            const sceneRegs = registrations.filter(r => r.scene_id === scene.id);
            if (sceneRegs.length === 0) return null;
            return (
              <div key={scene.id} className="mb-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className={`${sceneColors[i % sceneColors.length]} border-2 border-outline px-3 py-1 text-sm`}>{scene.name}</span>
                  <span className="text-sm text-muted-foreground font-normal">{sceneRegs.length} 人</span>
                </h3>
                <div className="space-y-2">
                  {sceneRegs.map(reg => (
                    <div key={reg.id} className="bg-card border-2 border-outline p-3 flex items-center gap-3" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                      <span className="font-bold">{reg.user_name}</span>
                      <span className="text-sm text-muted-foreground">x{reg.people_count}</span>
                      {reg.notes && <span className="text-sm text-muted-foreground">({reg.notes})</span>}
                      <div className="flex-1" />
                      {reg.user_id === userId && (
                        <button
                          onClick={() => setShowCancelConfirm(reg.id)}
                          className="text-error border-2 border-outline p-1.5 hover:bg-muted cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border-2 border-outline p-6 w-full max-w-sm" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-error" />确认取消报名？</h3>
            <p className="text-muted-foreground mb-6">取消后可以重新报名</p>
            <div className="flex gap-3">
              <button onClick={() => handleCancel(showCancelConfirm)} className="bg-error text-white border-2 border-outline px-5 py-2 font-bold cursor-pointer hover:bg-error/80">确认取消</button>
              <button onClick={() => setShowCancelConfirm(null)} className="bg-card border-2 border-outline px-5 py-2 font-bold cursor-pointer hover:bg-muted">返回</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border-2 border-outline px-6 py-3 font-bold z-50 flex items-center gap-2" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <Check className="w-5 h-5 text-success" />{toast}
        </div>
      )}
    </div>
  );
}
