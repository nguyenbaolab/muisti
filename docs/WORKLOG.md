# WORKLOG

Nhật ký thay đổi có ý nghĩa. Entry mới ở **đầu file** (sau tiêu đề và dòng kẻ). Đọc từ trên xuống = mới nhất → cũ nhất.

---

## Giai đoạn 0 — Tailwind + token järvi + dark/light
**Ngày:** 2026-09-19
**Trạng thái:** Done

**Đã làm:**
- Cài `tailwindcss` + `@tailwindcss/vite` v4; plugin trong `vite.config.ts`
- Xóa `App.css` (không được import)
- `index.css`: `@theme` järvi + `@custom-variant dark`; giữ alias `--text`/`--bg`/`--border`/`--accent`… map sang palette mới + `#root` layout cũ
- `useTheme`, `ThemeToggle`, `Button`, `Input`, `Card` — chưa gắn vào `src/pages/`
- Inter + script chống FOUC trong `index.html`

---

## ReviewPage — auto-focus ô gõ chữ Typing
**Ngày:** 2026-09-19
**Trạng thái:** Done

**Đã làm:**
- `typedInputRef` gắn vào `<input>` Typing
- `useEffect` focus khi `pageState === 'reviewing'` + `askMode === 'type'` + `!feedback`; deps gồm `queue` để focus lại mỗi câu mới
- Không đụng phím tắt / `handleSubmit` / `handleNext` / `persistCard` / srs.ts

---

## ReviewPage — phím tắt Enter + A/B/C/D
**Ngày:** 2026-09-19
**Trạng thái:** Done

**Đã làm:**
- MCQ hiện nhãn A/B/C/D theo index `mcqOptions` (đã shuffle)
- `useEffect` `document` keydown chỉ khi `pageState === 'reviewing'`: Enter sau feedback → `handleNext`; A–D khi MCQ chưa feedback → `submitMcqChoice(chosen)` (tránh stale `selectedOption`)
- Không sửa `handleSubmit` / `checkAnswer` / `handleNext` / `persistCard`; Typing Enter lần 1 vẫn form submit HTML
- Không đụng srs.ts / màn setup/done/empty/error

---

## `/decks` — 2 tab Cá nhân / Public
**Ngày:** 2026-09-18
**Trạng thái:** Done

**Đã làm:**
- State `activeTab: 'mine' | 'public'` (default `mine`); filter client `visibleDecks`; không đổi `loadDecks`
- Empty riêng: Cá nhân → tạo deck; Public → chưa có deck công khai
- Không route/query param; không đụng trang khác

---

## profiles + tên người chia sẻ deck (phần trước @)
**Ngày:** 2026-09-17
**Trạng thái:** Done (code) — **migration 009 chưa apply, owner tự chạy SQL Editor**

**Đã làm:**
- File `supabase/migrations/20260916_009_profiles.sql` + cập nhật `schema.sql` (bảng, RLS SELECT authenticated, trigger `on_auth_user_created`, backfill)
- Type `Profile`; `DecksPage` / `DeckPreviewPage`: 2 query (không embed — `decks.owner_id` FK `auth.users`, không FK sang `profiles`)
- `!owned` hiện «Chia sẻ bởi: {phần trước @}»; owned không hiện; không hiện email đầy đủ
- Không đụng DeckDetailPage / ReviewPage / EditDeckPage / CreateDeckPage / AppShell / srs.ts

---

## Tổng kết Tổng trên AppShell (trang chủ)
**Ngày:** 2026-09-17
**Trạng thái:** Done

**Đã làm:**
- `AppShell` fetch lúc mount: deck `owner_id = user.id` + `vocab_items(count)`; toàn bộ `user_vocab_progress` của user
- Khối số liệu sau `h1`, trước link Decks / Ôn tập: tổng deck, tổng từ, đã/chưa học, đã thuộc/đang học, due hôm nay
- `totalDecks === 0` → gợi ý + link `/decks/new`, không hiện toàn 0
- Không streak / thời gian học tổng; không route mới; không đụng DeckDetailPage / DecksPage / ReviewPage / srs.ts

