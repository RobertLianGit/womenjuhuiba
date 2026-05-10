# 「开始聚会吧」Web 应用 — 实施计划

## 概述

将微信小程序需求适配为 Web 应用，实现朋友聚会全流程工具：创建活动 → 意愿收集 → 投票去哪 → 方案确认 → 分段报名 → 记账结算。无需登录，输入昵称即可参与；方案环节生成可复制的 Prompt 模板。使用 Supabase 作为数据库。

## 技术方案

| 维度 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 16 (App Router) | 全栈能力，API Routes 做后端，SSR 支持分享页 |
| 语言 | TypeScript 5 | 类型安全，减少运行时错误 |
| UI | shadcn/ui + Tailwind CSS 4 | 组件丰富，定制灵活 |
| 数据库 | Supabase (PostgreSQL) | 技能集成，实时能力强，免运维 |
| 身份 | localStorage UUID + 昵称 | 无需登录，轻量参与 |
| AI | Prompt 模板生成，不接入 LLM | v0.1 方案，零运营成本 |
| 状态管理 | React useState + URL 参数 | 单活动页为主，无需全局状态库 |

## 功能模块

### 1. 创建活动与分享
- 发起人填写：活动名称、描述、大致时间
- 创建后生成活动链接，可复制分享
- 活动状态机：创建 → 意愿收集中 → 投票中 → 方案确认 → 报名中 → 进行中 → 已结算
- 组织者通过操作按钮驱动状态流转

### 2. 意愿收集
- 参与者输入昵称后一键表达意愿
- 可选填：想去哪（文本）、预计人数、参与时间段
- 汇总看板（组织者）：总人数、地点汇总、时间段分布、未表态名单
- 截止时间默认 3 天，可调整
- 意愿数据自动流入投票环节

### 3. 投票去哪
- 投票选项 = 意愿收集阶段"想去哪"的汇总 + 参与者新提方案
- 多提多选
- 投票结果可视化，组织者拍板确认
- 截止时间默认 3 天，可调整

### 4. 方案确认
- 组织者设置活动分段（如午餐/下午茶/晚餐）
- 填写具体时间地点
- 一键生成 Prompt 模板（填充意愿汇总数据），复制到 AI 工具使用
- 支持手动粘贴 AI 生成的方案内容回方案页
- 方案页可编辑

### 5. 分段报名
- 参与者查看分段方案，选择参与哪几段
- 表单：姓名 + 参与人数 + 备注
- 组织者看板：实时查看每段参与人列表
- 支持手动添加/删除参与人，临时参与人角标区分
- 活动开始前可修改或取消报名

### 6. 记账结算
- 每段独立记账：组织者填写总额
- 参与人数来自看板确认数据
- 自动计算：该段人均 = 总额 ÷ 参与人数；某人应付 = Σ(各段人均)
- "谁欠谁"转账指引：基于已付/应付差额列出最优转账路径

### 7. Prompt 模板生成（P1）
- 将意愿汇总数据填入模板，一键复制
- 模板内容：活动名称、描述、参与人数、地点汇总、时间段分布

## 数据结构

```sql
-- 活动
activities (
  id uuid, title text, description text,
  status text DEFAULT 'created',  -- created/intention/voting/plan/registration/ongoing/settled
  creator_id uuid, creator_name text,
  rough_time text,               -- 大致时间（如"周末"）
  intention_deadline timestamptz,
  vote_deadline timestamptz,
  created_at timestamptz, updated_at timestamptz
)

-- 活动分段
scenes (
  id uuid, activity_id uuid,
  name text,                     -- 如"午餐"
  time_range text,               -- 如"12:00-14:00"
  location text, sort_order int
)

-- 意愿
intentions (
  id uuid, activity_id uuid, user_id uuid, user_name text,
  wants text,                    -- 想去哪
  estimated_people int DEFAULT 1,
  selected_scenes uuid[],        -- 选择参与的段
  created_at timestamptz
)

-- 投票方案
vote_proposals (
  id uuid, activity_id uuid, user_id uuid, user_name text,
  location text, activity_type text,
  created_at timestamptz
)

-- 投票记录
vote_records (
  id uuid, activity_id uuid, user_id uuid, user_name text,
  voted_proposal_ids uuid[],
  created_at timestamptz
)

-- 报名
registrations (
  id uuid, activity_id uuid, scene_id uuid,
  user_id uuid, user_name text,
  people_count int DEFAULT 1, notes text,
  created_at timestamptz, updated_at timestamptz
)

-- 参与者看板
participants (
  id uuid, activity_id uuid, scene_id uuid,
  user_id uuid, user_name text,
  people_count int, is_manual bool DEFAULT false, is_temp bool DEFAULT false,
  status text DEFAULT 'confirmed'
)

-- 账单
bills (
  id uuid, activity_id uuid, scene_id uuid,
  total_amount decimal, settled_at timestamptz
)

-- 方案内容
plans (
  id uuid, activity_id uuid,
  content text,                  -- 方案全文（可编辑）
  prompt_generated text,         -- 生成的Prompt
  updated_at timestamptz
)
```

