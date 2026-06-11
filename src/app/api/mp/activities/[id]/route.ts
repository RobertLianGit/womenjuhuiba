import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashSecret } from '@/lib/hash';

const client = getSupabaseClient();

/**
 * 验证管理口令
 */
async function verifyPassphrase(activityId: string, passphrase: string | undefined) {
  if (!passphrase) return false;
  const { data: activity } = await client
    .from('mp_activities')
    .select('passphrase')
    .eq('id', activityId)
    .single();
  return activity && activity.passphrase === hashSecret(passphrase);
}

/**
 * GET /api/mp/activities/[id] - 获取活动详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await client
      .from('mp_activities')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: '活动不存在' }, { status: 404 });
    }

    // 脱敏
    const { passphrase: _, access_code: __, ...safeData } = data;
    return Response.json({ data: safeData });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/mp/activities/[id] - 更新活动
 * 支持: 状态变更、验证口令、投票规则
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, passphrase, vote_type, max_votes, confirmed_proposal_id } = body;

    // 验证口令
    const isValid = await verifyPassphrase(id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    // 如果是验证口令请求
    if (status === 'verify') {
      return Response.json({ data: { verified: true } });
    }

    // 构建更新对象
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (vote_type) updateData.vote_type = vote_type;
    if (max_votes) updateData.max_votes = max_votes;
    if (confirmed_proposal_id) updateData.confirmed_proposal_id = confirmed_proposal_id;

    const { data, error } = await client
      .from('mp_activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 脱敏
    const { passphrase: _, access_code: __, ...safeData } = data;
    return Response.json({ data: safeData });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * DELETE /api/mp/activities/[id] - 删除活动
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { passphrase } = body;

    const isValid = await verifyPassphrase(id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { error } = await client
      .from('mp_activities')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
