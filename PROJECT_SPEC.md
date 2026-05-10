# 我们聚会吧Beta — 完整项目文档

> 本文档覆盖当前Beta版本的完整实现，从业务需求到线上部署，足以让另一个AI据此复现。

---

## 一、产品定位与解决的问题

### 1.1 痛点

朋友聚会组织过程中的混乱：群聊讨论去哪永远定不下来、报名靠接龙容易漏人、AA制记账全凭记忆、组织者和参与者没有清晰分工。

### 1.2 产品定义

**我们聚会吧Beta** 是一个无需登录的朋友聚会组织工具，覆盖从想法到结账的全流程：

`创建活动 → 收集意愿 → 投票去哪 → 确认方案 → 分段报名 → 记账结算`

核心设计原则：
- **零门槛**：不用登录，输入昵称即可参与
- **双口令**：活动口令保护隐私，管理口令区分权限
- **口令即权限**：知道活动口令=能参加，知道管理口令=能管理
- **隐私优先**：API不暴露活动列表，口令哈希存储，开发者也无法看到原始口令

---

## 二、功能规格

### 2.1 首页

- **英雄区**：品牌名「我们聚会吧Beta」+「创建活动」按钮 +「通过口令加入」按钮
- **使用引导**：「怎么用？」6步引导说明
- **双Tab**：「我发起的」（localStorage存储创建的活动ID）/「我参与的」（localStorage存储已验证的活动ID）
- **创建活动弹窗**：活动名称、描述、大致时间、你的昵称、**活动口令**（必填，参与者凭此加入）、管理口令（自动生成6位码）
- **创建成功弹窗**：区分展示活动口令和管理口令，提供复制分享信息按钮
- **加入活动弹窗**：输入活动口令 → API验证 → 加入
- **活动卡片**：标题、状态标签、创建人、看板入口
- **隐私声明链接**：底部链接到 `/privacy`

### 2.2 活动详情页（双视图 + 门控）

**访问门控**：未输入活动口令的访客看到锁屏界面，需输入正确口令才能进入。

**参与者视图**：
- 当前阶段横幅（大号粉色标签，突出显示如「意愿收集中」）
- 直接操作卡片（如「去填写意愿 →」）
- 进度统计：已表态/已投票/已报名人数
- 口令输入区（验证管理口令后切换到组织者视图）

**组织者视图**（验证管理口令后）：
- 6宫格功能入口（意愿/投票/方案/报名/看板/结算）
- 状态流转按钮（开始投票/确认方案/开放报名/开始活动/开始结算/完成结算）
- 查看和复制管理口令
- 同样显示进度统计

**分享功能**：复制分享信息（活动名称+发起人+活动口令+链接）

### 2.3 意愿收集页

- **双Tab**：填写意愿 / 汇总看板
- 填写意愿：想做什么、预计人数、补充说明
- 汇总看板：所有参与者意愿列表
- 提交后绿色成功提示条（3秒自动消失）
- 组织者操作：提前结束收集（带口令验证）→ 跳转投票页
- 管理口令验证组件

### 2.4 投票页

- **三Tab**：投票（默认Tab）/ 提方案 / 结果
- **投票Tab**：显示所有方案 + 投票选择 + 「我有新想法」入口引导去提方案
- **提方案Tab**：黄底提示条显示意愿内容 + 一键导入按钮
- **投票规则设置**（组织者）：单选/多选 + 最多选几项，保存到活动数据
- **结果Tab**：票数排名 + 确认方案按钮（组织者）
- 10秒自动轮询刷新
- 管理口令验证组件

### 2.5 方案确认页

- **投票结果参考**：页顶显示投票排名，支持一键添加为分段
- **分段管理**：添加/编辑/删除分段（仅管理口令可操作）
- **Prompt生成**：丰富化模板 + AI工具使用提示（豆包/千问/ChatGPT）
- **保存方案**：保存后显示「开放报名 →」跳转按钮（先PATCH状态为registering再跳转）
- 无分段时提示
- 管理口令验证组件

### 2.6 分段报名页

