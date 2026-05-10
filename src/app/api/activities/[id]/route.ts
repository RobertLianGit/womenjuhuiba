import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const client = getSupabaseClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) updateData.status = body.status;
  if (body.intention_deadline !== undefined) updateData.intention_deadline = body.intention_deadline;
  if (body.vote_deadline !== undefined) updateData.vote_deadline = body.vote_deadline;

  const { data, error } = await client
    .from('activities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
