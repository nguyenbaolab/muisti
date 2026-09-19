# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **CSS:** Tailwind CSS v4 (`@tailwindcss/vite` + `@import "tailwindcss"` trong `index.css`). Token järvi trong `@theme`; dark mode class `.dark` trên `<html>` (`@custom-variant`). `AppLayout` + `HomePage` dùng `Button` / `ThemeToggle`; trang chưa nâng cấp vẫn inline style + alias `--border` / `--text` / `--bg`
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
  App.tsx               # BrowserRouter + session gate (onAuthStateChange); nested AppLayout
  index.css             # Tailwind + token järvi + alias CSS cũ; #root không còn chrome Vite
  assets/               # vite.svg, react.svg, hero.png
  components/
    AppLayout.tsx       # header (wordmark + Decks/Ôn tập + ThemeToggle + Đăng xuất) + Outlet
    Button.tsx
    Input.tsx
    Card.tsx
    ThemeToggle.tsx     # gắn trong AppLayout
  lib/
    supabase.ts         # Supabase client (createClient, requireEnv guard)
    srs.ts              # classifyAttempt + computeNextReview (SM-2 rút gọn)
    deckParser.ts       # parseDeckFile — split `;`, trim, max 500 dòng
    useTheme.ts         # light/dark + localStorage `muisti-theme` (mount ghi chốt theme — KI-012)
  pages/
    LoginPage.tsx       # email/password — signInWithPassword, không sign-up; ngoài AppLayout
    HomePage.tsx        # `/` — Tổng kết Tổng (query cũ từ AppShell)
    DecksPage.tsx       # /decks 2 tab Cá nhân/Public (activeTab); own → /decks/:id; khác → /preview + tên chia sẻ
    CreateDeckPage.tsx  # /decks/new — form + parse file + preview + lưu + active_pool_size
    EditDeckPage.tsx    # /decks/:id/edit — sửa metadata deck (owner); không sửa vocab_items
    DeckPreviewPage.tsx # /decks/:id/preview — đọc-only + Clone (non-owner); «Chia sẻ bởi» nếu !owned
    DeckDetailPage.tsx  # /decks/:id — owner: tab Từ vựng + Tổng kết; nút ôn → /review/:id
    ReviewPage.tsx      # ôn SRS; ngoài AppLayout (toàn màn hình); phím Enter + A–D MCQ; done = Session Summary
  types/
    database.ts         # Deck, VocabItem, UserVocabProgress, ReviewQueueItem, Profile
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
    20260916_008_deck_active_pool_size.sql  # decks.active_pool_size 10–30 default 20
    20260916_009_profiles.sql               # profiles + trigger auth.users — CHƯA APPLY (owner SQL Editor)
.env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## §3 Navigation skeleton

- `/login` — `LoginPage` khi chưa có session; đã login thì redirect `/`
- `/` — `HomePage` trong `AppLayout` khi có session (Tổng kết Tổng); chưa login thì redirect `/login`
- `/decks` — `DecksPage` trong `AppLayout` khi có session (tab Cá nhân / Public, default Cá nhân); guest → `/login`
- `/decks/new` — `CreateDeckPage` khi có session; guest → `/login`
- `/decks/:id/edit` — `EditDeckPage` khi có session; guest → `/login`; chỉ owner thấy form
- `/decks/:id/preview` — `DeckPreviewPage` khi có session; guest → `/login`; public hoặc own; Clone nếu không phải owner
- `/decks/:id` — `DeckDetailPage` khi có session; guest → `/login`; chỉ owner (non-owner: thông báo + link preview, không redirect)
- `/review` — `ReviewPage` mix; **ngoài** `AppLayout` (không header); guest → `/login`
- `/review/:deckId` — `ReviewPage` chỉ owner: check `owner_id` rồi enroll Active Pool rồi ôn due; **ngoài** `AppLayout`; non-owner bị chặn (nhắn sang preview)
- Layout session: `AppLayout` bọc `/`, `/decks`, `/decks/new`, `/decks/:id`, `/decks/:id/edit`, `/decks/:id/preview`. Header: Muisti → `/`, Decks, Ôn tập → `/review`, `ThemeToggle`, Đăng xuất (`signOut`). Không hiện email.
- Session: `getSession` + `onAuthStateChange` trong `App.tsx`; lần đầu hiện `Loading...`
- Chi tiết UI nghiệp vụ ở `REQUIREMENTS.md`.

---

## §4 Data flow patterns

Xem `docs/project/PATTERNS.md` (pattern lặp lại) và `docs/project/DECISIONS.md` (deck ownership, RLS, SRS). Không lặp lại ở đây.

