'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Stroke, Tool, Point, User, ActiveUser } from '@/types';
import styles from './Canvas.module.css';

interface Props {
  strokes: Stroke[];
  tool: Tool;
  color: string;
  strokeWidth: number;
  opacity: number;
  user: User;
  activeUsers: ActiveUser[];
  onStrokeComplete: (stroke: Omit<Stroke, 'id' | 'created_at'>) => void;
  onCursorMove: (point: Point) => void;
}

function getCanvasPoint(canvas: HTMLCanvasElement, e: MouseEvent | Touch): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: ((e instanceof Touch ? e.clientX : e.clientX) - rect.left) * scaleX,
    y: ((e instanceof Touch ? e.clientY : e.clientY) - rect.top) * scaleY,
  };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
  }

  ctx.lineWidth = stroke.stroke_width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
    ctx.beginPath();
    if (stroke.points.length === 1) {
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.stroke_width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
      ctx.fill();
    } else {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const mx = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const my = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, mx, my);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
  } else if (stroke.tool === 'line') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  } else if (stroke.tool === 'rect') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    ctx.beginPath();
    ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
  } else if (stroke.tool === 'circle') {
    const [p0, p1] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
    const rx = Math.abs(p1.x - p0.x) / 2;
    const ry = Math.abs(p1.y - p0.y) / 2;
    const cx = p0.x + (p1.x - p0.x) / 2;
    const cy = p0.y + (p1.y - p0.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function redrawAll(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, strokes: Stroke[]) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) drawStroke(ctx, s);
}

export default function Canvas({
  strokes, tool, color, strokeWidth, opacity,
  user, activeUsers, onStrokeComplete, onCursorMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const [cursors, setCursors] = useState<ActiveUser[]>([]);

  // Keep cursors in sync
  useEffect(() => {
    setCursors(activeUsers.filter(u => u.cursor));
  }, [activeUsers]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = canvas.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      // Save current drawing
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      overlay.width = w * dpr;
      overlay.height = h * dpr;
      overlay.style.width = w + 'px';
      overlay.style.height = h + 'px';
      overlay.getContext('2d')!.scale(dpr, dpr);
      // Redraw
      redrawAll(ctx, canvas, strokes);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw all strokes when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    redrawAll(ctx, canvas, strokes);
  }, [strokes]);

  // Draw live preview on overlay canvas
  const drawPreview = useCallback((points: Point[], previewTool: Tool) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);

    if (points.length === 0) return;
    const previewStroke: Stroke = {
      id: 'preview',
      user_id: user.id,
      username: user.username,
      color,
      stroke_width: strokeWidth,
      tool: previewTool,
      opacity,
      points,
      created_at: '',
    };
    drawStroke(ctx, previewStroke);
  }, [color, strokeWidth, opacity, user]);

  const startDraw = useCallback((point: Point) => {
    isDrawing.current = true;
    currentPoints.current = [point];
    drawPreview([point], tool);
  }, [drawPreview, tool]);

  const continueDraw = useCallback((point: Point) => {
    if (!isDrawing.current) return;
    onCursorMove(point);
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      currentPoints.current = [currentPoints.current[0], point];
    } else {
      currentPoints.current.push(point);
    }
    drawPreview(currentPoints.current, tool);
  }, [tool, onCursorMove, drawPreview]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const points = currentPoints.current;
    currentPoints.current = [];

    // Clear preview
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
    }

    if (points.length === 0) return;

    onStrokeComplete({
      user_id: user.id,
      username: user.username,
      color,
      stroke_width: strokeWidth,
      tool,
      opacity,
      points,
    });
  }, [color, strokeWidth, tool, opacity, user, onStrokeComplete]);

  // Mouse events
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      startDraw(getCanvasPoint(overlay, e));
    };
    const onMouseMove = (e: MouseEvent) => {
      onCursorMove(getCanvasPoint(overlay, e));
      continueDraw(getCanvasPoint(overlay, e));
    };
    const onMouseUp = () => endDraw();
    const onMouseLeave = () => { if (isDrawing.current) endDraw(); };

    overlay.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    overlay.addEventListener('mouseleave', onMouseLeave);

    return () => {
      overlay.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      overlay.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [startDraw, continueDraw, endDraw, onCursorMove]);

  // Touch events
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDraw(getCanvasPoint(overlay, e.touches[0]));
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      continueDraw(getCanvasPoint(overlay, e.touches[0]));
    };
    const onTouchEnd = () => endDraw();

    overlay.addEventListener('touchstart', onTouchStart, { passive: false });
    overlay.addEventListener('touchmove', onTouchMove, { passive: false });
    overlay.addEventListener('touchend', onTouchEnd);

    return () => {
      overlay.removeEventListener('touchstart', onTouchStart);
      overlay.removeEventListener('touchmove', onTouchMove);
      overlay.removeEventListener('touchend', onTouchEnd);
    };
  }, [startDraw, continueDraw, endDraw]);

  const cursorStyle =
    tool === 'eraser' ? 'cell'
    : tool === 'pen' ? 'crosshair'
    : 'crosshair';

  return (
    <div className={styles.canvasWrapper}>
      {/* Dot grid background */}
      <div className={styles.dotGrid} />

      {/* Main drawing canvas */}
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Live preview + interaction overlay */}
      <canvas
        ref={overlayRef}
        className={styles.overlay}
        style={{ cursor: cursorStyle }}
      />

      {/* Remote user cursors */}
      {cursors.map(u => u.cursor && (
        <div
          key={u.id}
          className={styles.cursor}
          style={{
            left: u.cursor.x,
            top: u.cursor.y,
            '--cursor-color': u.color,
          } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2L16 8L9 9.5L7.5 16L2 2Z" fill={u.color} stroke="#fff" strokeWidth="1.2"/>
          </svg>
          <span className={styles.cursorLabel} style={{ background: u.color }}>
            {u.username}
          </span>
        </div>
      ))}
    </div>
  );
}
