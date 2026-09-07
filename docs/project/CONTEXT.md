# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **Data / Auth:** Supabase (Postgres + Auth), client gọi `supabase-js`, bảo vệ bằng RLS
- **Auth model:** admin invite (`inviteUserByEmail`); không form đăng ký công khai
- **Deploy:** Cloudflare Pages
- **AI content:** Claude đọc PDF unit lúc soạn bài; app v0.1 không gọi LLM lúc runtime
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
  pages/
    LoginPage.tsx       # email/password — signInWithPassword, không sign-up
    AppShell.tsx        # sau login + Link /units + Đăng xuất
    UnitListPage.tsx    # danh sách units (fetch Supabase)
    UnitDetailPage.tsx  # 1 unit: vocab + exercises + đánh dấu từ (F-04)
  types/
    database.ts         # Unit, VocabItem, Exercise, UserVocabProgress
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
content/
  unit1_complete.json
  unit2_complete.json
scripts/
  seed-units.ts         # local seed via service role — KHÔNG import vào src/
.env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## §3 Navigation skeleton

- `/login` — `LoginPage` khi chưa có session; đã login thì redirect `/`
- `/` — `AppShell` khi có session; chưa login thì redirect `/login`
- `/units` — `UnitListPage` khi có session; guest / chưa login → redirect `/login` (`*` không session)
- `/units/:id` — `UnitDetailPage` khi có session; title unit + từ vựng + bài tập; guest → `/login`
- Session: `getSession` + `onAuthStateChange` trong `App.tsx`; lần đầu hiện `Loading...`
- Chi tiết UI nghiệp vụ ở `REQUIREMENTS.md`.

---

## §4 Data flow patterns

Xem `docs/project/PATTERNS.md` (pattern lặp lại) và `docs/project/DECISIONS.md` (tách content vs progress, RLS). Không lặp lại ở đây.

Hướng đã chốt:

- Content (`units`, `vocab_items`, `exercises`): authenticated SELECT; ghi chỉ service role
- Progress (`user_vocab_progress`, `quiz_attempts`, `user_unit_progress`): RLS `user_id = auth.uid()`

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
- Fetch units: `supabase.from('units').select('*').order('book_code', { ascending: true }).order('unit_number', { ascending: true })` — `UnitListPage`
- Fetch unit detail: `Promise.all` — `units` `.eq('id', unitId).single()` + `vocab_items` / `exercises` `.eq('unit_id', unitId).order('created_at')` + `user_vocab_progress.select('vocab_item_id').eq('user_id', currentUserId)` (bỏ qua nếu `getUser()` không có user) — `UnitDetailPage`
- Mark unknown vocab: `insert` `{ user_id, vocab_item_id }` vào `user_vocab_progress` (SRS fields dùng default DB). Unique `(user_id, vocab_item_id)`: lỗi `23505` / duplicate key coi như thành công, thêm id vào `markedVocabIds`. Lỗi khác hiện gần nút. — `UnitDetailPage`
- Unmark vocab: `delete` `user_vocab_progress` `.eq('user_id').eq('vocab_item_id')`; thành công thì bỏ id khỏi `markedVocabIds`. Cần policy DELETE own rows (migration `006`). — `UnitDetailPage`
- Seed content: `npm run seed` → `scripts/seed-units.ts` — client service role (`SUPABASE_SERVICE_ROLE_KEY` + `VITE_SUPABASE_URL` từ `.env`), không dùng `src/lib/supabase.ts`. JSON `notes` trên exercise → cột `authoring_notes`. `correct_answer: null` insert nguyên (cột nullable). `metadata` không insert. Apply migration `005` trước khi seed.
