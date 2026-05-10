'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Receipt, ArrowRight, Check } from 'lucide-react';

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

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export default function SettlePage() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activity_id') || '';
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settled, setSettled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    Promise.all([
      fetch(`/api/scenes?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/participants?activity_id=${activityId}`).then(r => r.json()),
      fetch(`/api/bills?activity_id=${activityId}`).then(r => r.json()),
    ]).then(([sceneRes, partRes, billRes]) => {
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
    await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_id: activityId,
        scene_id: sceneId,
        total_amount: bill.total_amount,
      }),
    });
  };

  // Calculate per-person bills
  const sceneMap = new Map(scenes.map(s => [s.id, s.name]));
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

  // Calculate transfers (simple: everyone pays average, those who paid less owe those who paid more)
  const transfers: Transfer[] = [];
  if (personBills.length > 0) {
    const avg = personBills.reduce((sum, p) => sum + p.total, 0) / personBills.length;
    const debtors = personBills.filter(p => p.total < avg).map(p => ({ name: p.name, diff: avg - p.total }));
    const creditors = personBills.filter(p => p.total > avg).map(p => ({ name: p.name, diff: p.total - avg }));

    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].diff, creditors[ci].diff);
      if (amount > 0.01) {
        transfers.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amount * 100) / 100 });
      }
      debtors[di].diff -= amount;
      creditors[ci].diff -= amount;
      if (debtors[di].diff < 0.01) di++;
      if (creditors[ci].diff < 0.01) ci++;
    }
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="w-8 h-8 text-primary" />记账结算</h1>
          <Link href={`/activity?id=${activityId}`} className="text-accent-blue font-bold text-sm border-2 border-outline px-3 py-1.5 hover:bg-muted transition-colors">
            返回活动
          </Link>
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
                        <input
                          type="number"
                          className="flex-1 border-2 border-outline bg-muted px-4 py-2.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                          value={amount || ''}
                          onChange={e => handleAmountChange(scene.id, e.target.value)}
                          onBlur={() => handleSaveBill(scene.id)}
                          placeholder="0"
                        />
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

        {/* Who owes whom */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">谁欠谁</h2>
          {transfers.length === 0 ? (
            <div className="bg-card border-2 border-outline p-6 text-center text-muted-foreground" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
              请先填写各段账单金额
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t, i) => (
                <div key={i} className="bg-card border-2 border-outline p-4 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <span className="font-bold text-lg">{t.from}</span>
                  <ArrowRight className="w-5 h-5 text-primary" />
                  <span className="font-bold text-lg">{t.to}</span>
                  <div className="flex-1" />
                  <span className="text-2xl font-bold text-primary">¥{t.amount.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Settle button */}
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
      </main>
    </div>
  );
}
