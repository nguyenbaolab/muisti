-- Migration: 20260908_004
-- Task: chuẩn bị seed data — thêm cột source_harjoitus + authoring_notes
-- Date: 2026-09-08

ALTER TABLE exercises
  ADD COLUMN source_harjoitus int,
  ADD COLUMN authoring_notes text;