---

## Trang chi tiết deck owner — `/decks/:id` (2 tab + nút ôn)
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- Route `/decks/:id` → `DeckDetailPage` (sau edit/preview); owner only
- `DecksPage`: click own → `/decks/:id` (không còn thẳng `/review/:id`); non-own vẫn `/preview`
- Tab Từ vựng: bảng FI | Nghĩa | Trạng thái (Chưa học / Đang học / Đã thuộc)
- Tab Tổng kết: tổng từ, đã/chưa học, đã thuộc/đang học, due hôm nay; thời gian học + số ngày ôn là ước lượng
- Nút «Bắt đầu ôn tập» link `/review/:id` (không phải tab nội dung)
- Non-owner gõ URL: thông báo không quyền + link preview; không lộ số liệu
- Không đụng DeckPreviewPage / srs.ts / ReviewPage / EditDeckPage

---

## Session Summary — màn done sau phiên ôn
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- State `completedCards` / `sessionStartTime` / `enrolledCount`; reset lúc `startReview`
- `enrollActivePool` trả thêm `enrolledCount`
- `handleNext` (đúng) đẩy thẻ vào `completedCards` trước khi `slice` queue
- Màn done: thời gian, 3 mức Nhớ dễ/Nhớ/Quên, bảng Từ cần chú ý, dòng từ mới chỉ trên `/review/:deckId`
- Không đụng srs.ts / persist / retry; không trừ idle
- Bỏ `sessionTotal` (done dùng `completedCards.length`; `noUnusedLocals`)

**Verify:** 2026-09-16 — đầy đủ 5/5 case: mixed 3 mức + bảng Từ cần chú ý; elapsed không 0:00; `/review/:deckId` enroll hiện «Có N từ mới…»; all-easy clone 3 từ trên `/review/:deckId` → 3/0/0, không bảng quên; mix (enroll trên deck rồi thoát, ôn mix 3 từ đúng ngay) → không dòng từ mới, 3/0/0.

---

## ReviewPage — check owner lúc mount (UX)
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- `useEffect` theo `scopedDeckId`: non-owner / không tìm thấy → `pageState = 'error'` ngay, không hiện màn setup
- Giữ nguyên guard owner trong `startReview` (lớp 2)
- Mix `/review` không đổi (`!scopedDeckId` return sớm)
- Không đổi kiến trúc; không sửa DECISIONS/REQUIREMENTS

**Phụ thuộc tiếp theo:** Verify non-owner URL vẫn cần account thứ 2 nếu chưa có sẵn

---

## Preview + Clone — không học trực tiếp deck public người khác
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- Xóa guard public→private trong `EditDeckPage` (kèm `originalVisibility` vì `noUnusedLocals`)
- `ReviewPage.startReview`: khi `scopedDeckId`, fetch `owner_id`; non-owner → error, không enroll; mix không đổi
- `DeckPreviewPage` `/decks/:id/preview`: đọc-only; Clone pattern CreateDeckPage; `(Copy)`, private, pool 20; không copy progress
- `DecksPage`: own → `/review/:id`, không phải mình → `/preview`
- Route `/decks/:id/preview`; đóng KI-011 vì đổi kiến trúc
- `npx tsc --noEmit` pass

**Phụ thuộc tiếp theo:** Verify Clone + URL `/review/:id` non-owner cần account thứ 2 (không có trên session hiện tại)

---

## Verify Clone end-to-end — tài khoản B, deck public của A
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- Owner (B) verify tay: bấm Clone trên preview deck public của A → deck mới trên `/decks` của B, tên có hậu tố `(Copy)`, đúng số từ như gốc
- Vào `/review/:id` của deck vừa clone, bấm «Bắt đầu ôn tập» → `enrollActivePool` chạy đúng, enroll từ bình thường, không lỗi

---

