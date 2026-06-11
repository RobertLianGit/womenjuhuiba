import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

/**
 * POST /api/mp/intentions - 提交意愿
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, user_openid, user_name, user_avatar, wants, estimated_people, notes } = body;

    if (!activity_id || !user_openid || !user_name) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // Upsert: 同一用户重复提交会覆盖
    const { data, error } = await client
      .from('mp_intentions')
      .upsert({
        activity_id,
        user_openid,
        user_name,
        user_avatar: user_avatar || '',
        wants: wants || '',
        estimated_people: estimated_people || 1,
        notes: notes || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'activity_id,user_openid' })
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
 * GET /api/mp/intentions - 获取意愿列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_intentions')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
