import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

/**
 * POST /api/mp/vote-records - 提交投票
 * 同时更新方案的票数
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, user_openid, user_name, user_avatar, proposal_ids } = body;

    if (!activity_id || !user_openid || !user_name || !proposal_ids) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取用户之前的投票记录
    const { data: oldRecord } = await client
      .from('mp_vote_records')
      .select('proposal_ids')
      .eq('activity_id', activity_id)
      .eq('user_openid', user_openid)
      .single();

    const oldProposalIds = oldRecord?.proposal_ids || [];

    // Upsert 投票记录
    const { data, error } = await client
      .from('mp_vote_records')
      .upsert({
        activity_id,
        user_openid,
        user_name,
        user_avatar: user_avatar || '',
        proposal_ids,
      }, { onConflict: 'activity_id,user_openid' })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 更新方案票数：减少旧方案的票数，增加新方案的票数
    const toRemove = oldProposalIds.filter((id: string) => !proposal_ids.includes(id));
    const toAdd = proposal_ids.filter((id: string) => !oldProposalIds.includes(id));

    // 手动更新票数
    for (const id of toRemove) {
      const { data: proposal } = await client
        .from('mp_vote_proposals')
        .select('vote_count')
        .eq('id', id)
        .single();
      if (proposal) {
        await client
          .from('mp_vote_proposals')
          .update({ vote_count: Math.max(0, (proposal.vote_count || 0) - 1) })
          .eq('id', id);
      }
    }

    for (const id of toAdd) {
      const { data: proposal } = await client
        .from('mp_vote_proposals')
        .select('vote_count')
        .eq('id', id)
        .single();
      if (proposal) {
        await client
          .from('mp_vote_proposals')
          .update({ vote_count: (proposal.vote_count || 0) + 1 })
          .eq('id', id);
      }
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/mp/vote-records - 获取投票记录
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_vote_records')
      .select('*')
      .eq('activity_id', activityId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
