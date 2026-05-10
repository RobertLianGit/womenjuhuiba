'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName } from '@/lib/party';
import { UserPlus, X, Check, AlertCircle } from 'lucide-react';

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

export default function RegisterPage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><RegisterContent /></Suspense>;
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [form, setForm] = useState({ user_name: '', selected_scenes: [] as string[], people_count: 1, notes: '' });
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const userId = getUserId();

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/registrations?activity_id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, regRes]) => {
      setScenes(sceneRes.data || []);
      setRegistrations(regRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  useEffect(() => {
    const name = getUserName();
    if (name) setForm(f => ({ ...f, user_name: name }));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSubmit = async () => {
    if (!form.user_name || form.selected_scenes.length === 0) return;

    for (const sceneId of form.selected_scenes) {
      await fetch('/api/registrations', {
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
    }

    // Refresh
    const res = await fetch(`/api/registrations?activity_id=${activityId}`);
    const data = await res.json();
    setRegistrations(data.data || []);
    showToast('报名成功！');
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
          <h1 className="text-3xl font-bold">分段报名</h1>
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
        </div>

        {/* Scene Summary */}
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

        {/* Registration Form */}
        <section className="mb-8">
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
              disabled={!form.user_name || form.selected_scenes.length === 0}
              className="mt-5 bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              提交报名
            </button>
          </div>
        </section>

        {/* Registered List */}
        <section>
          <h2 className="text-xl font-bold mb-4">已报名列表</h2>
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
