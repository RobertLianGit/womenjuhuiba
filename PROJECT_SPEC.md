# 我们聚会吧Beta — 完整项目文档

> 本文档覆盖从业务需求到线上实现的全部细节，可供另一个AI据此复现整个项目。

---

## 一、产品定位与解决的问题

### 1.1 核心问题

朋友聚会组织的全流程痛点：
- **定不下来**：群里七嘴八舌，有人想吃烧烤有人想火锅，永远达不成共识
- **信息散落**：意愿、投票、报名信息散落在不同聊天记录里，反复翻找
- **遗漏追责**：谁报了名谁没报，最后谁来付钱，全靠记忆
- **组织者负担**：一个人追着大家表态、投票、报名、交钱，心力交瘁

### 1.2 产品定义

**我们聚会吧Beta** 是一个无需登录的朋友聚会组织工具。覆盖从「发起活动」到「记账结算」的全流程：

```
创建活动 → 意愿收集 → 投票去哪 → 方案确认 → 分段报名 → 记账结算
```

核心特点：
- **零门槛**：无需注册登录，输入昵称即可参与
- **双口令**：活动口令（参与者加入）+ 管理口令（组织者管理），权限隔离
- **全流程**：6个阶段闭环，每个阶段都有明确的操作入口
- **可分享**：一条消息包含链接+活动名+发起人+活动口令，朋友直接加入

---

## 二、功能规格

### 2.1 首页

**功能**：
- Hero区：「创建活动」按钮 + 「通过口令加入」按钮
- 使用引导：「怎么用」6步说明
- 两个Tab：「我发起的」和「我参与的」
- 创建活动弹窗：标题、描述、大致时间、你的昵称、活动口令（必填）
- 创建成功弹窗：同时显示「活动口令」和「管理口令」，支持一键复制分享信息
- 通过口令加入弹窗：输入活动口令，验证后加入

**可见性规则**：
- 活动列表只显示「已加入的活动」（通过活动口令验证过的 + 自己创建的）
- 未验证口令的活动不在列表中显示

**分享信息格式**：
```
【活动名称】周末烧烤聚会
【发起人】小明
【活动口令】party2024
【链接】https://xxx.coze.site/activity?id=xxx
```

### 2.2 活动详情页

**双视图**：根据管理口令验证状态区分

**参与者视图**：
- 活动标题 + 状态标签
- 当前阶段横幅（大字醒目）：如「当前阶段：意愿收集」
- 直接操作卡片：根据当前状态显示对应按钮（去填写意愿 / 去投票 / 去报名 / 查看结算）
- 进度统计：已表态/已投票/已报名人数
- 活动口令验证门控：未输入正确活动口令的访客看到锁屏界面
- 管理口令验证入口：可随时输入管理口令切换为组织者

**组织者视图**（验证管理口令后）：
- 6宫格功能入口：意愿收集、投票去哪、方案确认、分段报名、组织者看板、记账结算
- 状态流转按钮：开始投票 → 确认方案 → 开放报名 → 开始活动 → 开始结算 → 完成结算
- 口令管理：查看/复制 活动口令 和 管理口令
- 分享按钮

### 2.3 意愿收集页

**双Tab**：填写意愿 / 汇总看板

**填写意愿Tab**：
- 你想做什么（文本，如"烧烤/火锅/密室"）
- 预计人数（整数）
- 补充说明
- 「更新意愿」按钮，提交后显示绿色成功提示（3秒自动消失）
- 同用户重复提交会覆盖（upsert逻辑）

**汇总看板Tab**：
- 所有人提交的意愿列表
- 进度统计：X人已表态

**组织者专属**（验证管理口令后可见）：
- 提前结束收集（状态→voting）
- 调整截止时间

### 2.4 投票去哪页

**默认Tab**：投票（而非提方案，降低认知门槛）

