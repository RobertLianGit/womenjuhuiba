import { normalizeSecret } from '@/lib/hash';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function verifyPassphrase(client: ReturnType<typeof getSupabaseClient>, activityId: string, passphrase: string | undefined) {
  if (!passphrase) return false;
  const { data: activity } = await client
    .from('activities')
    .select('passphrase')
    .eq('id', activityId)
    .single();
  return activity && activity.passphrase === normalizeSecret(passphrase);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, content, prompt_generated, passphrase } = body;

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 保存方案需要管理口令
  if (!(await verifyPassphrase(client, activity_id, passphrase))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { data, error } = await client
    .from('plans')
    .upsert(
      {
        activity_id,
        content: content || null,
        prompt_generated: prompt_generated || null,
      },
      { onConflict: 'activity_id' }
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
    .from('plans')
    .select('*')
    .eq('activity_id', activity_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
