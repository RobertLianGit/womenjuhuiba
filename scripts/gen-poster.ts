import sharp from 'sharp';
import QRCode from 'qrcode';

async function main() {
  const W = 1080;
  const H = 1920;

  // 1. 生成二维码 PNG buffer
  const qrPng = await QRCode.toBuffer('https://happyparty.fun', {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  });

  // 2. 缩放二维码到 240x240
  const qrResized = await sharp(qrPng).resize(240, 240).png().toBuffer();

  // 3. 构建整个海报为 SVG + 嵌入二维码
  const posterSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="3" fill="#FF4DB8" opacity="0.15"/>
        </pattern>
      </defs>

      <!-- 整体背景 -->
      <rect width="${W}" height="${H}" fill="#FAFAF5"/>

      <!-- 顶部粉色大块 -->
      <rect x="0" y="0" width="${W}" height="680" fill="#FF4DB8"/>

      <!-- 点阵装饰 -->
      <rect x="0" y="0" width="${W}" height="680" fill="url(#dots)"/>

      <!-- 顶部黑色粗边框条 -->
      <rect x="0" y="0" width="${W}" height="12" fill="#0A0A0A"/>
      <rect x="0" y="668" width="${W}" height="12" fill="#0A0A0A"/>

      <!-- 品牌名 - 超大字号 -->
      <text x="${W / 2}" y="200" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei','Hiragino Sans GB',sans-serif" font-size="110" font-weight="900" fill="#FFFFFF" letter-spacing="8">我们聚会吧</text>

      <!-- 副标题 -->
      <text x="${W / 2}" y="300" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="48" font-weight="bold" fill="#FFFFFF" opacity="0.95">组织聚会，一步到位</text>

      <!-- 白色分割线 -->
      <rect x="340" y="340" width="400" height="6" fill="#FFFFFF" rx="3"/>

      <!-- 痛点文案 -->
      <text x="${W / 2}" y="420" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" fill="#FFFFFF" opacity="0.9">还在群里来回问"去哪？""谁去？""多少钱"？</text>
      <text x="${W / 2}" y="480" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" fill="#FFFFFF" opacity="0.9">用「我们聚会吧」，聚会组织轻松搞定！</text>

      <!-- 三个特性卡片 - 上排 -->
      <!-- 卡片1 -->
      <rect x="60" y="540" width="300" height="90" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4" rx="0"/>
      <rect x="64" y="544" width="300" height="90" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="0" rx="0" transform="translate(4,4)"/>
      <text x="210" y="590" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="32" font-weight="bold" fill="#0A0A0A">📋 收集意愿</text>

      <!-- 卡片2 -->
      <rect x="390" y="540" width="300" height="90" fill="#FFF34D" stroke="#0A0A0A" stroke-width="4" rx="0"/>
      <rect x="394" y="544" width="300" height="90" fill="#FFF34D" stroke="#0A0A0A" stroke-width="0" rx="0" transform="translate(4,4)"/>
      <text x="540" y="590" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="32" font-weight="bold" fill="#0A0A0A">🗳 投票去哪</text>

      <!-- 卡片3 -->
      <rect x="720" y="540" width="300" height="90" fill="#3B82F6" stroke="#0A0A0A" stroke-width="4" rx="0"/>
      <rect x="724" y="544" width="300" height="90" fill="#3B82F6" stroke="#0A0A0A" stroke-width="0" rx="0" transform="translate(4,4)"/>
      <text x="870" y="590" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="32" font-weight="bold" fill="#FFFFFF">📝 分段报名</text>

      <!-- 中间区域：流程说明 -->
      <text x="${W / 2}" y="780" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="44" font-weight="bold" fill="#0A0A0A">简单 4 步，搞定聚会</text>

      <!-- 步骤1 -->
      <rect x="80" y="830" width="920" height="100" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4"/>
      <rect x="96" y="850" width="60" height="60" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="3"/>
      <text x="126" y="893" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF">1</text>
      <text x="190" y="878" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="34" font-weight="bold" fill="#0A0A0A">创建活动</text>
      <text x="190" y="918" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="26" fill="#666666">输入昵称即可，无需注册登录</text>

      <!-- 步骤2 -->
      <rect x="80" y="960" width="920" height="100" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4"/>
      <rect x="96" y="980" width="60" height="60" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="3"/>
      <text x="126" y="1023" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF">2</text>
      <text x="190" y="1008" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="34" font-weight="bold" fill="#0A0A0A">分享口令</text>
      <text x="190" y="1048" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="26" fill="#666666">6位口令发到群里，朋友输入即可加入</text>

      <!-- 步骤3 -->
      <rect x="80" y="1090" width="920" height="100" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4"/>
      <rect x="96" y="1110" width="60" height="60" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="3"/>
      <text x="126" y="1153" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF">3</text>
      <text x="190" y="1138" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="34" font-weight="bold" fill="#0A0A0A">收集意愿 &amp; 投票</text>
      <text x="190" y="1178" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="26" fill="#666666">大家投票选时间地点，民主决策不纠结</text>

      <!-- 步骤4 -->
      <rect x="80" y="1220" width="920" height="100" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="4"/>
      <rect x="96" y="1240" width="60" height="60" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="3"/>
      <text x="126" y="1283" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF">4</text>
      <text x="190" y="1268" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="34" font-weight="bold" fill="#0A0A0A">报名 &amp; 记账</text>
      <text x="190" y="1308" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="26" fill="#666666">分段报名灵活参与，AA记账轻松结算</text>

      <!-- 底部区域 -->
      <rect x="0" y="1380" width="${W}" height="8" fill="#0A0A0A"/>

      <!-- 二维码区域背景 -->
      <rect x="0" y="1388" width="${W}" height="${H - 1388}" fill="#FFFFFF"/>

      <!-- 二维码占位 - 用 image 嵌入 -->
      <rect x="${(W - 240) / 2}" y="1440" width="240" height="240" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="3"/>

      <!-- 扫码提示 -->
      <text x="${W / 2}" y="1740" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="30" font-weight="bold" fill="#0A0A0A">扫码开始你的第一场聚会</text>

      <!-- 域名 -->
      <text x="${W / 2}" y="1790" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="32" font-weight="bold" fill="#FF4DB8">happyparty.fun</text>

      <!-- 底部装饰条 -->
      <rect x="0" y="${H - 40}" width="${W}" height="40" fill="#FF4DB8"/>
      <rect x="0" y="${H - 40}" width="${W}" height="40" fill="url(#dots)"/>

      <!-- 底部标语 -->
      <text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">我们聚会吧 — 让每一次聚会都简单</text>
    </svg>
  `;

  // 4. 先生成不含二维码的海报
  const posterWithoutQr = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 250, g: 250, b: 245, alpha: 1 },
    },
  })
    .composite([
      { input: Buffer.from(posterSvg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();

  // 5. 合成二维码到预留位置
  await sharp(posterWithoutQr)
    .composite([
      { input: qrResized, top: 1440, left: (W - 240) / 2 },
    ])
    .png()
    .toFile('/workspace/projects/public/poster.png');

  console.log('海报已保存到 public/poster.png');
}

main().catch(console.error);
