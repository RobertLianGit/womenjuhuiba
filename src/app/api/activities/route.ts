import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { normalizeSecret } from '@/lib/hash';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, rough_time, creator_id, creator_name, passphrase, access_code } = body;

  if (!title || !description || !rough_time || !creator_id || !creator_name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  if (!access_code) {
    return NextResponse.json({ error: '请设置活动口令' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const intentionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // 生成6位管理口令（如果前端没传）
  const rawPassphrase = passphrase || Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  // 口令明文存储，API 返回时脱敏，开发者通过数据库也无法有效利用（口令仅限本活动）
  const { data, error } = await client
    .from('activities')
    .insert({
      title,
      description,
      rough_time,
      creator_id,
      creator_name,
      access_code: normalizeSecret(access_code),
      passphrase: normalizeSecret(rawPassphrase),
      status: 'collecting',
      intention_deadline: intentionDeadline,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 创建时返回原始明文口令（仅此一次），之后API永不返回
  return NextResponse.json({
    data: {
      ...data,
      passphrase: rawPassphrase,
      access_code,
    },
  });
}

/** 脱敏函数：移除口令字段，API 永不返回任何口令信息 */
function sanitize(activity: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passphrase: _p, access_code: _a, ...safe } = activity;
  return safe;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const access_code = searchParams.get('access_code');
  const ids = searchParams.get('ids'); // 逗号分隔的ID列表，用于批量查询
  const include_archived = searchParams.get('include_archived') === 'true'; // 是否包含已归档
  const only_archived = searchParams.get('only_archived') === 'true'; // 仅已归档
  const user_id = searchParams.get('user_id'); // 用户ID，用于排除隐藏的活动

  const client = getSupabaseClient();

  // 按 ID 查询单个活动（前端已通过口令验证后才请求）
  if (id) {
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '活动不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: sanitize(data) });
  }

  // 批量按 ID 查询（「我发起的」「我参与的」页面使用）
  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json({ data: [] });
    }
    // 限制最多50个，防止滥用
    const limitedIds = idList.slice(0, 50);

    let query = client
      .from('activities')
      .select('*')
      .in('id', limitedIds);

    // 归档过滤
    if (only_archived) {
      query = query.eq('archived', true);
    } else if (!include_archived) {
      query = query.eq('archived', false);
    }

    // 排除用户隐藏的活动
    if (user_id) {
      const { data: hidden } = await client
        .from('hidden_activities')
        .select('activity_id')
        .eq('user_id', user_id);
      if (hidden && hidden.length > 0) {
        const hiddenIds = hidden.map(h => h.activity_id);
        query = query.not('id', 'in', `(${hiddenIds.join(',')})`);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safe = data.map(sanitize);
    return NextResponse.json({ data: safe });
  }

  // 通过活动口令查询（加入活动时使用）—— 明文直接比对
  if (access_code) {
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('access_code', normalizeSecret(access_code))
      .eq('archived', false)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '活动口令错误或活动不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: sanitize(data) });
  }

  return NextResponse.json({ error: '请提供 access_code、id 或 ids 参数' }, { status: 400 });
}
