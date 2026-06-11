import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

/**
 * POST /api/mp/vote-proposals - 提交投票方案
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, user_openid, user_name, user_avatar, location, description } = body;

    if (!activity_id || !user_openid || !user_name || !location) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_vote_proposals')
      .insert({
        activity_id,
        user_openid,
        user_name,
        user_avatar: user_avatar || '',
        location,
        description: description || '',
        vote_count: 0,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/mp/vote-proposals - 获取投票方案列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_vote_proposals')
      .select('*')
      .eq('activity_id', activityId)
      .order('vote_count', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
