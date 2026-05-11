'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(new Set());
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

  // Setup Supabase Realtime, with automatic reconnection
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let connected = false;
    let hasConnectedOnce = false;

    const refetchStrokes = async () => {
      try {
        const res = await fetch('/api/drawings');
        const data: Stroke[] = await res.json();
        if (!cancelled) setStrokes(data ?? []);
      } catch (err) {
        console.error('Failed to refetch strokes:', err);
      }
    };

    const connect = () => {
      if (cancelled) return;

      // Tear down any prior channel before creating a new one
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      setConnectionStatus('connecting');

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
          void newPresences;
        })
        .on('presence', { event: 'leave' }, () => {})
        // DB changes: new stroke added by another user
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'drawings' },
          (payload) => {
            const newStroke = payload.new as Stroke;
            if (newStroke.user_id !== user.id) {
              // Guard against duplicates from refetch-after-reconnect overlap
              setStrokes(prev =>
                prev.some(s => s.id === newStroke.id) ? prev : [...prev, newStroke]
              );
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
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            attempt = 0;
            connected = true;
            setConnectionStatus('connected');
            await channel.track({
              username: user.username,
              color: user.color,
              last_seen_at: new Date().toISOString(),
            });
            // After a reconnect, refetch to catch up on events missed
            // while we were offline.
            if (hasConnectedOnce) await refetchStrokes();
            hasConnectedOnce = true;
          } else if (
            status === 'CLOSED' ||
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT'
          ) {
            connected = false;
            setConnectionStatus('disconnected');
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      // Exponential backoff with jitter, capped at 30s
      const base = Math.min(1000 * 2 ** attempt, 30000);
      const delay = base / 2 + Math.random() * (base / 2);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const reconnectNow = () => {
      if (cancelled) return;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      attempt = 0;
      connect();
    };

    const handleOnline = () => {
      if (!connected) reconnectNow();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !connected) {
        reconnectNow();
      }
    };

    connect();

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
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

  const visibleStrokes = useMemo(
    () => strokes.filter(s => !hiddenUserIds.has(s.user_id)),
    [strokes, hiddenUserIds]
  );

  const toggleUserVisibility = useCallback((userId: string) => {
    setHiddenUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

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
            strokes={visibleStrokes}
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

      <UsersPanel
        user={user}
        activeUsers={activeUsers}
        strokes={strokes}
        hiddenUserIds={hiddenUserIds}
        onToggleVisibility={toggleUserVisibility}
      />
    </div>
  );
}
