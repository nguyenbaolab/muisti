-- Migration: 20260914_007
-- Task: wipe unit-based schema → deck-based (no data backup)
-- Date: 2026-09-14
--
-- DROP each table explicitly, child before parent, so FK constraints
-- do not block the wipe. DROP TABLE ... CASCADE does NOT drop other
-- tables that only have FKs pointing at the dropped table (it drops
-- those FK constraints). ON DELETE CASCADE is row-level only.
-- decks is included so a partial prior run can re-run cleanly.

DROP TABLE IF EXISTS user_vocab_progress CASCADE;
DROP TABLE IF EXISTS vocab_items CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS decks CASCADE;

CREATE TABLE decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meaning_language text NOT NULL CHECK (meaning_language IN ('en', 'vi')),
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vocab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  finnish_word text NOT NULL,
  translation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocab_progress ENABLE ROW LEVEL SECURITY;

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