## EditDeckPage — sửa metadata deck `/decks/:id/edit`
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- Route `/decks/:id/edit` trong auth gate; nút Sửa cạnh Xóa trên `/decks` (owner)
- `EditDeckPage`: load deck, chặn non-owner / not found; form prefill `name` / `meaning_language` / `description` / `visibility` / `active_pool_size`
- Guard public→private: query progress user khác join `vocab_items`; chặn submit nếu có dòng
- Thành công → `/decks` + `location.state`; Hủy không lưu
- Không sửa `vocab_items`; không đụng CreateDeckPage / ReviewPage / srs.ts
- `npx tsc --noEmit` pass
- Verify: private deck sửa name/language/description/pool → lưu, `/decks` hiện đúng + banner; private→public thành công không chặn; public→private (không có user khác) lưu được, query guard không lỗi
- KI-011: không test được case “user khác đang học” (1 session); RLS own-rows khiến guard không thấy progress người khác

**Phụ thuộc tiếp theo:** RPC `SECURITY DEFINER` nếu muốn enforce guard public→private (KI-011)

---

## Verify Active Pool: apply 008 + 2 case pass
**Ngày:** 2026-09-16
**Trạng thái:** Done

**Đã làm:**
- Owner apply `20260916_008_deck_active_pool_size.sql` trên SQL Editor; Table Editor có `decks.active_pool_size`
- Verify `/review/:deckId`: `active_pool_size = 10`, upload 15 từ → enroll đúng 10, không phải 15
- Verify `/review` mix: không insert `user_vocab_progress` mới
- Đóng KI-009 (2026-09-16)

**Phụ thuộc tiếp theo:** UI sửa `active_pool_size` sau khi tạo (chưa chốt UX)

---

## Active Pool Enrollment — 008 + form + enroll trước due fetch
**Ngày:** 2026-09-16
**Trạng thái:** Done (file sẵn — apply 008 trên Dashboard trước khi verify tay)

**Đã làm:**
- Migration `20260916_008_deck_active_pool_size.sql` + `schema.sql`: `decks.active_pool_size` 10–30 default 20
- CreateDeckPage: field "Số từ học cùng lúc", validate, insert cột mới
- ReviewPage: `enrollActivePool` chỉ khi `/review/:deckId`, trước due fetch; mix không enroll
- Enroll defaults khớp schema: ease 2.5, interval 0, review_count 0, due = todayLocalIsoDate()
- Không đụng srs.ts / retry / UPDATE trả hết nợ
- `npx tsc --noEmit`

**Phụ thuộc tiếp theo:** Apply 008; UI sửa pool size sau khi tạo (chưa chốt)

---

## Chốt Active Pool Enrollment (KI-009) — chưa code
**Ngày:** 2026-09-16
**Trạng thái:** Decision recorded

**Đã làm:**
- DECISIONS.md: enroll khi `/review/:deckId`, `active_pool_size` 10–30 default 20, ngưỡng graduate 30 ngày
- KI-009 hướng fix trỏ sang Active Pool, vẫn Open
- Recon CreateDeckPage / DecksPage / schema — chưa implement

**Phụ thuộc tiếp theo:** Prompt implement 008 + CreateDeckPage field + ReviewPage enroll (không gồm UI sửa pool size)

---

## Upload deck: parser + /decks + /decks/new
**Ngày:** 2026-09-14
**Trạng thái:** Done

**Đã làm:**
- `src/lib/deckParser.ts`: parse `từ;nghĩa`, max 500 dòng, lỗi dòng trống / thiếu `;` / vế rỗng / trùng (case-insensitive)
- `DecksPage`: list own+public, count từ, badge visibility, xóa owner (confirm + CASCADE), click → `/review/:deckId`
- `CreateDeckPage`: form + FileReader + preview + Lưu (disabled nếu lỗi / 0 từ / tên trống); `owner_id` truyền tường minh
- Route `/decks/new` trong auth gate; AppShell đã có link Decks
- KI-009: upload không tạo progress → ôn trống
- KI-010: newline cuối file → dòng trống → chặn Lưu
- `npx tsc --noEmit`

**Phụ thuộc tiếp theo:** Chốt cách đưa từ mới vào hàng đợi SRS (KI-009)

