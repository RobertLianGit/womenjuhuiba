import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const VALID_RSVP = ['can_join', 'depends', 'unsure'] as const;
type RsvpValue = typeof VALID_RSVP[number];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id, user_name, wants, wants_time, rsvp, estimated_people, selected_scenes } = body;

  if (!activity_id || !user_id || !user_name) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  // Validate rsvp value
  const rsvpValue: RsvpValue = VALID_RSVP.includes(rsvp) ? rsvp : 'unsure';

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('intentions')
    .upsert(
      {
        activity_id,
        user_id,
        user_name: user_name.trim(),
        wants: wants || null,
        wants_time: wants_time || null,
        rsvp: rsvpValue,
        estimated_people: estimated_people || 1,
        selected_scenes: selected_scenes || null,
      },
      { onConflict: 'activity_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activity_id = searchParams.get('activity_id');

  if (!activity_id) {
    return NextResponse.json({ error: '缺少 activity_id' }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('intentions')
    .select('*')
    .eq('activity_id', activity_id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return RSVP summary alongside the data
  const rsvpSummary = {
    can_join: (data || []).filter((i: { rsvp: string }) => i.rsvp === 'can_join').length,
    depends: (data || []).filter((i: { rsvp: string }) => i.rsvp === 'depends').length,
    unsure: (data || []).filter((i: { rsvp: string }) => i.rsvp === 'unsure' || !i.rsvp).length,
  };

  return NextResponse.json({ data, rsvp_summary: rsvpSummary });
}
