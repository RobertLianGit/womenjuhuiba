import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activity_id = searchParams.get('activity_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('participants')
    .select('*')
    .eq('activity_id', activity_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id, user_name, scene_id, role } = body;

  if (!activity_id || !user_id || !user_name) {
    return NextResponse.json({ error: '缺少必填字段 (activity_id, user_id, user_name)' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Upsert participant - idempotent
  const { data, error } = await client
    .from('participants')
    .upsert(
      {
        activity_id,
        user_id,
        user_name: user_name.trim(),
        scene_id: scene_id || null,
        role: role || 'participant',
      },
      { onConflict: 'activity_id,user_id,scene_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { error } = await client.from('participants').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
