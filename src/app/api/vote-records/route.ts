import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id, user_name, proposal_id, voted_proposal_ids } = body;

  if (!activity_id || !user_id) {
    return NextResponse.json({ error: '缺少必填字段 (activity_id, user_id)' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Single proposal voting mode (new)
  if (proposal_id) {
    if (!user_name) {
      return NextResponse.json({ error: '缺少必填字段 (user_name)' }, { status: 400 });
    }
    // Check if already voted for this proposal (toggle mode)
    const { data: existing } = await client
      .from('vote_records')
      .select('id')
      .eq('activity_id', activity_id)
      .eq('user_id', user_id)
      .eq('proposal_id', proposal_id)
      .maybeSingle();

    if (existing) {
      // Un-vote: delete the record
      const { error } = await client
        .from('vote_records')
        .delete()
        .eq('id', existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: { action: 'unvoted', proposal_id } });
    }

    // Vote: insert
    const { data, error } = await client
      .from('vote_records')
      .insert({
        activity_id,
        user_id,
        user_name: user_name.trim(),
        proposal_id,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (already voted)
      if (error.code === '23505') {
        return NextResponse.json({ data: { action: 'already_voted', proposal_id } });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { action: 'voted', ...data } });
  }

  // Legacy multi-proposal voting mode
  if (voted_proposal_ids && Array.isArray(voted_proposal_ids)) {
    // Delete existing votes and insert new ones
    await client
      .from('vote_records')
      .delete()
      .eq('activity_id', activity_id)
      .eq('user_id', user_id);

    if (voted_proposal_ids.length === 0) {
      return NextResponse.json({ data: { action: 'cleared' } });
    }

    const records = voted_proposal_ids.map((pid: string) => ({
      activity_id,
      user_id,
      user_name: user_name || '',
      proposal_id: pid,
    }));

    const { data, error } = await client
      .from('vote_records')
      .insert(records)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: '请提供 proposal_id 或 voted_proposal_ids' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activity_id = searchParams.get('activity_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Get vote records with proposal info
  const { data, error } = await client
    .from('vote_records')
    .select('*')
    .eq('activity_id', activity_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate vote counts per proposal
  const voteCounts: Record<string, number> = {};
  const voterNames: Record<string, string[]> = {};
  for (const record of data || []) {
    const pid = record.proposal_id;
    if (pid) {
      voteCounts[pid] = (voteCounts[pid] || 0) + 1;
      if (!voterNames[pid]) voterNames[pid] = [];
      if (record.user_name) voterNames[pid].push(record.user_name);
    }
  }

  return NextResponse.json({
    data,
    vote_counts: voteCounts,
    voter_names: voterNames,
  });
}
