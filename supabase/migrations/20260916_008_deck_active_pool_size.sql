-- Migration: 20260916_008
-- Task: Active Pool Enrollment — decks.active_pool_size
-- Date: 2026-09-16

ALTER TABLE decks
  ADD COLUMN active_pool_size integer NOT NULL DEFAULT 20
  CHECK (active_pool_size BETWEEN 10 AND 30);
