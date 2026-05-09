'use client';

import { useRef, useState } from 'react';
import { Tool, User } from '@/types';
import styles from './Toolbar.module.css';

interface Props {
  tool: Tool;
  color: string;
  strokeWidth: number;
  opacity: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onOpacityChange: (o: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onLogout: () => void;
  user: User;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

const TOOLS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  {
    id: 'pen',
    label: 'Pen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12.5 2.5L15.5 5.5L6 15H3V12L12.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="9" width="14" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M5 9V6L9 2L13 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <line x1="3" y1="15" x2="15" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'rect',
    label: 'Rectangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Ellipse',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <ellipse cx="9" cy="9" rx="6.5" ry="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
];

const PRESET_COLORS = [
  '#f0f0f5', '#f04438', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
];

const STROKE_SIZES = [2, 4, 8, 14, 22];

export default function Toolbar({
  tool, color, strokeWidth, opacity,
  onToolChange, onColorChange, onStrokeWidthChange, onOpacityChange,
  onUndo, onClear, onLogout, user, connectionStatus,
}: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipTargetRef = useRef<HTMLElement | null>(null);

  const updateTooltipPosition = () => {
    const target = tooltipTargetRef.current;
    if (!target) return;
    const text = target.dataset.tooltip;
    if (!text) return;
    const rect = target.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const showTooltip = (target: HTMLElement | null) => {
    if (!target?.dataset.tooltip) return;
    tooltipTargetRef.current = target;
    updateTooltipPosition();
  };

  const hideTooltip = () => {
    tooltipTargetRef.current = null;
    setTooltip(null);
  };

  return (
    <aside
      className={styles.toolbar}
      onMouseOver={e => showTooltip((e.target as HTMLElement).closest('[data-tooltip]'))}
      onMouseMove={() => updateTooltipPosition()}
      onMouseLeave={hideTooltip}
      onFocusCapture={e => showTooltip((e.target as HTMLElement).closest('[data-tooltip]'))}
      onBlurCapture={hideTooltip}
      onScroll={hideTooltip}
    >

      {/* User avatar / logout */}
      <div className={styles.avatar} style={{ background: user.color }} data-tooltip={`${user.username} — click to sign out`}
        onClick={onLogout} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onLogout()}
        aria-label="Sign out"
      >
        {user.username.slice(0, 1).toUpperCase()}
      </div>
      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Connection status */}
      <div className={styles.status} data-tooltip={
        connectionStatus === 'connected' ? 'Live — realtime sync active'
        : connectionStatus === 'connecting' ? 'Connecting…'
        : 'Disconnected'
      }>
        <div className={`${styles.statusDot} ${styles[connectionStatus]}`} />
      </div>

      <div className={styles.divider} />

      {/* Drawing Tools */}
      <div className={styles.section}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
            onClick={() => onToolChange(t.id)}
            data-tooltip={t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Color Picker */}
      <div className={styles.section}>
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            className={`${styles.colorBtn} ${color === c ? styles.colorActive : ''}`}
            onClick={() => onColorChange(c)}
            style={{ '--swatch': c } as React.CSSProperties}
            aria-label={`Color ${c}`}
          />
        ))}
        {/* Custom color */}
        <div className={styles.customColorWrap} data-tooltip="Custom color">
          <input
            type="color"
            value={color}
            onChange={e => onColorChange(e.target.value)}
            className={styles.customColor}
            aria-label="Custom color"
          />
          <div className={styles.customColorPreview} style={{ background: color }} />
        </div>
      </div>

      <div className={styles.divider} />

      {/* Stroke Width */}
      <div className={styles.section}>
        {STROKE_SIZES.map(s => (
          <button
            key={s}
            className={`${styles.sizeBtn} ${strokeWidth === s ? styles.active : ''}`}
            onClick={() => onStrokeWidthChange(s)}
            data-tooltip={`${s}px`}
            aria-label={`Stroke ${s}px`}
          >
            <div className={styles.sizeDot} style={{ width: Math.min(s, 18), height: Math.min(s, 18) }} />
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Opacity */}
      <div className={styles.opacityWrap} data-tooltip="Opacity">
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={e => onOpacityChange(parseFloat(e.target.value))}
          className={styles.slider}
          aria-label="Opacity"
        />
        <span className={styles.opacityLabel}>{Math.round(opacity * 100)}%</span>
      </div>

      <div className={styles.divider} />

      {/* Actions */}
      <div className={styles.section}>
        <button className={styles.actionBtn} onClick={onUndo} data-tooltip="Undo last stroke" aria-label="Undo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 6H9.5a4.5 4.5 0 010 9H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M5 3L2 6L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={onClear} data-tooltip="Clear your drawings" aria-label="Clear your drawings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2.5h6V4M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>
      {tooltip && (
        <div
          className={styles.floatingTooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {tooltip.text}
        </div>
      )}

    </aside>
  );
}
