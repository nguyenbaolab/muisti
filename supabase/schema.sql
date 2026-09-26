-- Muisti schema — full DDL (source of truth for fresh project setup)
-- Version: 0.3.0
-- Updated: 2026-09-26
-- Apply entire file on a fresh Supabase project.
-- For incremental updates on existing DB, use supabase/migrations/.

-- bảng profiles (email đồng bộ từ auth.users; admin + quota Task 5)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  daily_exercise_quota int NOT NULL DEFAULT 10 CHECK (daily_exercise_quota >= 0)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: select all authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Avoid infinite recursion: policy on profiles must not SELECT profiles under RLS.
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

CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- bảng decks
CREATE TABLE decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meaning_language text NOT NULL CHECK (meaning_language IN ('en', 'vi')),
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  active_pool_size integer NOT NULL DEFAULT 20 CHECK (active_pool_size BETWEEN 10 AND 30),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decks: select public or own"
  ON decks FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "decks: insert own"
  ON decks FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "decks: update own"
  ON decks FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "decks: delete own"
  ON decks FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- bảng vocab_items
CREATE TABLE vocab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  finnish_word text NOT NULL,
  translation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vocab_items: select if deck visible"
  ON vocab_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE decks.id = vocab_items.deck_id
        AND (decks.visibility = 'public' OR decks.owner_id = auth.uid())
    )
  );

CREATE POLICY "vocab_items: insert if deck owner"
  ON vocab_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decks
      WHERE decks.id = vocab_items.deck_id
        AND decks.owner_id = auth.uid()
    )
  );

CREATE POLICY "vocab_items: update if deck owner"
  ON vocab_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE decks.id = vocab_items.deck_id
        AND decks.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decks
      WHERE decks.id = vocab_items.deck_id
        AND decks.owner_id = auth.uid()
    )
  );

CREATE POLICY "vocab_items: delete if deck owner"
  ON vocab_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM decks
      WHERE decks.id = vocab_items.deck_id
        AND decks.owner_id = auth.uid()
    )
  );

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

-- bảng exercise_quota_usage (Task 5 — daily Claude generation quota)
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

-- bảng generated_exercises (Task 5 — Level 2 fill_blank / mcq; content jsonb)
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
