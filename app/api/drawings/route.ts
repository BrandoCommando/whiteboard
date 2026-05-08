import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/drawings - Load all strokes
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Drawings GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/drawings - Save a new stroke
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, username, color, stroke_width, tool, opacity, points } = body;

    if (!user_id || !points || !Array.isArray(points)) {
      return NextResponse.json({ error: 'Invalid stroke data' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('drawings')
      .insert({
        user_id,
        username,
        color,
        stroke_width: stroke_width ?? 3,
        tool: tool ?? 'pen',
        opacity: opacity ?? 1.0,
        points,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Drawings POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/drawings - Clear all drawings
export async function DELETE() {
  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from('drawings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Drawings DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
