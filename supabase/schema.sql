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
  correct_answer jsonb NOT NULL,
  options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises: authenticated users can select"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- insert/update/delete: no client policies — service role bypasses RLS by default
