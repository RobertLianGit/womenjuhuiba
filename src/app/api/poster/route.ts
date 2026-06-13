import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = new ImageGenerationClient(config, customHeaders);

  const prompt = `A bold neo-brutalism style promotional poster for a party gathering app. The background is a vibrant hot pink (#FF4DB8) with thick black outlines and offset shadows. At the top, huge bold text "我们聚会吧" in white with black outline. Below it, a row of 4 small brutalist cards with icons showing the flow: collect intentions → vote → register → settle bills. Each card has a black border and slight rotation. In the center, a group of diverse young people celebrating together, illustrated in a flat bold graphic style with black outlines. The overall mood is energetic, fun, and youthful. No QR code. Leave the bottom 25% area clean with warm white (#FAFAF5) background for text overlay later.`;

  try {
    const response = await client.generate({
      prompt,
      size: '2K',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      return NextResponse.json({ imageUrl: helper.imageUrls[0] });
    } else {
      return NextResponse.json(
        { error: helper.errorMessages.join('; ') || '生成失败' },
        { status: 500 }
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
