import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashSecret } from '@/lib/hash';

const client = getSupabaseClient();

// 生成随机口令
function generateCode(length: number = 6): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/mp/activities - 创建活动
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, rough_time, creator_openid, creator_name, creator_avatar, access_code, passphrase } = body;

    if (!title || !creator_openid || !creator_name || !access_code || !passphrase) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 生成随机管理口令（如果前端没传）
    const adminPassphrase = passphrase || generateCode(6);
    
    const { data, error } = await client
      .from('mp_activities')
      .insert({
        title,
        description: description || '',
        rough_time: rough_time || '',
        status: 'collecting',
        creator_openid,
        creator_name,
        creator_avatar: creator_avatar || '',
        access_code: hashSecret(access_code),
        passphrase: hashSecret(adminPassphrase),
        vote_type: 'single',
        max_votes: 1,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 返回原始口令（不是哈希值）
    return Response.json({ 
      data: { 
        ...data, 
        access_code,  // 返回原始口令
        passphrase: adminPassphrase 
      } 
    });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * GET /api/mp/activities - 查询活动
 * 支持: access_code, ids, id
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('access_code');
    const ids = searchParams.get('ids');
    const id = searchParams.get('id');

    // 必须提供查询条件
    if (!accessCode && !ids && !id) {
      return Response.json({ error: '请提供活动口令或活动ID' }, { status: 400 });
    }

    // 通过 access_code 查询
    if (accessCode) {
      const { data, error } = await client
        .from('mp_activities')
        .select('*')
        .eq('access_code', hashSecret(accessCode))
        .single();

      if (error || !data) {
        return Response.json({ error: '活动不存在或口令错误' }, { status: 404 });
      }

      // 脱敏：不返回 passphrase 和 access_code
      const { passphrase: _, access_code: __, ...safeData } = data;
      return Response.json({ data: safeData });
    }

    // 通过 id 查询单个
    if (id) {
      const { data, error } = await client
        .from('mp_activities')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return Response.json({ error: '活动不存在' }, { status: 404 });
      }

      const { passphrase: _, access_code: __, ...safeData } = data;
      return Response.json({ data: safeData });
    }

    // 通过 ids 批量查询
    if (ids) {
      const idArray = ids.split(',').filter(Boolean).slice(0, 50);
      const { data, error } = await client
        .from('mp_activities')
        .select('*')
        .in('id', idArray);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      // 脱敏
      const safeData = data.map(({ passphrase: _, access_code: __, ...rest }) => rest);
      return Response.json({ data: safeData });
    }

    return Response.json({ error: '无效查询' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: '服务器错误' }, { status: 500 });
  }
}
