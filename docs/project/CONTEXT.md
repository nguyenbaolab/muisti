# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **CSS:** Tailwind CSS v4 (`@tailwindcss/vite` + `@import "tailwindcss"` trong `index.css`). Token järvi trong `@theme`; dark mode class `.dark` trên `<html>` (`@custom-variant`). Không còn alias CSS cũ (`--text` / `--border`…). Trang session dùng token + `Button` / `Input` / `Select` / `Textarea` / `RadioGroup` / `FileField` / `DeckForm` / `Tabs` / `DeckHeader` / `VocabTable`. Review / Practice / FilePractice trong `AppLayout` (form `max-w-xl`). Review Đợt A + Đợt B đã järvi
- **Data / Auth:** Supabase (Postgres + Auth), client gọi `supabase-js`, bảo vệ bằng RLS
- **Auth model:** admin invite (`inviteUserByEmail`); không form đăng ký công khai
- **Deploy:** Cloudflare Workers Static Assets qua Git integration (nhánh `main`, Worker `name` = `muisti`). SPA: `wrangler.jsonc` `assets.directory` = `./dist`, `binding` = `ASSETS`, `not_found_handling` = `single-page-application`, `run_worker_first` = `["/api/*"]`, `main` = `worker/index.ts`. Không `public/_redirects`. `public/_headers`. `.node-version` = 22. Wrangler không trong `package.json` scripts (Cloudflare chạy lúc deploy). Env **Build** (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Env **Worker runtime**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, secrets `SUPABASE_SERVICE_ROLE_KEY` + `ANTHROPIC_API_KEY` (wrangler secret put — không Build vars).
- **AI content:** Task 5 bước 4 — UI `/practice/:deckId` gọi `POST /api/generate-exercise`. Admin `/admin` + Worker + schema bước 1 đã có.
- **Phân công:** Claude thiết kế + prompt; Cursor thực thi code/data; chủ dự án test và quyết định cuối

---

## §2 Module map

```
src/
  main.tsx              # entry point
  App.tsx               # BrowserRouter + session gate (onAuthStateChange); nested AppLayout
  index.css             # Tailwind + token järvi; không alias cũ; #root không chrome Vite
  components/
    AppLayout.tsx       # header (wordmark + Decks/Ôn tập + Admin nếu is_admin + ThemeToggle + Đăng xuất) + Outlet
    AdminRoute.tsx      # gate nested: getUser → profiles.is_admin; loading / Navigate `/` / Outlet
    Button.tsx          # variant primary/secondary/danger/success; prop loading; export class primary/secondary/success
    Input.tsx           # forwardRef; optional label/error; w-full
    Select.tsx          # forwardRef; label/error; option children; mũi tên native
    Textarea.tsx        # forwardRef; label/error; resize-y; rows mặc định 3
    RadioGroup.tsx      # fieldset/legend; options value/label/description
    FileField.tsx       # input file ẩn + nút Chọn/Đổi file; hint/error
    DeckForm.tsx        # 5 trường metadata Create/Edit; hint pool đúng cơ chế; `showEditPoolHint` chỉ Edit
    linkClasses.ts      # backLinkClassName (không mb-4) + backLinkBlockClassName
    ThemeToggle.tsx     # AppLayout; mount không ghi storage
    FocusLayout.tsx     # hiện mồ côi (không page import); `<main> max-w-xl` + ← Trang chủ / ThemeToggle — giữ file
    Tabs.tsx            # tablist ARIA + roving tabindex; TabPanel
    DeckHeader.tsx      # h1 + mô tả + meta Nghĩa/visibility/số từ/sharer + actions
    VocabTable.tsx      # bảng từ; cột trạng thái optional; empty copy; caption sr-only
  lib/
    supabase.ts         # Supabase client (createClient, requireEnv guard)
    srs.ts              # classifyAttempt + computeNextReview (SM-2 rút gọn)
    session.ts          # thuần: SessionCard, applyWrong (debt 3/2/1), advanceSession (reinsert gap N / tốt nghiệp); không Supabase/React
    practiceSession.ts  # thuần: PracticeCard, gradePracticeCard (debt 3/2/1 + pendingTypes fill_blank), advancePracticeSession (gap = computeReinsertGap); không Supabase/React
    sessionLimits.ts    # DECK_SESSION_LIMIT (20) deck due/phiên; MIX_SESSION_LIMIT (30) mix due/phiên; PRACTICE_SESSION_LIMIT (20) Level 2 /practice; extra giữ .limit(20) inline
    deckParser.ts       # parseDeckFile — split `;`, trim, cắt dòng trống cuối, max 500 sau cắt
    deckLabels.ts       # languageLabel / visibilityLabel / sharerNameFromEmail
    useTheme.ts         # override | system; chỉ ghi localStorage khi toggle (KI-012 Closed)
    generateExercise.ts # SPA → POST /api/generate-exercise (Bearer access_token); exclude_ids tùy chọn (tối đa 50); parse content; map lỗi Worker
  pages/
    LoginPage.tsx       # järvi; signInWithPassword; lỗi Việt hóa; ngoài AppLayout
    HomePage.tsx        # `/` — Việc hôm nay (todo deck sở hữu) + lưới 6 số; empty tạo deck; không nút Ôn tập
    AdminPage.tsx       # `/admin` — list profiles; quota + is_admin chỉ super admin sửa; admin thường read-only; khóa is_admin dòng mình
    PracticePage.tsx    # `/practice/:deckId` Level 2; AppLayout + max-w-xl; owner; interval>=3 ưu tiên times_shown thấp; nợ 3/2/1 qua practiceSession; không ghi SRS
    DecksPage.tsx       # /decks järvi; nút success «Luyện file tự do» + nút primary «Tạo deck mới» header; Tabs Cá nhân/Public; `?tab=public` chỉ set tab ban đầu; Public có dòng clone; hàng hairline; own → /:id; khác → /preview
    CreateDeckPage.tsx  # /decks/new järvi; DeckForm + FileField + Xem trước; Lưu deck
    EditDeckPage.tsx    # /decks/:id/edit järvi; DeckForm; owner; Lưu/Hủy
    DeckPreviewPage.tsx # /decks/:id/preview järvi; đọc-only + Clone; dòng clone không copy tiến độ nếu !owned
    DeckDetailPage.tsx  # /decks/:id järvi; owner: ôn + Luyện tập + Ôn thêm + Sửa + «Học lại từ đầu» khi isGraduated; Tabs Từ vựng/Tổng kết; VocabTable
    ReviewPage.tsx      # ôn SRS + extraMode; AppLayout + max-w-xl; MCQ hai chiều (askMode+mcqDirection); HUD; queue debt/reinsert qua lib/session; wrongCount đóng băng sau persist 1 lần; done + Ôn tiếp khi còn due
    FilePracticePage.tsx # `/practice-file` — luyện file tạm; AppLayout + max-w-xl; parseDeckFile + session.ts; MCQ hai chiều + HUD; không Supabase/SRS
  types/
    database.ts         # Deck, VocabItem, UserVocabProgress, ReviewQueueItem, Profile (+is_admin/quota), GeneratedExercise (content typed), ExerciseQuotaUsage, FillBlankContent/McqContent
public/                 # Vite copy nguyên vào dist/
  _headers              # nosniff / referrer / DENY / Permissions-Policy; /assets/* immutable
  favicon.svg
  icons.svg
wrangler.jsonc          # main worker/index.ts; assets ./dist + binding ASSETS; run_worker_first /api/*
worker/
  index.ts              # POST /api/generate-exercise (Claude + pool + quota)
tsconfig.worker.json    # include worker/; types @cloudflare/workers-types
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
    20260916_009_profiles.sql               # profiles + trigger auth.users (applied)
    20260926_010_exercise_generation.sql    # Task 5 bước 1: is_admin/quota + exercise tables (applied)
    20260928_011_rls_and_super_admin.sql    # siết RLS profiles SELECT + is_super_admin + index generated_exercises (applied)

schema.sql v0.4.0 (2026-09-28): profiles (+ is_admin, is_super_admin, daily_exercise_quota), decks, vocab_items, user_vocab_progress, exercise_quota_usage, generated_exercises; `public.is_admin()` + `public.is_super_admin()` SECURITY DEFINER; RLS profiles SELECT siết (own/admin/public-deck-owner), UPDATE chỉ super admin; index generated_exercises (vocab_item_id, exercise_type, times_shown).
.env.example            # VITE_* Build; SUPABASE_URL/ANON_KEY + SERVICE_ROLE + ANTHROPIC Worker runtime
```

---

## §3 Navigation skeleton

- `/login` — `LoginPage` järvi khi chưa có session; đã login thì redirect `/`
- `/` — `HomePage` trong `AppLayout` khi có session (Việc hôm nay + lưới 6 số); chưa login thì redirect `/login`
- `/decks` — `DecksPage` trong `AppLayout` khi có session (tab Cá nhân / Public; `?tab=public` mở Public lần đầu, mọi giá trị khác / không có param mở Cá nhân; tab local, không sync URL); guest → `/login`
- `/decks/new` — `CreateDeckPage` khi có session; guest → `/login`
- `/decks/:id/edit` — `EditDeckPage` khi có session; guest → `/login`; chỉ owner thấy form
- `/decks/:id/preview` — `DeckPreviewPage` khi có session; guest → `/login`; public hoặc own; Clone nếu không phải owner
- `/decks/:id` — `DeckDetailPage` khi có session; guest → `/login`; chỉ owner (non-owner: thông báo + link preview, không redirect)
- `/admin` — `AdminPage` trong `AppLayout` + `AdminRoute` (profiles.is_admin); non-admin / lỗi → `/`; guest → `/login`
- `/review` — `ReviewPage` mix; trong `AppLayout` (form `max-w-xl`); guest → `/login`
- `/review/:deckId` — `ReviewPage` chỉ owner: check `owner_id` rồi enroll Active Pool rồi ôn due; trong `AppLayout`; non-owner bị chặn (nhắn sang preview)
- `/review/:deckId/extra` — cùng `ReviewPage`, `extraMode` (`useMatch`); owner check + scope deck như `/review/:deckId`; **không** enroll; fetch từ đang học chưa đến hạn; **không** ghi progress; trong `AppLayout`
- `/practice/:deckId` — `PracticePage` Level 2; trong `AppLayout` (form `max-w-xl`); chỉ owner; lọc `interval_days >= 3`, ưu tiên tổng `times_shown` thấp, cap `PRACTICE_SESSION_LIMIT` (20); nợ 3/2/1 + loại câu qua `practiceSession.ts`; gọi Worker; **không** ghi SRS
- `/practice-file` — `FilePracticePage`; trong `AppLayout` (form `max-w-xl`); upload file + session `lib/session` + `parseDeckFile`; **không** Supabase/SRS; vào từ Decks (nút success)
- Layout session: `AppLayout` bọc `/`, `/decks*`, `/admin` (qua `AdminRoute`), `/review`, `/review/:deckId`, `/review/:deckId/extra`, `/practice/:deckId`, `/practice-file`. Header: Muisti → `/`, Decks, Ôn tập → `/review`, link **Admin** → `/admin` chỉ khi `profiles.is_admin` (fetch 1 lần lúc mount AppLayout), `ThemeToggle`, Đăng xuất. Không hiện email.
- Session: `getSession` + `onAuthStateChange` trong `App.tsx`; lần đầu hiện `Loading...`
- Chi tiết UI nghiệp vụ ở `REQUIREMENTS.md`.

---

## §4 Data flow patterns

Xem `docs/project/PATTERNS.md` (pattern lặp lại) và `docs/project/DECISIONS.md` (deck ownership, RLS, SRS). Không lặp lại ở đây.

Hướng đã chốt (2026-09-14, cột pool 2026-09-16, profiles 2026-09-17):

- `decks`: SELECT nếu `visibility = 'public'` hoặc `owner_id = auth.uid()`; INSERT/UPDATE/DELETE chỉ owner. Cột `active_pool_size` integer 10–30, default 20.
- `vocab_items`: SELECT theo quyền SELECT của deck cha; INSERT/UPDATE/DELETE chỉ owner deck (client upload được)
- `user_vocab_progress`: RLS own-rows `user_id = auth.uid()` — không đổi cấu trúc cột
- `profiles`: `id` = `auth.users.id`, `email`, `is_admin` (default false), `is_super_admin` (default false), `daily_exercise_quota` (default 10); SELECT siết — own row HOẶC `public.is_admin()` HOẶC owner của deck `visibility = 'public'`; UPDATE chỉ super admin qua `public.is_super_admin()` (cùng SECURITY DEFINER với `is_admin()` — tránh recursion RLS, 011). Trigger `on_auth_user_created` INSERT khi có user mới. **009 / 010 / 011 đã apply (owner, SQL Editor).**
- `exercise_quota_usage`: PK `(user_id, usage_date)`; đếm lần sinh bài trong ngày; RLS own-rows SELECT/INSERT/UPDATE. Mục đích: enforce quota client/Function.
- `generated_exercises`: bài Level 2 gắn `vocab_item_id`; `exercise_type` `fill_blank`|`mcq`; `content` jsonb; `times_shown` / `cooldown_until`. SELECT nếu deck visible; INSERT/UPDATE chỉ owner deck.

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
- Worker API: `POST /api/generate-exercise` — `worker/index.ts`. SPA gọi qua `src/lib/generateExercise.ts` (Bearer access token). Verify `/auth/v1/user` → secrets → validate body (`exclude_ids` tùy chọn, tối đa 50 UUID) → pool (`times_shown`, cooldown ≥5 → +10 ngày, trừ `exclude_ids`) hoặc Claude (quota Hướng B); không sinh được và có `exclude_ids` thì dùng lại câu trong danh sách (bỏ cooldown lúc chọn, vẫn bump) → `{ exercise: { id, exercise_type, content } }`. Lỗi JSON: `unauthorized` | `server_misconfigured` | `invalid_request` | `quota_exceeded` | `vocab_item_not_found` | `generation_failed` | `generation_unavailable` | `internal_error` | `not_found`. Cùng origin với SPA → không CORS đặc biệt.
- Parse deck file: `parseDeckFile(content)` — `src/lib/deckParser.ts` (cắt dòng trống cuối; cap 500 sau cắt; dòng trống giữa file vẫn lỗi)
- List decks: `decks.select('*, vocab_items(count)')` — RLS lọc own + public — `DecksPage`; filter client `activeTab` `'mine' | 'public'`; initial `activeTab` từ `?tab=public` (Public) hoặc khác/không có (Cá nhân), không ghi lại URL; click own → `/decks/:id`, click không phải mình → `/decks/:id/preview`. UI järvi: `Tabs` (`idPrefix="decks"`, aria-label «Loại deck») + `TabPanel`; hàng đầu `h1` + nút success «Luyện file tự do» (`/practice-file`) + nút primary «Tạo deck mới» + dòng nhịp học; tab Public dòng clone (không lúc loading); hàng deck hairline; nhãn từ `src/lib/deckLabels.ts` (DecksPage tự thêm «Nghĩa: » khi render). Sửa `<Link>` `/edit`; Xóa `window.confirm` cũ. Lỗi `profiles` → `console.error`.
- Owner email (tên chia sẻ): query 2 — `profiles.select('id, email').in('id', ownerIds)` trên `DecksPage`; `profiles.select('email').eq('id', owner_id)` trên `DeckPreviewPage` nếu `!owned`. Không embed từ `decks`. `sharerNameFromEmail` trong `deckLabels.ts`. Preview lỗi profiles → `console.error`, fallback «Ẩn danh».
- Admin users: `AdminPage` load list `id, email, is_admin, daily_exercise_quota` + own-row `is_super_admin` (fail → read-only). Gate `/admin` vẫn `is_admin` (`AdminRoute` / nav). Chỉ `is_super_admin` UPDATE quota (blur ≥ 0) và `is_admin` (checkbox); admin thường disabled mọi dòng; super admin khóa checkbox `is_admin` trên dòng mình. Không UI chỉnh `is_super_admin`.
- Account summary: `decks.select('id, name, created_at, vocab_items(count)').eq('owner_id', user.id).order('created_at')` + `user_vocab_progress.select('interval_days, due_date').eq('user_id')` — `HomePage` `/`; `todayLocalIsoDate()`; không join vocab cho progress summary (unpaged — KI-030). Lưới 6 số dưới khối Việc hôm nay; không hero due / không nút Ôn tập
- Home todo due: `user_vocab_progress.select('id, vocab_item_id, vocab_items!inner(deck_id)').eq('user_id').lte('due_date', todayLocalIsoDate())` — paged `.order('id').range(from, from+999)` đến trang < 1000 hàng; group `deck_id` client, bỏ deck không sở hữu
- Home todo reviewed-today: cùng select + `.gte('last_reviewed_at', localMidnightIso)` với `localMidnightIso = new Date(y, m, d, 0, 0, 0, 0).toISOString()` (nửa đêm local → ISO); paged như due
- Home suggestion (chỉ khi tổng `dueCount` ≤ `LOW_WORK_THRESHOLD` 10): lần lượt deck sở hữu `created_at` tăng, `vocab_items` count > 0, `user_vocab_progress.select('id, vocab_items!inner(deck_id)').eq('user_id').eq('vocab_items.deck_id', deckId).limit(1)` — match đầu (0 hàng = chưa bắt đầu) → `/decks/:id`; không thì `/decks?tab=public`
- Deck detail (owner): `decks.select('*')` rồi `vocab_items.select(...).eq('deck_id').order('created_at')` + `fetchDeckProgress` (`user_vocab_progress` join `vocab_items!inner`) — `DeckDetailPage`; UI `DeckHeader` + dòng Bắt đầu ôn tập + Link secondary **Luyện tập** → `/practice/:id` + `Tabs` («Nội dung deck») + chú giải trạng thái / lưới Tổng kết + dòng Đã học/quá hạn; actions Link ôn + Link practice + Link extra (khi `dueTodayCount === 0` và `extraCandidatesCount > 0`) + Link Sửa `/edit` + Button «Học lại từ đầu» khi `isGraduated` (`totalWords > 0 && notEnrolledCount === 0 && graduatedCount === totalWords`). Reset: `window.confirm` → DELETE `.eq('user_id').in('vocab_item_id', words.map(id))` → refetch `fetchDeckProgress` + `wordsWithProgress`; `actionError` / `resetting` (Button `loading`). Không đụng `vocab_items` / `active_pool_size`. Non-owner: `forbidden`, không bảng. Ngày «hôm nay» = `todayLocalIsoDate()`
- Level 2 practice: `loadPracticeWords` — `user_vocab_progress` + `vocab_items!inner(*)` + `.eq('vocab_items.deck_id')` + `.gte('interval_days', 3)`; rồi `generated_exercises.select('vocab_item_id, times_shown').in(ids)` → cộng `times_shown` client, sort tăng dần, `.slice(0, PRACTICE_SESSION_LIMIT)`; mỗi từ `createPracticeCard` (`firstType` random `fill_blank`|`mcq`). Hiện câu theo `currentExerciseType`; `generateExercise()` gửi `exclude_ids` đã hiện trong phiên. Sai: `gradePracticeCard` (nợ 3/2/1 + mẻ loại câu); Tiếp: `advancePracticeSession` (gap `computeReinsertGap`). Đúng và `repeatDebt === 0` thì từ xong. Không UPDATE progress. — `PracticePage`
- Create deck: `decks.insert({ owner_id, name, meaning_language, description, visibility, active_pool_size }).select('id').single()` rồi `vocab_items.insert([...])` — `CreateDeckPage` (`DeckForm` + `FileField` + Xem trước; rollback nếu vocab lỗi; lỗi insert UI cố định + `console.error`). `canSave` không đổi (mọi lỗi parse kể cả dòng trống khóa Lưu).
- Update deck metadata: `decks.update({ name, meaning_language, description, visibility, active_pool_size }).eq('id')` — `EditDeckPage` (`DeckForm`; không còn guard public→private; lỗi lưu UI cố định + `console.error`)
- Preview deck: `decks.select('*, vocab_items(id, finnish_word, translation, created_at)').eq('id').single()` rồi sort client `created_at` tăng dần — `DeckPreviewPage`; UI `DeckHeader` + `VocabTable`; Clone `Button loading`; owner thấy visibility + Link ôn + «Đây là deck của bạn.»; `!owned` `sharedBy` không visibility + dòng Clone không copy tiến độ
- Clone deck: insert deck mới (`name` + ` (Copy)`, `visibility: 'private'`, `active_pool_size: 20`) rồi bulk insert vocab; rollback delete deck nếu vocab lỗi; không copy progress — `DeckPreviewPage`. Verified 2026-09-16 (tài khoản B, deck public của A): Clone + enroll Active Pool trên bản copy.
- Delete deck: `decks.delete().eq('id')` — CASCADE vocab + progress — `DecksPage`
- Active pool enroll (chỉ `/review/:deckId` **và** owner, **không** extra): `enrollActivePool` trả `{ fatalError, enrolledCount }`; `startReview` lưu `enrolledCount`. Mix `/review` và extra `/review/:deckId/extra` không enroll.
- Session Summary: `completedCards` tích khi trả hết nợ; màn `done` đếm wrongCount 0/1/≥2, thời gian từ `sessionStartTime`, bảng từ quên; dòng từ mới chỉ khi `scopedDeckId && enrolledCount > 0 && !extraMode`. Extra: không dòng lịch ôn / từ mới. Deck hoặc mix (không extra): `handleNext` (async) `await loadRemainingDue()` rồi mới `pageState = 'done'` — tránh nháy copy khi `remainingDue` còn null; `remainingDue > 0` → bỏ «hôm nay» trên dòng tổng, thêm «Còn N từ đến hạn hôm nay.» + Button «Ôn tiếp» (`startReview`); hai Link về secondary. Extra / `remainingDue` 0 hoặc null: done như cũ.
- Review keyboard (`pageState === 'reviewing'` only): document `keydown` — Enter + `feedback` → `handleNext`; MCQ A–D → `submitMcqChoice(chosen)` (không đọc `selectedOption` vì stale). `handleSubmit` chuột/form không đổi.
- Theme: `useTheme` — override từ `localStorage['muisti-theme']` (`light`|`dark` only) hoặc theo OS sống (`matchMedia` change). Chỉ `setItem` trong `toggleTheme`. Script FOUC `index.html` cùng quy tắc. `ThemeToggle` trong `AppLayout` (Review / Practice / FilePractice dùng chung). Mount hook không ghi storage. Login không mount hook (class lúc load). KI-012 Closed.
- Review UI Đợt A: trong `AppLayout`, nội dung bọc `max-w-xl`; setup hiện tên deck (cùng query `checkOwner` `owner_id, name`) + dòng mix vs deck (không số due); `ownerChecked` chỉ lớp hiển thị; gợi ý phím setup `hidden sm:block`; loading/empty/error/done järvi; done thêm dòng đến hạn lại; `startReview` lỗi fetch → copy cố định + `console.error`.
- Review UI Đợt B (màn `reviewing`): h1 sr-only; tiến độ derived `completedCards.length` / (`completedCards.length + queue.length`) + HUD (Câu X/Y, đúng/sai, timer — cập nhật lúc Tiếp); Typing qua `Input`; MCQ hai chiều (`askMode` + `mcqDirection`, `pickForm` trọng số, `finnishPool`/`meaningPool`); fieldset disabled, A–D; persist error chỉ hiện khi `!feedback`; feedback `role="status"`; gợi ý phím `hidden sm:block`. `persistCard` lỗi → copy cố định + `console.error`.
- SRS queue mix: `user_vocab_progress.select('..., vocab_items(*)').eq('user_id').lte('due_date', today).order('due_date' asc).order('id' asc).limit(MIX_SESSION_LIMIT)` (30) — không join `decks` / không lọc `deck_id` — `ReviewPage` `/review`. Leftover giữ `due_date`; session vẫn shuffle.
- SRS queue 1 deck: cùng query + `vocab_items!inner(*)` + `.eq('vocab_items.deck_id', deckId)` + `.order('due_date' asc).order('id' asc).limit(DECK_SESSION_LIMIT)` (20) — `ReviewPage` `/review/:deckId`. Cắt trên DB (quá hạn trước; `id` hòa); leftover giữ `due_date`; session vẫn shuffle như mix/extra.
- Remaining due (done, mọi mode khi hết queue): `loadRemainingDue` — extra: `null` ngay. Deck: `select('id, vocab_items!inner(deck_id)', { count: 'exact', head: true }).eq('user_id').eq('vocab_items.deck_id').lte('due_date', today)`. Mix: `select('id', { count: 'exact', head: true }).eq('user_id').lte('due_date', today)` — **không** lọc deck. Lỗi / reject → `remainingDue = null`, vẫn `setPageState('done')` sau await. Reset `null` lúc đầu `startReview`.
- Extra queue 1 deck: cùng select `!inner` + `interval_days < 30` + `due_date > today`, `order due_date asc`, `limit 20` — `ReviewPage` `/review/:deckId/extra`. Không shuffle trước khi cắt 20 (cắt trên DB); session vẫn shuffle hàng đợi như mix/deck.
- Vocab distractor pools: `vocab_items.select('finnish_word, translation')` (scoped deck nếu có) → `finnishPool` + `meaningPool` — `ReviewPage` / map từ cards — `FilePracticePage`.
- SRS update: persist **một lần** khi đúng lần đầu (`!persisted`); `wrongCount` đóng băng cho `computeNextReview`. Sai: `applyWrong` (debt 3/2/1); `advanceSession` chèn cách N + trừ `repeatDebt` / tốt nghiệp khi đúng và `repeatDebt === 0`. Extra **không** gọi `persistCard`. — `src/lib/srs.ts` + `src/lib/session.ts` + `ReviewPage`