**投票Tab**：
- 所有方案卡片，每个显示：地点、类型、提出人、当前得票数
- 投票规则提示（单选/多选，最多选X项）
- 勾选后「提交投票」
- 底部「我有新想法，去提方案 →」链接（引导到提方案Tab）
- 10秒自动轮询刷新方案数据

**提方案Tab**：
- 地点（必填）、活动类型（选填）
- 「导入意愿内容」提示条：如果有意愿数据，显示黄底提示 + 一键导入按钮
- 提交方案

**结果Tab**：
- 按得票数排序的方案列表
- 组织者专属「确认方案」按钮（需管理口令）

**投票规则设置**（组织者专属）：
- 单选 / 多选切换
- 多选时设置最多选几项
- 保存规则到数据库（activities.vote_type / max_votes）

### 2.5 方案确认页

**投票结果参考**（页顶）：
- 显示投票排名：如「烧烤(5票) > 火锅(3票) > 密室(2票)」
- 一键添加为分段

**分段管理**（仅管理口令者可操作）：
- 添加分段：名称、时间段、地点
- 编辑分段：修改现有分段信息
- 删除分段
- 分段列表按 sort_order 排序

**方案内容**：
- 文本编辑区域，可手动编辑完整方案描述
- 「保存方案」按钮

**Prompt生成**：
- 基于方案内容自动生成AI Prompt模板
- 丰富模板内容：活动背景、参与人数、各分段详情、预算建议、注意事项
- 提示用户「复制此Prompt到豆包专家模式、通义千问、ChatGPT等获取更详细方案」
- 一键复制Prompt

**保存后**：
- 显示「开放报名 →」跳转按钮
- 点击后先 PATCH 活动状态为 registering，再跳转到报名页

### 2.6 分段报名页

**方案内容展示**（页顶）：
- 自动显示方案确认页保存的方案全文

**报名表单**：
- 每个分段一张卡片：名称、时间、地点
- 每个分段有独立的「报名」按钮
- 报名时填写：参加人数、备注
- 已报名的分段显示绿色对勾

**已报名列表**：
- 每个分段下显示已报名人员及人数

**自动报名逻辑**：
- 填写过意愿的用户，进入报名页时自动为其报名所有分段
- 前端检测：获取该活动的意愿提交者 → 检查每个分段是否已有报名记录 → 无则自动创建

### 2.7 组织者看板

**可见性**：所有人可查看，管理口令者可编辑

**查看模式**（所有人）：
- 按分段展示参与人员列表
- 每人显示：昵称、人数、状态
- 顶部显示「查看」标签

**编辑模式**（管理口令者）：
- 手动添加参与人（昵称 + 人数）
- 删除参与人
- 标记临时人员（is_temp）
- 顶部显示「组织者」标签

**数据同步**：
- 报名页的数据自动同步到看板
- 进入看板时自动拉取最新报名数据

### 2.8 记账结算页

**账单管理**（组织者专属：金额输入和保存需要管理口令）：
- 每个分段一条账单
- 输入总金额
- 保存账单

**分摊计算**（所有人可见）：
- 自动计算人均金额（总金额 / 参与人数）
- 显示每人的分摊金额

**转账指引**：
- 根据谁支付了什么，计算谁还需要转给谁多少
- 标记已结算

---

## 三、权限体系

### 3.1 双口令设计

| 口令类型 | 用途 | 谁知道 | 存储位置 |
|---------|------|--------|---------|
| **活动口令** (access_code) | 加入活动、查看活动内容 | 所有参与者 | 创建时设置，分享时传播 |
| **管理口令** (passphrase) | 管理操作：状态流转、编辑分段、确认方案等 | 仅组织者 | 创建时自动生成6位码，localStorage存储 |

### 3.2 权限矩阵

