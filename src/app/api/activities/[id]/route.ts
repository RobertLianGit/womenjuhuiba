import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { normalizeSecret } from '@/lib/hash';

/** 脱敏函数 */
function sanitize(activity: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passphrase: _p, access_code: _a, ...safe } = activity;
  return safe;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const client = getSupabaseClient();

  // 验证管理口令 — 明文直接比对
  if (body.passphrase) {
    const { data: activity } = await client
      .from('activities')
      .select('passphrase')
      .eq('id', id)
      .single();

    if (!activity || activity.passphrase !== normalizeSecret(body.passphrase)) {
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
  if (body.archived !== undefined) updateData.archived = body.archived;

  const { data, error } = await client
    .from('activities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: sanitize(data) });
}

/** DELETE: 管理者彻底删除活动 / 参与者隐藏活动 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const mode = searchParams.get('mode'); // 'organizer' | 'participant'
  const passphrase = searchParams.get('passphrase');
  const client = getSupabaseClient();

  if (mode === 'organizer') {
    // 管理者删除：需要口令验证
    const { data: activity } = await client
      .from('activities')
      .select('passphrase')
      .eq('id', id)
      .single();

    if (!activity || activity.passphrase !== normalizeSecret(passphrase || '')) {
      return NextResponse.json({ error: '管理口令错误' }, { status: 403 });
    }

    // 彻底删除活动（级联删除相关数据）
    await client.from('intentions').delete().eq('activity_id', id);
    await client.from('vote_records').delete().eq('activity_id', id);
    await client.from('vote_proposals').delete().eq('activity_id', id);
    await client.from('registrations').delete().eq('activity_id', id);
    await client.from('scenes').delete().eq('activity_id', id);
    await client.from('bills').delete().eq('activity_id', id);
    await client.from('plans').delete().eq('activity_id', id);
    await client.from('participants').delete().eq('activity_id', id);
    await client.from('hidden_activities').delete().eq('activity_id', id);
    const { error } = await client.from('activities').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } else if (mode === 'participant' && userId) {
    // 参与者隐藏：只是自己看不到
    const { error } = await client
      .from('hidden_activities')
      .upsert({ user_id: userId, activity_id: id }, { onConflict: 'user_id,activity_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { hidden: true } });
  }

  return NextResponse.json({ error: '参数错误' }, { status: 400 });
}