- **方案内容展示**：页顶自动显示已保存的方案全文
- **报名方式**：
  - 有分段：显示各段勾选框
  - 无分段：显示「全程参与」勾选框
- **自动报名**：意愿提交者进入页面时自动报名所有段
- 已报名列表
- 无分段提示（引导了解方案或联系组织者）
- 管理口令验证组件

### 2.7 组织者看板

- **所有人可见**（显示「查看」标签），管理口令者可编辑
- 参与者列表 + 手动添加/删除（需管理口令）
- 自动同步报名数据
- 管理口令验证组件

### 2.8 记账结算页

- 账单管理（添加/编辑，需管理口令）
- 人均分摊计算
- 转账指引（谁转谁多少钱）
- 标记已结算
- 管理口令验证组件

### 2.9 隐私声明页（/privacy）

大白话说明隐私保护逻辑：
- 口令即权限的设计理念
- API不暴露活动列表
- 口令哈希存储（不可逆，开发者也无法看到原始口令）
- 坦率说明技术边界

---

## 三、权限体系

### 3.1 双口令设计

| 口令类型 | 生成方式 | 用途 | 存储位置 |
|---------|---------|------|---------|
| 活动口令 (access_code) | 创建者设置 | 参与者加入活动、访问活动内容 | 数据库(哈希) + localStorage |
| 管理口令 (passphrase) | 自动生成6位码 | 组织者管理操作、状态流转 | 数据库(哈希) + localStorage |

### 3.2 权限矩阵

| 操作 | 参与者 | 组织者 |
|------|--------|--------|
| 查看活动 | ✅ 需活动口令 | ✅ |
| 填写意愿 | ✅ | ✅ |
| 投票/提方案 | ✅ | ✅ |
| 报名 | ✅ | ✅ |
| 查看看板 | ✅ | ✅ |
| 状态流转 | ❌ | ✅ 需管理口令 |
| 编辑分段/方案 | ❌ | ✅ 需管理口令 |
| 添加/删除参与人 | ❌ | ✅ 需管理口令 |
| 管理账单 | ❌ | ✅ 需管理口令 |

### 3.3 口令验证流程

1. **活动口令验证**：`GET /api/activities?access_code=输入值` → API对输入哈希后与数据库比较 → 匹配则返回活动数据 → 前端 `markActivityAccessed(id)` 保存到localStorage
2. **管理口令验证**：`PATCH /api/activities/{id}` body=`{status:'verify', passphrase:输入值}` → API对输入哈希后与数据库比较 → 匹配则返回成功 → 前端 `setPassphrase(id, 输入值)` 保存到localStorage
3. **前端身份判断**：`isOrganizer(activityId)` 仅检查localStorage中是否存有该活动的passphrase

### 3.4 口令哈希存储

- **算法**：SHA-256 单向哈希
- **实现**：`src/lib/hash.ts` → `hashSecret(input: string): string`
- **入库时**：创建活动时 `passphrase` 和 `access_code` 存入数据库前先哈希
- **验证时**：对用户输入哈希后与数据库中的哈希值比较
- **API响应**：GET 请求不返回 passphrase 和 access_code（脱敏）；POST 创建活动时返回原始值（此时还未哈希，是用户刚输入的）

---

## 四、数据模型

### 4.1 ER关系

```
activities ──1:N── scenes
activities ──1:N── intentions
activities ──1:N── vote_proposals
activities ──1:N── vote_records
activities ──1:N── registrations (scene_id可空，全程参与时为null)
activities ──1:N── participants
activities ──1:N── bills
activities ──1:1── plans
```

### 4.2 表定义

#### activities — 活动表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| title | varchar(200) | 活动标题 |
| description | text | 活动描述 |
| rough_time | varchar(100) | 大致时间 |
| status | varchar(30) | 状态，默认'collecting' |
| creator_id | varchar(36) | 创建者UUID |
| creator_name | varchar(100) | 创建者昵称 |
| intention_deadline | timestamp | 意愿截止时间（创建时间+3天） |
| vote_deadline | timestamp | 投票截止时间 |
| passphrase | text | **管理口令（SHA-256哈希存储）** |
| access_code | text | **活动口令（SHA-256哈希存储）** |
| vote_type | text | 投票类型：'single'(默认) 或 'multi' |
| max_votes | integer | 多选时最多选几项，默认1 |
| created_at | timestamp | |
| updated_at | timestamp | |

