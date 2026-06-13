import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = getSupabaseClient();

  try {
    // 基础统计
    const [activities, intentions, proposals, registrations, participants, bills] = await Promise.all([
      supabase.from('activities').select('id, status, created_at, creator_name'),
      supabase.from('intentions').select('id, activity_id'),
      supabase.from('vote_proposals').select('id, activity_id'),
      supabase.from('registrations').select('id, activity_id'),
      supabase.from('participants').select('id, activity_id'),
      supabase.from('bills').select('id, activity_id, amount'),
    ]);

    const allActivities = activities.data || [];

    // 按状态分组
    const statusCount: Record<string, number> = {};
    allActivities.forEach((a: { status: string }) => {
      statusCount[a.status] = (statusCount[a.status] || 0) + 1;
    });

    // 按日期分组（最近30天）
    const dailyCounts: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyCounts[key] = 0;
    }
    allActivities.forEach((a: { created_at: string }) => {
      const key = a.created_at?.slice(0, 10);
      if (key && key in dailyCounts) {
        dailyCounts[key]++;
      }
    });

    // 最近活动
    const recentActivities = allActivities
      .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // 报名最多的活动
    const regCounts: Record<string, number> = {};
    (registrations.data || []).forEach((r: { activity_id: string }) => {
      regCounts[r.activity_id] = (regCounts[r.activity_id] || 0) + 1;
    });

    const topActivities = Object.entries(regCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => {
        const act = allActivities.find((a: { id: string }) => a.id === id);
        return { id, title: act?.creator_name || '未知', count };
      });

    // PV/UV 统计
    const [pvToday, pvWeek, pvMonth, uvToday, uvWeek, uvMonth] = await Promise.all([
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('page_views').select('visitor_id').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from('page_views').select('visitor_id').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('page_views').select('visitor_id').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ]);

    const uniqueVisitors = (data: { visitor_id: string | null }[]) => new Set((data || []).map((d: { visitor_id: string | null }) => d.visitor_id).filter(Boolean)).size;

    return NextResponse.json({
      data: {
        overview: {
          totalActivities: allActivities.length,
          totalIntentions: intentions.data?.length || 0,
          totalProposals: proposals.data?.length || 0,
          totalRegistrations: registrations.data?.length || 0,
          totalParticipants: participants.data?.length || 0,
          totalBills: bills.data?.length || 0,
          pvToday: pvToday.count || 0,
          pvWeek: pvWeek.count || 0,
          pvMonth: pvMonth.count || 0,
          uvToday: uniqueVisitors(uvToday.data || []),
          uvWeek: uniqueVisitors(uvWeek.data || []),
          uvMonth: uniqueVisitors(uvMonth.data || []),
        },
        statusCount,
        dailyCounts,
        recentActivities,
        topActivities,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
