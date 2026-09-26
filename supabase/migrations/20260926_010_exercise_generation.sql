-- Migration: 20260926_010
-- Task 5 bước 1/4: Level 2 exercise generation schema (fill_blank, mcq)
-- Date: 2026-09-26
-- Apply on Supabase SQL Editor (owner). Incremental on existing DB.

-- Admin flag + per-user daily generation quota on profiles
ALTER TABLE profiles
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN daily_exercise_quota int NOT NULL DEFAULT 10
  CHECK (daily_exercise_quota >= 0);

-- Avoid infinite recursion: policy on profiles must not SELECT profiles under RLS.
-- SECURITY DEFINER reads is_admin bypassing RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "profiles: admin update any row"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Daily quota usage (one row per user per calendar day)
CREATE TABLE exercise_quota_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT current_date,
  generations_used int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE exercise_quota_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_quota_usage: select own rows"
  ON exercise_quota_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "exercise_quota_usage: insert own rows"
  ON exercise_quota_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "exercise_quota_usage: update own rows"
  ON exercise_quota_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Generated Level 2 exercises (content shape varies by exercise_type)
CREATE TABLE generated_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocab_item_id uuid NOT NULL REFERENCES vocab_items(id) ON DELETE CASCADE,
  exercise_type text NOT NULL CHECK (exercise_type IN ('fill_blank', 'mcq')),
  content jsonb NOT NULL,
  times_shown int NOT NULL DEFAULT 0,
  cooldown_until date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generated_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_exercises: select if deck visible"
  ON generated_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vocab_items
      JOIN decks ON decks.id = vocab_items.deck_id
      WHERE vocab_items.id = generated_exercises.vocab_item_id
        AND (decks.visibility = 'public' OR decks.owner_id = auth.uid())
    )
  );

CREATE POLICY "generated_exercises: insert if deck owner"
  ON generated_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vocab_items
      JOIN decks ON decks.id = vocab_items.deck_id
      WHERE vocab_items.id = generated_exercises.vocab_item_id
        AND decks.owner_id = auth.uid()
    )
  );

CREATE POLICY "generated_exercises: update if deck owner"
  ON generated_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM vocab_items
      JOIN decks ON decks.id = vocab_items.deck_id
      WHERE vocab_items.id = generated_exercises.vocab_item_id
        AND decks.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vocab_items
      JOIN decks ON decks.id = vocab_items.deck_id
      WHERE vocab_items.id = generated_exercises.vocab_item_id
        AND decks.owner_id = auth.uid()
    )
  );