| 操作 | 活动口令验证者 | 管理口令验证者 |
|------|:---:|:---:|
| 查看活动内容 | ✅ | ✅ |
| 填写意愿 | ✅ | ✅ |
| 提交投票 | ✅ | ✅ |
| 提交方案 | ✅ | ✅ |
| 提交报名 | ✅ | ✅ |
| 查看看板 | ✅ | ✅ |
| 查看账单 | ✅ | ✅ |
| 状态流转 | ❌ | ✅ |
| 投票规则设置 | ❌ | ✅ |
| 确认方案 | ❌ | ✅ |
| 添加/编辑/删除分段 | ❌ | ✅ |
| 保存方案 | ❌ | ✅ |
| 保存账单 | ❌ | ✅ |
| 看板编辑/删除人员 | ❌ | ✅ |
| 提前结束意愿收集 | ❌ | ✅ |

### 3.3 口令验证流程

**活动口令验证**（门控）：
1. 用户访问活动详情页 `/activity?id=xxx`
2. 前端检查 `isActivityAccessed(activityId)`（localStorage中已验证列表）
3. 未验证 → 显示锁屏界面，要求输入活动口令
4. 调用 `GET /api/activities?access_code=输入值` 查询
5. 匹配 → `markActivityAccessed(activityId)` 记住验证，显示活动内容
6. 所有子页面（意愿/投票/方案/报名/看板/结算）同样检查访问权限

**管理口令验证**：
1. 用户点击「输入管理口令」或「验证口令」按钮
2. 输入6位口令
3. 调用 `PATCH /api/activities/{id}` 传入 `{ passphrase: 输入值, status: 'verify' }`
4. API验证通过 → 前端调用 `setPassphrase(activityId, passphrase)` 保存到localStorage
5. 此后该用户在该活动下被视为组织者

---

## 四、数据模型

### 4.1 ER关系

```
activities (1) ──→ (N) scenes
activities (1) ──→ (N) intentions
activities (1) ──→ (N) vote_proposals
activities (1) ──→ (N) vote_records
activities (1) ──→ (N) registrations ──→ scenes
activities (1) ──→ (N) participants  ──→ scenes
activities (1) ──→ (N) bills         ──→ scenes
activities (1) ──→ (1) plans
```

### 4.2 表结构

#### activities — 活动主表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID, gen_random_uuid() |
| title | varchar(200) | 活动标题 |
| description | text | 活动描述 |
| rough_time | varchar(100) | 大致时间（如"下周五"） |
| status | varchar(30) | 活动状态，默认'collecting' |
| creator_id | varchar(36) | 创建者UUID（localStorage生成） |
| creator_name | varchar(100) | 创建者昵称 |
| access_code | varchar(50) | 活动口令（创建时设置，参与者加入用） |
| passphrase | varchar(50) | 管理口令（6位，自动生成） |
| vote_type | varchar(20) | 投票类型：'single'单选 / 'multi'多选 |
| max_votes | integer | 多选时最多选几项，默认1 |
| intention_deadline | timestamp | 意愿收集截止时间（创建时默认+3天） |
| vote_deadline | timestamp | 投票截止时间 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

**索引**：creator_id, status, created_at

#### scenes — 活动分段表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | 所属活动，级联删除 |
| name | varchar(100) | 分段名称（如"午餐"） |
| time_range | varchar(100) | 时间段（如"12:00-14:00"） |
| location | varchar(200) | 地点 |
| sort_order | integer | 排序，默认0 |
| created_at | timestamp | |

**索引**：activity_id

#### intentions — 意愿表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| user_id | varchar(36) | 提交者UUID |
| user_name | varchar(100) | 提交者昵称 |
| wants | text | 想做什么 |
| estimated_people | integer | 预计人数，默认1 |
| selected_scenes | text | 选中的分段（JSON） |
| created_at | timestamp | |

**唯一约束**：(activity_id, user_id) — 同用户重复提交覆盖

