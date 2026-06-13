'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { ArrowLeft, BarChart3, Users, Calendar, TrendingUp, Activity, Eye, Share2 } from 'lucide-react';

interface Stats {
  overview: {
    totalActivities: number;
    totalIntentions: number;
    totalProposals: number;
    totalRegistrations: number;
    totalParticipants: number;
    totalBills: number;
    pvToday: number;
    pvWeek: number;
    pvMonth: number;
    uvToday: number;
    uvWeek: number;
    uvMonth: number;
  };
  statusCount: Record<string, number>;
  dailyCounts: Record<string, number>;
  recentActivities: Array<{ id: string; title: string; status: string; created_at: string; creator_name: string }>;
  topActivities: Array<{ id: string; title: string; count: number }>;
}

const STATUS_MAP: Record<string, string> = {
  collecting: '意愿收集中',
  voting: '投票中',
  plan: '方案确认中',
  registering: '报名中',
  started: '进行中',
  settling: '结算中',
  settled: '已结算',
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 每日趋势最大值
  const maxDaily = stats ? Math.max(...Object.values(stats.dailyCounts), 1) : 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 顶部 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 border-2 border-foreground rounded-lg hover:shadow-brutal transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black">管理后台</h1>
          <span className="ml-auto text-sm text-muted-foreground">数据统计与推广</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-lg font-bold">加载中...</div>
        ) : !stats ? (
          <div className="text-center py-20 text-lg">暂无数据</div>
        ) : (
          <>
            {/* 核心指标 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard icon={<Calendar className="w-5 h-5" />} label="活动总数" value={stats.overview.totalActivities} color="bg-primary text-primary-foreground" />
              <StatCard icon={<Users className="w-5 h-5" />} label="参与者" value={stats.overview.totalParticipants} color="bg-accent-blue text-white" />
              <StatCard icon={<Activity className="w-5 h-5" />} label="意愿提交" value={stats.overview.totalIntentions} color="bg-success text-white" />
              <StatCard icon={<BarChart3 className="w-5 h-5" />} label="投票方案" value={stats.overview.totalProposals} color="bg-warning text-primary-foreground" />
              <StatCard icon={<TrendingUp className="w-5 h-5" />} label="报名人数" value={stats.overview.totalRegistrations} color="bg-accent-blue text-white" />
              <StatCard icon={<Eye className="w-5 h-5" />} label="账单数" value={stats.overview.totalBills} color="bg-muted text-foreground" />
            </div>

            {/* 访问统计 */}
            <div className="border-2 border-foreground rounded-lg p-4 mb-6 bg-card shadow-brutal">
              <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Eye className="w-5 h-5" /> 访问统计</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center border-2 border-foreground/20 rounded-lg p-3">
                  <div className="text-2xl font-black">{stats.overview.pvToday}</div>
                  <div className="text-xs text-muted-foreground mt-1">今日PV</div>
                  <div className="text-sm font-bold text-primary">{stats.overview.uvToday} UV</div>
                </div>
                <div className="text-center border-2 border-foreground/20 rounded-lg p-3">
                  <div className="text-2xl font-black">{stats.overview.pvWeek}</div>
                  <div className="text-xs text-muted-foreground mt-1">近7天PV</div>
                  <div className="text-sm font-bold text-primary">{stats.overview.uvWeek} UV</div>
                </div>
                <div className="text-center border-2 border-foreground/20 rounded-lg p-3">
                  <div className="text-2xl font-black">{stats.overview.pvMonth}</div>
                  <div className="text-xs text-muted-foreground mt-1">近30天PV</div>
                  <div className="text-sm font-bold text-primary">{stats.overview.uvMonth} UV</div>
                </div>
              </div>
            </div>

            {/* 活动状态分布 */}
            <div className="border-2 border-foreground rounded-lg p-4 mb-6 bg-card shadow-brutal">
              <h2 className="text-lg font-black mb-3">活动状态分布</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.statusCount).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 border-2 border-foreground rounded-lg px-3 py-1.5 bg-muted">
                    <span className="text-sm font-bold">{STATUS_MAP[status] || status}</span>
                    <span className="bg-foreground text-background px-2 py-0.5 rounded text-sm font-black">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.statusCount).length === 0 && (
                  <span className="text-muted-foreground text-sm">暂无活动</span>
                )}
              </div>
            </div>

            {/* 每日趋势 */}
            <div className="border-2 border-foreground rounded-lg p-4 mb-6 bg-card shadow-brutal">
              <h2 className="text-lg font-black mb-3">近30天活动创建趋势</h2>
              <div className="flex items-end gap-0.5 h-32">
                {Object.entries(stats.dailyCounts).map(([date, count]) => (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      className="w-full bg-primary rounded-t-sm min-h-[2px] transition-all hover:bg-accent-blue"
                      style={{ height: `${Math.max((count / maxDaily) * 100, 2)}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {date.slice(5)}: {count}个
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>30天前</span>
                <span>今天</span>
              </div>
            </div>

            {/* 最近活动 */}
            <div className="border-2 border-foreground rounded-lg p-4 mb-6 bg-card shadow-brutal">
              <h2 className="text-lg font-black mb-3">最近创建的活动</h2>
              {stats.recentActivities.length === 0 ? (
                <span className="text-muted-foreground text-sm">暂无活动</span>
              ) : (
                <div className="space-y-2">
                  {stats.recentActivities.map(a => (
                    <div key={a.id} className="flex items-center gap-3 border-2 border-foreground/20 rounded-lg px-3 py-2">
                      <span className="font-bold flex-1 truncate">{a.title || '未命名'}</span>
                      <span className="text-xs text-muted-foreground">{a.creator_name}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{STATUS_MAP[a.status] || a.status}</span>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 推广工具 */}
            <div className="border-2 border-foreground rounded-lg p-4 mb-6 bg-card shadow-brutal">
              <h2 className="text-lg font-black mb-3 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                推广工具
              </h2>
              <div className="space-y-3">
                <div className="border-2 border-foreground/20 rounded-lg p-3">
                  <h3 className="font-bold mb-1">分享文案</h3>
                  <p className="text-sm text-muted-foreground mb-2">复制以下文案发朋友圈或群聊：</p>
                  <div className="bg-muted rounded-lg p-3 text-sm relative group">
                    <span id="share-text">🎉 朋友聚会再也不用群里刷屏了！用「我们聚会吧」创建活动，收意愿、投票去哪、分段报名、记账结算，一站式搞定！快来试试 👇</span>
                    <button
                      onClick={() => {
                        const text = document.getElementById('share-text')?.textContent || '';
                        const url = window.location.origin;
                        navigator.clipboard.writeText(text + '\n' + url);
                        alert('已复制分享文案！');
                      }}
                      className="absolute top-2 right-2 bg-foreground text-background px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      复制
                    </button>
                  </div>
                </div>

                <div className="border-2 border-foreground/20 rounded-lg p-3">
                  <h3 className="font-bold mb-1">网站地址</h3>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted rounded px-3 py-1.5 text-sm font-mono flex-1">{window?.location?.origin || 'https://happyparty.fun'}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        alert('已复制！');
                      }}
                      className="border-2 border-foreground rounded-lg px-3 py-1.5 text-sm font-bold hover:shadow-brutal transition-all"
                    >
                      复制
                    </button>
                  </div>
                </div>

                <div className="border-2 border-foreground/20 rounded-lg p-3">
                  <h3 className="font-bold mb-1">推广建议</h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>1. 在朋友聚会后分享活动链接，让大家体验完整流程</li>
                    <li>2. 发朋友圈时带上活动截图，展示投票/报名界面</li>
                    <li>3. 在公司团建群里发起第一个活动</li>
                    <li>4. 让已使用的用户口碑传播</li>
                    <li>5. 可以在活动创建后把二维码海报发到群里</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="border-2 border-foreground rounded-lg p-3 shadow-brutal">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
