# 我们聚会吧Beta - 项目文档

## 项目概览

朋友聚会组织工具，支持创建活动、意愿收集、投票去哪、方案确认、分段报名、记账结算的全流程。

- **Web版**：无需登录，输入昵称即可参与，粗野风设计

### 技术栈

| 维度 | 说明 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Core | React 19 |
| Language | TypeScript 5 |
| UI 组件 | shadcn/ui |
| Styling | Tailwind CSS 4 (粗野风) |
| Database | Supabase |
| 登录 | 昵称+localStorage |
| 包管理器 | pnpm |

## 目录结构

```
├── src/                        # 源码
│   ├── app/
│   │   ├── page.tsx            # 首页 - 活动列表 + 创建
│   │   ├── layout.tsx          # 全局布局
│   │   ├── globals.css         # 全局样式 + @theme 设计变量
│   │   ├── activity/page.tsx   # 活动详情
│   │   ├── intention/page.tsx  # 意愿收集
│   │   ├── vote/page.tsx       # 投票去哪
│   │   ├── plan/page.tsx       # 方案确认
│   │   ├── register/page.tsx   # 分段报名
│   │   ├── dashboard/page.tsx  # 组织者看板
│   │   ├── settle/page.tsx     # 记账结算
│   │   ├── privacy/page.tsx    # 隐私说明
│   │   └── api/                # API 路由
│   │       ├── activities/     # 活动 CRUD + 状态流转
│   │       ├── scenes/         # 分段管理
│   │       ├── intentions/     # 意愿提交与查询
│   │       ├── vote-proposals/ # 投票方案
│   │       ├── vote-records/   # 投票记录
│   │       ├── registrations/  # 报名
│   │       ├── participants/   # 参与人
│   │       ├── bills/          # 账单
│   │       └── plans/          # 方案内容
│   ├── components/
│   │   ├── navbar.tsx          # 顶部导航
│   │   ├── passphrase-verifier.tsx  # 管理口令验证组件
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/
│   │   ├── party.ts            # 用户身份工具
│   │   ├── utils.ts            # 通用工具
│   │   └── hash.ts             # 口令哈希工具
│   └── storage/database/
│       ├── supabase-client.ts  # Supabase 客户端
│       └── shared/schema.ts    # Drizzle ORM Schema
└── public/                     # 静态资源
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

### 数据表
activities, scenes, intentions, vote_proposals, vote_records, registrations, participants, bills, plans

使用 Supabase service_role_key 绕过 RLS，公开读写。

### 活动状态流转

`collecting` → `voting` → `plan` → `registering` → `started` → `settling` → `settled`

### 口令体系

- **活动口令（access_code）**：6位数字，用于进入活动
- **管理口令（passphrase）**：6位数字，用于管理操作
- 两个口令均使用 SHA-256 哈希存储，开发者无法查看原始口令

### 隐私保护

- API 无参数拒绝：无 access_code/ids/id 参数时返回空数据
- 数据脱敏：返回数据时移除口令哈希等敏感字段
- 口令哈希：SHA-256 单向加密，开发者也无法看到原始口令

## 设计风格 - 粗野风 (Neo-Brutalism)

粗黑边框、错位阴影、大字号、零圆角
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