#### vote_proposals — 投票方案表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| user_id | varchar(36) | 提案者UUID |
| user_name | varchar(100) | 提案者昵称 |
| location | varchar(200) | 地点（必填） |
| activity_type | varchar(200) | 活动类型 |
| created_at | timestamp | |

#### vote_records — 投票记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| user_id | varchar(36) | 投票者UUID |
| user_name | varchar(100) | 投票者昵称 |
| voted_proposal_ids | text | 投给的方案ID列表（逗号分隔） |
| created_at | timestamp | |

**唯一约束**：(activity_id, user_id)

#### registrations — 报名表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| scene_id | varchar(36) FK → scenes.id | 报名的分段 |
| user_id | varchar(36) | 报名者UUID |
| user_name | varchar(100) | 报名者昵称 |
| people_count | integer | 参加人数，默认1 |
| notes | text | 备注 |
| created_at | timestamp | |
| updated_at | timestamp | |

**唯一约束**：(activity_id, scene_id, user_id)

#### participants — 参与者看板表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| scene_id | varchar(36) FK → scenes.id | |
| user_id | varchar(36) | 参与者UUID（手动添加可为空） |
| user_name | varchar(100) | 昵称 |
| people_count | integer | 人数，默认1 |
| is_manual | boolean | 是否手动添加，默认false |
| is_temp | boolean | 是否临时人员，默认false |
| status | varchar(30) | 状态，默认'confirmed' |
| created_at | timestamp | |

#### bills — 账单表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| scene_id | varchar(36) FK → scenes.id | |
| total_amount | numeric(10,2) | 总金额，默认0 |
| created_at | timestamp | |
| updated_at | timestamp | |

#### plans — 方案内容表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| content | text | 方案全文 |
| prompt_generated | text | AI生成的Prompt |
| updated_at | timestamp | |

---

## 五、API接口设计

所有API基于 Next.js App Router，路径为 `src/app/api/`。

### 5.1 通用约定

- 使用 Supabase service_role_key，绕过 RLS
- 客户端通过 `getSupabaseClient()` 获取 Supabase 实例
- 管理操作需在请求体中传入 `passphrase` 字段
- API层验证口令：查数据库比对 activities.passphrase
- 错误统一返回 `{ error: string }`，成功返回 `{ data: ... }`

### 5.2 接口清单

#### activities

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/activities | 创建活动（自动生成管理口令，status默认collecting） | 公开 |
| GET | /api/activities | 获取活动列表 | 公开 |
| GET | /api/activities?id=xxx | 获取单个活动 | 公开 |
| GET | /api/activities?access_code=xxx | 通过活动口令查询活动 | 公开 |
| PATCH | /api/activities/{id} | 更新活动（状态流转、投票规则等） | 需管理口令 |
| PATCH | /api/activities/{id} status='verify' | 仅验证口令不更新数据 | 需管理口令 |

**POST 创建活动**：
- 必填：title, description, rough_time, creator_id, creator_name, access_code
- 自动生成：passphrase (6位大写字母+数字), status='collecting', intention_deadline (创建时间+3天)

**PATCH 更新活动**：
- 传入 passphrase 验证身份
- status='verify' 时仅验证口令，不修改数据
- 可更新字段：status, intention_deadline, vote_deadline, vote_type, max_votes
- 状态流转必须传 passphrase，否则返回403

#### scenes

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/scenes | 添加分段 | 需管理口令 |
| GET | /api/scenes?activity_id=xxx | 获取分段列表 | 公开 |
| PATCH | /api/scenes | 编辑分段（body中传id） | 需管理口令 |
| DELETE | /api/scenes?id=xxx&passphrase=xxx | 删除分段 | 需管理口令 |

DELETE/PATCH 口令验证流程：先从 scenes 表查出 activity_id，再验证该活动的 passphrase。

#### intentions

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/intentions | 提交意愿（upsert） | 公开 |
| GET | /api/intentions?activity_id=xxx | 获取意愿列表 | 公开 |

