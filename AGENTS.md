# 我们聚会吧Beta - 项目文档

## 项目概览

朋友聚会组织 Web 工具，支持创建活动、意愿收集、投票去哪、方案确认、分段报名、记账结算的全流程。无需登录，输入昵称即可参与。

### 版本技术栈

| 维度 | 选择 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Core | React 19 |
| Language | TypeScript 5 |
| UI 组件 | shadcn/ui (基于 Radix UI) |
| Styling | Tailwind CSS 4 (粗野风 Neo-Brutalism 主题) |
| Database | Supabase (PostgreSQL) |
| 包管理器 | pnpm |

## 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页 - 活动列表 + 创建
│   ├── layout.tsx            # 全局布局
│   ├── globals.css           # 全局样式 + @theme 设计变量
│   ├── activity/page.tsx     # 活动详情 - 状态流转 + 功能入口
│   ├── intention/page.tsx    # 意愿收集 - 填写/汇总双Tab
│   ├── vote/page.tsx         # 投票去哪 - 提方案/投票/结果三Tab
│   ├── plan/page.tsx         # 方案确认 - 分段设置 + Prompt生成
│   ├── register/page.tsx     # 分段报名 - 按段报名 + 已报名列表
│   ├── dashboard/page.tsx    # 组织者看板 - 参与人管理
│   ├── settle/page.tsx       # 记账结算 - 账单/分摊/转账指引
│   └── api/                  # API 路由
│       ├── activities/       # 活动 CRUD + 状态流转
│       ├── scenes/           # 分段管理
│       ├── intentions/       # 意愿提交与查询
│       ├── vote-proposals/   # 投票方案
│       ├── vote-records/     # 投票记录
│       ├── registrations/    # 报名
│       ├── participants/     # 参与人（看板用）
│       ├── bills/            # 账单
│       └── plans/            # 方案内容
├── components/
│   ├── navbar.tsx            # 顶部导航
│   └── ui/                   # shadcn/ui 组件
├── lib/
│   ├── party.ts              # 用户身份工具 (localStorage userId/name)
│   └── utils.ts              # 通用工具 (cn)
└── storage/database/
    ├── supabase-client.ts    # Supabase 客户端 (service_role_key)
    └── shared/schema.ts      # Drizzle ORM Schema 定义
```

## 构建与测试命令

```bash
pnpm dev          # 开发环境 (端口 5000)
pnpm build        # 生产构建
pnpm start        # 生产启动
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查
```

## 数据库

9 张表：activities, scenes, intentions, vote_proposals, vote_records, registrations, participants, bills, plans

使用 Supabase service_role_key 绕过 RLS，公开读写。

### 活动状态流转

`collecting` → `voting` → `plan` → `registering` → `started` → `settling` → `settled`

## 设计风格

粗野风 (Neo-Brutalism)：粗黑边框、错位阴影、大字号、零圆角
- 主色：粉色 #FF4DB8
- 背景：暖白 #FAFAF5
- 强调：蓝色 #3B82F6
- 成功：绿色 #22C55E
- 警告：黄色 #FFF34D

## 开发注意事项

- 用户身份通过 localStorage 存储的 UUID 和昵称标识，无需登录
- API 路由统一使用 `getSupabaseClient()` 获取客户端
- 前端页面均为 'use client' 组件，使用 fetch 调用 API
- 活动创建后默认状态为 `collecting`（意愿收集中）
- 意愿/投票有 upsert 逻辑，同用户重复提交会覆盖
