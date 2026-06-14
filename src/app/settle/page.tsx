'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { isOrganizer, getPassphrase, setPassphrase, isActivityAccessed } from '@/lib/party';
import { Receipt, KeyRound } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  scene_id: string;
  user_name: string;
  people_count: number;
  is_temp: boolean;
}

interface Bill {
  id: string;
  scene_id: string;
  total_amount: number;
}

interface PersonBill {
  name: string;
  scenes: string[];
  total: number;
}



function SettleContent() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
    const isCreator = isOrganizer(activityId);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settled, setSettled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    if (!isActivityAccessed(activityId)) {
      window.location.href = `/activity?id=${activityId}`;
      return;
    }
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/participants?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/bills?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/activities?id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, partRes, billRes, actRes]) => {
      setScenes(sceneRes.data || []);
      setParticipants(partRes.data || []);
      setBills(billRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activityId]);

  const handleAmountChange = async (sceneId: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    setBills(prev => prev.map(b => b.scene_id === sceneId ? { ...b, total_amount: val } : b));
  };

  const handleSaveBill = async (sceneId: string) => {
    const bill = bills.find(b => b.scene_id === sceneId);
    if (!bill) return;
    const passphrase = getPassphrase(activityId);
    await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        scene_id: sceneId,
        total_amount: bill.total_amount,
        passphrase,
      }),
    });
  };

  // Calculate per-person bills
  const personBills: PersonBill[] = [];
  const nameMap = new Map<string, PersonBill>();

  for (const scene of scenes) {
    const bill = bills.find(b => b.scene_id === scene.id);
    const sceneParts = participants.filter(p => p.scene_id === scene.id);
    const totalPeople = sceneParts.reduce((sum, p) => sum + p.people_count, 0);
    const perPerson = totalPeople > 0 && bill ? bill.total_amount / totalPeople : 0;

    for (const part of sceneParts) {
      if (!nameMap.has(part.user_name)) {
        const pb: PersonBill = { name: part.user_name, scenes: [], total: 0 };
        nameMap.set(part.user_name, pb);
        personBills.push(pb);
      }
      const pb = nameMap.get(part.user_name)!;
      if (!pb.scenes.includes(scene.name)) pb.scenes.push(scene.name);
      pb.total += perPerson * part.people_count;
    }
  }



  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="w-8 h-8 text-primary" />记账结算</h1>
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

        {/* Bills per scene */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">分段账单</h2>
          <div className="space-y-4">
            {scenes.map((scene, i) => {
              const bill = bills.find(b => b.scene_id === scene.id);
              const sceneParts = participants.filter(p => p.scene_id === scene.id);
              const totalPeople = sceneParts.reduce((sum, p) => sum + p.people_count, 0);
              const amount = bill?.total_amount || 0;
              const perPerson = totalPeople > 0 ? amount / totalPeople : 0;
              const shadows = ['5px 5px 0 #0A0A0A', '6px 4px 0 #0A0A0A', '4px 6px 0 #0A0A0A'] as const;
              return (
                <div key={scene.id} className="bg-card border-2 border-outline p-5" style={{ boxShadow: shadows[i % 3] }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-primary text-primary-foreground border-2 border-outline px-3 py-1 font-bold text-sm">{scene.name}</span>
                    <span className="text-sm text-muted-foreground">{totalPeople} 人参与</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-bold mb-1">总金额</label>
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold">¥</span>
                        {isCreator ? (
                          <input
                            type="number"
                            className="flex-1 border-2 border-outline bg-muted px-4 py-2.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={amount || ''}
                            onChange={e => handleAmountChange(scene.id, e.target.value)}
                            onBlur={() => handleSaveBill(scene.id)}
                            placeholder="0"
                          />
                        ) : (
                          <div className="flex-1 border-2 border-outline bg-muted px-4 py-2.5 text-xl font-bold">{amount || '-'}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">参与人数</label>
                      <div className="border-2 border-outline bg-muted px-4 py-2.5 text-xl font-bold">{totalPeople}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">人均</label>
                      <div className="border-2 border-outline bg-muted px-4 py-2.5 text-xl font-bold text-primary">¥{perPerson.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Person summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">个人应付汇总</h2>
          <div className="bg-card border-2 border-outline overflow-hidden" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-high border-b-2 border-outline">
                  <th className="text-left px-4 py-3 font-bold">姓名</th>
                  <th className="text-left px-4 py-3 font-bold">参与段次</th>
                  <th className="text-right px-4 py-3 font-bold">应付总额</th>
                </tr>
              </thead>
              <tbody>
                {personBills.map((p, i) => (
                  <tr key={p.name} className={i % 2 === 1 ? 'bg-surface-container' : ''}>
                    <td className="px-4 py-3 font-bold">{p.name}</td>
                    <td className="px-4 py-3">
                      {p.scenes.map(s => (
                        <span key={s} className="bg-accent-blue/20 text-accent-blue border border-accent-blue/30 px-2 py-0.5 text-xs font-bold mr-1">{s}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-lg">¥{p.total.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>



        {/* Settle button - Organizer only */}
        {isCreator && (
          <section>
            <button
              onClick={() => { setSettled(true); }}
              disabled={settled}
              className="bg-success text-white border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
            >
              {settled ? '已结算' : '标记已结算'}
            </button>
          </section>
        )}
        {!isCreator && settled && (
          <section>
            <span className="bg-success text-white border-2 border-outline px-4 py-2 font-bold">已结算</span>
          </section>
        )}
      </main>
    </div>
  );
}

export default function SettlePage() {
  return <Suspense fallback={<div className="p-8 text-center">加载中...</div>}><SettleContent /></Suspense>;
}
