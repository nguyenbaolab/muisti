# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **CSS:** Tailwind CSS v4 (`@tailwindcss/vite` + `@import "tailwindcss"` trong `index.css`). Token järvi trong `@theme`; dark mode class `.dark` trên `<html>` (`@custom-variant`). Không còn alias CSS cũ (`--text` / `--border`…). Trang session dùng token + `Button` / `Input` / `Select` / `Textarea` / `RadioGroup` / `FileField` / `DeckForm` / `Tabs` / `DeckHeader` / `VocabTable` / `FocusLayout`. Review Đợt A + Đợt B đã järvi
- **Data / Auth:** Supabase (Postgres + Auth), client gọi `supabase-js`, bảo vệ bằng RLS
- **Auth model:** admin invite (`inviteUserByEmail`); không form đăng ký công khai
- **Deploy:** Cloudflare Workers Static Assets qua Git integration (nhánh `main`, Worker `name` = `muisti`). SPA: `wrangler.jsonc` `assets.not_found_handling = "single-page-application"`, `directory` = `./dist`. Không `public/_redirects` (rule `/* /index.html 200` lỗi 100324 trên Workers). `public/_headers` (bảo mật + cache immutable `/assets/*`). `.node-version` = 22. Không thêm wrangler vào `package.json`. Env **Build** variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (không đặt `SUPABASE_SERVICE_ROLE_KEY`)
- **AI content:** app v0.1 không gọi LLM lúc runtime; nội dung deck do user upload
- **Phân công:** Claude thiết kế + prompt; Cursor thực thi code/data; chủ dự án test và quyết định cuối

---

## §2 Module map

```
src/
  main.tsx              # entry point
  App.tsx               # BrowserRouter + session gate (onAuthStateChange); nested AppLayout
  index.css             # Tailwind + token järvi; không alias cũ; #root không chrome Vite
  components/
    AppLayout.tsx       # header (wordmark + Decks/Ôn tập + title hover + ThemeToggle + Đăng xuất) + Outlet
    Button.tsx          # variant primary/secondary/danger; prop loading; export class primary/secondary
    Input.tsx           # forwardRef; optional label/error; w-full
    Select.tsx          # forwardRef; label/error; option children; mũi tên native
    Textarea.tsx        # forwardRef; label/error; resize-y; rows mặc định 3
    RadioGroup.tsx      # fieldset/legend; options value/label/description
    FileField.tsx       # input file ẩn + nút Chọn/Đổi file; hint/error
    DeckForm.tsx        # 5 trường metadata Create/Edit; hint pool đúng cơ chế; `showEditPoolHint` chỉ Edit
    linkClasses.ts      # backLinkClassName (không mb-4) + backLinkBlockClassName
    ThemeToggle.tsx     # AppLayout + FocusLayout (Review); mount không ghi storage
    FocusLayout.tsx     # <main> max-w-xl + thanh ← Trang chủ / ThemeToggle; ngoài AppLayout
    Tabs.tsx            # tablist ARIA + roving tabindex; TabPanel
    DeckHeader.tsx      # h1 + mô tả + meta Nghĩa/visibility/số từ/sharer + actions
    VocabTable.tsx      # bảng từ; cột trạng thái optional; empty copy; caption sr-only
  lib/
    supabase.ts         # Supabase client (createClient, requireEnv guard)
    srs.ts              # classifyAttempt + computeNextReview (SM-2 rút gọn)
    deckParser.ts       # parseDeckFile — split `;`, trim, cắt dòng trống cuối, max 500 sau cắt
    deckLabels.ts       # languageLabel / visibilityLabel / sharerNameFromEmail
    useTheme.ts         # override | system; chỉ ghi localStorage khi toggle (KI-012 Closed)
  pages/
    LoginPage.tsx       # järvi; signInWithPassword; lỗi Việt hóa; ngoài AppLayout
    HomePage.tsx        # `/` — Tổng kết Tổng; hero due + Ôn tập + dòng mix vs deck; empty tạo deck
    DecksPage.tsx       # /decks järvi; dòng nhịp học; Tabs Cá nhân/Public; Public có dòng clone; hàng hairline; own → /:id; khác → /preview
    CreateDeckPage.tsx  # /decks/new järvi; DeckForm + FileField + Xem trước; Lưu deck
    EditDeckPage.tsx    # /decks/:id/edit järvi; DeckForm; owner; Lưu/Hủy
    DeckPreviewPage.tsx # /decks/:id/preview järvi; đọc-only + Clone; dòng clone không copy tiến độ nếu !owned
    DeckDetailPage.tsx  # /decks/:id järvi; owner: dòng Bắt đầu ôn tập; Tabs Từ vựng (chú giải trạng thái)/Tổng kết (Đã học/quá hạn); ôn + Sửa; VocabTable
    ReviewPage.tsx      # ôn SRS; ngoài AppLayout; FocusLayout; setup mô tả mix vs deck + phím sm+; empty/error/done Đợt A; reviewing Đợt B; done + dòng đến hạn lại
  types/
    database.ts         # Deck, VocabItem, UserVocabProgress, ReviewQueueItem, Profile
public/                 # Vite copy nguyên vào dist/
  _headers              # nosniff / referrer / DENY / Permissions-Policy; /assets/* immutable
  favicon.svg
  icons.svg
wrangler.jsonc          # Worker muisti; assets.directory ./dist; SPA not_found_handling
.node-version           # 22 — Cloudflare Builds đọc file này
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
.env.example            # VITE_* (nhúng bundle / đặt Build variables trên Worker); SUPABASE_SERVICE_ROLE_KEY local-only, không đặt trên Cloudflare
```