Hướng đã chốt (2026-09-14, cột pool 2026-09-16, profiles 2026-09-17):

- `decks`: SELECT nếu `visibility = 'public'` hoặc `owner_id = auth.uid()`; INSERT/UPDATE/DELETE chỉ owner. Cột `active_pool_size` integer 10–30, default 20.
- `vocab_items`: SELECT theo quyền SELECT của deck cha; INSERT/UPDATE/DELETE chỉ owner deck (client upload được)
- `user_vocab_progress`: RLS own-rows `user_id = auth.uid()` — không đổi cấu trúc cột
- `profiles`: `id` = `auth.users.id`, `email`; SELECT mọi authenticated (`USING (true)`); trigger `on_auth_user_created` INSERT khi có user mới. **009 chưa apply trên DB cho đến khi owner chạy SQL Editor.**

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
- List decks: `decks.select('*, vocab_items(count)')` — RLS lọc own + public — `DecksPage`; filter client `activeTab` `'mine' | 'public'`; click own → `/decks/:id`, click không phải mình → `/decks/:id/preview`
- Owner email (tên chia sẻ): query 2 — `profiles.select('id, email').in('id', ownerIds)` trên `DecksPage`; `profiles.select('email').eq('id', owner_id)` trên `DeckPreviewPage` nếu `!owned`. Không embed từ `decks` (không FK `decks`→`profiles`). UI cắt phần trước `@`.
- Account summary: `decks.select('id, vocab_items(count)').eq('owner_id', user.id)` + `user_vocab_progress.select('interval_days, due_date').eq('user_id')` — `HomePage` `/`; `todayLocalIsoDate()`; không join vocab cho progress
- Deck detail (owner): `decks.select('*')` rồi `vocab_items` + `user_vocab_progress` join `vocab_items!inner` lọc `deck_id` — `DeckDetailPage`; ngày «hôm nay» = `todayLocalIsoDate()`
- Create deck: `decks.insert({ owner_id, name, meaning_language, description, visibility, active_pool_size }).select('id').single()` rồi `vocab_items.insert([...])` — `CreateDeckPage` (`owner_id` không có DEFAULT; `active_pool_size` 10–30, default 20)
- Update deck metadata: `decks.update({ name, meaning_language, description, visibility, active_pool_size }).eq('id')` — `EditDeckPage` (không còn guard public→private)
- Preview deck: `decks.select('*, vocab_items(finnish_word, translation)').eq('id').single()` — `DeckPreviewPage`
- Clone deck: insert deck mới (`name` + ` (Copy)`, `visibility: 'private'`, `active_pool_size: 20`) rồi bulk insert vocab; rollback delete deck nếu vocab lỗi; không copy progress — `DeckPreviewPage`. Verified 2026-09-16 (tài khoản B, deck public của A): Clone + enroll Active Pool trên bản copy.
- Delete deck: `decks.delete().eq('id')` — CASCADE vocab + progress — `DecksPage`
- Active pool enroll (chỉ `/review/:deckId` **và** owner): `enrollActivePool` trả `{ fatalError, enrolledCount }`; `startReview` lưu `enrolledCount`. Mix `/review` không enroll.
- Session Summary: `completedCards` tích khi trả hết nợ; màn `done` đếm wrongCount 0/1/≥2, thời gian từ `sessionStartTime`, bảng từ quên; dòng từ mới chỉ khi `scopedDeckId && enrolledCount > 0`.
- Review keyboard (`pageState === 'reviewing'` only): document `keydown` — Enter + `feedback` → `handleNext`; MCQ A–D → `submitMcqChoice(chosen)` (không đọc `selectedOption` vì stale). `handleSubmit` chuột/form không đổi.
- Theme: `useTheme` + script chống FOUC trong `index.html`; key `localStorage['muisti-theme']`. `ThemeToggle` mount trong `AppLayout` (Login/Review không có toggle; class `.dark` vẫn do script + storage). Mount hook ghi storage ngay — KI-012.
- SRS queue mix: `user_vocab_progress.select('..., vocab_items(*)').eq('user_id').lte('due_date', todayLocalIsoDate())` — không join `decks` — `ReviewPage` `/review`
- SRS queue 1 deck: cùng query + `vocab_items!inner(*)` + `.eq('vocab_items.deck_id', deckId)` — `ReviewPage` `/review/:deckId`
- SRS update: khi từ trả hết nợ (đúng lần cuối), `computeNextReview` rồi `update` ease/interval/due_date/review_count/last_reviewed_at. Sai chỉ đẩy lại cuối queue, không ghi DB. — `src/lib/srs.ts` + `ReviewPage`
