import type { Metadata } from 'next';
import './globals.css';
import { PageViewTracker } from '@/components/page-view-tracker';

export const metadata: Metadata = {
  title: '我们聚会吧Beta | 一站式聚会组织工具',
  description: '从创建活动到记账结算，一站式完成朋友聚会的全程工具。意愿收集、投票去哪、方案确认、分段报名、记账结算，让聚会组织不再混乱。',
  keywords: '聚会,聚会组织,活动管理,投票,报名,记账,朋友聚会,团建,派对',
  openGraph: {
    title: '我们聚会吧Beta | 一站式聚会组织工具',
    description: '从创建活动到记账结算，一站式完成朋友聚会的全程工具',
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