upsert 逻辑：基于 (activity_id, user_id) 唯一约束，重复提交覆盖。

#### vote-proposals

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/vote-proposals | 提交投票方案 | 公开 |
| GET | /api/vote-proposals?activity_id=xxx | 获取方案列表 | 公开 |

#### vote-records

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/vote-records | 提交投票（upsert） | 公开 |
| GET | /api/vote-records?activity_id=xxx | 获取投票记录 | 公开 |

#### registrations

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/registrations | 报名 | 公开 |
| GET | /api/registrations?activity_id=xxx | 获取报名列表 | 公开 |
| DELETE | /api/registrations?id=xxx | 取消报名 | 公开 |

#### participants

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/participants | 手动添加参与人 | 需管理口令 |
| GET | /api/participants?activity_id=xxx | 获取参与人列表 | 公开 |
| DELETE | /api/participants?id=xxx | 删除参与人 | 需管理口令 |

#### bills

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/bills | 保存账单 | 需管理口令 |
| GET | /api/bills?activity_id=xxx | 获取账单列表 | 公开 |

#### plans

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/plans | 保存方案（upsert） | 需管理口令 |
| GET | /api/plans?activity_id=xxx | 获取方案内容 | 公开 |

---

## 六、前端架构

### 6.1 技术栈

| 维度 | 选择 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Core | React 19 |
| Language | TypeScript 5 |
| UI 组件 | shadcn/ui (基于 Radix UI) |
| Styling | Tailwind CSS 4 (粗野风 Neo-Brutalism 主题) |
| Database | Supabase (PostgreSQL) |
| 包管理器 | pnpm |

### 6.2 目录结构

```
src/
├── app/
│   ├── page.tsx              # 首页 - 活动列表 + 创建 + 加入
│   ├── layout.tsx            # 全局布局 (Navbar)
│   ├── globals.css           # 全局样式 + @theme + :root变量
│   ├── activity/page.tsx     # 活动详情 - 双视图 + 门控
│   ├── intention/page.tsx    # 意愿收集 - 双Tab
│   ├── vote/page.tsx         # 投票去哪 - 三Tab + 投票规则
│   ├── plan/page.tsx         # 方案确认 - 分段 + Prompt
│   ├── register/page.tsx     # 分段报名 - 自动报名
│   ├── dashboard/page.tsx    # 组织者看板 - 双模式
│   ├── settle/page.tsx       # 记账结算
│   └── api/                  # 10个API路由
├── components/
│   ├── navbar.tsx            # 顶部导航
│   ├── passphrase-verifier.tsx # 口令验证组件（所有子页面复用）
│   └── ui/                   # shadcn/ui 组件库
├── lib/
│   ├── party.ts              # 用户身份 + 口令管理
│   └── utils.ts              # cn() 工具
└── storage/database/
    ├── supabase-client.ts    # Supabase 客户端
    └── shared/schema.ts      # Drizzle ORM Schema
```

### 6.3 关键组件

#### PassphraseVerifier（口令验证组件）

所有子页面复用的管理口令验证组件，提供三种显示模式：
- **compact=true**：行内小标签（看板、投票页使用）
- **compact=false**：独立按钮区域
- **已验证**：显示绿色「已验证为组织者」或蓝色「组织者」标签

验证流程：
1. 检查 `isOrganizer(activityId, null)` 判断 localStorage 中是否有口令
2. 有 → 直接显示组织者状态
3. 无 → 显示「输入管理口令」按钮
4. 用户输入 → `PATCH /api/activities/{id}` 验证 → `setPassphrase()` 保存

### 6.4 页面通用模式

所有子页面遵循统一模式：
1. **Suspense 包装**：因使用 `useSearchParams()`，Next.js 16 要求 Suspense boundary
2. **activityId 获取**：从 URL 参数 `?activity_id=xxx` 获取
3. **访问权限检查**：`isActivityAccessed(activityId)`，未通过则跳回活动详情页
4. **管理口令验证**：`PassphraseVerifier` 组件
5. **轮询刷新**：投票页10秒自动刷新（解决B看不到A提交内容的问题）