---

## §3 Navigation skeleton

- `/login` — `LoginPage` järvi khi chưa có session; đã login thì redirect `/`
- `/` — `HomePage` trong `AppLayout` khi có session (Tổng kết Tổng); chưa login thì redirect `/login`
- `/decks` — `DecksPage` trong `AppLayout` khi có session (tab Cá nhân / Public, default Cá nhân); guest → `/login`
- `/decks/new` — `CreateDeckPage` khi có session; guest → `/login`
- `/decks/:id/edit` — `EditDeckPage` khi có session; guest → `/login`; chỉ owner thấy form
- `/decks/:id/preview` — `DeckPreviewPage` khi có session; guest → `/login`; public hoặc own; Clone nếu không phải owner
- `/decks/:id` — `DeckDetailPage` khi có session; guest → `/login`; chỉ owner (non-owner: thông báo + link preview, không redirect)
- `/review` — `ReviewPage` mix; **ngoài** `AppLayout`; tự khung `FocusLayout` (← Trang chủ + ThemeToggle, `max-w-xl`); guest → `/login`
- `/review/:deckId` — `ReviewPage` chỉ owner: check `owner_id` rồi enroll Active Pool rồi ôn due; **ngoài** `AppLayout`, cùng `FocusLayout`; non-owner bị chặn (nhắn sang preview)
- Layout session: `AppLayout` bọc `/`, `/decks`, `/decks/new`, `/decks/:id`, `/decks/:id/edit`, `/decks/:id/preview`. Header: Muisti → `/`, Decks (`title` xem/học deck), Ôn tập → `/review` (`title` ôn due mọi deck), `ThemeToggle`, Đăng xuất (`signOut`). Không hiện email.
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
- Parse deck file: `parseDeckFile(content)` — `src/lib/deckParser.ts` (cắt dòng trống cuối; cap 500 sau cắt; dòng trống giữa file vẫn lỗi)
- List decks: `decks.select('*, vocab_items(count)')` — RLS lọc own + public — `DecksPage`; filter client `activeTab` `'mine' | 'public'`; click own → `/decks/:id`, click không phải mình → `/decks/:id/preview`. UI järvi: `Tabs` (`idPrefix="decks"`, aria-label «Loại deck») + `TabPanel`; hàng đầu `h1` + `<Link>` «Tạo deck mới» + dòng nhịp học; tab Public dòng clone (không lúc loading); hàng deck hairline; nhãn từ `src/lib/deckLabels.ts` (DecksPage tự thêm «Nghĩa: » khi render). Sửa `<Link>` `/edit`; Xóa `window.confirm` cũ. Lỗi `profiles` → `console.error`.
- Owner email (tên chia sẻ): query 2 — `profiles.select('id, email').in('id', ownerIds)` trên `DecksPage`; `profiles.select('email').eq('id', owner_id)` trên `DeckPreviewPage` nếu `!owned`. Không embed từ `decks`. `sharerNameFromEmail` trong `deckLabels.ts`. Preview lỗi profiles → `console.error`, fallback «Ẩn danh».
- Account summary: `decks.select('id, vocab_items(count)').eq('owner_id', user.id)` + `user_vocab_progress.select('interval_days, due_date').eq('user_id')` — `HomePage` `/`; `todayLocalIsoDate()`; không join vocab cho progress. Hero due + nút Ôn tập + dòng «Ôn những từ đến hạn của mọi deck…»
- Deck detail (owner): `decks.select('*')` rồi `vocab_items.select(...).eq('deck_id').order('created_at')` + `user_vocab_progress` join `vocab_items!inner` — `DeckDetailPage`; UI `DeckHeader` + dòng Bắt đầu ôn tập + `Tabs` («Nội dung deck») + chú giải trạng thái / lưới Tổng kết + dòng Đã học/quá hạn; actions Link ôn + Link Sửa `/edit`. Non-owner: `forbidden`, không bảng. Ngày «hôm nay» = `todayLocalIsoDate()`
- Create deck: `decks.insert({ owner_id, name, meaning_language, description, visibility, active_pool_size }).select('id').single()` rồi `vocab_items.insert([...])` — `CreateDeckPage` (`DeckForm` + `FileField` + Xem trước; rollback nếu vocab lỗi; lỗi insert UI cố định + `console.error`). `canSave` không đổi (mọi lỗi parse kể cả dòng trống khóa Lưu).
- Update deck metadata: `decks.update({ name, meaning_language, description, visibility, active_pool_size }).eq('id')` — `EditDeckPage` (`DeckForm`; không còn guard public→private; lỗi lưu UI cố định + `console.error`)
- Preview deck: `decks.select('*, vocab_items(id, finnish_word, translation, created_at)').eq('id').single()` rồi sort client `created_at` tăng dần — `DeckPreviewPage`; UI `DeckHeader` + `VocabTable`; Clone `Button loading`; owner thấy visibility + Link ôn + «Đây là deck của bạn.»; `!owned` `sharedBy` không visibility + dòng Clone không copy tiến độ
- Clone deck: insert deck mới (`name` + ` (Copy)`, `visibility: 'private'`, `active_pool_size: 20`) rồi bulk insert vocab; rollback delete deck nếu vocab lỗi; không copy progress — `DeckPreviewPage`. Verified 2026-09-16 (tài khoản B, deck public của A): Clone + enroll Active Pool trên bản copy.
- Delete deck: `decks.delete().eq('id')` — CASCADE vocab + progress — `DecksPage`
- Active pool enroll (chỉ `/review/:deckId` **và** owner): `enrollActivePool` trả `{ fatalError, enrolledCount }`; `startReview` lưu `enrolledCount`. Mix `/review` không enroll.
- Session Summary: `completedCards` tích khi trả hết nợ; màn `done` đếm wrongCount 0/1/≥2, thời gian từ `sessionStartTime`, bảng từ quên; dòng từ mới chỉ khi `scopedDeckId && enrolledCount > 0`.
- Review keyboard (`pageState === 'reviewing'` only): document `keydown` — Enter + `feedback` → `handleNext`; MCQ A–D → `submitMcqChoice(chosen)` (không đọc `selectedOption` vì stale). `handleSubmit` chuột/form không đổi.
- Theme: `useTheme` — override từ `localStorage['muisti-theme']` (`light`|`dark` only) hoặc theo OS sống (`matchMedia` change). Chỉ `setItem` trong `toggleTheme`. Script FOUC `index.html` cùng quy tắc. `ThemeToggle` trong `AppLayout` và `FocusLayout` (Review). Mount hook không ghi storage. Login không mount hook (class lúc load). KI-012 Closed.
- Review UI Đợt A: một `<main>` qua `FocusLayout`; setup hiện tên deck (cùng query `checkOwner` `owner_id, name`) + dòng mix vs deck (không số due); `ownerChecked` chỉ lớp hiển thị; gợi ý phím setup `hidden sm:block`; loading/empty/error/done järvi; done thêm dòng đến hạn lại; `startReview` lỗi fetch → copy cố định + `console.error`.
- Review UI Đợt B (màn `reviewing`): h1 sr-only; tiến độ derived `completedCards.length` / (`completedCards.length + queue.length`); khối Nghĩa lớn; Typing qua `Input` (`ref` → `<input>` thật, `!text-base`); MCQ tự dựng (không `RadioGroup`), fieldset disabled, A–D theo `mcqOptions.map` index; persist error chỉ hiện khi `!feedback`; feedback `role="status"` `aria-live="polite"`; gợi ý phím `hidden sm:block` `aria-hidden`. `persistCard` lỗi → copy cố định + `console.error`.
- SRS queue mix: `user_vocab_progress.select('..., vocab_items(*)').eq('user_id').lte('due_date', todayLocalIsoDate())` — không join `decks` — `ReviewPage` `/review`
- SRS queue 1 deck: cùng query + `vocab_items!inner(*)` + `.eq('vocab_items.deck_id', deckId)` — `ReviewPage` `/review/:deckId`
- SRS update: khi từ trả hết nợ (đúng lần cuối), `computeNextReview` rồi `update` ease/interval/due_date/review_count/last_reviewed_at. Sai chỉ đẩy lại cuối queue, không ghi DB. — `src/lib/srs.ts` + `ReviewPage`
