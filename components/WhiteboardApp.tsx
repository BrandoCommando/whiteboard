'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Stroke, Tool, Point, ActiveUser } from '@/types';
import { supabase } from '@/lib/supabase';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import UsersPanel from './UsersPanel';
import styles from './WhiteboardApp.module.css';

interface Props {
  user: User;
  onLogout: () => void;
}

const CURSOR_THROTTLE_MS = 50;

export default function WhiteboardApp({ user, onLogout }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(user.color);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1.0);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loadingStrokes, setLoadingStrokes] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastCursorBroadcast = useRef(0);

  // Load initial strokes
  useEffect(() => {
    fetch('/api/drawings')
      .then(r => r.json())
      .then((data: Stroke[]) => {
        setStrokes(data ?? []);
        setLoadingStrokes(false);
      })
      .catch(() => setLoadingStrokes(false));
  }, []);

  // Setup Supabase Realtime
  useEffect(() => {
    const channel = supabase.channel('whiteboard', {
      config: { presence: { key: user.id } },
    });

    channel
      // Presence: track online users and cursors
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ username: string; color: string; cursor?: Point; last_seen_at: string }>();
        const users: ActiveUser[] = Object.entries(state).map(([id, presences]) => {
          const p = presences[0];
          return { id, username: p.username, color: p.color, cursor: p.cursor, last_seen_at: p.last_seen_at };
        });
        setActiveUsers(users.filter(u => u.id !== user.id));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handled by sync
        void newPresences;
      })
      .on('presence', { event: 'leave' }, () => {
        // Handled by sync
      })
      // DB changes: new stroke added by another user
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drawings' },
        (payload) => {
          const newStroke = payload.new as Stroke;
          // Don't add strokes from ourselves (we already have them locally)
          if (newStroke.user_id !== user.id) {
            setStrokes(prev => [...prev, newStroke]);
          }
        }
      )
      // DB changes: stroke removed (e.g. another user cleared their drawings)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'drawings' },
        (payload) => {
          const id = (payload.old as { id?: string } | null)?.id;
          if (id) setStrokes(prev => prev.filter(s => s.id !== id));
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          await channel.track({
            username: user.username,
            color: user.color,
            last_seen_at: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Broadcast cursor position (throttled)
  const broadcastCursor = useCallback((point: Point) => {
    const now = Date.now();
    if (now - lastCursorBroadcast.current < CURSOR_THROTTLE_MS) return;
    lastCursorBroadcast.current = now;
    channelRef.current?.track({
      username: user.username,
      color: user.color,
      cursor: point,
      last_seen_at: new Date().toISOString(),
    });
  }, [user]);

  // Called when user completes a stroke
  const handleStrokeComplete = useCallback(async (stroke: Omit<Stroke, 'id' | 'created_at'>) => {
    // Optimistic: add locally first
    const optimisticStroke: Stroke = {
      ...stroke,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    setStrokes(prev => [...prev, optimisticStroke]);

    // Persist to DB (Supabase realtime will broadcast to others)
    try {
      await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stroke),
      });
    } catch (err) {
      console.error('Failed to save stroke:', err);
    }
  }, []);

  const handleClearBoard = async () => {
    if (!confirm('Clear all of your drawings? This cannot be undone.')) return;
    const previous = strokes;
    setStrokes(prev => prev.filter(s => s.user_id !== user.id));
    try {
      const res = await fetch(`/api/drawings?user_id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setStrokes(previous);
        console.error('Failed to clear drawings:', await res.text());
      }
    } catch (err) {
      setStrokes(previous);
      console.error('Failed to clear drawings:', err);
    }
  };

  const handleUndo = () => {
    // Remove last stroke by this user
    setStrokes(prev => {
      const idx = [...prev].reverse().findIndex(s => s.user_id === user.id);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const next = [...prev];
      next.splice(realIdx, 1);
      return next;
    });
  };

  return (
    <div className={styles.root}>
      <Toolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        onToolChange={setTool}
        onColorChange={setColor}
        onStrokeWidthChange={setStrokeWidth}
        onOpacityChange={setOpacity}
        onUndo={handleUndo}
        onClear={handleClearBoard}
        onLogout={onLogout}
        user={user}
        connectionStatus={connectionStatus}
      />

      <main className={styles.main}>
        {loadingStrokes ? (
          <div className={styles.loader}>
            <div className={styles.spinner} />
            <span>Loading canvas…</span>
          </div>
        ) : (
          <Canvas
            strokes={strokes}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            user={user}
            activeUsers={activeUsers}
            onStrokeComplete={handleStrokeComplete}
            onCursorMove={broadcastCursor}
          />
        )}
      </main>

      <UsersPanel user={user} activeUsers={activeUsers} />
    </div>
  );
}
