'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import LoginScreen from '@/components/LoginScreen';
import WhiteboardApp from '@/components/WhiteboardApp';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    try {
      const stored = localStorage.getItem('wb_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {}
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('wb_user', JSON.stringify(user));
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('wb_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '2px solid rgba(255,255,255,0.12)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <WhiteboardApp user={user} onLogout={handleLogout} />;
}
