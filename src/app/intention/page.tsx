'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getUserId, getUserName, isOrganizer, getPassphrase, setPassphrase, isActivityAccessed, markActivityAccessed } from '@/lib/party';
import { Send, BarChart3, Clock, Users, MapPin, CheckCircle2, KeyRound, Calendar } from 'lucide-react';

interface Intention {
  id: string;
  user_id: string;
  user_name: string;
  wants: string | null;
  wants_time: string | null;
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

const RSVP_OPTIONS = [
  { value: 'can_join', label: '可以', emoji: '✅', color: 'bg-success text-white' },
  { value: 'depends', label: '看时间', emoji: '🤔', color: 'bg-warning text-[#0A0A0A]' },
  { value: 'unsure', label: '暂时不确定', emoji: '💭', color: 'bg-muted text-foreground' },
] as const;

type RsvpStatus = typeof RSVP_OPTIONS[number]['value'];

function IntentionPageContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const isCreator = isOrganizer(activityId);
  const [tab, setTab] = useState<'form' | 'summary'>('form');
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [form, setForm] = useState({
    user_name: '',
    wants: '',
    wants_time: '',
    estimated_people: 1,
    selected_scenes: [] as string[],
    rsvp: '' as RsvpStatus | '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    if (!isActivityAccessed(activityId) && !isOrganizer(activityId)) {
      window.location.href = `/activity?id=${activityId}`;
      return;
    }
    if (isOrganizer(activityId)) {
      markActivityAccessed(activityId);
    }
    Promise.all([
      fetch(`/api/intentions?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([intRes, sceneRes]) => {
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
        wants_time: existing.wants_time || '',
        estimated_people: existing.estimated_people || 1,
        selected_scenes: existing.selected_scenes ? JSON.parse(existing.selected_scenes) : [],
        rsvp: existing.wants ? 'can_join' : existing.wants_time ? 'depends' : 'unsure',
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
        wants_time: form.wants_time || null,
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

  // RSVP counts
  const rsvpCounts = {
    can_join: intentions.filter(i => i.wants || i.wants_time).length,
    depends: intentions.filter(i => i.wants_time && !i.wants).length,
    unsure: intentions.filter(i => !i.wants && !i.wants_time).length,
  };
  const totalPeople = intentions.reduce((sum, i) => sum + (i.estimated_people || 1), 0);
  const wantsList = intentions.filter(i => i.wants).map(i => ({ name: i.user_name, wants: i.wants! }));
  const wantsTimeList = intentions.filter(i => i.wants_time).map(i => ({ name: i.user_name, wants_time: i.wants_time! }));

  // Time preferences aggregation
  const timePreferences = wantsTimeList.reduce<Record<string, string[]>>((acc, item) => {
    const times = item.wants_time.split(/[、,，\s]+/).filter(Boolean);
    times.forEach(t => {
      const key = t.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.name);
    });
    return acc;
  }, {});
  const sortedTimePrefs = Object.entries(timePreferences).sort((a, b) => b[1].length - a[1].length);

  // Location preferences aggregation
  const locationPreferences = wantsList.reduce<Record<string, string[]>>((acc, item) => {
    const locations = item.wants.split(/[、,，\s]+/).filter(Boolean);
    locations.forEach(l => {
      const key = l.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.name);
    });
    return acc;
  }, {});
  const sortedLocationPrefs = Object.entries(locationPreferences).sort((a, b) => b[1].length - a[1].length);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">意愿收集</h1>
          <div className="flex items-center gap-2">
            {isCreator && <span className="bg-accent-blue text-white text-xs font-bold px-2 py-1 border-2 border-outline">组织者</span>}
            <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
              返回活动
            </Link>
          </div>
        </div>

        {/* Quick RSVP - Primary Question */}
        <div className="bg-card border-2 border-outline p-5 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
          <h2 className="text-lg font-bold mb-1">你大概能参加吗？</h2>
          <p className="text-sm text-muted-foreground mb-4">先选一个大方向，细节可以之后补充</p>
          <div className="grid grid-cols-3 gap-3">
            {RSVP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, rsvp: opt.value }))}
                className={`border-2 border-outline p-3 font-bold text-center transition-all cursor-pointer min-h-[60px] flex flex-col items-center justify-center gap-1 ${
                  form.rsvp === opt.value
                    ? `${opt.color} scale-[1.02]`
                    : 'bg-card hover:bg-muted'
                }`}
                style={form.rsvp === opt.value ? { boxShadow: '4px 4px 0 #0A0A0A' } : {}}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
          {form.rsvp && (
            <p className="text-sm text-muted-foreground mt-3">
              {form.rsvp === 'can_join' && '好的！下面可以补充你想去哪里、什么时候方便'}
              {form.rsvp === 'depends' && '没关系，填一下你大概方便的时间，组织者会参考'}
              {form.rsvp === 'unsure' && '没问题，有想法了随时回来更新'}
            </p>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('form')}
            className={`px-4 py-2 font-bold border-2 border-outline transition-all cursor-pointer text-sm ${tab === 'form' ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><Send className="w-4 h-4" />补充想法</span>
          </button>
          <button
            onClick={() => setTab('summary')}
            className={`px-4 py-2 font-bold border-2 border-outline transition-all cursor-pointer text-sm ${tab === 'summary' ? 'bg-primary text-[#0A0A0A]' : 'bg-card hover:bg-muted'}`}
          >
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />大家的想法</span>
          </button>
        </div>

        {/* Submit Success Toast */}
        {showSubmitSuccess && (
          <div className="mb-6 bg-success text-white border-2 border-outline p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">已记录！你可以关闭页面了</p>
              <p className="text-sm opacity-90">有变化随时回来更新</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-primary">{intentions.length}</div>
            <div className="text-xs text-muted-foreground">已回应</div>
          </div>
          <div className="bg-card border-2 border-outline p-3 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <div className="text-xl font-bold text-accent-blue">{totalPeople}</div>
            <div className="text-xs text-muted-foreground">预计总人数</div>
          </div>
        </div>

        {/* Form Tab */}
        {tab === 'form' && (
          <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
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
                <label className="block text-sm font-bold mb-1">可参加时间</label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.wants_time}
                  onChange={e => setForm(f => ({ ...f, wants_time: e.target.value }))}
                  placeholder="如：周六下午、下周末、7月初等"
                />
                <p className="text-xs text-muted-foreground mt-1">多个用顿号分隔，如"周六下午、周日上午"</p>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">想做什么 / 去哪</label>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.wants}
                  onChange={e => setForm(f => ({ ...f, wants: e.target.value }))}
                  placeholder="说说你的想法"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">几个人</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, estimated_people: Math.max(1, f.estimated_people - 1) }))}
                    className="w-11 h-11 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer"
                  >-</button>
                  <span className="text-2xl font-bold w-12 text-center">{form.estimated_people}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, estimated_people: f.estimated_people + 1 }))}
                    className="w-11 h-11 border-2 border-outline bg-card font-bold text-xl hover:bg-muted cursor-pointer"
                  >+</button>
                </div>
              </div>
              {scenes.length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-2">参与时间段（多选）</label>
                  <div className="space-y-2">
                    {scenes.map(scene => (
                      <label key={scene.id} className="flex items-center gap-3 bg-muted border-2 border-outline p-3 cursor-pointer hover:bg-muted/80 transition-colors">
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
              className="mt-5 bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full text-center"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {submitted ? '更新意愿' : '提交'}
            </button>
            {submitted && <p className="text-sm text-muted-foreground text-center mt-2">已记录，有变化随时更新</p>}
          </div>
        )}

        {/* Summary Tab */}
        {tab === 'summary' && (
          <div className="space-y-5">
            {/* RSVP Summary */}
            <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><Users className="w-5 h-5 text-primary" />回应情况</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>✅ 可以</span>
                  <span className="font-bold">{rsvpCounts.can_join} 人</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🤔 看时间</span>
                  <span className="font-bold">{rsvpCounts.depends} 人</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>💭 暂不确定</span>
                  <span className="font-bold">{rsvpCounts.unsure} 人</span>
                </div>
              </div>
            </div>

            {/* Time Preferences */}
            {sortedTimePrefs.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-accent-blue" />时间偏好</h3>
                <div className="space-y-2">
                  {sortedTimePrefs.map(([time, people]) => (
                    <div key={time} className="flex items-center justify-between bg-muted p-3 border-2 border-outline">
                      <span className="font-medium">{time}</span>
                      <span className="text-sm text-muted-foreground">{people.length} 人 · {people.join('、')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Preferences */}
            {sortedLocationPrefs.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />地点偏好</h3>
                <div className="space-y-2">
                  {sortedLocationPrefs.map(([loc, people]) => (
                    <div key={loc} className="flex items-center justify-between bg-muted p-3 border-2 border-outline">
                      <span className="font-medium">{loc}</span>
                      <span className="text-sm text-muted-foreground">{people.length} 人 · {people.join('、')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Responses */}
            {intentions.length > 0 && (
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <h3 className="font-bold mb-3">所有人的回应</h3>
                <div className="space-y-3">
                  {intentions.map(i => (
                    <div key={i.id} className="bg-muted p-3 border-2 border-outline">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{i.user_name}</span>
                        <span className="text-xs text-muted-foreground">{i.estimated_people}人</span>
                      </div>
                      {i.wants_time && <p className="text-sm">🕐 {i.wants_time}</p>}
                      {i.wants && <p className="text-sm">📍 {i.wants}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {intentions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold">还没有人回应</p>
                <p className="text-sm mt-1">分享活动给朋友，让大家来填</p>
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
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <IntentionPageContent />
    </Suspense>
  );
}