## 是否有原型设计

是（设计引导已开启）

## 实施步骤

1. **阶段一：原型设计** — 加载 design-canvas 技能，设计首页、活动详情、意愿收集、投票、方案确认、报名、看板、结算共 8 个核心页面的 HTML 原型。原型完成后提示用户确认，确认后进入开发。

2. **初始化项目与数据库** — `coze init` 创建 Next.js 项目；加载 Supabase 技能创建数据库表（activities, scenes, intentions, vote_proposals, vote_records, registrations, participants, bills, plans）。涉及文件：`.coze`、`supabase/migrations/`。

3. **创建活动与分享 + 布局框架** — 实现全局 Layout（顶部导航）、首页（创建活动入口+近期活动列表）、活动创建表单、活动详情页（状态展示+操作入口）、分享链接生成。涉及文件：`src/app/layout.tsx`、`src/app/page.tsx`、`src/app/activity/page.tsx`、`src/lib/db-activities.ts`。

4. **意愿收集与投票** — 意愿提交表单、汇总看板（组织者视角）、状态流转到投票、投票页面（多提多选+结果可视化）、截止时间控制。涉及文件：`src/app/intention/page.tsx`、`src/app/vote/page.tsx`、`src/lib/db-intentions.ts`、`src/lib/db-votes.ts`。

5. **方案确认与 Prompt 生成** — 方案页（分段设置+时间地点填写）、Prompt 模板生成与一键复制、方案内容编辑与展示。涉及文件：`src/app/plan/page.tsx`、`src/lib/db-plans.ts`。

6. **分段报名与组织者看板** — 报名表单（选段+人数+备注）、组织者实时看板（手动添加/删除参与人、临时参与人角标）、报名修改/取消。涉及文件：`src/app/register/page.tsx`、`src/app/dashboard/page.tsx`、`src/lib/db-registrations.ts`。

7. **记账结算** — 每段账单录入、人均计算、某人应付汇总、"谁欠谁"转账指引。涉及文件：`src/app/settle/page.tsx`、`src/lib/db-bills.ts`。

8. **代码检查与验证** — 执行 lint + ts-check 静态检查、服务存活探测、API 接口冒烟测试、日志健康检查。

## 页面规格

##### @nav(web-topbar)
> type: topbar
> platform: web

- @page(/) 首页
- @page(/activity) 活动详情
- @page(/intention) 意愿收集
- @page(/vote) 投票去哪
- @page(/plan) 方案确认
- @page(/register) 报名
- @page(/dashboard) 组织者看板
- @page(/settle) 记账结算

##### @page(/) 首页

**核心职责**：创建活动入口和查看近期活动列表。
**访问路径**：顶部导航直达。
**布局**：顶部导航栏（Logo + 应用名）→ 主区域包含"创建活动"大按钮 → 下方为近期活动卡片列表（按时间倒序）。
**列表项字段**：活动名称 / 状态标签 / 大致时间 / 参与人数 / 创建时间

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 创建活动按钮 | 点击 | 弹出 @modal(create-activity) | — | — |
| 活动卡片 | 点击 | 跳转 @page(/activity)?id=activity_id | activity_id | — |
| Logo | 点击 | 回到首页 | — | — |

**弹窗 create-activity**：
- 标题："创建新活动"
- 表单字段：活动名称（必填）、活动描述（必填）、大致时间（必填，如"周末"）
- 操作：创建（创建活动并跳转活动详情页）、取消（关闭弹窗）

