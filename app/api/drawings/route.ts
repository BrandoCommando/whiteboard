import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

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

// DELETE /api/drawings?user_id=… — remove all strokes for that user only
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId || !isUuid(userId)) {
      return NextResponse.json({ error: 'Valid user_id query parameter is required' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    const { error } = await supabase.from('drawings').delete().eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Drawings DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
