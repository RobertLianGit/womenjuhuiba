'use client';

import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

export default function PosterPage() {
  const [generating, setGenerating] = useState(false);
  const [finalImageUrl, setFinalImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      // 1. 调用 AI 生图 API
      const res = await fetch('/api/poster', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setGenerating(false);
        return;
      }

      const aiImageUrl = data.imageUrl;

      // 2. 加载 AI 图片 + 生成二维码
      const [img, qrDataUrl] = await Promise.all([
        loadImage(aiImageUrl),
        QRCode.toDataURL('https://happyparty.fun', {
          width: 280,
          margin: 2,
          color: { dark: '#0A0A0A', light: '#FFFFFF' },
        }),
      ]);

      // 3. Canvas 合成
      const canvas = document.createElement('canvas');
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // 绘制 AI 生成的图片（上半部分）
      const imgRatio = img.width / img.height;
      const targetImgHeight = H * 0.72;
      const drawWidth = imgRatio > W / targetImgHeight ? W : targetImgHeight * imgRatio;
      const drawHeight = imgRatio > W / targetImgHeight ? W / imgRatio : targetImgHeight;
      const imgX = (W - drawWidth) / 2;
      ctx.drawImage(img, imgX, 0, drawWidth, drawHeight);

      // 底部暖白区域
      const bottomY = H * 0.70;
      ctx.fillStyle = '#FAFAF5';
      ctx.fillRect(0, bottomY, W, H - bottomY);

      // 粉色装饰条
      ctx.fillStyle = '#FF4DB8';
      ctx.fillRect(0, bottomY, W, 8);

      // 标语
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0A0A0A';
      ctx.font = 'bold 52px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('组织聚会，一步到位', W / 2, bottomY + 80);

      // 特性列表
      ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#555555';
      const features = [
        '收集意愿 · 投票去哪 · 分段报名',
        '记账结算 · 一键分享 · 无需登录',
      ];
      features.forEach((line, i) => {
        ctx.fillText(line, W / 2, bottomY + 140 + i * 48);
      });

      // 二维码
      const qrImg = await loadImage(qrDataUrl);
      const qrSize = 260;
      const qrX = (W - qrSize) / 2;
      const qrY = bottomY + 260;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 二维码下方提示
      ctx.fillStyle = '#999999';
      ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('扫码开始你的第一场聚会', W / 2, qrY + qrSize + 44);

      // 品牌名
      ctx.fillStyle = '#FF4DB8';
      ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('我们聚会吧', W / 2, qrY + qrSize + 90);

      ctx.textAlign = 'left';

      // 输出
      const dataUrl = canvas.toDataURL('image/png');
      setFinalImageUrl(dataUrl);
    } catch (e) {
      console.error('海报生成失败', e);
      setError('生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!finalImageUrl) return;
    const link = document.createElement('a');
    link.href = finalImageUrl;
    link.download = '我们聚会吧-宣传海报.png';
    link.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">宣传海报生成器</h1>
        <p className="text-muted-foreground mb-8">
          生成一张吸引眼球的宣传海报，带首页二维码，可直接分享到微信群或朋友圈
        </p>

        {/* Generate Button */}
        {!finalImageUrl && (
          <div className="text-center py-20">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary text-primary-foreground border-2 border-outline px-10 py-5 text-xl font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
            >
              {generating ? (
                <><RefreshCw className="w-6 h-6 animate-spin" /> AI 正在创作中...</>
              ) : (
                <><Sparkles className="w-6 h-6" /> 生成海报</>
              )}
            </button>
            {generating && (
              <p className="text-sm text-muted-foreground mt-4">AI 生图需要 10-20 秒，请耐心等待...</p>
            )}
            {error && (
              <p className="text-sm text-red-500 mt-4 font-bold">{error}</p>
            )}
          </div>
        )}

        {/* Result */}
        {finalImageUrl && (
          <div>
            <div className="bg-card border-2 border-outline p-4 mb-6" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <img src={finalImageUrl} alt="宣传海报" className="w-full" />
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDownload}
                className="bg-primary text-primary-foreground border-2 border-outline px-8 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                <Download className="w-5 h-5" /> 下载海报
              </button>
              <button
                onClick={() => { setFinalImageUrl(''); setError(''); }}
                className="bg-muted border-2 border-outline px-8 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                <RefreshCw className="w-5 h-5" /> 重新生成
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
