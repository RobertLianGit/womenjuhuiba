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
  const { activity_id, scene_id, user_id, user_name, people_count, is_manual, is_temp, passphrase } = body;

  if (!activity_id || !scene_id || !user_name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 手动添加参与人需要管理口令
  if (is_manual && !(await verifyPassphrase(client, activity_id, passphrase))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { data, error } = await client
    .from('participants')
    .insert({
      activity_id,
      scene_id,
      user_id: user_id || crypto.randomUUID(),
      user_name,
      people_count: people_count || 1,
      is_manual: is_manual ?? true,
      is_temp: is_temp ?? false,
    })
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
  const scene_id = searchParams.get('scene_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();
  let query = client.from('participants').select('*').eq('activity_id', activity_id);

  if (scene_id) {
    query = query.eq('scene_id', scene_id);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const passphrase = searchParams.get('passphrase');

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Look up activity_id from the participant
  const { data: participant } = await client.from('participants').select('activity_id').eq('id', id).single();
  if (!participant) {
    return NextResponse.json({ error: '参与人不存在' }, { status: 404 });
  }

  // 删除参与人需要管理口令
  if (!(await verifyPassphrase(client, participant.activity_id, passphrase || undefined))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { error } = await client.from('participants').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
