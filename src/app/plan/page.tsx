'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { isOrganizer, getPassphrase, setPassphrase, isActivityAccessed } from '@/lib/party';
import { Plus, Trash2, Copy, Check, FileText, Sparkles, Pencil, ArrowRight, Lightbulb, KeyRound } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  time_range: string | null;
  location: string | null;
  sort_order: number;
}

interface Proposal {
  id: string;
  user_id: string;
  user_name: string;
  location: string;
  activity_type: string | null;
}

interface VoteRecord {
  id: string;
  user_id: string;
  user_name: string;
  voted_proposal_ids: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  passphrase: string;
}

function PlanPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityPassphrase, setActivityPassphrase] = useState<string | null>(null);
  const isCreator = isOrganizer(activityId, activityPassphrase);
  const [plan, setPlan] = useState<{ content: string; prompt_generated: string }>({ content: '', prompt_generated: '' });
  const [addForm, setAddForm] = useState({ name: '', time_range: '', location: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', time_range: '', location: '' });

  useEffect(() => {
    if (!activityId) return;
    if (!isActivityAccessed(activityId)) {
      window.location.href = `/activity?id=${activityId}`;
      return;
    }
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
      fetch(`/api/plans?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/vote-proposals?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/vote-records?activity_id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, actRes, planRes, propRes, voteRes]) => {
      setScenes(sceneRes.data || []);
      const actData = actRes.data;
      setActivity(actData || null);
      if (actData) setActivityPassphrase(actData.passphrase);
      if (planRes.data) {
        setPlan({ content: planRes.data.content || '', prompt_generated: planRes.data.prompt_generated || '' });
      }
      setProposals(propRes.data || []);
      setVoteRecords(voteRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  // Calculate vote results
  const voteCounts: Record<string, number> = {};
  proposals.forEach(p => { voteCounts[p.id] = 0; });
  voteRecords.forEach(v => {
    try {
      const ids: string[] = JSON.parse(v.voted_proposal_ids);
      ids.forEach(id => { voteCounts[id] = (voteCounts[id] || 0) + 1; });
    } catch { /* skip */ }
  });
  const sortedProposals = [...proposals].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));

  const handleAddScene = async () => {
    if (!addForm.name) return;
    const passphrase = getPassphrase(activityId);
    const res = await fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        name: addForm.name,
        time_range: addForm.time_range || null,
        location: addForm.location || null,
        sort_order: scenes.length,
        passphrase,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setScenes(prev => [...prev, result.data]);
      setAddForm({ name: '', time_range: '', location: '' });
      setShowAddForm(false);
    } else {
      alert(result.error || '添加失败，请确认管理口令');
    }
  };

  const handleDeleteScene = async (id: string) => {
    if (!confirm('确定删除这个分段？')) return;
    const passphrase = getPassphrase(activityId);
    const res = await fetch(`/api/scenes?id=${id}&passphrase=${passphrase}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      setScenes(prev => prev.filter(s => s.id !== id));
    } else {
      alert(result.error || '删除失败，请确认管理口令');
    }
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene.id);
    setEditForm({ name: scene.name, time_range: scene.time_range || '', location: scene.location || '' });
  };

  const handleSaveEdit = async (id: string) => {
    const passphrase = getPassphrase(activityId);
    const res = await fetch(`/api/scenes?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        time_range: editForm.time_range || null,
        location: editForm.location || null,
        passphrase,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, ...result.data } : s));
      setEditingScene(null);
    } else {
      alert(result.error || '保存失败，请确认管理口令');
    }
  };

  const handleGeneratePrompt = async () => {
    const intRes = await fetch(`/api/intentions?activity_id=${activityId}`);
    const intData = await intRes.json();
    const intentions = intData.data || [];

    const locationSummary = intentions
      .filter((i: { wants: string | null }) => i.wants)
      .map((i: { user_name: string; wants: string }) => `- ${i.user_name}：${i.wants}`)
      .join('\n');

    const voteSummary = sortedProposals.length > 0
      ? sortedProposals.map((p, i) => `${i + 1}. ${p.location}${p.activity_type ? `（${p.activity_type}）` : ''} - ${voteCounts[p.id] || 0}票`).join('\n')
      : '暂无投票结果';

    const sceneList = scenes.map(s => `- ${s.name}${s.time_range ? `（${s.time_range}）` : ''}${s.location ? ` @ ${s.location}` : ''}`).join('\n');

    const prompt = `你是一个专业的聚会活动策划助手。请根据以下信息，帮我生成一份详细的活动方案。

=====
【活动基本信息】
活动名称：${activity?.title || ''}
活动描述：${activity?.description || ''}
大致时间：${activity?.rough_time || ''}

=====
【意愿收集结果】
大家想去的方向：
${locationSummary || '暂无'}

=====
【投票结果排名】
${voteSummary}

=====
【分段安排草案】
${sceneList || '暂无分段，请根据投票结果建议合理的分段安排'}

=====
请为每个分段提供：
1. 具体时间安排（精确到半小时）
2. 地点推荐（需考虑交通便利性和成员分布）
3. 活动内容详细建议（含破冰/暖场安排）
4. 费用预估（人均）
5. 注意事项和备选方案

要求：
- 各分段之间预留充足的转场时间
- 考虑不同参与者的偏好差异
- 提供天气备选方案
- 标注需要提前预定的项目`;

    setPlan(prev => ({ ...prev, prompt_generated: prompt }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plan.prompt_generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePlan = async () => {
    const passphrase = getPassphrase(activityId);
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        content: plan.content,
        prompt_generated: plan.prompt_generated,
        passphrase,
      }),
    });
    const result = await res.json();
    if (result.data) {
      setSaved(true);
    } else {
      alert(result.error || '保存失败，请确认管理口令');
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">方案确认</h1>
            {isCreator && <span className="bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">组织者</span>}
            {!isCreator && <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 border-2 border-outline">只读</span>}
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

        {/* Vote Results Reference */}
        {sortedProposals.length > 0 && (
          <section className="mb-8">
            <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning" />投票结果参考</h2>
              <p className="text-sm text-muted-foreground mb-3">以下为投票排名，可参考结果手动添加分段</p>
              <div className="space-y-2">
                {sortedProposals.map((p, i) => (
                  <div key={p.id} className="bg-muted border-2 border-outline p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${i === 0 ? 'text-warning' : ''}`}>#{i + 1}</span>
                      <span className="font-bold">{p.location}</span>
                      {p.activity_type && <span className="text-muted-foreground text-sm">({p.activity_type})</span>}
                    </div>
                    <span className="font-bold text-sm">{voteCounts[p.id] || 0} 票</span>
                  </div>
                ))}
              </div>
              {isCreator && (
                <button
                  onClick={async () => {
                    // Auto-create scenes from top proposals
                    for (const p of sortedProposals) {
                      if (scenes.some(s => s.name === p.location)) continue;
                      const passphrase = getPassphrase(activityId);
                      const res = await fetch('/api/scenes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          activity_id: activityId,
                          name: p.location,
                          time_range: null,
                          location: p.location,
                          sort_order: scenes.length,
                          passphrase,
                        }),
                      });
                      const result = await res.json();
                      if (result.data) {
                        setScenes(prev => [...prev, result.data]);
                      }
                    }
                  }}
                  className="mt-4 bg-primary text-primary-foreground border-2 border-outline px-4 py-2 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  一键添加投票结果为分段
                </button>
              )}
            </div>
          </section>
        )}

        {/* Scene Setup */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">分段设置</h2>
            {isCreator && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-success text-white border-2 border-outline px-4 py-2 font-bold text-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
                style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
              >
                <Plus className="w-4 h-4" />添加分段
              </button>
            )}
          </div>

          {scenes.length === 0 ? (
            <div className="bg-card border-2 border-outline p-6 text-center text-muted-foreground" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
              还没有分段，点击上方按钮添加，或参考投票结果一键导入
            </div>
          ) : (
            <div className="space-y-3">
              {scenes.map(scene => (
                <div key={scene.id} className="bg-card border-2 border-outline p-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  {editingScene === scene.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          className="border-2 border-outline bg-muted px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="名称"
                        />
                        <input
                          className="border-2 border-outline bg-muted px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={editForm.time_range}
                          onChange={e => setEditForm(f => ({ ...f, time_range: e.target.value }))}
                          placeholder="时间范围"
                        />
                        <input
                          className="border-2 border-outline bg-muted px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={editForm.location}
                          onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                          placeholder="地点"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(scene.id)} className="bg-primary text-primary-foreground border-2 border-outline px-4 py-1.5 font-bold text-sm cursor-pointer">保存</button>
                        <button onClick={() => setEditingScene(null)} className="bg-card border-2 border-outline px-4 py-1.5 font-bold text-sm cursor-pointer hover:bg-muted">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className="bg-primary text-primary-foreground border-2 border-outline px-3 py-1 font-bold text-sm">{scene.name}</span>
                      {scene.time_range && <span className="text-sm text-muted-foreground">{scene.time_range}</span>}
                      {scene.location && <span className="text-sm font-medium">{scene.location}</span>}
                      <div className="flex-1" />
                      {isCreator && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditScene(scene)}
                            className="text-accent-blue hover:bg-muted border-2 border-outline p-2 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteScene(scene.id)}
                            className="text-error hover:bg-muted border-2 border-outline p-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Scene Form */}
          {showAddForm && isCreator && (
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

        {/* Prompt Generation - Organizer only */}
        {isCreator && (
          <section className="mb-8">
            <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent-blue" />Prompt 生成</h2>
              <p className="text-sm text-muted-foreground mb-4">生成 Prompt 后，复制到豆包专家模式、通义千问、ChatGPT 等 AI 工具中，获取详细活动方案</p>
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
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={handleCopy}
                      className="bg-card border-2 border-outline px-4 py-2 font-bold text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已复制' : '一键复制'}
                    </button>
                    <span className="text-xs text-muted-foreground">复制后粘贴到豆包专家模式、通义千问、ChatGPT 等 AI 工具中使用</span>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Plan Content */}
        <section className="mb-8">
          <div className="bg-card border-2 border-outline p-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />方案内容</h2>
            {isCreator ? (
              <>
                <textarea
                  className="w-full border-2 border-outline bg-muted p-4 text-base resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={plan.content}
                  onChange={e => setPlan(p => ({ ...p, content: e.target.value }))}
                  placeholder="粘贴 AI 生成的方案内容，或手动编写..."
                  rows={10}
                />
                <div className="flex items-center gap-4 mt-3">
                  <button
                    onClick={handleSavePlan}
                    disabled={!plan.content}
                    className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                  >
                    {saved ? '已保存 ✓' : '保存方案'}
                  </button>
                  {saved && (
                    <button
                      onClick={async () => {
                        const passphrase = getPassphrase(activityId);
                        const res = await fetch(`/api/activities/${activityId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'registering', passphrase }),
                        });
                        const result = await res.json();
                        if (result.error) {
                          alert(result.error || '状态更新失败');
                        } else {
                          window.location.href = `/register?activity_id=${activityId}`;
                        }
                      }}
                      className="bg-success text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                      style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                    >
                      开放报名 <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-muted border-2 border-outline p-4 min-h-[100px] text-base whitespace-pre-wrap">
                {plan.content || '组织者尚未填写方案内容'}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PlanPage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><PlanPageContent /></Suspense>;
}