---

## Fix 007: DROP tường minh child→parent (re-run an toàn)
**Ngày:** 2026-09-14
**Trạng thái:** Done (file sẵn — chưa apply lại trên Dashboard)

**Đã làm:**
- Sửa comment 007: DROP TABLE CASCADE không drop bảng FK-con
- DROP tường minh: user_vocab_progress → vocab_items → exercises → units → decks
- CREATE + RLS giữ nguyên

**Phụ thuộc tiếp theo:** Starter apply lại 007 trên Dashboard

---

## Migrate schema unit-based → deck-based (wipe data)
**Ngày:** 2026-09-14
**Trạng thái:** Done (file sẵn — chờ apply migration 007 trên Supabase Dashboard)

**Đã làm:**
- Migration `20260914_007_deck_based_schema.sql`: DROP exercises + units CASCADE, CREATE decks / vocab_items / user_vocab_progress + RLS
- Cập nhật `supabase/schema.sql` (source of truth)
- Types: thêm Deck, VocabItem.deck_id; xóa Unit / Exercise
- Xóa UnitListPage, UnitDetailPage, routes `/units`; placeholder `/decks`; AppShell → `/decks`
- ReviewPage: mix mặc định (`/review`); deck cụ thể (`/review/:deckId`)
- Xóa seed-units.ts + unit1/2 JSON; bỏ script `npm run seed`
- DECISIONS + CONTEXT + KI-002 note; `npx tsc --noEmit`

**Phụ thuộc tiếp theo:** Apply 007 trên Dashboard (wipe), rồi UI decks / upload thật

---

## Archive REQUIREMENTS v1 + viết REQUIREMENTS v2 (deck-based)
**Ngày:** 2026-09-14
**Trạng thái:** Done

**Đã làm:**
- Đổi tên REQUIREMENTS.md → REQUIREMENTS_v1_book_based.md + note archived
- Viết REQUIREMENTS.md mới: deck-based, chỉ Level 1, tái dùng srs.ts

---

## Fix: MCQ fallback khi thiếu từ nhiễu trong ReviewPage
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- ReviewPage: nếu vocab_items khả dụng làm nhiễu < 3, tự động
  fallback về hình thức "Gõ chữ" cho lượt hỏi đó
- npx tsc --noEmit pass

---

## T1.5 — Ôn tập SRS hàng ngày (F-05)
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Tạo src/lib/srs.ts: classifyAttempt + computeNextReview theo
  đúng công thức DECISIONS.md
- Tạo src/pages/ReviewPage.tsx: setup hình thức (multi-select),
  session queue với retry, 2 hình thức hỏi (gõ chữ/MCQ), update
  DB khi từ trả hết nợ
- Thêm route /review, Link từ AppShell
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.6 (F-06: chấm bài tự động MCQ/fill-blank)

---

## T1.5-A — Quyết định thuật toán SRS
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Ghi DECISIONS.md: SM-2 rút gọn 3 mức từ wrong_count trong session
- Không code UI/logic

**Phụ thuộc tiếp theo:** T1.5-B (UI + logic ôn tập)

---

## T1.4 mở rộng — Unmark (bỏ đánh dấu từ)
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Migration 20260908_006: policy DELETE cho
  user_vocab_progress
- UnitDetailPage: nút đánh dấu giờ toggle được — click lại để
  unmark, DELETE row tương ứng
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.5 (F-05: ôn tập SRS hàng ngày)

---

## exercises.correct_answer nullable
**Ngày:** 2026-09-08
**Trạng thái:** File sẵn — chờ chạy incremental trên Supabase Dashboard

**Đã làm:**
- Migration 20260908_005: DROP NOT NULL trên exercises.correct_answer
- schema.sql CREATE TABLE: correct_answer jsonb (không NOT NULL)
- seed-units.ts: bỏ coerce null → {}; insert null nguyên
- DECISIONS.md + REQUIREMENTS.md §4
- Chưa chạy SQL; chưa chạy npm run seed

