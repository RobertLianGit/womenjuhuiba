import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('activities')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: '活动不存在' }, { status: 404 });
  }

  // 脱敏：不返回 passphrase
  const { passphrase: _, ...safe } = data;
  return NextResponse.json({ data: safe });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const client = getSupabaseClient();

  // 验证管理口令
  if (body.passphrase) {
    const { data: activity } = await client
      .from('activities')
      .select('passphrase')
      .eq('id', id)
      .single();

    if (!activity || activity.passphrase !== body.passphrase) {
      return NextResponse.json({ error: '管理口令错误' }, { status: 403 });
    }
  } else if (body.status !== undefined) {
    // 状态流转必须验证口令
    return NextResponse.json({ error: '需要管理口令' }, { status: 403 });
  }

  // Special case: just verifying passphrase, don't update anything
  if (body.status === 'verify') {
    return NextResponse.json({ data: { verified: true } });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) updateData.status = body.status;
  if (body.intention_deadline !== undefined) updateData.intention_deadline = body.intention_deadline;
  if (body.vote_deadline !== undefined) updateData.vote_deadline = body.vote_deadline;
  if (body.vote_type !== undefined) updateData.vote_type = body.vote_type;
  if (body.max_votes !== undefined) updateData.max_votes = body.max_votes;

  const { data, error } = await client
    .from('activities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
