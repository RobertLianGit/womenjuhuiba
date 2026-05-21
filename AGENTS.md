# 我们聚会吧Beta - 项目文档

## 项目概览

朋友聚会组织工具，支持创建活动、意愿收集、投票去哪、方案确认、分段报名、记账结算的全流程。

**双端版本**：
- **Web版**：无需登录，输入昵称即可参与，粗野风设计
- **小程序版**：微信授权登录，微信原生设计风格，数据独立存储

### 版本技术栈

| 维度 | Web版 | 小程序版 |
|------|-------|----------|
| Framework | Next.js 16 (App Router) | 微信小程序原生 |
| Core | React 19 | WXML/WXSS/JS |
| Language | TypeScript 5 | JavaScript |
| UI 组件 | shadcn/ui | 微信原生组件 |
| Styling | Tailwind CSS 4 (粗野风) | WXSS (微信风格) |
| Database | Supabase (无前缀表) | Supabase (mp_前缀表) |
| 登录 | 昵称+localStorage | 微信授权 (openid) |
| 包管理器 | pnpm | - |

## 目录结构

```
├── src/                        # Web版源码
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
│   │   └── api/                # API 路由
│   │       ├── activities/     # 活动 CRUD + 状态流转
│   │       ├── scenes/         # 分段管理
│   │       ├── intentions/     # 意愿提交与查询
│   │       ├── vote-proposals/ # 投票方案
│   │       ├── vote-records/   # 投票记录
│   │       ├── registrations/  # 报名
│   │       ├── participants/   # 参与人
│   │       ├── bills/          # 账单
│   │       ├── plans/          # 方案内容
│   │       └── mp/             # 小程序专用API
│   ├── components/
│   │   ├── navbar.tsx          # 顶部导航
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/
│   │   ├── party.ts            # 用户身份工具
│   │   ├── utils.ts            # 通用工具
│   │   └── hash.ts             # 口令哈希工具
│   └── storage/database/
│       ├── supabase-client.ts  # Supabase 客户端
│       └── shared/schema.ts    # Drizzle ORM Schema
├── miniprogram/                # 小程序版源码
│   ├── app.js                  # 小程序入口
│   ├── app.json                # 小程序配置
│   ├── app.wxss                # 全局样式
│   ├── pages/                  # 页面文件
│   │   ├── index/              # 首页
│   │   ├── create/             # 创建活动
│   │   ├── detail/             # 活动详情
│   │   ├── intention/          # 意愿收集
│   │   ├── vote/               # 投票
│   │   ├── plan/               # 方案确认
│   │   ├── register/           # 报名
│   │   ├── dashboard/          # 看板
│   │   └── settle/             # 结算
│   ├── utils/                  # 工具函数
│   └── README.md               # 小程序文档
└── public/                     # 静态资源
```

## 构建与测试命令

```bash
# Web版
pnpm dev          # 开发环境 (端口 5000)
pnpm build        # 生产构建
pnpm start        # 生产启动
pnpm ts-check     # TypeScript 类型检查
pnpm lint         # ESLint 检查

# 小程序版
# 使用微信开发者工具导入 miniprogram 目录
```

## 数据库

### Web版表（无前缀）
activities, scenes, intentions, vote_proposals, vote_records, registrations, participants, bills, plans

### 小程序版表（mp_前缀）
mp_activities, mp_scenes, mp_intentions, mp_vote_proposals, mp_vote_records, mp_registrations, mp_participants, mp_bills, mp_plans

使用 Supabase service_role_key 绕过 RLS，公开读写。

### 活动状态流转

`collecting` → `voting` → `plan` → `registering` → `started` → `settling` → `settled`

### 口令体系

- **活动口令（access_code）**：6位数字，用于进入活动
- **管理口令（passphrase）**：6位数字，用于管理操作
- 两个口令均使用 SHA-256 哈希存储，开发者无法查看原始口令

## 设计风格

### Web版 - 粗野风 (Neo-Brutalism)
粗黑边框、错位阴影、大字号、零圆角
- 主色：粉色 #FF4DB8
- 背景：暖白 #FAFAF5
- 强调：蓝色 #3B82F6
- 成功：绿色 #22C55E
- 警告：黄色 #FFF34D

### 小程序版 - 微信原生风格
- 主色：绿色 #07c160
- 辅助色：蓝色 #576b95
- 背景色：#f5f5f5

## 开发注意事项

### Web版
- 用户身份通过 localStorage 存储的 UUID 和昵称标识，无需登录
- API 路由统一使用 `getSupabaseClient()` 获取客户端
- 前端页面均为 'use client' 组件，使用 fetch 调用 API
- 活动创建后默认状态为 `collecting`（意愿收集中）
- 意愿/投票有 upsert 逻辑，同用户重复提交会覆盖

### 小程序版
- 使用微信授权登录获取 openid 作为用户标识
- API 路由在 `/api/mp/` 路径下
- 需要在微信公众平台配置服务器域名
- 图片资源需要自行准备（参考 miniprogram/IMAGES.md）
