'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import styles from './LoginScreen.module.css';

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      onLogin(data);
    } catch {
      setError('Could not connect. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid} aria-hidden />
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15" />
            <path d="M8 26 Q12 10 18 18 Q24 26 28 10" stroke="var(--accent)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="28" cy="10" r="2.5" fill="var(--accent)" />
          </svg>
        </div>
        <h1 className={styles.title}>Whiteboard</h1>
        <p className={styles.subtitle}>Real-time collaborative drawing</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="username">
            Your name
          </label>
          <input
            ref={inputRef}
            id="username"
            className={styles.input}
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="e.g. Alice"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.btn}
            disabled={loading || !username.trim()}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Enter Whiteboard →'
            )}
          </button>
        </form>

        <p className={styles.hint}>
          Existing names are recognized — just type yours to resume.
        </p>
      </div>
    </div>
  );
}
