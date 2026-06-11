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
  const { activity_id, name, time_range, location, sort_order, passphrase } = body;

  if (!activity_id || !name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // 添加分段需要管理口令
  if (!(await verifyPassphrase(client, activity_id, passphrase))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { data, error } = await client
    .from('scenes')
    .insert({ activity_id, name, time_range: time_range || null, location: location || null, sort_order: sort_order || 0 })
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
    .from('scenes')
    .select('*')
    .eq('activity_id', activity_id)
    .order('sort_order', { ascending: true });

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

  // Look up activity_id from the scene
  const { data: scene } = await client.from('scenes').select('activity_id').eq('id', id).single();
  if (!scene) {
    return NextResponse.json({ error: '分段不存在' }, { status: 404 });
  }

  // 删除分段需要管理口令
  if (!(await verifyPassphrase(client, scene.activity_id, passphrase || undefined))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const { error } = await client.from('scenes').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = body.id || searchParams.get('id');
  const { name, time_range, location, passphrase } = body;

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Look up activity_id from the scene
  const { data: scene } = await client.from('scenes').select('activity_id').eq('id', id).single();
  if (!scene) {
    return NextResponse.json({ error: '分段不存在' }, { status: 404 });
  }

  // 编辑分段需要管理口令
  if (!(await verifyPassphrase(client, scene.activity_id, passphrase))) {
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (time_range !== undefined) updateData.time_range = time_range || null;
  if (location !== undefined) updateData.location = location || null;

  const { data, error } = await client
    .from('scenes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
