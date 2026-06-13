import sharp from 'sharp';
import QRCode from 'qrcode';

async function main() {
  const W = 1080;
  const H = 1920;

  // 1. 生成二维码 SVG
  const qrSvg = await QRCode.toString('https://happyparty.fun', {
    type: 'svg',
    width: 260,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  });

  // 2. 读取 AI 背景图并缩放到合适尺寸
  const bgBuffer = await sharp('/workspace/projects/public/poster-bg.png')
    .resize(W, Math.round(H * 0.72), { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // 3. 构建底部白色区域 + 文字 + 二维码的 SVG overlay
  const bottomY = Math.round(H * 0.70);
  const overlaySvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- 底部白色区域 -->
      <rect x="0" y="${bottomY}" width="${W}" height="${H - bottomY}" fill="#FAFAF5"/>
      <!-- 粉色装饰条 -->
      <rect x="0" y="${bottomY}" width="${W}" height="8" fill="#FF4DB8"/>

      <!-- 标语 -->
      <text x="${W / 2}" y="${bottomY + 70}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="52" font-weight="bold" fill="#0A0A0A">组织聚会，一步到位</text>

      <!-- 特性列表 -->
      <text x="${W / 2}" y="${bottomY + 140}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="32" fill="#555555">收集意愿 · 投票去哪 · 分段报名</text>
      <text x="${W / 2}" y="${bottomY + 188}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="32" fill="#555555">记账结算 · 一键分享 · 无需登录</text>

      <!-- 二维码（居中） -->
      <g transform="translate(${(W - 260) / 2}, ${bottomY + 240})">
        ${qrSvg.replace(/<\?xml[^?]*\?>\s*/g, '').replace(/<svg[^>]*>/, `<svg width="260" height="260">`)}
      </g>

      <!-- 二维码下方提示 -->
      <text x="${W / 2}" y="${bottomY + 544}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="26" fill="#999999">扫码开始你的第一场聚会</text>

      <!-- 品牌名 -->
      <text x="${W / 2}" y="${bottomY + 590}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="30" font-weight="bold" fill="#FF4DB8">我们聚会吧</text>
    </svg>
  `;

  // 4. 合成：先创建空白画布 → 放背景 → 叠加 SVG
  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 250, g: 250, b: 245 },
    },
  })
    .composite([
      { input: bgBuffer, top: 0, left: 0 },
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png()
    .toFile('/workspace/projects/public/poster.png');

  console.log('海报已保存到 public/poster.png');
}

main().catch(console.error);
