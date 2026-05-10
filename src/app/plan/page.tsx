'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Plus, Trash2, Copy, Check, FileText, Sparkles } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
  sort_order: number;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
}

export default function PlanPage() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [plan, setPlan] = useState<{ content: string; prompt_generated: string }>({ content: '', prompt_generated: '' });
  const [addForm, setAddForm] = useState({ name: '', time_range: '', location: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
      fetch(`/api/plans?activity_id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, actRes, planRes]) => {
      setScenes(sceneRes.data || []);
      setActivity(actRes.data || null);
      if (planRes.data) {
        setPlan({ content: planRes.data.content || '', prompt_generated: planRes.data.prompt_generated || '' });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  const handleAddScene = async () => {
    if (!addForm.name) return;
    const res = await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        name: addForm.name,
        time_range: addForm.time_range || null,
        location: addForm.location || null,
        sort_order: scenes.length,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setScenes(prev => [...prev, result.data]);
      setAddForm({ name: '', time_range: '', location: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteScene = async (id: string) => {
    const res = await fetch(`/api/scenes?id=${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      setScenes(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleGeneratePrompt = async () => {
    // Fetch intentions for context
    const intRes = await fetch(`/api/intentions?activity_id=${activityId}`);
    const intData = await intRes.json();
    const intentions = intData.data || [];

    const locationSummary = intentions
      .filter((i: { wants: string | null }) => i.wants)
      .map((i: { user_name: string; wants: string }) => `${i.user_name}想去：${i.wants}`)
      .join('\n');

    const sceneList = scenes.map(s => `- ${s.name}${s.time_range ? `（${s.time_range}）` : ''}${s.location ? ` @ ${s.location}` : ''}`).join('\n');

    const prompt = `你是一个聚会活动策划助手。请根据以下信息，帮我生成一个详细的活动方案。

活动名称：${activity?.title || ''}
活动描述：${activity?.description || ''}
大致时间：${activity?.rough_time || ''}

大家想去的地方：
${locationSummary || '暂无'}

活动分段安排：
${sceneList || '暂无分段'}

请为每个分段提供：1) 具体时间安排 2) 地点推荐 3) 活动内容建议 4) 注意事项`;

    setPlan(prev => ({ ...prev, prompt_generated: prompt }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plan.prompt_generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePlan = async () => {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        content: plan.content,
        prompt_generated: plan.prompt_generated,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">方案确认</h1>
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
        </div>

        {/* Scene Setup */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">分段设置</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-success text-white border-2 border-outline px-4 py-2 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              <Plus className="w-4 h-4" />添加分段
            </button>
          </div>

          {scenes.length === 0 ? (
            <div className="bg-card border-2 border-outline p-6 text-center text-muted-foreground" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
              还没有分段，点击上方按钮添加
            </div>
          ) : (
            <div className="space-y-3">
              {scenes.map(scene => (
                <div key={scene.id} className="bg-card border-2 border-outline p-4 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <span className="bg-primary text-primary-foreground border-2 border-outline px-3 py-1 font-bold text-sm">{scene.name}</span>
                  {scene.time_range && <span className="text-sm text-muted-foreground">{scene.time_range}</span>}
                  {scene.location && <span className="text-sm font-medium">{scene.location}</span>}
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDeleteScene(scene.id)}
                    className="text-error hover:bg-muted border-2 border-outline p-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Scene Form */}
          {showAddForm && (
            <div className="bg-card border-2 border-outline p-5 mt-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">名称 <span className="text-error">*</span></label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="如：午餐"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">时间范围</label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={addForm.time_range}
                    onChange={e => setAddForm(f => ({ ...f, time_range: e.target.value }))}
                    placeholder="如：12:00-14:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">地点</label>
                  <input
                    className="w-full border-2 border-outline bg-muted px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={addForm.location}
                    onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="如：望京小腰"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAddScene}
                  disabled={!addForm.name}
                  className="bg-primary text-primary-foreground border-2 border-outline px-4 py-2 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  添加
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddForm({ name: '', time_range: '', location: '' }); }}
                  className="bg-card border-2 border-outline px-4 py-2 font-bold text-sm hover:bg-muted cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Prompt Generation */}
        <section className="mb-8">
          <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent-blue" />Prompt 生成</h2>
            <button
              onClick={handleGeneratePrompt}
              className="bg-accent-blue text-white border-2 border-outline px-5 py-2.5 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer mb-4"
              style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
            >
              生成 Prompt
            </button>
            {plan.prompt_generated && (
              <>
                <textarea
                  className="w-full border-2 border-outline bg-muted p-4 text-sm font-mono resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={plan.prompt_generated}
                  onChange={e => setPlan(p => ({ ...p, prompt_generated: e.target.value }))}
                  rows={10}
                />
                <button
                  onClick={handleCopy}
                  className="mt-3 bg-card border-2 border-outline px-4 py-2 font-bold text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '一键复制'}
                </button>
              </>
            )}
          </div>
        </section>

        {/* Plan Content */}
        <section>
          <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />方案内容</h2>
            <textarea
              className="w-full border-2 border-outline bg-muted p-4 text-base resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={plan.content}
              onChange={e => setPlan(p => ({ ...p, content: e.target.value }))}
              placeholder="粘贴 AI 生成的方案内容，或手动编写..."
              rows={10}
            />
            <button
              onClick={handleSavePlan}
              disabled={!plan.content}
              className="mt-3 bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {saved ? '已保存' : '保存方案'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
