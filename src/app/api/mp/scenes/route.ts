import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashSecret } from '@/lib/hash';

const client = getSupabaseClient();

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
 * POST /api/mp/scenes - 创建分段
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, name, time_range, location, description, sort_order, passphrase } = body;

    if (!activity_id || !name || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const isValid = await verifyPassphrase(activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { data, error } = await client
      .from('mp_scenes')
      .insert({ activity_id, name, time_range, location, description, sort_order: sort_order || 0 })
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
 * GET /api/mp/scenes - 获取分段列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_scenes')
      .select('*')
      .eq('activity_id', activityId)
      .order('sort_order', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/mp/scenes - 更新分段
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, time_range, location, description, sort_order, passphrase } = body;

    if (!id || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取 scene 关联的 activity_id
    const { data: scene } = await client
      .from('mp_scenes')
      .select('activity_id')
      .eq('id', id)
      .single();

    if (!scene) {
      return Response.json({ error: '分段不存在' }, { status: 404 });
    }

    const isValid = await verifyPassphrase(scene.activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (time_range !== undefined) updateData.time_range = time_range;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await client
      .from('mp_scenes')
      .update(updateData)
      .eq('id', id)
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
 * DELETE /api/mp/scenes - 删除分段
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const passphrase = searchParams.get('passphrase');

    if (!id || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const { data: scene } = await client
      .from('mp_scenes')
      .select('activity_id')
      .eq('id', id)
      .single();

    if (!scene) {
      return Response.json({ error: '分段不存在' }, { status: 404 });
    }

    const isValid = await verifyPassphrase(scene.activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { error } = await client
      .from('mp_scenes')
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
