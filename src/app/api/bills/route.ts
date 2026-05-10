import { hashSecret } from '@/lib/hash';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function verifyPassphrase(client: ReturnType<typeof getSupabaseClient>, activityId: string, passphrase: string | undefined) {
  if (!passphrase) return false;
  const { data: activity } = await client
    .from('activities')
    .select('passphrase')
    .eq('id', activityId)
    .single();
  return activity && activity.passphrase === hashSecret(passphrase);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, scene_id, total_amount, passphrase } = body;

  if (!activity_id || !scene_id || total_amount === undefined) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 录入账单需要管理口令
  if (!(await verifyPassphrase(client, activity_id, passphrase))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { data, error } = await client
    .from('bills')
    .upsert(
      {
        activity_id,
        scene_id,
        total_amount: String(total_amount),
      },
      { onConflict: 'activity_id,scene_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activity_id = searchParams.get('activity_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bills')
    .select('*')
    .eq('activity_id', activity_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
