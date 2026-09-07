-- Migration: 20260908_005
-- Task: cho phép correct_answer NULL (free_practice/guided_composition
-- không có đáp án cố định)
-- Date: 2026-09-08

ALTER TABLE exercises
  ALTER COLUMN correct_answer DROP NOT NULL;
