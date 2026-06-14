import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id, user_name, location, activity_type, proposed_time } = body;

  if (!activity_id || !user_id || !user_name || (!location && !proposed_time)) {
    return NextResponse.json({ error: '缺少必填字段（至少填写地点或时间）' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('vote_proposals')
    .insert({ activity_id, user_id, user_name, location: location || null, activity_type: activity_type || null, proposed_time: proposed_time || null })
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
    .from('vote_proposals')
    .select('*')
    .eq('activity_id', activity_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