#### scenes — 分段表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| name | varchar(200) | 分段名称 |
| time_range | varchar(200) | 时间范围 |
| location | varchar(200) | 地点 |
| sort_order | integer | 排序序号，默认0 |
| created_at | timestamp | |

#### intentions — 意愿表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| activity_id | varchar(36) FK → activities.id | |
| user_id | varchar(36) | 提交者UUID |
| user_name | varchar(100) | 提交者昵称 |
| wants | text | 想做什么 |
| estimated_people | integer | 预计人数，默认1 |
| notes | text | 补充说明 |
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
| scene_id | varchar(36) FK → scenes.id | **可空**。null表示全程参与 |
| user_id | varchar(36) | 报名者UUID |
| user_name | varchar(100) | 报名者昵称 |
| people_count | integer | 参加人数，默认1 |
| notes | text | 备注 |
| created_at | timestamp | |
| updated_at | timestamp | |

**唯一约束**：
- `registrations_activity_scene_user_uniq`：(activity_id, scene_id, user_id) WHERE scene_id IS NOT NULL
- `registrations_activity_null_scene_user_uniq`：(activity_id, user_id) WHERE scene_id IS NULL

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
| payer_name | varchar(100) | 支付人 |
| is_settled | boolean | 是否已结算，默认false |
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
- **口令哈希验证**：所有口令验证使用 `hashSecret()` 对输入哈希后与数据库哈希值比较
- **隐私保护**：GET 响应不返回 `passphrase` 和 `access_code` 字段
- 错误统一返回 `{ error: string }`，成功返回 `{ data: ... }`

### 5.2 API隐私规则

| 查询方式 | 是否允许 | 说明 |
|---------|---------|------|
| 无参数 GET | ❌ 400 | 拒绝返回所有活动 |
| ?creator_id=xxx | ❌ 400 | 不允许按用户查活动（已移除） |
| ?access_code=xxx | ✅ | 知道活动口令才能查，返回单个活动（脱敏） |
| ?id=xxx | ✅ | 已知活动ID查询（活动详情页内部用，脱敏） |
| ?ids=a,b,c | ✅ | 批量查询（首页内部用，最多50个，脱敏） |
| GET /{id} | ❌ 404 | 已删除，防止猜测UUID |

**脱敏规则**：所有 GET 响应中删除 `passphrase` 和 `access_code` 字段，仅 POST 创建时返回原始值。

### 5.3 接口清单

#### activities

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/activities | 创建活动 | 公开 |
| GET | /api/activities?access_code=xxx | 通过活动口令查活动 | 需活动口令 |
| GET | /api/activities?id=xxx | 单个活动查询 | 公开（脱敏） |
| GET | /api/activities?ids=a,b,c | 批量查询 | 公开（脱敏） |
| PATCH | /api/activities/{id} | 更新活动 | 需管理口令 |

**POST 创建活动**：
- 必填：title, description, rough_time, creator_id, creator_name, access_code
- 自动生成：passphrase (6位大写字母+数字), status='collecting', intention_deadline (创建时间+3天)
- **入库前哈希**：passphrase 和 access_code 使用 `hashSecret()` 哈希后存储
- 返回原始值（未哈希的）供前端展示

**PATCH 更新活动**：
- 传入 passphrase 验证身份（API对输入哈希后与数据库比较）
- status='verify' 时仅验证口令，不修改数据，返回 `{ data: { verified: true } }`
- 可更新字段：status, intention_deadline, vote_deadline, vote_type, max_votes

#### scenes

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/scenes | 添加分段 | 需管理口令 |
| GET | /api/scenes?activity_id=xxx | 获取分段列表 | 公开 |
| PATCH | /api/scenes | 编辑分段（body中传id） | 需管理口令 |
| DELETE | /api/scenes?id=xxx&passphrase=xxx | 删除分段 | 需管理口令 |

