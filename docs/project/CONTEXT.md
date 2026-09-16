# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **Data / Auth:** Supabase (Postgres + Auth), client gọi `supabase-js`, bảo vệ bằng RLS
- **Auth model:** admin invite (`inviteUserByEmail`); không form đăng ký công khai
- **Deploy:** Cloudflare Pages
- **AI content:** app v0.1 không gọi LLM lúc runtime; nội dung deck do user upload
- **Phân công:** Claude thiết kế + prompt; Cursor thực thi code/data; chủ dự án test và quyết định cuối

---

## §2 Module map

```
src/
  main.tsx              # entry point
  App.tsx               # BrowserRouter + session gate (onAuthStateChange)
  App.css
  index.css
  assets/               # vite.svg, react.svg, hero.png
  lib/
    supabase.ts         # Supabase client (createClient, requireEnv guard)
    srs.ts              # classifyAttempt + computeNextReview (SM-2 rút gọn)
    deckParser.ts       # parseDeckFile — split `;`, trim, max 500 dòng
  pages/
    LoginPage.tsx       # email/password — signInWithPassword, không sign-up
    AppShell.tsx        # sau login + Link /decks + /review + Đăng xuất
    DecksPage.tsx       # danh sách decks (own + public), xóa owner, link ôn
    CreateDeckPage.tsx  # /decks/new — form + parse file + preview + lưu
    ReviewPage.tsx      # ôn SRS: mix (/review); /review/:deckId enroll Active Pool rồi due fetch
  types/
    database.ts         # Deck, VocabItem, UserVocabProgress, ReviewQueueItem
public/                 # static assets
supabase/
  schema.sql              # full DDL — dùng setup project mới
  migrations/
    20260908_001_units.sql
    20260908_002_vocab_exercises.sql
    20260908_003_user_vocab_progress.sql
    20260908_004_exercises_add_source_notes.sql
    20260908_005_exercises_correct_answer_nullable.sql
    20260908_006_user_vocab_progress_delete_policy.sql
    20260914_007_deck_based_schema.sql   # wipe units/exercises → decks
    20260916_008_deck_active_pool_size.sql
.env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## §3 Navigation skeleton

- `/login` — `LoginPage` khi chưa có session; đã login thì redirect `/`
- `/` — `AppShell` khi có session; chưa login thì redirect `/login`
- `/decks` — `DecksPage` khi có session; guest → `/login`
- `/decks/new` — `CreateDeckPage` khi có session; guest → `/login`
- `/review` — `ReviewPage` mix tất cả từ due của user; guest → `/login`
- `/review/:deckId` — `ReviewPage` chỉ từ due thuộc deck đó (chuẩn bị cho UI chọn deck)
- Session: `getSession` + `onAuthStateChange` trong `App.tsx`; lần đầu hiện `Loading...`
- Chi tiết UI nghiệp vụ ở `REQUIREMENTS.md`.

---

## §4 Data flow patterns

Xem `docs/project/PATTERNS.md` (pattern lặp lại) và `docs/project/DECISIONS.md` (deck ownership, RLS, SRS). Không lặp lại ở đây.

Hướng đã chốt (2026-09-14):

- `decks`: SELECT nếu `visibility = 'public'` hoặc `owner_id = auth.uid()`; INSERT/UPDATE/DELETE chỉ owner
- `vocab_items`: SELECT theo quyền SELECT của deck cha; INSERT/UPDATE/DELETE chỉ owner deck (client upload được)
- `user_vocab_progress`: RLS own-rows `user_id = auth.uid()` — không đổi cấu trúc cột

---

## §5 Conventions

- Comment code và commit message: **tiếng Anh**
- Trao đổi với chủ dự án qua Claude: **tiếng Việt**, giọng thân mật (mình / bạn)
- Functional components + TypeScript; không thêm framework/backend mới nếu chưa bàn với Claude
- `npx tsc --noEmit` phải pass trước khi báo done
- Không đổi kiến trúc đã chốt trong `DECISIONS.md` nếu chưa được chủ dự án xác nhận
- Khi bí: ghi `docs/BLOCKERS.md`, dừng, hỏi user

---

## §6 Store/API index

- `src/lib/supabase.ts`: `export const supabase` — Supabase client dùng chung toàn app; khởi tạo từ `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- Parse deck file: `parseDeckFile(content)` — `src/lib/deckParser.ts`
- List decks: `decks.select('*, vocab_items(count)')` — RLS lọc own + public — `DecksPage`
- Create deck: `decks.insert({ owner_id, name, meaning_language, description, visibility, active_pool_size }).select('id').single()` rồi `vocab_items.insert([...])` — `CreateDeckPage` (`owner_id` không có DEFAULT; `active_pool_size` 10–30, default 20)
- Delete deck: `decks.delete().eq('id')` — CASCADE vocab + progress — `DecksPage`
- Active pool enroll (chỉ `/review/:deckId`): trước due fetch, `enrollActivePool` — join progress↔vocab_items, `interval_days < 30`, insert progress cho từ chưa enroll (`ease_factor`/`interval_days`/`review_count` theo DEFAULT schema 2.5/0/0, `due_date` = `todayLocalIsoDate()`). Mix `/review` không enroll.
- SRS queue mix: `user_vocab_progress.select('..., vocab_items(*)').eq('user_id').lte('due_date', todayLocalIsoDate())` — không join `decks` — `ReviewPage` `/review`
- SRS queue 1 deck: cùng query + `vocab_items!inner(*)` + `.eq('vocab_items.deck_id', deckId)` — `ReviewPage` `/review/:deckId`
- SRS update: khi từ trả hết nợ (đúng lần cuối), `computeNextReview` rồi `update` ease/interval/due_date/review_count/last_reviewed_at. Sai chỉ đẩy lại cuối queue, không ghi DB. — `src/lib/srs.ts` + `ReviewPage`
