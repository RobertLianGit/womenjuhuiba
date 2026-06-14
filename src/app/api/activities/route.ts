import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { normalizeSecret } from '@/lib/hash';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, rough_time, creator_id, creator_name, passphrase, access_code, skip_to_register } = body;

  if (!title || !creator_id || !creator_name) {
    return NextResponse.json({ error: '缺少必填字段（活动名称和发起人昵称）' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const intentionDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  // 自动生成6位数字活动口令
  const rawAccessCode = access_code || String(Math.floor(100000 + Math.random() * 900000));

  // 自动生成6位管理口令
  const rawPassphrase = passphrase || Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  const status = skip_to_register ? 'registering' : 'collecting';

  const { data, error } = await client
    .from('activities')
    .insert({
      title,
      description: description || '',
      rough_time: rough_time || '',
      creator_id,
      creator_name,
      access_code: normalizeSecret(rawAccessCode),
      passphrase: normalizeSecret(rawPassphrase),
      status,
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
      access_code: rawAccessCode,
    },
  });
}

/** 脱敏函数：移除口令字段，但保留 access_token 用于免口令分享 */
function sanitize(activity: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passphrase: _p, access_code: _a, ...safe } = activity;
  return safe;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const access_code = searchParams.get('access_code');
  const access_token = searchParams.get('access_token');
  const ids = searchParams.get('ids');
  const include_archived = searchParams.get('include_archived') === 'true';
  const only_archived = searchParams.get('only_archived') === 'true';
  const user_id = searchParams.get('user_id');

  const client = getSupabaseClient();

  // 按 ID 查询单个活动
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

  // 通过 access_token 免口令查询
  if (access_token) {
    const { data, error } = await client
      .from('activities')
      .select('*')
      .eq('access_token', access_token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '活动不存在或链接已失效' }, { status: 404 });
    }

    return NextResponse.json({ data: sanitize(data) });
  }

  // 批量按 ID 查询
  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json({ data: [] });
    }
    const limitedIds = idList.slice(0, 50);

    let query = client
      .from('activities')
      .select('*')
      .in('id', limitedIds);

    if (only_archived) {
      query = query.eq('archived', true);
    } else if (!include_archived) {
      query = query.eq('archived', false);
    }

    if (user_id) {
      const { data: hidden } = await client
        .from('hidden_activities')
        .select('activity_id')
        .eq('user_id', user_id);
      if (hidden && hidden.length > 0) {
        const hiddenIds = hidden.map((h: { activity_id: string }) => h.activity_id);
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

  // 通过 creator_id 查询用户的活动（首页"我的活动"）
  if (user_id && !ids) {
    let query = client
      .from('activities')
      .select('*')
      .eq('creator_id', user_id);

    if (only_archived) {
      query = query.eq('archived', true);
    } else if (!include_archived) {
      query = query.eq('archived', false);
    }

    const { data: hidden } = await client
      .from('hidden_activities')
      .select('activity_id')
      .eq('user_id', user_id);

    if (hidden && hidden.length > 0) {
      const hiddenIds = hidden.map((h: { activity_id: string }) => h.activity_id);
      query = query.not('id', 'in', `(${hiddenIds.join(',')})`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const safe = data.map(sanitize);
    return NextResponse.json({ data: safe });
  }

  // 通过活动口令查询
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

  return NextResponse.json({ error: '请提供 access_code、access_token、id 或 ids 参数' }, { status: 400 });
}
