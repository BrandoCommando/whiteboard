export type Tool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  user_id: string;
  username: string;
  color: string;
  stroke_width: number;
  tool: Tool;
  opacity: number;
  points: Point[];
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  color: string;
  created_at: string;
  last_seen_at: string;
}

export interface DrawingState {
  isDrawing: boolean;
  currentPoints: Point[];
  tool: Tool;
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface ActiveUser {
  id: string;
  username: string;
  color: string;
  cursor?: Point;
  last_seen_at: string;
}
