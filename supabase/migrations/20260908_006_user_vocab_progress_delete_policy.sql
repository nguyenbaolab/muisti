-- Migration: 20260908_006
-- Task: thêm policy DELETE cho user_vocab_progress (hỗ trợ unmark)
-- Date: 2026-09-08

CREATE POLICY "user_vocab_progress: delete own rows"
  ON user_vocab_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