**Phụ thuộc tiếp theo:** Apply 005 trên Dashboard, rồi `npm run seed`

---

## Seed script Unit 1 + Unit 2
**Ngày:** 2026-09-08
**Trạng thái:** Script sẵn — chưa chạy (chủ dự án tự `npm run seed`)

**Đã làm:**
- Cài tsx + dotenv (devDependencies)
- Tạo scripts/seed-units.ts: service role client, insert unit →
  vocab_items → exercises; JSON notes → authoring_notes
- unique book_code+unit_number: reuse id, không insert unit trùng
- null correct_answer → {} (cột NOT NULL)
- Thêm `"seed": "tsx scripts/seed-units.ts"` vào package.json
- Không đụng src/; không chạy seed

**Phụ thuộc tiếp theo:** Chủ dự án chạy `npm run seed`, kiểm tra Table Editor

---

## DDL exercises.source_harjoitus + authoring_notes
**Ngày:** 2026-09-08
**Trạng thái:** File sẵn — chờ chạy incremental trên Supabase Dashboard

**Đã làm:**
- Tạo supabase/migrations/20260908_004_exercises_add_source_notes.sql
- Append ALTER TABLE vào cuối schema.sql
- DECISIONS.md + REQUIREMENTS.md §4 (cột mới, không hiện UI học viên)
- Chưa chạy SQL trên project thật; chưa đụng TypeScript / seed

**Phụ thuộc tiếp theo:** Apply 004 trên Dashboard, rồi seed Unit 1 + Unit 2

---

## T1.4 — Đánh dấu từ chưa biết (F-04)
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Migration 20260908_003: user_vocab_progress + RLS (select/insert/
  update own rows)
- Thêm UserVocabProgress type vào database.ts
- UnitDetailPage: fetch progress hiện có, nút đánh dấu từng vocab item,
  insert với xử lý unique constraint conflict, loading state per-item
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.5 (F-05: ôn tập SRS hàng ngày)

---

## T1.4-A — DDL user_vocab_progress + RLS
**Ngày:** 2026-09-08
**Trạng thái:** File sẵn — chờ chạy incremental trên Supabase Dashboard

**Đã làm:**
- Tạo supabase/migrations/20260908_003_user_vocab_progress.sql
- Append bảng + 3 policy (select/insert/update own rows) vào schema.sql
- Không thêm created_at (ngoài spec REQUIREMENTS)
- Chưa chạy SQL trên project thật

**Phụ thuộc tiếp theo:** Xác nhận Table Editor + 3 policy, rồi T1.4-B (UI đánh dấu từ)

---

## T1.3 — Học 1 unit (F-03)
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Thêm VocabItem, Exercise interfaces vào src/types/database.ts
- Tạo src/pages/UnitDetailPage.tsx: Promise.all fetch unit +
  vocab_items + exercises, loading/error/empty state, link back
- Thêm Link to /units/:id trong UnitListPage
- Thêm route /units/:id vào App.tsx
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.4 (F-04: đánh dấu từ chưa biết)

---

## Reorganize supabase/ — migration convention
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Tạo supabase/schema.sql (full DDL, source of truth)
- Tạo supabase/migrations/20260908_001_units.sql
- Tạo supabase/migrations/20260908_002_vocab_exercises.sql
- Xóa supabase/migrations/schema.sql (file cũ)
- Cập nhật CONTEXT.md §2, DECISIONS.md

---

## T1.3-A — DDL vocab_items + exercises + RLS
**Ngày:** 2026-09-08
**Trạng thái:** File sẵn — chờ chạy incremental trên Supabase Dashboard

**Đã làm:**
- Append `vocab_items` + `exercises` vào `schema.sql` (giữ nguyên `units`)
- RLS SELECT `authenticated` cả 2 bảng; ghi chỉ service role
- Chưa chạy SQL trên project thật (chủ dự án chỉ dán block T1.3-A)

**Phụ thuộc tiếp theo:** Xác nhận Table Editor + policy, rồi T1.3-B (UI học unit)

---