口令验证流程：先从 scenes 表查出 activity_id，再验证该活动的 passphrase（哈希比对）。

#### intentions

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/intentions | 提交意愿（upsert） | 公开 |
| GET | /api/intentions?activity_id=xxx | 获取意愿列表 | 公开 |

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
| POST | /api/registrations | 报名（支持scene_id为空的全程报名） | 公开 |
| GET | /api/registrations?activity_id=xxx | 获取报名列表 | 公开 |
| DELETE | /api/registrations?id=xxx | 取消报名 | 公开 |

**全程报名**：scene_id 为 null 时表示全程参与。upsert逻辑使用 partial unique index 处理 NULL。

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
│   ├── privacy/page.tsx      # 隐私保护声明
│   ├── activity/page.tsx     # 活动详情 - 双视图 + 门控
│   ├── intention/page.tsx    # 意愿收集 - 双Tab
│   ├── vote/page.tsx         # 投票去哪 - 三Tab + 投票规则
│   ├── plan/page.tsx         # 方案确认 - 分段 + Prompt
│   ├── register/page.tsx     # 分段报名 - 全程/分段
│   ├── dashboard/page.tsx    # 组织者看板 - 双模式
│   ├── settle/page.tsx       # 记账结算
│   └── api/                  # 10个API路由
├── components/
│   ├── navbar.tsx            # 顶部导航
│   ├── passphrase-verifier.tsx # 口令验证组件（所有子页面复用）
│   └── ui/                   # shadcn/ui 组件库
├── lib/
│   ├── party.ts              # 用户身份 + 口令管理
│   ├── hash.ts               # SHA-256 哈希工具
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
1. 检查 `isOrganizer(activityId)` 判断 localStorage 中是否有口令
2. 有 → 直接显示组织者状态
3. 无 → 显示「输入管理口令」按钮
4. 用户输入 → `PATCH /api/activities/{id}` 验证 → `setPassphrase()` 保存

### 6.4 页面通用模式

所有子页面遵循统一模式：
1. **Suspense 包装**：因使用 `useSearchParams()`，Next.js 16 要求 Suspense boundary
2. **activityId 获取**：从 URL 参数 `?activity_id=xxx` 获取
3. **访问权限检查**：`isActivityAccessed(activityId)`，未通过则跳回活动详情页
4. **管理口令验证**：`PassphraseVerifier` 组件
5. **轮询刷新**：投票页10秒自动刷新

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
| 已创建活动 | party_created_activities | JSON数组 | 自己创建的活动ID列表 |

### 8.2 身份判断逻辑

