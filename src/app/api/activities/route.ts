import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, rough_time, creator_id, creator_name, passphrase } = body;

  if (!title || !description || !rough_time || !creator_id || !creator_name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const intentionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // 生成6位管理口令（如果前端没传）
  const finalPassphrase = passphrase || Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  const { data, error } = await client
    .from('activities')
    .insert({
      title,
      description,
      rough_time,
      creator_id,
      creator_name,
      passphrase: finalPassphrase,
      status: 'collecting',
      intention_deadline: intentionDeadline,
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
  const id = searchParams.get('id');

  const client = getSupabaseClient();

  if (id) {
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  // List all activities
  const { data, error } = await client
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
