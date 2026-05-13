'use client';

import { useMemo } from 'react';
import { User, ActiveUser, Stroke } from '@/types';
import styles from './UsersPanel.module.css';

interface Props {
  user: User;
  activeUsers: ActiveUser[];
  strokes: Stroke[];
  hiddenUserIds: Set<string>;
  onToggleVisibility: (userId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

type PanelUser = {
  id: string;
  username: string;
  color: string;
  isMe: boolean;
  isOnline: boolean;
  drawingCount: number;
  lastDrawingAt: number | null;
};

export default function UsersPanel({
  user,
  activeUsers,
  strokes,
  hiddenUserIds,
  onToggleVisibility,
  isMobileOpen,
  onCloseMobile,
}: Props) {
  const allUsers = useMemo(() => {
    const presenceById = new Map<string, { username: string; color: string }>();
    presenceById.set(user.id, { username: user.username, color: user.color });
    for (const u of activeUsers) {
      presenceById.set(u.id, { username: u.username, color: u.color });
    }

    const drawingStats = new Map<string, { drawingCount: number; lastDrawingAt: number | null; username: string; color: string }>();
    for (const s of strokes) {
      const ts = Date.parse(s.created_at);
      const prev = drawingStats.get(s.user_id);
      drawingStats.set(s.user_id, {
        drawingCount: (prev?.drawingCount ?? 0) + 1,
        lastDrawingAt: Math.max(prev?.lastDrawingAt ?? 0, Number.isNaN(ts) ? 0 : ts) || null,
        username: s.username,
        color: s.color,
      });
    }

    const ids = new Set<string>([
      ...Array.from(presenceById.keys()),
      ...Array.from(drawingStats.keys()),
    ]);

    const merged: PanelUser[] = Array.from(ids).map((id) => {
      const presence = presenceById.get(id);
      const stats = drawingStats.get(id);
      const isMe = id === user.id;
      return {
        id,
        username: presence?.username ?? stats?.username ?? 'Unknown',
        color: presence?.color ?? stats?.color ?? '#666',
        isMe,
        isOnline: isMe || presenceById.has(id),
        drawingCount: stats?.drawingCount ?? 0,
        lastDrawingAt: stats?.lastDrawingAt ?? null,
      };
    });

    merged.sort((a, b) => {
      const ta = a.lastDrawingAt ?? -1;
      const tb = b.lastDrawingAt ?? -1;
      if (tb !== ta) return tb - ta;
      return a.username.localeCompare(b.username);
    });
    return merged;
  }, [activeUsers, strokes, user.color, user.id, user.username]);

  const onlineCount = allUsers.filter(u => u.isOnline).length;

  return (
    <aside
      className={`${styles.panel} ${isMobileOpen ? styles.mobileOpen : ''}`}
      role="dialog"
      aria-label="People"
      aria-modal={isMobileOpen ? true : undefined}
    >
      <div className={styles.headerRow}>
        <p className={styles.heading}>
          <span className={styles.dot} />
          {onlineCount} online
        </p>
        <button
          type="button"
          className={styles.mobileCloseBtn}
          onClick={onCloseMobile}
          aria-label="Close people panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className={styles.list}>
        {allUsers.map(u => (
          <button
            key={u.id}
            className={`${styles.user} ${hiddenUserIds.has(u.id) ? styles.hidden : ''}`}
            onClick={() => onToggleVisibility(u.id)}
            data-tooltip={hiddenUserIds.has(u.id) ? 'Show drawings' : 'Hide drawings'}
            aria-pressed={!hiddenUserIds.has(u.id)}
          >
            <div className={styles.avatar} style={{ background: u.color }}>
              {u.username.slice(0, 1).toUpperCase()}
            </div>
            <div className={styles.meta}>
              <span className={styles.name}>
                {u.username}
                {u.isMe && <span className={styles.me}> (you)</span>}
              </span>
              <span className={styles.subline}>
                <span className={`${styles.status} ${u.isOnline ? styles.online : styles.offline}`} />
                {u.drawingCount} drawing{u.drawingCount === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
