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
 * POST /api/mp/bills - 添加账单
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activity_id, description, amount, payer_name, payer_openid, settled, passphrase } = body;

    if (!activity_id || !description || !amount || !payer_name || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const isValid = await verifyPassphrase(activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { data, error } = await client
      .from('mp_bills')
      .insert({
        activity_id,
        description,
        amount,
        payer_name,
        payer_openid: payer_openid || '',
        settled: settled || false,
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
 * GET /api/mp/bills - 获取账单列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return Response.json({ error: '缺少 activity_id' }, { status: 400 });
    }

    const { data, error } = await client
      .from('mp_bills')
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
 * PATCH /api/mp/bills - 更新账单（标记已结算）
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, settled, passphrase } = body;

    if (!id || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 获取 bill 关联的 activity_id
    const { data: bill } = await client
      .from('mp_bills')
      .select('activity_id')
      .eq('id', id)
      .single();

    if (!bill) {
      return Response.json({ error: '账单不存在' }, { status: 404 });
    }

    const isValid = await verifyPassphrase(bill.activity_id, passphrase);
    if (!isValid) {
      return Response.json({ error: '管理口令错误' }, { status: 403 });
    }

    const { data, error } = await client
      .from('mp_bills')
      .update({ settled })
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
