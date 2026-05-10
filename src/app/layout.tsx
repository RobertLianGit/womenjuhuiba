import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '开始聚会吧 | 一站式聚会组织工具',
  description: '从创建活动到记账结算，一站式完成朋友聚会的全程工具',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