##### @page(/activity) 活动详情

**核心职责**：展示活动当前状态、基础信息、操作入口。
**访问路径**：从首页活动卡片或分享链接进入。缺少 id 参数时跳转首页。
**布局**：顶部导航 → 活动标题区（名称+状态徽章）→ 基础信息区（描述/时间/组织者）→ 当前阶段操作区（根据状态动态展示按钮）→ 快捷入口卡片列表（意愿/投票/方案/报名/看板/结算，按已开放状态高亮可点击）。

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 状态操作按钮 | 点击 | 驱动状态流转（如"开始收集意愿"/"开始投票"/"确认方案"/"开启报名"/"活动开始"/"结算"） | activity_id | 仅组织者可见 |
| 意愿入口卡片 | 点击 | 跳转 @page(/intention)?id=activity_id | activity_id | 意愿阶段后可用 |
| 投票入口卡片 | 点击 | 跳转 @page(/vote)?id=activity_id | activity_id | 投票阶段后可用 |
| 方案入口卡片 | 点击 | 跳转 @page(/plan)?id=activity_id | activity_id | 方案阶段后可用 |
| 报名入口卡片 | 点击 | 跳转 @page(/register)?id=activity_id | activity_id | 报名阶段后可用 |
| 看板入口卡片 | 点击 | 跳转 @page(/dashboard)?id=activity_id | activity_id | 报名阶段后可用，仅组织者 |
| 结算入口卡片 | 点击 | 跳转 @page(/settle)?id=activity_id | activity_id | 进行中/已结算状态可用 |
| Logo | 点击 | 回到首页 | — | — |

##### @page(/intention) 意愿收集

**核心职责**：参与者表达意愿，组织者查看汇总。
**访问路径**：从活动详情页入口进入。
**布局**：顶部导航 → 活动名称 → 双 Tab 切换（"填写意愿"/"汇总看板"）→ 填写 Tab：意愿表单 → 汇总 Tab：人数统计卡片 + 地点汇总列表 + 时间段分布 + 未表态名单。
**状态**：
- 空态：汇总看板无数据时显示"暂无意愿表达"
- 加载态：骨架屏

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 提交意愿按钮 | 点击 | 提交意愿，显示成功 Toast | — | — |
| 想去哪输入框 | 输入 | 文本保存 | — | 选填 |
| 预计人数输入 | 修改 | 数字增减 | — | 默认1，选填 |
| 参与时间段 | 勾选 | 多选时间段 | — | 活动有分段时显示 |
| 截止时间调整 | 点击 | 弹出日期时间选择器 | — | 仅组织者 |
| 提前结束意愿收集 | 点击 | 确认弹窗后关闭意愿收集，流转到投票阶段 | — | 仅组织者 |
| Logo | 点击 | 回到首页 | — | — |

##### @page(/vote) 投票去哪

**核心职责**：参与者提交方案和投票，查看结果。
**访问路径**：从活动详情页入口进入。
**布局**：顶部导航 → 活动名称 → 三 Tab（"提交方案"/"投票"/"结果"）→ 提交 Tab：新增方案表单 + 已有方案列表 → 投票 Tab：方案卡片列表多选 + 提交投票 → 结果 Tab：各方案票数柱状图 + 排名。
**状态**：
- 空态：无方案时"还没有人提方案，来提第一个吧"
- 加载态：骨架屏

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 新增方案按钮 | 点击 | 弹出 @modal(add-proposal)，填写地点+活动形式 | — | — |
| 投票选项 | 勾选 | 多选 | — | — |
| 提交投票按钮 | 点击 | 提交投票，显示成功 Toast | — | — |
| 确认方案按钮 | 点击 | 组织者拍板确认，选择最终方案，流转到方案确认阶段 | — | 仅组织者 |
| 截止时间调整 | 点击 | 弹出日期时间选择器 | — | 仅组织者 |
| 提前结束投票 | 点击 | 确认弹窗后关闭投票 | — | 仅组织者 |
| Logo | 点击 | 回到首页 | — | — |

**弹窗 add-proposal**：
- 标题："提一个方案"
- 字段：地点（必填）、活动形式（选填）
- 操作：提交、取消