## T1.2 — Danh sách unit (F-02)
**Ngày:** 2026-09-08
**Trạng thái:** Done

**Đã làm:**
- Chạy migration T1.2-A: tạo bảng units + RLS SELECT authenticated trên Supabase dashboard
- Tạo src/types/database.ts: interface Unit
- Tạo src/pages/UnitListPage.tsx: fetch + loading/error/empty state
- Thêm route /units vào App.tsx
- Thêm Link /units vào AppShell.tsx
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.3 (F-03: học 1 unit)

---

## T1.2-A — DDL bảng units + RLS
**Ngày:** 2026-09-08
**Trạng thái:** File sẵn — chờ chạy trên Supabase Dashboard

**Đã làm:**
- Thay placeholder `supabase/migrations/schema.sql` bằng DDL `units` + unique `(book_code, unit_number)` + RLS SELECT `authenticated`
- Chưa chạy SQL trên project thật (chủ dự án chạy trong SQL Editor)

**Phụ thuộc tiếp theo:** Xác nhận Table Editor + policy, rồi T1.2-B (UI danh sách unit)

---

## T1.1 — Đăng nhập (F-01)
**Ngày:** 2026-09-07
**Trạng thái:** Done

**Đã làm:**
- Cài react-router-dom ^7.18.3 (bundle types, không cần @types/react-router-dom)
- Tạo src/pages/LoginPage.tsx: form email/password, supabase.auth.signInWithPassword, loading + error state
- Tạo src/pages/AppShell.tsx: placeholder với logout
- Sửa src/App.tsx: BrowserRouter + onAuthStateChange session tracking, redirect logic, loading state
- npx tsc --noEmit pass

**Phụ thuộc tiếp theo:** T1.2 (F-02: danh sách unit)

---

## T1.0 — Scaffold Vite + React + TypeScript + Supabase client
**Ngày:** 2026-09-07
**Trạng thái:** Done

