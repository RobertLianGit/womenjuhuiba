# 我们聚会吧 - 微信小程序版

## 部署步骤

### 1. 创建云开发环境

1. 打开微信开发者工具，导入 `miniprogram` 目录
2. 点击「云开发」按钮，开通云开发服务
3. 创建云开发环境，记录环境ID
4. 在 `app.js` 中修改 `env: 'your-env-id'` 为你的环境ID

### 2. 创建数据库集合

在云开发控制台创建以下集合：

- activities（活动）
- scenes（分段）
- intentions（意愿）
- vote_proposals（投票方案）
- vote_records（投票记录）
- registrations（报名）
- participants（参与者）
- bills（账单）
- plans（方案内容）

### 3. 部署云函数

在微信开发者工具中，右键点击 `cloudfunctions` 目录下的每个云函数文件夹，选择「上传并部署：云端安装依赖」：

- login
- activities
- scenes
- intentions
- voteProposals
- voteRecords
- registrations
- participants
- bills
- plans

### 4. 配置 AppID

修改 `project.config.json` 中的 `appid` 为你的小程序 AppID

### 5. 预览与发布

1. 点击「预览」按钮扫码体验
2. 点击「上传」提交代码审核

## 目录结构

```
miniprogram/
├── app.js                    # 小程序入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
├── sitemap.json              # 搜索配置
├── pages/                    # 页面
│   ├── index/                # 首页
│   ├── create/               # 创建活动
│   ├── detail/               # 活动详情
│   ├── intention/            # 意愿收集
│   ├── vote/                 # 投票
│   ├── plan/                 # 方案确认
│   ├── register/             # 报名
│   ├── dashboard/            # 看板
│   └── settle/               # 结算
├── cloudfunctions/           # 云函数
│   ├── login/                # 登录
│   ├── activities/           # 活动
│   ├── scenes/               # 分段
│   ├── intentions/           # 意愿
│   ├── voteProposals/        # 投票方案
│   ├── voteRecords/          # 投票记录
│   ├── registrations/        # 报名
│   ├── participants/         # 参与者
│   ├── bills/                # 账单
│   └── plans/                # 方案
├── utils/                    # 工具函数
│   ├── api.js                # API 服务
│   └── util.js               # 通用工具
├── images/                   # TabBar 图标
└── assets/                   # 页面图标
```

## 功能说明

### 活动状态流转

`collecting` → `voting` → `plan` → `registering` → `started` → `settling` → `settled`

### 口令体系

- **活动口令（access_code）**：6位数字，用于进入活动
- **管理口令（passphrase）**：6位数字，用于管理操作
- 两个口令均使用 SHA-256 哈希存储

### 登录方式

使用微信授权登录，获取 openid 作为用户唯一标识

## 与 Web 版的区别

| 维度 | Web版 | 小程序版 |
|------|-------|----------|
| 登录 | 昵称+localStorage | 微信授权(openid) |
| 数据库 | Supabase（无前缀表） | 云开发数据库 |
| 设计风格 | 粗野风 | 微信原生风格 |
| 分享 | 链接 | 微信好友/群 |
| 后端 | Next.js API Routes | 云函数 |

## 图片资源

图片资源已生成在 `images/` 和 `assets/` 目录，如需自定义请参考 `IMAGES.md`
