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
 * POST /api/mp/participants - 手动添加参与者
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, name, phone, notes, passphrase } = body;

    if (!activity_id || !name || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const isValid = await verifyPassphrase(activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { data, error } = await client
      .from('mp_participants')
      .insert({ activity_id, name, phone: phone || '', notes: notes || '' })
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
 * GET /api/mp/participants - 获取参与者列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_participants')
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
 * DELETE /api/mp/participants - 删除参与者
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const passphrase = searchParams.get('passphrase');

    if (!id || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取 participant 关联的 activity_id
    const { data: participant } = await client
      .from('mp_participants')
      .select('activity_id')
      .eq('id', id)
      .single();

    if (!participant) {
      return Response.json({ error: '参与者不存在' }, { status: 404 });
    }

    const isValid = await verifyPassphrase(participant.activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { error } = await client
      .from('mp_participants')
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