**Đã làm:**
- Khởi tạo Vite + React + TypeScript project vào root (scaffold vào thư mục tạm rồi copy để giữ docs/, .cursorrules, README.md)
- Cài @supabase/supabase-js ^2.116.0
- Tạo src/lib/supabase.ts: Supabase client với requireEnv guard (throw rõ tên biến thiếu)
- Tạo .env.example (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Bổ sung .env vào .gitignore (Vite template mặc định chỉ ignore *.local)
- Tạo supabase/migrations/schema.sql placeholder
- npm run dev pass (Vite 8.2.2, React 19.2.8)
- npx tsc --noEmit pass (TypeScript 6.0.2)

**Phụ thuộc tiếp theo:** T1.1 (F-01: đăng nhập)

---

## [2026-09-07] — chore(scaffold): T1.0-B env + Supabase client

- `.gitignore`: thêm `.env` (trước chỉ có `*.local`)
- `.env.example`: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (không tạo `.env`)
- `src/lib/supabase.ts`: named export `supabase`; throw nếu thiếu biến — chưa wire UI
- `npx tsc --noEmit` pass
- T1.0 còn lại: `supabase/migrations/schema.sql`

---

## [2026-09-07] — chore(scaffold): T1.0-A Vite + React + TS

- `npm create vite@latest` template `react-ts` (copy vào root, giữ docs/ `.cursorrules` README.md `.git/`)
- `npm install` + `@supabase/supabase-js` (chưa wire client)
- `npm run dev` → VITE 8.2.2 ready http://localhost:5173/ rồi dừng
- `npx tsc --noEmit` pass
- package.json name `muisti` (tránh `vite-tmp` từ folder tạm)
- T1.0 còn lại: env, supabase client, schema.sql placeholder

---

## [2026-09-07] — docs(plan): đồng bộ PLAN_1.md §2 + §4 với thực tế extract

- §2: phụ thuộc full-extract PDF unit 1 **và** unit 2 trước mọi task §3 (kể cả T1.0)
- §4: bỏ số “17 type” — trỏ core set đã chốt trong REQUIREMENTS.md (không phải quyết định mới)

---

## [2026-09-07] — docs: mở rộng exercises.type +2 (dialogue, reading_passage)

- REQUIREMENTS.md: core set 17 → 19; ghi chú lines/speaker trong `correct_answer`
- DECISIONS.md: prepend entry (lưu nguyên văn bài khoá; hồi tố Unit 1, áp Unit 2)
- Chốt trong chat Claude lúc full-extract Unit 2 — ghi docs trước khi JSON Unit 1/2 áp dụng
- Chưa có migration/data thật trên Supabase

---

## [2026-09-03] — docs: đồng bộ README / .cursorrules / entry bản quyền theo SM2

- README.md dòng 3: điểm bắt đầu SM2, SM1 để tương lai
- `.cursorrules` dòng 16: cùng ý
- DECISIONS.md entry bản quyền (2026-09-01): bổ sung SM2 (+ SM1 nếu mở rộng) vào bullet lý do — không tạo entry mới

---

## [2026-09-02] — docs(decisions): bổ sung 2 entry còn thiếu (SM2 + book_code)

- Quyết định đã chốt trong chat Claude trước đó nhưng chưa được ghi vào DECISIONS.md
- Entry A: điểm bắt đầu Suomen Mestari 2 (SM1 retro-fit sau, không loại khỏi scope)
- Entry B: `units.book_code` + `unit_number` độc lập theo cuốn, unique composite
- REQUIREMENTS.md không đổi (đã khớp)

---

## [2026-09-02] — docs(req): đồng bộ REQUIREMENTS.md với SM2 / book_code (bug đồng bộ)

- §1: điểm bắt đầu là Suomen Mestari 2 (SM1 để tương lai) — schema cũ còn ghi SM1
- Bảng `units`: `number` → `unit_number`; thêm `book_code`; unique composite (`book_code`, `unit_number`)
- Không phải quyết định mới — REQUIREMENTS.md chưa được cập nhật khi đã chốt SM2 + đánh số độc lập theo cuốn
- Chưa có migration/data thật trên Supabase

---

## [2026-09-02] — docs(plan): full-extract Unit 1 xong mới được code (kể cả scaffold)

- Cập nhật PLAN_1.md §2: bỏ ngoại lệ “không chặn scaffold / F-01”
- Full-extract nội dung Unit 1 thật (đã soát) phải xong trước mọi task §3, kể cả T1.0

---

## [2026-09-02] — docs(plan): sửa lại bullet PLAN_1.md §4 cho khớp out of scope

- Lần sửa trước lạc ý (đọc như tham chiếu enum). Đổi thành: không tự ý thêm type ngoài core set 17 — chỉ mở rộng khi full-extract unit thật cần thiết

---

## [2026-09-02] — docs(plan): đồng bộ PLAN_1.md §4 với enum exercises.type

- Sửa câu out-of-scope cũ (“Matching và các loại… sau recon sách thật”) — trỏ về `docs/project/REQUIREMENTS.md` (core set 17 type, có thể mở rộng khi full-extract)

---

## [2026-09-02] — docs(schema): chốt exercises.type core set + scene_description

- Thay placeholder `mcq | fill_blank | matching | …` bằng enum 17 type (scan cấu trúc SM2 Kappale 1–3)
- Thêm cột `exercises.scene_description` (text, nullable) cho bài phụ thuộc tranh; tách khỏi `prompt`
- Negative scope: bài nghe, web ngoài, xúc xắc/bàn cờ, dữ liệu địa phương cá nhân, crossword → fill_blank list
- DECISIONS: entry mới (core set mở rộng dần; không tái tạo hình sách)
- Chỉ docs — chưa có migration/data thật trên Supabase

---

## [2026-09-01] — chore(docs): dựng hệ thống tài liệu chuẩn

- Chuyển 4 file gốc vào cấu trúc docs/ mới
- Thêm CURRENT.md, WORKFLOW.md, PATTERNS.md, BLOCKERS.md, KNOWN_ISSUES.md, RUNBOOK.md, USER_GUIDE.md
- Liên quan: setup ban đầu
