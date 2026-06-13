import sharp from 'sharp';
import QRCode from 'qrcode';

async function main() {
  // 2x 分辨率输出，消除锯齿
  const scale = 2;
  const W = 1080 * scale;
  const H = 1920 * scale;

  // 1. 生成二维码 PNG buffer
  const qrSize = 240 * scale;
  const qrPng = await QRCode.toBuffer('https://happyparty.fun', {
    type: 'png',
    width: qrSize,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  });

  const qrResized = await sharp(qrPng).resize(qrSize, qrSize).png().toBuffer();

  // 2. 构建海报 SVG（所有坐标乘以 scale）
  const s = scale;
  const posterSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" width="${80*s}" height="${80*s}" patternUnits="userSpaceOnUse">
          <circle cx="${40*s}" cy="${40*s}" r="${6*s}" fill="#FF4DB8" opacity="0.12"/>
        </pattern>
      </defs>

      <!-- 整体暖白背景 -->
      <rect width="${W}" height="${H}" fill="#FAFAF5"/>

      <!-- ========== 顶部黑色粗框 ========== -->
      <rect x="0" y="0" width="${W}" height="${16*s}" fill="#0A0A0A"/>

      <!-- ========== 广告语 - 最醒目位置 ========== -->
      <text x="${W/2}" y="${200*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei','Hiragino Sans GB',sans-serif"
        font-size="${72*s}" font-weight="900" fill="#0A0A0A" letter-spacing="${4*s}">
        让每一次聚会
      </text>
      <text x="${W/2}" y="${300*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei','Hiragino Sans GB',sans-serif"
        font-size="${72*s}" font-weight="900" fill="#0A0A0A" letter-spacing="${4*s}">
        都不再只是"下次一定"
      </text>

      <!-- ========== 品牌名粉色块 ========== -->
      <rect x="0" y="${360*s}" width="${W}" height="${400*s}" fill="#FF4DB8"/>
      <rect x="0" y="${360*s}" width="${W}" height="${400*s}" fill="url(#dots)"/>
      <!-- 上下黑框 -->
      <rect x="0" y="${360*s}" width="${W}" height="${12*s}" fill="#0A0A0A"/>
      <rect x="0" y="${748*s}" width="${W}" height="${12*s}" fill="#0A0A0A"/>

      <!-- 品牌名 -->
      <text x="${W/2}" y="${490*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${100*s}" font-weight="900" fill="#FFFFFF" letter-spacing="${12*s}">
        我们聚会吧
      </text>

      <!-- 痛点 -->
      <text x="${W/2}" y="${590*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${34*s}" fill="#FFFFFF" opacity="0.92">
        还在群里来回问"去哪？""谁去？""多少钱"？
      </text>
      <text x="${W/2}" y="${650*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${34*s}" fill="#FFFFFF" opacity="0.92">
        一步搞定，聚会组织不再难！
      </text>

      <!-- ========== 三个特性卡片 ========== -->
      <!-- 卡片1 -->
      <rect x="${60*s}" y="${800*s}" width="${300*s}" height="${100*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${64*s+4*s}" y="${804*s+4*s}" width="${300*s}" height="${100*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${2*s}" opacity="0.3"/>
      <text x="${210*s}" y="${862*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${32*s}" font-weight="bold" fill="#0A0A0A">📋 收集意愿</text>

      <!-- 卡片2 -->
      <rect x="${390*s}" y="${800*s}" width="${300*s}" height="${100*s}" fill="#FFF34D" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${394*s+4*s}" y="${804*s+4*s}" width="${300*s}" height="${100*s}" fill="#FFF34D" stroke="#0A0A0A" stroke-width="${2*s}" opacity="0.3"/>
      <text x="${540*s}" y="${862*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${32*s}" font-weight="bold" fill="#0A0A0A">🗳 投票去哪</text>

      <!-- 卡片3 -->
      <rect x="${720*s}" y="${800*s}" width="${300*s}" height="${100*s}" fill="#3B82F6" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${724*s+4*s}" y="${804*s+4*s}" width="${300*s}" height="${100*s}" fill="#3B82F6" stroke="#0A0A0A" stroke-width="${2*s}" opacity="0.3"/>
      <text x="${870*s}" y="${862*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${32*s}" font-weight="bold" fill="#FFFFFF">📝 分段报名</text>

      <!-- ========== 流程说明 ========== -->
      <text x="${W/2}" y="${1010*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${44*s}" font-weight="bold" fill="#0A0A0A">简单 4 步，搞定聚会</text>

      <!-- 步骤1 -->
      <rect x="${80*s}" y="${1060*s}" width="${920*s}" height="${110*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${96*s}" y="${1080*s}" width="${70*s}" height="${70*s}" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="${3*s}"/>
      <text x="${131*s}" y="${1132*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${40*s}" font-weight="bold" fill="#FFFFFF">1</text>
      <text x="${200*s}" y="${1116*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${36*s}" font-weight="bold" fill="#0A0A0A">创建活动</text>
      <text x="${200*s}" y="${1156*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${26*s}" fill="#666666">输入昵称即可，无需注册登录</text>

      <!-- 步骤2 -->
      <rect x="${80*s}" y="${1200*s}" width="${920*s}" height="${110*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${96*s}" y="${1220*s}" width="${70*s}" height="${70*s}" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="${3*s}"/>
      <text x="${131*s}" y="${1272*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${40*s}" font-weight="bold" fill="#FFFFFF">2</text>
      <text x="${200*s}" y="${1256*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${36*s}" font-weight="bold" fill="#0A0A0A">分享口令</text>
      <text x="${200*s}" y="${1296*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${26*s}" fill="#666666">6位口令发到群里，朋友输入即可加入</text>

      <!-- 步骤3 -->
      <rect x="${80*s}" y="${1340*s}" width="${920*s}" height="${110*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${96*s}" y="${1360*s}" width="${70*s}" height="${70*s}" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="${3*s}"/>
      <text x="${131*s}" y="${1412*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${40*s}" font-weight="bold" fill="#FFFFFF">3</text>
      <text x="${200*s}" y="${1396*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${36*s}" font-weight="bold" fill="#0A0A0A">收集意愿 &amp; 投票</text>
      <text x="${200*s}" y="${1436*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${26*s}" fill="#666666">大家投票选时间地点，民主决策不纠结</text>

      <!-- 步骤4 -->
      <rect x="${80*s}" y="${1480*s}" width="${920*s}" height="${110*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${4*s}"/>
      <rect x="${96*s}" y="${1500*s}" width="${70*s}" height="${70*s}" fill="#FF4DB8" stroke="#0A0A0A" stroke-width="${3*s}"/>
      <text x="${131*s}" y="${1552*s}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${40*s}" font-weight="bold" fill="#FFFFFF">4</text>
      <text x="${200*s}" y="${1536*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${36*s}" font-weight="bold" fill="#0A0A0A">报名 &amp; 记账</text>
      <text x="${200*s}" y="${1576*s}"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${26*s}" fill="#666666">分段报名灵活参与，AA记账轻松结算</text>

      <!-- ========== 底部二维码区域 ========== -->
      <rect x="0" y="${1640*s}" width="${W}" height="${8*s}" fill="#0A0A0A"/>

      <!-- 二维码占位白底 -->
      <rect x="${(W - qrSize - 20*s)/2}" y="${1680*s}" width="${qrSize + 20*s}" height="${qrSize + 20*s}" fill="#FFFFFF" stroke="#0A0A0A" stroke-width="${3*s}"/>

      <!-- 扫码提示 -->
      <text x="${W/2}" y="${1780*s + qrSize}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${32*s}" font-weight="bold" fill="#0A0A0A">扫码开始你的第一场聚会</text>

      <!-- 域名 -->
      <text x="${W/2}" y="${1840*s + qrSize}" text-anchor="middle"
        font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif"
        font-size="${36*s}" font-weight="900" fill="#FF4DB8">happyparty.fun</text>

      <!-- 底部粉色条 -->
      <rect x="0" y="${H - 50*s}" width="${W}" height="${50*s}" fill="#FF4DB8"/>
    </svg>
  `;

  // 3. SVG -> PNG
  const svgBuffer = Buffer.from(posterSvg);

  // 4. 先渲染 SVG 为 PNG
  const posterPng = await sharp(svgBuffer)
    .png()
    .toBuffer();

  // 5. 合成二维码
  const qrY = 1680 * s + 10 * s;
  const qrX = (W - qrSize) / 2;
  await sharp(posterPng)
    .composite([
      { input: qrResized, top: qrY, left: qrX },
    ])
    .png()
    .toFile('/workspace/projects/public/poster.png');

  console.log('海报已保存到 public/poster.png');
}

main().catch(console.error);
