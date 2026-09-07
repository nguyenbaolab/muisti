-- Muisti schema — full DDL (source of truth for fresh project setup)
-- Version: 0.1.0
-- Updated: 2026-09-08
-- Apply entire file on a fresh Supabase project.
-- For incremental updates on existing DB, use supabase/migrations/.

-- bảng units
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_code text NOT NULL,
  unit_number int NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT units_book_unit_unique UNIQUE (book_code, unit_number)
);

-- RLS units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units: authenticated users can select"
  ON units FOR SELECT
  TO authenticated
  USING (true);

-- insert/update/delete: no client policies — service role bypasses RLS by default

-- bảng vocab_items
CREATE TABLE vocab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  finnish_word text NOT NULL,
  translation text NOT NULL,
  part_of_speech text,
  example_sentence text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocab_items: authenticated users can select"
  ON vocab_items FOR SELECT
  TO authenticated
  USING (true);

-- bảng exercises
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  type text NOT NULL,
  prompt text NOT NULL,
  scene_description text,
  correct_answer jsonb,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises: authenticated users can select"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- insert/update/delete: no client policies — service role bypasses RLS by default

-- bảng user_vocab_progress
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

-- RLS user_vocab_progress (own rows only)
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

CREATE POLICY "user_vocab_progress: delete own rows"
  ON user_vocab_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- exercises: cột authoring (nullable — không mọi bài đều có harjoitus)
ALTER TABLE exercises
  ADD COLUMN source_harjoitus int,
  ADD COLUMN authoring_notes text;