##### @page(/plan) 方案确认

**核心职责**：组织者设置分段、填写方案、生成 Prompt。
**访问路径**：从活动详情页入口进入。
**布局**：顶部导航 → 活动名称 → 分段设置区（可增删分段，每段：名称+时间范围+地点）→ Prompt 生成区（一键生成按钮 + 可复制的 Prompt 文本框）→ 方案内容编辑区（富文本/大文本框，粘贴 AI 生成的内容）。

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 添加分段按钮 | 点击 | 新增一段空白分段 | — | — |
| 删除分段按钮 | 点击 | 删除该段 | — | — |
| 生成 Prompt 按钮 | 点击 | 填充数据到 Prompt 模板，显示在文本框 | — | — |
| 复制 Prompt 按钮 | 点击 | 复制到剪贴板，显示 Toast | — | — |
| 保存方案按钮 | 点击 | 保存方案内容，流转到报名阶段 | — | 仅组织者 |
| 方案内容编辑区 | 编辑 | 保存到后端 | — | — |
| Logo | 点击 | 回到首页 | — | — |

##### @page(/register) 报名

**核心职责**：参与者按段报名，组织者查看报名情况。
**访问路径**：从活动详情页入口进入。
**布局**：顶部导航 → 活动名称 → 方案摘要卡片 → 分段报名表单（每段一个勾选项+人数输入）→ 姓名输入 + 参与人数 + 备注文本框 → 提交按钮 → 下方已报名列表。
**状态**：
- 空态：暂无报名
- 加载态：骨架屏

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 分段勾选 | 勾选 | 选中参与段 | — | — |
| 提交报名按钮 | 点击 | 提交报名，显示成功 Toast | — | — |
| 修改报名按钮 | 点击 | 重新填写表单 | — | 已报名用户 |
| 取消报名按钮 | 点击 | 弹出 @modal(cancel-confirm)，确认后取消 | — | 已报名用户，活动开始前 |
| Logo | 点击 | 回到首页 | — | — |

**弹窗 cancel-confirm**：
- 标题："确认取消报名"
- 内容：显示当前报名信息
- 操作：确认取消（删除报名记录）、返回

##### @page(/dashboard) 组织者看板

**核心职责**：组织者实时查看和管理各段参与人。
**访问路径**：从活动详情页入口进入，仅组织者可访问。
**布局**：顶部导航 → 活动名称 → 按 Tab 切换分段 → 每段参与人卡片列表（姓名+人数+来源标签：报名/手动添加/临时）→ 底部操作栏：手动添加参与人 + 复制名单。
**列表项字段**：姓名 / 参与人数 / 来源标签 / 操作按钮
**状态**：
- 空态：该段暂无参与人

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 手动添加按钮 | 点击 | 弹出 @modal(add-participant)，填写姓名+人数+是否临时 | — | — |
| 删除参与人按钮 | 点击 | 确认后删除 | participant_id | — |
| 复制名单按钮 | 点击 | 复制文本到剪贴板，显示 Toast | — | — |
| 分段 Tab | 切换 | 显示对应段参与人列表 | scene_id | — |
| Logo | 点击 | 回到首页 | — | — |

**弹窗 add-participant**：
- 标题："添加参与人"
- 字段：姓名（必填）、参与人数（默认1）、是否临时参与人（开关）
- 操作：添加、取消

##### @page(/settle) 记账结算

**核心职责**：录入账单、自动分摊、展示转账指引。
**访问路径**：从活动详情页入口进入。
**布局**：顶部导航 → 活动名称 → 分段账单卡片列表（每段：段名+总额输入+参与人数+人均）→ 个人应付汇总表（姓名+参与段次+应付总额）→ "谁欠谁"转账指引卡片列表（A→B 金额）→ 标记已结算按钮。
**状态**：
- 空态：暂无账单数据

**交互说明**

| 元素 | 动作 | 响应 | 传参 | 备注 |
|------|------|------|------|------|
| 金额输入框 | 输入 | 实时计算人均和个人分摊 | — | 仅组织者可编辑 |
| 标记已结算按钮 | 点击 | 更新活动状态为已结算 | — | 仅组织者 |
| Logo | 点击 | 回到首页 | — | — |
