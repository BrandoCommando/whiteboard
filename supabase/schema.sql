-- ============================================================
-- Whiteboard App Database Schema
-- Run this in your Supabase SQL editor or via psql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',      -- User's cursor/stroke color identity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================
-- DRAWINGS TABLE
-- Stores individual strokes (a stroke = one pen-down to pen-up)
-- ============================================================
CREATE TABLE IF NOT EXISTS drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,                     -- Denormalized for display
  color TEXT NOT NULL,
  stroke_width FLOAT NOT NULL DEFAULT 3,
  tool TEXT NOT NULL DEFAULT 'pen',          -- pen | eraser | line | rect | circle
  opacity FLOAT NOT NULL DEFAULT 1.0,
  points JSONB NOT NULL,                      -- Array of {x, y} points
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering strokes in render order
CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON drawings(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_drawings_user_id ON drawings(user_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

-- Users: allow all reads, allow insert/update with anon key
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true);

-- Drawings: allow all reads and inserts
CREATE POLICY "Allow public read drawings" ON drawings FOR SELECT USING (true);
CREATE POLICY "Allow public insert drawings" ON drawings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete drawings" ON drawings FOR DELETE USING (true);

-- ============================================================
-- REALTIME: Enable for drawings table
-- ============================================================
-- In Supabase Dashboard: Database > Replication > enable for 'drawings' table
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE drawings;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
