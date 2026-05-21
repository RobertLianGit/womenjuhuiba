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
 * POST /api/mp/plans - 保存方案内容
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, content, passphrase } = body;

    if (!activity_id || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const isValid = await verifyPassphrase(activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { data, error } = await client
      .from('mp_plans')
      .upsert({
        activity_id,
        content: content || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'activity_id' })
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
 * GET /api/mp/plans - 获取方案内容
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_plans')
      .select('*')
      .eq('activity_id', activityId)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
