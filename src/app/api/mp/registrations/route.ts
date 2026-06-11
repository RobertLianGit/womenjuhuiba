import { getSupabaseClient } from '@/storage/database/supabase-client';

const client = getSupabaseClient();

/**
 * POST /api/mp/registrations - 提交报名
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, scene_id, user_openid, user_name, user_avatar, people_count, notes } = body;

    if (!activity_id || !user_openid || !user_name) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 判断是更新还是插入
    const existingQuery = client
      .from('mp_registrations')
      .select('id')
      .eq('activity_id', activity_id)
      .eq('user_openid', user_openid);

    if (scene_id) {
      existingQuery.eq('scene_id', scene_id);
    } else {
      existingQuery.is('scene_id', null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    let data, error;

    if (existing) {
      // 更新
      ({ data, error } = await client
        .from('mp_registrations')
        .update({
          user_name,
          user_avatar: user_avatar || '',
          people_count: people_count || 1,
          notes: notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single());
    } else {
      // 插入
      ({ data, error } = await client
        .from('mp_registrations')
        .insert({
          activity_id,
          scene_id: scene_id || null,
          user_openid,
          user_name,
          user_avatar: user_avatar || '',
          people_count: people_count || 1,
          notes: notes || '',
        })
        .select()
        .single());
    }

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/mp/registrations - 获取报名列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_registrations')
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

/**
 * DELETE /api/mp/registrations - 取消报名
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: '缺少 id' }, { status: 400 });
    }

    const { error } = await client
      .from('mp_registrations')
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
