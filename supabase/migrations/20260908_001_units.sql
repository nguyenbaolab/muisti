-- Migration: 20260908_001
-- Task: T1.2-A — bảng units + RLS
-- Date: 2026-09-08

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
