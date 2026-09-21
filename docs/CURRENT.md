# CURRENT

**Active phase:** 1  
**Version:** v0.2 (deck-based)  
**Last updated:** 2026-09-21

## Active docs

- Requirements (hiện hành): `docs/project/REQUIREMENTS.md`
- Plan Phase 1 cũ (lịch sử unit-based): `docs/phases/phase-1/PLAN_1.md`
- Workflow: `docs/project/WORKFLOW.md`

## Đang in-progress

- Schema deck-based đã migrate xong (migration `20260914_007_deck_based_schema.sql`)
- Feature upload deck + ôn Active Pool đã ship; tiếp tục polish / KI mở

## Vừa close

- Wipe schema unit-based (`units` / `exercises`) → `decks` + `vocab_items` + `user_vocab_progress`
- Enroll error handling: fatal trừ Postgres `23505`; docs đồng bộ với code (2026-09-21)
