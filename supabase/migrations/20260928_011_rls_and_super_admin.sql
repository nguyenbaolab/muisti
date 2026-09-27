-- Migration: 20260928_011
-- Task: RLS profiles tighten + is_super_admin + generated_exercises index
-- Date: 2026-09-28
-- Apply on Supabase SQL Editor (owner). Incremental on existing DB.

-- Super admin flag (1 account; set by hand after apply — see comment at end)
ALTER TABLE profiles
  ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;

-- Avoid infinite recursion: policy on profiles must not SELECT profiles under RLS.
-- SECURITY DEFINER reads is_super_admin bypassing RLS.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Tighten SELECT + UPDATE on profiles
DROP POLICY "profiles: select all authenticated" ON profiles;
DROP POLICY "profiles: admin update any row" ON profiles;

CREATE POLICY "profiles: select own, admin, or public deck owner"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.owner_id = profiles.id
        AND decks.visibility = 'public'
    )
  );

CREATE POLICY "profiles: super admin update any row"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Index for Worker pool lookup (vocab_item_id + exercise_type + order times_shown)
CREATE INDEX ON generated_exercises (vocab_item_id, exercise_type, times_shown);

-- SAU KHI APPLY: chủ dự án tự set tài khoản của mình bằng SQL tay (chạy riêng, không nằm trong migration):
-- UPDATE profiles SET is_super_admin = true, is_admin = true WHERE email = '<email-cua-ban>';
-- Chốt: 1 super admin duy nhất. is_admin = true để lọt policy SELECT/admin-list.