---

## 七、设计系统

### 7.1 Neo-Brutalism（粗野风）

核心特征：
- **粗黑边框**：所有元素 border-2 border-outline (#0A0A0A)
- **错位阴影**：shadow-card (4px 4px 0 #0A0A0A), shadow-float (6px 6px 0), shadow-dialog (8px 8px 0)
- **大字号**：标题 text-3xl/4xl font-bold
- **零圆角**：radius-sm/md = 0rem

### 7.2 色板

| 用途 | 色值 | CSS变量 |
|------|------|---------|
| 背景 | #FFF34D (明黄) | --background |
| 前景/文字 | #0A0A0A (近黑) | --foreground |
| 主色/强调 | #FF4DB8 (粉) | --primary |
| 蓝色强调 | #3B82F6 | --accent-blue / --secondary |
| 成功 | #22C55E | --success |
| 错误 | #EF4444 | --destructive |
| 警告 | #F59E0B | --warning |
| 卡片背景 | #FFFFFF | --card |
| 容器背景 | #F5F0D0 | --muted |
| 边框 | #0A0A0A | --border / --outline |

### 7.3 字体

- 主字体：Space Grotesk (Google Fonts .cn 域)
- 中文回退：Noto Sans SC, system-ui

### 7.4 CSS实现要点

- Tailwind v4 的 `@theme inline` 注册自定义 token
- `:root` 变量定义在 `@layer base` 中（防止被 Tailwind v4 默认值覆盖）
- 状态标签带旋转角度（`-rotate-2` / `rotate-1`）增加粗野风感

---

## 八、用户身份系统

### 8.1 无登录设计

使用 localStorage 存储用户身份，无需服务端认证：

| 存储项 | Key | 格式 | 说明 |
|--------|-----|------|------|
| 用户UUID | party_user_id | UUID v4 | 首次访问自动生成 |
| 用户昵称 | party_user_name | 文本 | 创建活动或首次操作时设置 |
| 管理口令 | party_pass_{activityId} | 6位码 | 验证通过后保存 |
| 已验证活动 | party_accessed_activities | JSON数组 | 通过活动口令验证的活动ID列表 |

### 8.2 身份判断逻辑

```typescript
// 是否为组织者：localStorage中存储的口令与活动passphrase一致
isOrganizer(activityId, activity.passphrase)

// 是否可访问活动：活动ID在已验证列表中
isActivityAccessed(activityId)
```

---

## 九、活动状态流转

```
collecting → voting → plan → registering → started → settling → settled
  意愿收集    投票     方案确认   报名中      进行中     结算中     已结算
```

| 当前状态 | 组织者操作 | 流转到 |
|---------|-----------|--------|
| collecting | 开始投票 | voting |
| voting | 确认方案 | plan |
| plan | 开放报名 | registering |
| registering | 开始活动 | started |
| started | 开始结算 | settling |
| settling | 完成结算 | settled |

流转通过 `PATCH /api/activities/{id}` 实现，必须传管理口令。

---

## 十、关键技术实现细节

### 10.1 Supabase 连接

```typescript
// supabase-client.ts
// 环境变量：COZE_SUPABASE_URL, COZE_SUPABASE_ANON_KEY
// 使用 service_role_key 权限，绕过 RLS
// 通过 coze-coding-dev-sdk 的 getReportBuffer 和 createWrappedFetch 包装
```

### 10.2 upsert逻辑

意图、投票等使用 Supabase 的 upsert：
- intentions: 基于 (activity_id, user_id) 唯一约束
- vote_records: 基于 (activity_id, user_id) 唯一约束
- registrations: 基于 (activity_id, scene_id, user_id) 唯一约束
- plans: 基于 (activity_id) — 每个活动只有一条方案

### 10.3 前端轮询

投票页每10秒自动刷新方案和投票数据，解决多人协作时看不到他人提交的问题：
```typescript
useEffect(() => {
  const interval = setInterval(() => fetchData(), 10000);
  return () => clearInterval(interval);
}, [activityId]);
```

### 10.4 Next.js 16 特殊处理

- **useSearchParams 需要 Suspense**：所有使用 useSearchParams 的页面必须用 `<Suspense>` 包裹内容组件
- **serverExternalPackages**：next.config.ts 中添加 `serverExternalPackages: ['pg']`，因为 Drizzle ORM 使用 pg 驱动
- **Hydration 错误预防**：避免在 JSX 中直接使用 `typeof window`、`Date.now()` 等，动态内容使用 useEffect + useState

### 10.5 活动口令门控

活动详情页和所有子页面的访问流程：
1. 活动详情页：检查 `isActivityAccessed(id)`，未验证显示锁屏界面
2. 锁屏界面：输入活动口令 → `GET /api/activities?access_code=输入值` 查询 → 匹配则 `markActivityAccessed(id)`
3. 子页面：同样检查 `isActivityAccessed(id)`，未通过则 `router.push('/activity?id=' + id)` 跳回

### 10.6 方案确认→开放报名的状态联动

方案确认页的「开放报名」按钮不是简单链接跳转，而是：
1. 调用 `PATCH /api/activities/{id}` 将状态设为 `registering`
2. 成功后才跳转到报名页
3. 如果跳转失败，显示提示「管理者可以回到首页去进入开放报名页面」

---

## 十一、部署与运维

### 11.1 环境变量

| 变量名 | 说明 |
|--------|------|
| COZE_SUPABASE_URL | Supabase 项目 URL |
| COZE_SUPABASE_ANON_KEY | Supabase service_role_key |
| DEPLOY_RUN_PORT | 服务端口（5000） |
| COZE_PROJECT_DOMAIN_DEFAULT | 对外访问域名 |

### 11.2 构建与运行

```bash
pnpm install       # 安装依赖
pnpm dev           # 开发环境 (端口5000, HMR)
pnpm build         # 生产构建
pnpm start         # 生产启动
pnpm ts-check      # TypeScript 类型检查
pnpm lint          # ESLint 检查
```

### 11.3 数据库初始化

9张表通过 Supabase Dashboard 创建，Schema 定义在 `src/storage/database/shared/schema.ts`。

必要的唯一约束（需手动添加）：
```sql
ALTER TABLE intentions ADD CONSTRAINT intentions_activity_user_uniq UNIQUE (activity_id, user_id);
ALTER TABLE vote_records ADD CONSTRAINT vote_records_activity_user_uniq UNIQUE (activity_id, user_id);
ALTER TABLE registrations ADD CONSTRAINT registrations_activity_scene_user_uniq UNIQUE (activity_id, scene_id, user_id);
```

### 11.4 RLS策略

RLS已启用但未配置策略。使用 service_role_key 绕过，公开读写。生产环境建议添加策略。

---

## 十二、已知限制与未来优化

### 当前限制

1. **无实时推送**：投票页依赖10秒轮询，非WebSocket实时更新
2. **无推送通知**：状态变更后参与者不会收到通知
3. **口令无加密**：管理口令明文存储在数据库和localStorage
4. **无离线支持**：需要网络连接
5. **单设备身份**：localStorage换设备/清缓存后身份丢失，管理口令需要重新输入
6. **Prompt模板不接AI**：只生成可复制文本，需用户自行粘贴到AI工具
7. **无图片上传**：活动没有封面图

### 优化方向

1. WebSocket 实时推送
2. 微信/短信通知
3. 口令哈希存储
4. 活动封面图
5. 模板化创建（常用活动模板）
6. 导出为日历事件
7. 数据统计看板（参与率、投票分布图表）
