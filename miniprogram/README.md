# 我们聚会吧 - 微信小程序版本

## 概述

这是「我们聚会吧」的微信小程序版本，与Web版共享相同的功能定位，但数据独立存储（使用mp_前缀的数据库表）。

## 技术栈

- **前端**：微信小程序原生开发（WXML/WXSS/JS）
- **后端**：Next.js API Routes（复用Web项目后端）
- **数据库**：Supabase PostgreSQL（mp_前缀表）
- **登录**：微信授权登录（openid）

## 目录结构

```
miniprogram/
├── app.js              # 小程序入口
├── app.json            # 小程序配置
├── app.wxss            # 全局样式
├── project.config.json # 项目配置
├── sitemap.json        # 搜索配置
├── pages/              # 页面文件
│   ├── index/          # 首页（活动列表）
│   ├── create/         # 创建活动
│   ├── detail/         # 活动详情
│   ├── intention/      # 意愿收集
│   ├── vote/           # 投票
│   ├── plan/           # 方案确认
│   ├── register/       # 报名
│   ├── dashboard/      # 看板
│   └── settle/         # 结算
├── utils/              # 工具函数
│   ├── api.js          # API服务封装
│   └── util.js         # 通用工具
├── images/             # TabBar图标
└── assets/             # 页面图标资源
```

## API 路由

所有小程序API都在 `/api/mp/` 路径下：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/mp/activities` | GET/POST | 活动列表/创建 |
| `/api/mp/activities/[id]` | GET/PATCH | 活动详情/状态变更 |
| `/api/mp/scenes` | GET/POST/PATCH/DELETE | 分段管理 |
| `/api/mp/intentions` | GET/POST | 意愿收集 |
| `/api/mp/vote-proposals` | GET/POST | 投票方案 |
| `/api/mp/vote-records` | GET/POST | 投票记录 |
| `/api/mp/registrations` | GET/POST/DELETE | 报名管理 |
| `/api/mp/participants` | GET/POST/DELETE | 参与者管理 |
| `/api/mp/bills` | GET/POST/PATCH | 账单管理 |
| `/api/mp/plans` | GET/POST | 方案内容 |

## 数据库表

| 表名 | 说明 |
|------|------|
| mp_activities | 活动 |
| mp_scenes | 分段 |
| mp_intentions | 意愿 |
| mp_vote_proposals | 投票方案 |
| mp_vote_records | 投票记录 |
| mp_registrations | 报名 |
| mp_participants | 参与者 |
| mp_bills | 账单 |
| mp_plans | 方案内容 |

## 部署步骤

### 1. 准备工作

1. 注册微信小程序账号，获取 AppID
2. 下载微信开发者工具
3. 准备图片资源（参考 IMAGES.md）

### 2. 配置

1. 修改 `project.config.json` 中的 `appid`
2. 修改 `utils/api.js` 中的 `BASE_URL` 为你的服务器域名
3. 在微信公众平台配置服务器域名白名单

### 3. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 选择 `miniprogram` 目录
4. 填入 AppID

### 4. 调试与发布

1. 在开发者工具中调试
2. 点击「上传」提交代码
3. 在微信公众平台提交审核
4. 审核通过后发布

## 功能流程

### 活动状态流转

```
collecting（意愿收集中）
    ↓
voting（投票进行中）
    ↓
plan（方案确认中）
    ↓
registering（开放报名）
    ↓
started（活动已开始）
    ↓
settling（记账结算中）
    ↓
settled（已结算）
```

### 口令体系

- **活动口令（access_code）**：6位数字，用于进入活动
- **管理口令（passphrase）**：6位数字，用于管理操作
- 两个口令在创建活动时自动生成，均使用 SHA-256 哈希存储

## 与Web版的区别

| 维度 | Web版 | 小程序版 |
|------|-------|----------|
| 登录方式 | 昵称+localStorage | 微信授权登录 |
| 用户标识 | UUID | openid |
| 数据存储 | 无前缀表 | mp_前缀表 |
| 设计风格 | 粗野风 | 微信原生风格 |
| 分享方式 | 链接 | 微信好友/群 |

## 注意事项

1. 服务器域名需要在微信公众平台配置
2. 敏感接口需要管理口令验证
3. 图片资源需要自行准备
4. 建议先在测试环境调试后再上线
