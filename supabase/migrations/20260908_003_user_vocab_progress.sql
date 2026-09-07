-- Migration: 20260908_003
-- Task: T1.4-A (F-04) — bảng user_vocab_progress + RLS
-- Date: 2026-09-08

CREATE TABLE user_vocab_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_item_id uuid NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  ease_factor float NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  due_date date NOT NULL DEFAULT current_date,
  review_count int NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  CONSTRAINT user_vocab_progress_unique UNIQUE (user_id, vocab_item_id)
);

ALTER TABLE user_vocab_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_vocab_progress: select own rows"
  ON user_vocab_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_vocab_progress: insert own rows"
  ON user_vocab_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_vocab_progress: update own rows"
  ON user_vocab_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
