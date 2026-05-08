import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST /api/auth - Create or retrieve a user by username
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const cleanUsername = username.trim().slice(0, 32);
    if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username may only contain letters, numbers, spaces, hyphens and underscores' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Try to find existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', cleanUsername)
      .single();

    if (existingUser) {
      // Update last_seen_at
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      return NextResponse.json(existingUser);
    }

    // Generate a distinctive color for new user
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
      '#14b8a6', '#f43f5e',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ username: cleanUsername, color })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