```typescript
// 是否为组织者：localStorage中是否存有该活动的passphrase
isOrganizer(activityId: string): boolean

// 是否可访问活动：活动ID在已验证列表中
isActivityAccessed(activityId: string): boolean

// 标记已创建的活动（首页「我发起的」Tab用）
addCreatedActivity(activityId: string): void
getCreatedActivities(): string[]
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

### 10.2 口令哈希存储

```typescript
// lib/hash.ts
import { createHash } from 'crypto';
export function hashSecret(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
```

- 创建活动时：`passphrase` 和 `access_code` 入库前调用 `hashSecret()` 哈希
- 验证口令时：对用户输入调用 `hashSecret()` 后与数据库哈希值比较
- GET 响应中不返回 `passphrase` 和 `access_code`
- 已有数据迁移：需将明文口令更新为哈希值

### 10.3 upsert逻辑

- intentions: 基于 (activity_id, user_id) 唯一约束
- vote_records: 基于 (activity_id, user_id) 唯一约束
- registrations: 基于 partial unique index（scene_id NOT NULL 和 scene_id IS NULL 分别建索引）
- plans: 基于 (activity_id) — 每个活动只有一条方案

### 10.4 前端轮询

投票页每10秒自动刷新方案和投票数据：
```typescript
useEffect(() => {
  const interval = setInterval(() => fetchData(), 10000);
  return () => clearInterval(interval);
}, [activityId]);
```

### 10.5 Next.js 16 特殊处理

- **useSearchParams 需要 Suspense**：所有使用 useSearchParams 的页面必须用 `<Suspense>` 包裹内容组件
- **serverExternalPackages**：next.config.ts 中添加 `serverExternalPackages: ['pg']`
- **Hydration 错误预防**：避免在 JSX 中直接使用 `typeof window`、`Date.now()` 等

### 10.6 活动口令门控

活动详情页和所有子页面的访问流程：
1. 活动详情页：检查 `isActivityAccessed(id)`，未验证显示锁屏界面
2. 锁屏界面：输入活动口令 → `GET /api/activities?access_code=输入值` 查询（API哈希比对） → 匹配则 `markActivityAccessed(id)`
3. 子页面：同样检查 `isActivityAccessed(id)`，未通过则跳回活动详情页

### 10.7 方案确认→开放报名的状态联动

方案确认页的「开放报名」按钮：
1. 调用 `PATCH /api/activities/{id}` 将状态设为 `registering`
2. 成功后才跳转到报名页
3. 失败时显示提示

### 10.8 无分段活动的全程报名

- `registrations.scene_id` 可为空，null 表示全程参与
- 报名页无分段时显示「全程参与」复选框
- 数据库使用 partial unique index 处理 NULL 的唯一约束

### 10.9 首页活动列表的隐私实现

- **不加载全量活动**：API无参数时返回400
- **「我发起的」**：从 localStorage 读取 `party_created_activities`，通过 `GET /api/activities?ids=...` 批量查询
- **「我参与的」**：从 localStorage 读取 `party_accessed_activities`，通过 `GET /api/activities?ids=...` 批量查询
- 创建活动后自动调用 `addCreatedActivity(id)` 保存到 localStorage

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

必要的约束和索引：
```sql
-- 唯一约束
ALTER TABLE intentions ADD CONSTRAINT intentions_activity_user_uniq UNIQUE (activity_id, user_id);
ALTER TABLE vote_records ADD CONSTRAINT vote_records_activity_user_uniq UNIQUE (activity_id, user_id);

-- registrations 的 partial unique index（处理 scene_id 为 NULL 的情况）
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_activity_id_scene_id_user_id_key;
CREATE UNIQUE INDEX registrations_activity_scene_user_uniq ON registrations (activity_id, scene_id, user_id) WHERE scene_id IS NOT NULL;
CREATE UNIQUE INDEX registrations_activity_null_scene_user_uniq ON registrations (activity_id, user_id) WHERE scene_id IS NULL;

-- 必要字段
ALTER TABLE activities ADD COLUMN IF NOT EXISTS passphrase TEXT NOT NULL DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS access_code TEXT NOT NULL DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS vote_type TEXT NOT NULL DEFAULT 'single';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_votes INTEGER NOT NULL DEFAULT 1;
ALTER TABLE registrations ALTER COLUMN scene_id DROP NOT NULL;
```

### 11.4 已有数据迁移

如果数据库中已有明文口令数据，需迁移为哈希值：
```typescript
import { createHash } from 'crypto';
function hashSecret(s: string) { return createHash('sha256').update(s).digest('hex'); }
// 对每条 activity 的 passphrase 和 access_code 执行 UPDATE
```

### 11.5 RLS策略

RLS已启用但未配置策略。使用 service_role_key 绕过，公开读写。生产环境建议添加策略。

---

## 十二、已知限制与未来优化

### 当前限制

1. **无实时推送**：投票页依赖10秒轮询，非WebSocket实时更新
2. **无推送通知**：状态变更后参与者不会收到通知
3. **无离线支持**：需要网络连接
4. **单设备身份**：localStorage换设备/清缓存后身份丢失，管理口令需要重新输入
5. **Prompt模板不接AI**：只生成可复制文本，需用户自行粘贴到AI工具
6. **无图片上传**：活动没有封面图

### 优化方向

1. WebSocket 实时推送
2. 微信/短信通知
3. 活动封面图
4. 模板化创建（常用活动模板）
5. 导出为日历事件
6. 数据统计看板（参与率、投票分布图表）
