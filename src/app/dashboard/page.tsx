'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { isOrganizer } from '@/lib/party';
import { LayoutDashboard, Plus, Trash2, Copy, Check, UserPlus } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
}

interface Participant {
  id: string;
  scene_id: string;
  user_id: string;
  user_name: string;
  people_count: number;
  is_manual: boolean;
  is_temp: boolean;
  status: string;
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><DashboardContent /></Suspense>;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [activityPassphrase, setActivityPassphrase] = useState<string | null>(null);
  const isCreator = isOrganizer(activityId, activityPassphrase);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeScene, setActiveScene] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ user_name: '', people_count: 1, is_temp: false });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/participants?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, partRes, actRes]) => {
      const sceneData = sceneRes.data || [];
      setScenes(sceneData);
      setParticipants(partRes.data || []);
      if (actRes.data) setActivityPassphrase(actRes.data.passphrase);
      if (sceneData.length > 0) setActiveScene(sceneData[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  const sceneParticipants = participants.filter(p => p.scene_id === activeScene);
  const totalPeople = sceneParticipants.reduce((sum, p) => sum + p.people_count, 0);
  const manualCount = sceneParticipants.filter(p => p.is_manual).length;
  const tempCount = sceneParticipants.filter(p => p.is_temp).length;
  const regCount = sceneParticipants.filter(p => !p.is_manual && !p.is_temp).length;

  const handleAddParticipant = async () => {
    if (!addForm.user_name || !activeScene) return;
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        scene_id: activeScene,
        user_name: addForm.user_name,
        people_count: addForm.people_count,
        is_manual: true,
        is_temp: addForm.is_temp,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setParticipants(prev => [...prev, result.data]);
      setShowAddModal(false);
      setAddForm({ user_name: '', people_count: 1, is_temp: false });
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/participants?id=${id}`, { method: 'DELETE' });
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleCopyList = () => {
    const sceneName = scenes.find(s => s.id === activeScene)?.name || '';
    const lines = sceneParticipants.map(p => `${p.user_name} x${p.people_count}${p.is_temp ? ' (临时)' : ''}`);
    const text = `${sceneName} 参与名单 (${totalPeople}人):\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-card border-2 border-outline p-8 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="text-2xl font-bold mb-3">仅组织者可访问</h2>
            <p className="text-muted-foreground mb-4">组织者看板只有活动创建者才能管理参与人。</p>
            <Link href={`/activity?id=${activityId}`} className="bg-primary text-primary-foreground border-2 border-outline px-4 py-2 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
              返回活动详情
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2"><LayoutDashboard className="w-8 h-8 text-primary" />组织者看板</h1>
            <span className="bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">组织者</span>
          </div>
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-3xl font-bold">{totalPeople}</div>
            <div className="text-sm text-muted-foreground">总人数</div>
          </div>
          <div className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 bg-success" />
              <span>报名 {regCount}</span>
              <span className="inline-block w-3 h-3 bg-accent-blue ml-2" />
              <span>手动 {manualCount}</span>
              <span className="inline-block w-3 h-3 bg-warning ml-2" />
              <span>临时 {tempCount}</span>
            </div>
            <div className="flex mt-2 h-4 border-2 border-outline overflow-hidden">
              {totalPeople > 0 && (
                <>
                  <div className="bg-success" style={{ width: `${(regCount / totalPeople) * 100}%` }} />
                  <div className="bg-accent-blue" style={{ width: `${(manualCount / totalPeople) * 100}%` }} />
                  <div className="bg-warning" style={{ width: `${(tempCount / totalPeople) * 100}%` }} />
                </>
              )}
            </div>
          </div>
          <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-3xl font-bold">{sceneParticipants.length}</div>
            <div className="text-sm text-muted-foreground">参与条目</div>
          </div>
        </div>

        {/* Scene Tabs */}
        <div className="flex gap-2 mb-6">
          {scenes.map(scene => (
            <button
              key={scene.id}
              onClick={() => setActiveScene(scene.id)}
              className={`px-4 py-2 font-bold border-2 border-outline transition-all cursor-pointer ${activeScene === scene.id ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            >
              {scene.name}
            </button>
          ))}
        </div>

        {/* Participant Cards */}
        <div className="space-y-3 mb-20">
          {sceneParticipants.map(p => {
            const sourceLabel = p.is_temp ? '临时' : p.is_manual ? '手动添加' : '报名';
            const sourceBg = p.is_temp ? 'bg-warning text-primary-foreground' : p.is_manual ? 'bg-accent-blue text-white' : 'bg-success text-white';
            return (
              <div key={p.id} className="bg-card border-2 border-outline p-4 flex items-center gap-3 relative" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                {p.is_temp && (
                  <span className="absolute -top-2 -right-2 bg-warning text-primary-foreground border-2 border-outline px-2 py-0.5 text-xs font-bold rotate-3">临时</span>
                )}
                <span className="font-bold text-lg">{p.user_name}</span>
                <span className="text-muted-foreground">x{p.people_count}</span>
                <span className={`${sourceBg} border-2 border-outline px-2 py-0.5 text-xs font-bold`}>{sourceLabel}</span>
                <div className="flex-1" />
                <button onClick={() => handleDelete(p.id)} className="text-error border-2 border-outline p-1.5 hover:bg-muted cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {sceneParticipants.length === 0 && (
            <div className="bg-card border-2 border-outline p-8 text-center text-muted-foreground" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
              暂无参与人，点击下方按钮添加
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-outline p-4 z-30">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-primary-foreground border-2 border-outline px-5 py-2.5 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              <UserPlus className="w-4 h-4" />手动添加
            </button>
            <button
              onClick={handleCopyList}
              className="bg-card border-2 border-outline px-5 py-2.5 font-bold hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制名单'}
            </button>
          </div>
        </div>
      </main>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border-2 border-outline w-full max-w-md p-6" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h2 className="text-xl font-bold mb-4">手动添加参与人</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">姓名 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={addForm.user_name}
                  onChange={e => setAddForm(f => ({ ...f, user_name: e.target.value }))}
                  placeholder="参与人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">参与人数</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAddForm(f => ({ ...f, people_count: Math.max(1, f.people_count - 1) }))} className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer">-</button>
                  <span className="text-2xl font-bold w-12 text-center">{addForm.people_count}</span>
                  <button onClick={() => setAddForm(f => ({ ...f, people_count: f.people_count + 1 }))} className="w-10 h-10 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer">+</button>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.is_temp}
                  onChange={e => setAddForm(f => ({ ...f, is_temp: e.target.checked }))}
                  className="w-5 h-5 accent-warning"
                />
                <span className="font-medium">临时参与人</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddParticipant}
                disabled={!addForm.user_name}
                className="bg-primary text-primary-foreground border-2 border-outline px-5 py-2.5 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                添加
              </button>
              <button onClick={() => { setShowAddModal(false); setAddForm({ user_name: '', people_count: 1, is_temp: false }); }} className="bg-card border-2 border-outline px-5 py-2.5 font-bold hover:bg-muted cursor-pointer">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
