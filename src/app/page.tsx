'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, setUserName } from '@/lib/party';
import { Plus, Calendar, PartyPopper } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; rotate: string }> = {
  collecting: { label: '意愿收集中', bg: 'bg-primary text-primary-foreground', rotate: '-rotate-2' },
  voting:     { label: '投票中', bg: 'bg-accent-blue text-white', rotate: 'rotate-1' },
  plan:       { label: '方案确认中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-2' },
  registering:{ label: '报名中', bg: 'bg-success text-white', rotate: '-rotate-1' },
  started:    { label: '进行中', bg: 'bg-accent-blue text-white', rotate: '-rotate-2' },
  settling:   { label: '结算中', bg: 'bg-warning text-primary-foreground', rotate: 'rotate-1' },
  settled:    { label: '已结算', bg: 'bg-muted text-muted-foreground', rotate: '' },
};

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', rough_time: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(res => {
        setActivities(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.rough_time) return;
    const userId = getUserId();
    const userName = getUserName() || '我';
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, creator_id: userId, creator_name: userName }),
    });
    const result = await res.json();
    if (result.data) {
      setActivities(prev => [result.data, ...prev]);
      setShowCreateModal(false);
      setForm({ title: '', description: '', rough_time: '' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar activePage="home" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="mb-12">
          <div className="bg-card border-2 border-outline p-10 md:p-14 relative" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="absolute top-4 right-6 w-16 h-16 bg-primary opacity-20 -z-0" />
            <div className="absolute bottom-3 right-20 w-10 h-10 bg-accent-blue opacity-15 -z-0" />
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3">我们聚会吧<span className="text-base font-normal align-super ml-1 text-secondary">Beta</span></h1>
              <p className="text-xl md:text-2xl font-medium text-muted-foreground mb-8">从创建到结算，一站式聚会工具</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground border-2 border-outline px-8 py-4 text-xl font-bold tracking-wide hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[4px_4px_0_#0A0A0A] transition-all cursor-pointer"
                style={{ boxShadow: '8px 8px 0 #0A0A0A' }}
              >
                <span className="flex items-center gap-3">
                  <Plus className="w-6 h-6" />创建活动
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Activity List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">近期活动</h2>
            <span className="text-sm font-medium text-muted-foreground">共 {activities.length} 个活动</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : activities.length === 0 ? (
            <div className="bg-card border-2 border-outline p-12 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <PartyPopper className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
              <p className="text-xl font-bold mb-2">还没有活动</p>
              <p className="text-muted-foreground mb-6">点击上方按钮，创建你的第一个聚会活动吧</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activities.map((act) => {
                const st = STATUS_MAP[act.status] || STATUS_MAP.collecting;
                return (
                  <Link
                    key={act.id}
                    href={`/activity?id=${act.id}`}
                    className="bg-card border-2 border-outline p-5 block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all group"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{act.title}</h3>
                      <span className={`inline-block ${st.bg} border-2 border-outline px-2.5 py-1 text-xs font-bold ${st.rotate} shrink-0 ml-3`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{act.rough_time}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t-2 border-outline/15 text-xs text-muted-foreground">
                      由 {act.creator_name} 创建于 {new Date(act.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border-2 border-outline w-full max-w-lg p-8 relative" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h2 className="text-2xl font-bold mb-6">创建新活动</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">活动名称 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="如：周末烧烤派对"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">活动描述 <span className="text-error">*</span></label>
                <textarea
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="简单描述一下聚会的内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">大致时间 <span className="text-error">*</span></label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.rough_time}
                  onChange={e => setForm(f => ({ ...f, rough_time: e.target.value }))}
                  placeholder="如：周末、下周六、12月底"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCreate}
                disabled={!form.title || !form.description || !form.rough_time}
                className="bg-primary text-primary-foreground border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                创建活动
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setForm({ title: '', description: '', rough_time: '' }); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
