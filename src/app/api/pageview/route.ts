import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { page, referrer, visitor_id } = await request.json();

    if (!page) {
      return NextResponse.json({ error: '缺少page参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    await supabase.from('page_views').insert({
      page,
      referrer: referrer || null,
      visitor_id: visitor_id || null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '记录失败' }, { status: 500 });
  }
}
