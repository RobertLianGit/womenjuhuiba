import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id, user_name, proposal_id, voted_proposal_ids } = body;

  if (!activity_id || !user_id) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Support both single proposal_id (toggle) and array voted_proposal_ids (batch)
  const proposalIds = voted_proposal_ids || (proposal_id ? [proposal_id] : []);
  if (proposalIds.length === 0) {
    return NextResponse.json({ error: '请至少选择一个方案' }, { status: 400 });
  }

  const results: Record<string, unknown>[] = [];
  for (const pid of proposalIds) {
    const { data, error } = await client
      .from('vote_records')
      .upsert(
        { activity_id, user_id, user_name, proposal_id: pid },
        { onConflict: 'activity_id,user_id,proposal_id' }
      )
      .select()
      .single();
    if (error) {
      console.error('Vote record upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (data) results.push(data);
  }

  return NextResponse.json({ data: results.length === 1 ? results[0] : results });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activity_id = searchParams.get('activity_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from('vote_records')
    .select('*')
    .eq('activity_id', activity_id);

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

  const { error } = await client
    .from('vote_records')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
