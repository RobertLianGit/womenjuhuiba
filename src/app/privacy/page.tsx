import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隐私保护声明 - 我们聚会吧Beta',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="text-accent-blue font-bold border-2 border-outline px-3 py-1 hover:bg-accent-blue hover:text-white transition-colors inline-block mb-6">← 返回首页</Link>

        <h1 className="text-3xl font-bold border-b-4 border-outline pb-3 mb-6">隐私保护声明</h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold mb-2">你的活动，别人看不见</h2>
            <p>我们聚会吧Beta 采用<strong>「口令即权限」</strong>的设计理念。简单来说：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>活动列表不公开</strong> — 没有活动广场、没有推荐、没有搜索。任何人打开网站，只能看到自己参与过的活动。</li>
              <li><strong>没有口令进不来</strong> — 每个活动都有一个由创建者设置的活动口令（比如&quot;周末火锅666&quot;）。不知道口令，就无法查看或加入活动。</li>
              <li><strong>管理口令是另一把钥匙</strong> — 创建活动时会自动生成一个6位管理口令，只有组织者持有。管理口令用于控制活动阶段（开始投票、开放报名等）和管理操作（编辑方案、删除成员等），普通参与者看不到也用不了。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">具体怎么保护的</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>API 不暴露活动列表</strong> — 后端接口不接受「列出所有活动」的请求。没有参数就返回错误，不会把任何活动数据交出去。</li>
              <li><strong>不能按用户查活动</strong> — 即使知道某个人的用户ID，也无法通过接口查看他创建了哪些活动、参与了哪些活动。</li>
              <li><strong>不能猜ID进活动</strong> — 活动详情接口不暴露管理口令，且只能通过已验证身份的请求访问。猜测活动的随机ID无法获取内容。</li>
              <li><strong>管理口令不回传</strong> — 任何 API 查询都不会返回管理口令。它只存在于创建者本人的浏览器本地存储中，服务端不会把它发给其他人。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">数据存在哪里</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>活动数据</strong> — 存储在服务端数据库（Supabase PostgreSQL），只有通过口令验证的用户才能访问对应活动的数据。</li>
              <li><strong>你的身份信息</strong> — 仅存储在你自己的浏览器本地（localStorage），包括：你的昵称、一个随机生成的用户ID、你持有的管理口令、你已加入的活动列表。这些信息不会上传到服务端做身份关联。</li>
              <li><strong>没有账号体系</strong> — 本产品不要求注册、不收集手机号或邮箱、不使用 Cookie 追踪。换设备或清浏览器缓存会丢失本地身份，需要重新通过活动口令加入。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">什么情况下别人能看到你的活动</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>你把<strong>活动口令</strong>告诉了别人（这是设计意图，口令就是邀请函）</li>
              <li>你把<strong>管理口令</strong>告诉了别人（请不要这样做，除非你确实想把管理权交给对方）</li>
              <li>别人看到了你分享的链接（分享时链接会包含活动口令，请注意分享范围）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">口令安全建议</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>活动口令</strong>可以简单好记，方便分享给朋友（比如&quot;周五见123&quot;），不需要高强度</li>
              <li><strong>管理口令</strong>是系统随机生成的6位码，请妥善保存，不要随意转发</li>
              <li>如果管理口令泄露，目前需要创建新活动来重新开始（后续版本会支持重置口令）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">技术实现的隐私边界</h2>
            <p className="mb-2">坦率说明以下技术现实：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>数据库未启用行级安全策略（RLS），所有数据通过服务端API层控制访问。这意味着如果API层存在漏洞，数据可能被访问。我们会持续审查API安全性。</li>
              <li>本产品使用 Supabase 的 service_role_key 绕过 RLS，这是为了简化多人协作场景下的数据写入。服务端代码是唯一的数据访问入口。</li>
              <li>活动口令和管理口令均使用 SHA-256 哈希算法存储在数据库中，即使开发者也无法看到原始口令。验证时对输入做哈希后与存储值比对。</li>
            </ul>
          </section>

          <section className="border-t-2 border-outline pt-4 mt-6">
            <p className="text-xs text-muted-foreground">最后更新：2026年5月 | 本声明适用于「我们聚会吧Beta」当前版本</p>
          </section>
        </div>
      </div>
    </div>
  );
}
