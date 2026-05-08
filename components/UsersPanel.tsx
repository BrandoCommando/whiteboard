'use client';

import { User, ActiveUser } from '@/types';
import styles from './UsersPanel.module.css';

interface Props {
  user: User;
  activeUsers: ActiveUser[];
}

export default function UsersPanel({ user, activeUsers }: Props) {
  const allUsers = [
    { id: user.id, username: user.username, color: user.color, isMe: true },
    ...activeUsers.map(u => ({ ...u, isMe: false })),
  ];

  return (
    <aside className={styles.panel}>
      <p className={styles.heading}>
        <span className={styles.dot} />
        {allUsers.length} online
      </p>
      <div className={styles.list}>
        {allUsers.map(u => (
          <div key={u.id} className={styles.user}>
            <div className={styles.avatar} style={{ background: u.color }}>
              {u.username.slice(0, 1).toUpperCase()}
            </div>
            <span className={styles.name}>
              {u.username}
              {u.isMe && <span className={styles.me}> (you)</span>}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
