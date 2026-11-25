# KNOWN_ISSUES

Lỗi / sai lệch đã biết. Đánh số từ **KI-001**. Entry mới ở đầu (sau header).

**Format mỗi issue:**

- **Mức độ:** Critical / High / Medium / Low
- **File liên quan:**
- **Mô tả:**
- **Cách tái hiện:**
- **Hướng fix:**
- **Trạng thái:** Open / Partial / Resolved / Closed

---

## KI-038 — Dòng trống giữa file khóa Lưu, `\r` đơn parse sai, `/practice-file` không chỉ dòng lỗi

**Mức độ:** Medium  
**File liên quan:** `src/lib/deckParser.ts`, `src/pages/CreateDeckPage.tsx`, `src/pages/FilePracticePage.tsx`, `src/components/ParseErrorList.tsx`

**Mô tả:** Ba vấn đề:

1. Dòng trống giữa file và ở đầu file bị coi là lỗi «Dòng trống» và khóa Lưu. Dòng trống không chứa từ, nên chặn nó không bảo vệ dữ liệu. KI-016 và KI-010 chỉ xử lý dòng trống cuối file.
2. `split(/\r?\n/)` không tách xuống dòng kiểu `\r` đơn. File `kissa;mèo\rkoira;chó` ra 1 từ hợp lệ với nghĩa sai `mèo\rkoira;chó` (parse sai im lặng).
3. `/practice-file` chỉ hiện «File có N dòng lỗi», không cho biết dòng nào và lỗi gì. `CreateDeckPage` đã có danh sách lỗi nhưng component nằm cục bộ.

**Cách tái hiện:** (1) File có một dòng trống giữa hai từ hợp lệ → preview báo «Dòng trống», nút Lưu khóa. (2) File chỉ dùng `\r` giữa hai dòng `từ;nghĩa` → một từ, nghĩa dính cả dòng sau. (3) Upload file thiếu `;` trên `/practice-file` → chỉ thấy số lỗi.

**Hướng fix (đã làm 2026-11-25):** Bỏ qua mọi dòng `trim() === ''` (không báo); tách `\r\n` / `\r` / `\n`; đếm 500 trên dòng không trống; câu lỗi chỉ cách sửa. `ParseErrorList` dùng chung; `/practice-file` hiện tối đa 20 lỗi đầu. Không đổi `canSave`.

**Trạng thái:** Closed (2026-11-25)

---

## KI-037 — Practice Level 2: không trần lần lặp, F5 mất phiên, lần lặp có thể tốn quota hoặc lặp câu

**Mức độ:** Low  
**File liên quan:** `src/lib/practiceSession.ts`, `src/pages/PracticePage.tsx`, `worker/index.ts` (`findPoolExercise`, `findFallbackExercise`, `generateFreshExercise`)

**Mô tả:**

- (a) Không có trần số lần lặp. `repeatDebt` cộng 3/2/1 rồi lúc Tiếp trừ 1; từ lần sai thứ 3 trở đi nợ sau Tiếp không giảm nếu vẫn sai. Từ sai mãi thì không rời queue, phiên không kết thúc. Cùng tính chất với Level 1 (`advanceSession`).
- (b) Queue, `repeatDebt`, `pendingTypes` và danh sách `exclude_ids` chỉ nằm trong memory. F5 hoặc đóng tab lúc `practicing` mất phiên (về setup), không ghi `user_vocab_progress`.
- (c) Mỗi lần hiện gọi `POST /api/generate-exercise`. Pool không còn câu ngoài `exclude_ids` thì Worker sinh câu mới và tăng `generations_used` (Hướng B). Hết quota, Claude lỗi/billing, hoặc insert fail thì dùng lại một câu trong `exclude_ids` (bỏ cooldown lúc chọn, vẫn bump `times_shown`) nếu còn hàng; không còn hàng thì trả lỗi như cũ.

**Cách tái hiện:** (a) Cứ trả lời sai một từ. (b) F5 giữa phiên. (c) Luyện một từ đến khi mọi câu `fill_blank` của từ đó nằm trong `exclude_ids` hoặc đang cooldown, rồi sai tiếp đến khi chạm `daily_exercise_quota`.

**Hướng fix:** Chưa làm. Trần lặp hoặc nút bỏ từ giữa câu là quyết định sản phẩm. Resume phiên cần lưu state ngoài memory. Quota: chấp nhận dự phòng câu cũ; không đổi Hướng B.

**Trạng thái:** Open (2026-11-16)

---

## KI-036 — Worker insertExercise fail sau khi Claude đã sinh xong → tốn 1 lần gọi Claude, không lưu câu

**Mức độ:** Low  
**File liên quan:** `worker/index.ts` (`insertExercise`), `worker/generateExercise.ts`

**Mô tả:** Trong luồng sinh Level 2 (Hướng B: quota tăng SAU khi sinh + INSERT thành công), nếu Claude sinh câu thành công nhưng bước `insertExercise` vào `generated_exercises` fail (vd RLS INSERT từ chối, lỗi mạng DB), thì đã tốn 1 lần gọi Claude (mất tiền) nhưng không lưu được câu và không bump quota. Hiếm: owner-check đã pass ở `loadOwnedVocab` trước đó nên RLS INSERT gần như chắc pass.

**Cách tái hiện:** Khó tái hiện tự nhiên vì owner-check đã lọc trước INSERT. Về lý thuyết: làm INSERT fail (vd thu hồi quyền owner giữa chừng, hoặc lỗi DB tạm thời) sau khi generate thành công.

**Hướng fix:** Ghi nhận, không vá. Chi phí 1 lần gọi Claude lãng phí khi INSERT fail được chấp nhận vì tần suất cực thấp. Đúng Hướng B (không bump quota khi chưa lưu thành công).

**Trạng thái:** Open (2026-09-28)

---

## KI-035 — Pool generated_exercises phình vô hạn theo thời gian cho mỗi (từ, loại)

**Mức độ:** Low  
**File liên quan:** `worker/generateExercise.ts` (`findPoolExercise`), `src/pages/PracticePage.tsx` (`loadPracticeWords`)  
**Liên quan:** KI-034

**Mô tả:** Mỗi câu trong pool khi chạm `times_shown` 5 → set `cooldown_until` 10 ngày → Worker sinh câu MỚI bù cho (từ, loại) đó. Không có trần số câu mỗi (từ, loại), nên pool tăng đơn điệu theo thời gian. Đã cân nhắc và CHẤP NHẬN không đặt trần: content nhỏ, Postgres nuốt hàng triệu hàng dễ; pool nhiều câu sẵn thì Worker gọi Claude ÍT hơn (giảm tiền, không tăng), vì tỉ lệ trúng câu cũ trong pool cao hơn.

**Cách tái hiện:** Luyện một (từ, loại) lặp lại nhiều ngày qua các chu kỳ cooldown; đếm số hàng `generated_exercises` cho `vocab_item_id` đó tăng dần.

**Hướng fix:** Không xóa câu. Nếu cần về sau: đổi PracticePage đọc pool sang RPC sum group by trên DB (gộp `times_shown` theo `vocab_item_id` phía server thay vì kéo hàng về client) — giải quyết luôn KI-034. Không đặt trần pool.

**Trạng thái:** Open (2026-09-28) — chấp nhận, không cấp bách

---

## KI-034 — Ưu tiên times_shown Level 2 có thể lệch nếu >1000 hàng generated_exercises cho tập từ eligible

**Mức độ:** Low  
**File liên quan:** `src/pages/PracticePage.tsx` (`loadPracticeWords`)  
**Liên quan:** KI-035

**Mô tả:** Tổng `times_shown` tính client từ `generated_exercises.select('vocab_item_id, times_shown').in(vocab_ids)`. PostgREST cắt im ~1000 hàng/request. Deck lớn + nhiều bài sinh → tổng thiếu → thứ tự ưu tiên có thể sai (vẫn lấy đủ từ `interval_days >= 3`, chỉ lệch sort). Lưu ý: ngưỡng ~1000 hàng của PostgREST đếm số CÂU (`generated_exercises` rows) không đếm số TỪ — một deck 200 từ, mỗi từ 5 câu, đã chạm ~1000 câu nên lệch đến sớm hơn tưởng. Chỉ lệch sort ưu tiên, không hỏng chức năng; tự hết khi chuyển RPC sum group by (xem KI-035).

**Cách tái hiện:** Nhiều hơn ~1000 hàng `generated_exercises` thuộc các `vocab_item_id` eligible của một deck.

**Hướng fix:** Aggregate RPC/`sum` group by trên DB, hoặc page `.range` đến hết rồi cộng.

**Trạng thái:** Open (2026-09-27; cập nhật 2026-09-28 — ghi chú ngưỡng đếm câu; liên quan KI-035)

---

## KI-033 — Admin có thể tự tắt `is_admin` của chính mình

**Mức độ:** Low  
**File liên quan:** `src/pages/AdminPage.tsx`

**Mô tả:** Checkbox `is_admin` trên `/admin` cho phép bỏ tick hàng của chính admin đang đăng nhập. Sau khi UPDATE thành công, user mất quyền admin (nav ẩn, `/admin` redirect `/`). Không có confirm; khôi phục chỉ qua SQL / service role.

**Cách tái hiện:** Admin mở `/admin`, bỏ tick Admin trên email của mình, blur/đợi lưu xong, reload.

**Hướng fix:** Chặn uncheck hàng `id === auth.uid()`, hoặc confirm; tùy chọn không cho hạ admin cuối cùng.

**Trạng thái:** Resolved (2026-09-28) — xử qua mô hình super admin (migration 011 + Admin UI): chỉ super admin đổi is_admin; admin thường read-only; checkbox is_admin trên dòng chính super admin bị khóa (chống tự hạ quyền); RLS UPDATE profiles chặn ở tầng DB.

---

## KI-032 — Worker `/api/generate-exercise` chưa rate-limit tần suất gọi

**Mức độ:** Low  
**File liên quan:** `worker/index.ts`

**Mô tả:** Mỗi request (kể cả chỉ lấy lại bài từ pool, không sinh Claude) vẫn tốn verify JWT + query Supabase. Chưa giới hạn số lần gọi Worker/phút/user. Spam client có thể tăng tải Auth/PostgREST dù không đốt quota sinh.

**Hướng fix:** Rate limit (CF / Durable Object / KV) hoặc cache ngắn pool hit; ưu tiên sau khi UI luyện tập có traffic thật.

**Trạng thái:** Open (2026-09-26)

---

## KI-031 — Race quota multi-tab khi sinh bài (Hướng B)

**Mức độ:** Low  
**File liên quan:** `worker/index.ts`, `exercise_quota_usage`

**Mô tả:** Quota tăng **sau** Claude + INSERT thành công (Hướng B). Hai tab cùng vượt gần hạn có thể cùng qua check `used < limit` rồi cùng sinh → vượt `daily_exercise_quota` nhỏ. Chấp nhận tạm; Hướng A (reserve rồi refund nếu fail) deferred.

**Hướng fix:** Atomic reserve (`UPDATE … WHERE generations_used < quota RETURNING`) hoặc RPC; refund nếu generation fail.

**Trạng thái:** Open (2026-09-26) — deferred Hướng A

---

## KI-030 — Account summary trên Home không phân trang, cắt im ở 1000 dòng progress

**Mức độ:** Low  
**File liên quan:** `src/pages/HomePage.tsx`

**Mô tả:** Query lưới 6 số `user_vocab_progress.select('interval_days, due_date').eq('user_id')` **không** `.range`. PostgREST trả tối đa 1000 hàng/request và cắt im. Đã học / chưa học / đã thuộc / đang học (và `dueTodayCount` nội bộ) có thể thiếu khi user có > 1000 dòng progress. Query due / reviewed-today của khối Việc hôm nay đã paged.

**Cách tái hiện:** Tài khoản > 1000 `user_vocab_progress`; so lưới Home với đếm thật trên DB.

**Hướng fix:** Paged cùng helper todo, hoặc RPC/count trên server.

**Trạng thái:** Open (2026-09-24)

---

## KI-029 — Tick «Xong hôm nay» trên Home có thể bị mở lại sau Bắt đầu ôn tập

**Mức độ:** Low  
**File liên quan:** `src/pages/HomePage.tsx`, `src/pages/ReviewPage.tsx`  
**Liên quan:** KI-028

**Mô tả:** Tick suy ra `dueCount === 0` + có `last_reviewed_at` hôm nay (local). «Bắt đầu ôn tập» trên `/review/:deckId` gọi `enrollActivePool` khi pool còn chỗ — từ mới `due_date = hôm nay`. Quay Home: `dueCount > 0`, hàng chuyển «Chưa xong». Home không ghi tick; không undo tay được vì indicator không tương tác.

**Cách tái hiện:** Deck vừa ôn hết due hôm nay (tick), còn từ chưa enroll và slot pool; bấm «Bắt đầu ôn tập»; về `/`.

**Hướng fix:** Coi enroll hôm nay là việc mới (giữ hành vi); hoặc không enroll từ `due_date = hôm nay` nếu chỉ muốn giữ tick; hoặc persist tick riêng (ngoài scope hiện tại).

**Trạng thái:** Open (2026-09-24)

---

## KI-028 — Số due trên Detail / hàng Home có thể nhỏ hơn phiên ôn deck

**Mức độ:** Low  
**File liên quan:** `src/pages/HomePage.tsx`, `src/pages/DeckDetailPage.tsx`, `src/pages/ReviewPage.tsx`

**Mô tả:** Home **không còn** hero số «Đến hạn hôm nay». Detail vẫn đếm `due_date <= hôm nay` trên progress hiện có, **không** enroll. Hàng Home «{n} từ đến hạn» cùng công thức. «Bắt đầu ôn tập» trên `/review/:deckId` gọi `enrollActivePool` trước khi fetch due — từ mới được `due_date = hôm nay`. Phiên deck **capped 20** (`DECK_SESSION_LIMIT`); mix **capped 30** (`MIX_SESSION_LIMIT`): nếu due+enroll ≤ cap, session deck vẫn có thể **dài hơn** số vừa thấy trên Detail / hàng Home; nếu n > cap, session **ngắn hơn** số Home (leftover giữ `due_date`, Home vẫn hiện n). Mix không enroll. Tick Home có thể mất sau enroll — KI-029; leftover cũng giữ tick «Chưa xong» (đúng).

**Cách tái hiện:** Deck còn slot pool và từ chưa enroll, due+enroll ≤ 20: so Detail/Home với độ dài phiên. Hoặc due > 20: phiên 20, Home vẫn «{n} từ đến hạn». Mix due > 30: phiên 30, done «Ôn tiếp».

**Hướng fix:** Copy UI đã gợi ý cap + «Ôn tiếp» khi leftover. Không cần số khớp Home với độ dài một phiên.

**Trạng thái:** Open (2026-09-21; cập nhật 2026-09-24 — Home hết hero + cap phiên deck; 2026-09-25 — mix cũng cap)

---

## KI-027 — Không có test tự động cho `srs.ts`

**Mức độ:** Low  
**File liên quan:** `src/lib/srs.ts`, `package.json`

**Mô tả:** `package.json` không có script `test`. Không có file `*.test.*` / vitest / jest trong repo. DECISIONS (entry SRS) từng ghi «test toán học exhaustive» lúc chốt công thức (2026-09-08) nhưng artifact đó **không** nằm trong repo.

**Cách tái hiện:** `npm run` / glob `**/*.{test,spec}.*` — không có harness.

**Hướng fix:** Thêm vitest (hoặc tương đương) + unit test `classifyAttempt` / `computeNextReview` nếu muốn regression guard.

**Trạng thái:** Open (2026-09-21)

---

## KI-026 — Mix `/review` không lọc `owner_id`; dựa RLS `user_id`

**Mức độ:** Low  
**File liên quan:** `src/pages/ReviewPage.tsx`, RLS `user_vocab_progress`

**Mô tả:** Mix chọn mọi progress của user có `due_date <= hôm nay`, **không** join `decks` / lọc `owner_id`. An toàn phụ thuộc RLS: `user_id = auth.uid()` trên SELECT/INSERT/UPDATE/DELETE. Comment trong code: có progress nghĩa là user đã từng ôn từ đó.

**Cách tái hiện:** Đọc query mix trong `startReview`; đối chiếu `schema.sql` policies.

**Hướng fix:** Xác nhận RLS đủ (hiện đúng); chỉ thêm join nếu product muốn loại progress trên deck không còn quyền SELECT vocab.

**Trạng thái:** Open (2026-09-21)

---

## KI-025 — `title` trên nav AppLayout chỉ hiện khi hover desktop

**Mức độ:** Low  
**File liên quan:** `src/components/AppLayout.tsx`

**Mô tả:** NavLink «Decks» / «Ôn tập» có `title` giải thích mix vs học trên deck. Tooltip native chỉ hiện hover chuột; không hiện trên mobile / touch.

**Cách tái hiện:** Mở app trên điện thoại, nhấn giữ nav; không có tooltip.

**Hướng fix:** Không bắt buộc. Copy giải thích nằm trên Home / Decks / Review setup.

**Trạng thái:** Open (2026-09-19)

---

## KI-024 — Đổi tên Worker trên Cloudflare lệch `wrangler.jsonc` `name`

**Mức độ:** Medium  
**File liên quan:** `wrangler.jsonc`

**Mô tả:** `name` hiện là `"muisti"` — khớp Worker đã tạo. Nếu đổi tên Worker trên dashboard mà không đổi `name` trong `wrangler.jsonc` (hoặc ngược lại), lần deploy sau có thể tạo Worker **mới** thay vì cập nhật Worker cũ.

**Cách tái hiện:** Đổi tên trên Cloudflare, giữ `wrangler.jsonc` `"name": "muisti"`, deploy.

**Hướng fix:** Giữ hai bên trùng. Không đổi trừ khi cố ý tách Worker.

**Trạng thái:** Open (2026-09-19)

---

## KI-021 — Chưa có Content-Security-Policy trên Worker

**Mức độ:** Low  
**File liên quan:** `index.html`, `public/_headers`

**Mô tả:** `_headers` không gửi CSP. `index.html` có script inline chống FOUC theme (localStorage `muisti-theme`) và stylesheet Google Fonts. CSP cần nonce hoặc hash cho script inline; thiếu thì app/theme/font có thể hỏng.

**Cách tái hiện:** Xem `public/_headers` — không có dòng `Content-Security-Policy`.

**Hướng fix:** Thêm CSP sau khi hash script inline (và quyết định self-host font hoặc `style-src` cho `fonts.googleapis.com`).

**Trạng thái:** Open (2026-09-19)

---

## KI-022 — Bundle một chunk ~495 KiB, chưa lazy-load route

**Mức độ:** Low  
**File liên quan:** `src/App.tsx`, output `dist/assets/*.js`

**Mô tả:** `npm run build` ra một JS (~506690 bytes / ~495 KiB) gồm supabase-js + React + react-router. Vite có thể cảnh báo chunk > 500 kB. Không `React.lazy` / code-split theo route.

**Cách tái hiện:** `npm run build`; xem kích thước `dist/assets/index-*.js`.

**Hướng fix:** Tách chunk (lazy `ReviewPage` / trang deck) khi cần.

**Trạng thái:** Open (2026-09-19)

---

## KI-023 — Google Fonts từ domain ngoài

**Mức độ:** Low  
**File liên quan:** `index.html`

**Mô tả:** Inter tải từ `fonts.googleapis.com` / `fonts.gstatic.com`. Gọi domain ngoài lúc runtime; cân nhắc self-host nếu quan tâm quyền riêng tư hoặc muốn CSP chặt.

**Cách tái hiện:** Mở app, Network thấy request tới hai domain trên.

**Hướng fix:** Self-host file font trong `public/` / `@font-face` khi cần.

**Trạng thái:** Open (2026-09-19)

---

## KI-020 — `p { margin: 0 }` không layer thắng `mt-*` trên `<p>`

**Mức độ:** Low  
**File liên quan:** `src/index.css`, các `<p>` dùng `!mt-*` hoặc `mt-*`

**Mô tả:** `p { margin: 0 }` ngoài `@layer` thắng utility `mt-*`. Đã xóa rule (2026-09-19); Preflight `*` lo margin 0. `!mt-*` (thắng rule cũ) đổi thành `mt-*`. Các `<p>` có `mt-*` chết trước đây (Login subtitle, lưới số liệu, DeckHeader, back-link error, Decks status, Create preview, Preview owned/clone) **bắt đầu có khoảng cách theo class đã viết** — có chủ đích. `space-y-1` trên 3 dòng ước lượng Tổng kết Detail cũng bắt đầu có tác dụng.

**Cách tái hiện (cũ):** `<p className="mt-4">` không có margin-top.

**Hướng fix:** Đã làm. Nhìn trình duyệt nhóm trên nếu muốn tinh chỉnh sau.

**Trạng thái:** Closed (2026-09-19)

---

## KI-019 — `--color-accent-hover` không có cặp dark

**Mức độ:** Low  
**File liên quan:** `src/index.css` `@theme`, `src/components/Button.tsx`, `src/pages/DecksPage.tsx`

**Mô tả:** Token hover accent chỉ có bản sáng. Dark dùng `accent-dark` làm nền/chữ, không có `--color-accent-hover-dark`. Chưa sửa vì đổi hover dark sẽ lệch pixel.

**Cách tái hiện:** Hover nút primary / link accent trên Decks khi `.dark`.

**Hướng fix:** Thêm token hover-dark và gắn `dark:hover:…` khi chấp nhận đổi hiển thị.

**Trạng thái:** Open (2026-09-19)

---

## KI-018 — Review keyboard listener gắn lại mỗi render

**Mức độ:** Low  
**File liên quan:** `src/pages/ReviewPage.tsx`

**Mô tả:** `handleNext` và `submitMcqChoice` không `useCallback` nên identity đổi mỗi render. Effect `document` `keydown` phụ thuộc hai hàm đó → tháo/gắn listener mỗi lần render. Có cleanup, không leak; chỉ churn.

**Cách tái hiện:** Mở màn `reviewing`, gõ / chọn đáp án — mỗi setState rebind listener (DevTools Event Listeners).

**Hướng fix:** `useCallback` các handler (cẩn thận deps) hoặc đăng ký listener ổn định. Không sửa ở Đợt B.

**Trạng thái:** Open (2026-09-19)

---

## KI-017 — ReviewPage: due count, lỗi persist, F5 mất phiên

**Mức độ:** Low  
**File liên quan:** `src/pages/ReviewPage.tsx`

**Mô tả:**
- Setup chưa hiện số từ đến hạn / số sẽ enroll — cần query mới (enroll chỉ chạy khi bấm Bắt đầu nên số trước đó dễ lệch).
- Lỗi persist lúc học: Đợt B đã Việt hóa trong `persistCard` («Không lưu được câu trả lời. Thử lại.» + `console.error`). UI chỉ hiện khi `error && !feedback` nên không còn hiện lỗi cũ cùng «Đúng!» sau retry thành công. **Nguyên nhân gốc còn:** `handleSubmit` / `submitMcqChoice` không `setError(null)` khi bắt đầu / khi persist OK — `error` vẫn trong state đến `presentCard` / `startReview`.
- F5 giữa phiên (`loading` / `reviewing`) mất queue — state chỉ trong memory; chưa có persist phiên.

**Cách tái hiện:** Setup không thấy số due. Persist fail → copy Việt. Retry thành công → «Đúng!» không kèm alert lỗi (state `error` vẫn còn). F5 giữa phiên → về setup.

**Hướng fix:** Query due nếu muốn số chính xác; `setError(null)` đầu `handleSubmit` / `submitMcqChoice` (và khi persist OK) nếu muốn xóa state; persist phiên nếu product muốn resume.

**Trạng thái:** Partial (2026-09-19) — Việt hóa + điều kiện hiển thị Đợt B; gốc `error` không xóa và F5/due count còn Open.

---

## KI-016 — File kết thúc bằng newline bị lỗi «Dòng trống» và khóa Lưu

**Mức độ:** Medium  
**File liên quan:** `src/lib/deckParser.ts`, `src/pages/CreateDeckPage.tsx`

**Mô tả:** `parseDeckFile` coi mọi dòng `trim() === ''` là lỗi «Dòng trống», kể cả dòng cuối do editor thêm `\n`. `canSave` yêu cầu `errors.length === 0` nên file sạch nhưng có newline cuối → Lưu khóa.

**Cách tái hiện (cũ):** File `koira;chó\n` → 1 từ hợp lệ + 1 lỗi Dòng trống → Lưu disabled.

**Hướng fix (đã làm 2026-09-19):** Sau `split`, cắt đuôi các dòng `trim() === ''` liên tục. Dòng trống giữa file vẫn lỗi «Dòng trống». Cap 500 tính trên số dòng sau khi cắt. Không đổi `canSave` / UI.

**Trạng thái:** Closed (2026-09-19)

---

## KI-015 — Thứ tự hàng từ vựng trên Detail/Preview không ổn định

**Mức độ:** Low  
**File liên quan:** `src/pages/DeckDetailPage.tsx`, `src/pages/DeckPreviewPage.tsx`

**Mô tả:** Query vocab không `order` (Preview embed cũng không `id`/`created_at`) → thứ tự bảng phụ thuộc Postgres.

**Cách tái hiện (cũ):** Mở `/decks/:id` hoặc `/preview` — hàng không theo thứ tự tạo.

**Hướng fix (đã làm 2026-09-19):** Detail `vocab_items.order('created_at', { ascending: true })`. Preview select `id, created_at` rồi sort client theo `created_at`. Key hàng = `item.id`.

**Trạng thái:** Closed (2026-09-19)

---

## KI-014 — Tab đang chọn trên DeckDetail bị `disabled`

**Mức độ:** Low  
**File liên quan:** `src/pages/DeckDetailPage.tsx`, `src/components/Tabs.tsx`

**Mô tả:** Hai nút «Từ vựng»/«Tổng kết» `disabled` khi đang chọn → không còn trong tab order, không focus lại tab hiện tại.

**Cách tái hiện (cũ):** Mở `/decks/:id`, tab đang chọn xám/`disabled`.

**Hướng fix (đã làm 2026-09-19):** `Tabs` dùng `aria-selected` + roving tabindex; tab chọn không `disabled`. Detail/DecksPage dùng chung.

**Trạng thái:** Closed (2026-09-19)

---

## KI-013 — F5 làm thông báo clone hiện lại vì `location.state`

**Mức độ:** Low  
**File liên quan:** `src/pages/DecksPage.tsx`, `src/pages/DeckPreviewPage.tsx` (navigate state, không sửa ở bước này)

**Mô tả:** `DecksPage` đọc `location.state.success` (shape `{ success?: string }`) và hiện một dòng status. `DeckPreviewPage` clone xong `navigate('/decks', { replace: true, state: { success: … } })`. History state được giữ khi F5 / reload trên `/decks` → thông báo clone hiện lại.

**Cách tái hiện:** Clone một deck public → về `/decks` thấy thông báo thành công → F5 → thông báo vẫn hiện.

**Hướng fix (chưa làm):** Sau khi đọc `success`, xóa state bằng `navigate('.', { replace: true, state: {} })` (hoặc `navigate(location.pathname, { replace: true })`), hoặc copy vào state cục bộ rồi clear history state. Không đổi shape `location.state` phía `DeckPreviewPage` nếu không cần.

**Trạng thái:** Open (2026-09-19) — ghi nhận, chưa sửa.

---

## KI-012 — `useTheme` ghi `localStorage` ngay lúc mount, chốt cứng theme hệ thống

**Mức độ:** Low  
**File liên quan:** `src/lib/useTheme.ts`, `src/components/ThemeToggle.tsx`, `src/components/AppLayout.tsx`, `index.html`

**Mô tả:** Trước đây `useEffect` luôn `localStorage.setItem('muisti-theme', theme)` kể cả mount → user chưa toggle vẫn bị chốt theo OS lúc đó; lần sau script ưu tiên storage, không theo OS.

**Cách tái hiện (cũ):** Xóa key `muisti-theme`, đăng nhập (route có `AppLayout`), reload → key đã có `light`/`dark`. Đổi OS theme, reload — giao diện không đổi.

**Hướng fix (đã làm 2026-09-19):** State tách `override` (null nếu chưa chọn) và `systemDark`. Theme hiệu lực = override ?? OS. Listener `matchMedia('prefers-color-scheme: dark')` `change` + cleanup. Effect class `.dark` không ghi storage. `toggleTheme` mới `setItem` (try/catch). Script `index.html` chỉ tin `'light'|'dark'`, try/catch storage.

**Giới hạn còn lại:** `LoginPage` và `ReviewPage` không mount `useTheme` nên không có listener sống — theme lúc mở trang do script `index.html`; đổi OS khi đang đứng trên những trang đó không cập nhật cho đến khi reload hoặc vào route có `AppLayout`.

**Trạng thái:** Closed (2026-09-19)

---

## KI-011 — Guard public→private không thấy progress user khác (RLS own-rows)

**Mức độ:** Medium  
**File liên quan:** `src/pages/EditDeckPage.tsx`, RLS `user_vocab_progress`

**Mô tả:** Spec cũ chặn owner đổi deck `public` → `private` nếu user khác có `user_vocab_progress` trên từ của deck. Query client join `vocab_items!inner` + `.neq('user_id', owner)`. RLS `user_vocab_progress` chỉ `SELECT` dòng `user_id = auth.uid()` nên owner **không đọc được** progress người khác → query luôn rỗng → guard không bao giờ chặn.

**Cách tái hiện:** Cần account thứ 2 enroll deck public rồi owner đổi sang private. Không giả lập được với 1 session owner. Public→private khi chỉ owner có progress: lưu thành công (query không lỗi).

**Hướng fix:** Không còn áp dụng. 2026-09-16 đổi kiến trúc: non-owner không học trực tiếp trên deck public — Preview + Clone. Guard đã xóa khỏi `EditDeckPage`. Không sửa RLS / không thêm RPC.

**Trạng thái:** Closed (2026-09-16) — đóng do đổi kiến trúc (Clone thay thế học trực tiếp), không phải do sửa được guard.

---

## KI-010 — Dòng trống cuối file (newline) chặn Lưu

**Mức độ:** Low  
**File liên quan:** `src/lib/deckParser.ts`, `src/pages/CreateDeckPage.tsx`

**Mô tả:** Spec parse: mọi dòng trống là lỗi "Dòng trống", và bất kỳ lỗi nào thì disable Lưu. Nhiều editor/OS thêm newline cuối file → `split` ra 1 dòng rỗng cuối → 1 lỗi dù toàn bộ từ đều hợp lệ. Đã xác nhận lúc test upload.

**Cách tái hiện:** File `kissa;mèo\\nkoira;chó\\n` (có newline sau dòng cuối) → preview "N lỗi" gồm dòng trống, nút Lưu disabled.

**Hướng fix:** Có thể bỏ qua đúng 1 trailing empty line, hoặc cho Lưu khi chỉ còn lỗi dòng trống cuối. Cần chốt vì khác spec hiện tại ("dòng trống = lỗi").

**Trạng thái:** Closed (2026-09-19) — cùng fix KI-016 (cắt dòng trống cuối trong `parseDeckFile`).

---

## KI-009 — Upload deck không tạo `user_vocab_progress` — ôn `/review/:deckId` trống

**Mức độ:** High  
**File liên quan:** `src/pages/CreateDeckPage.tsx`, `src/pages/ReviewPage.tsx`, bảng `user_vocab_progress`

**Mô tả:** Luồng tạo deck chỉ INSERT `decks` + `vocab_items`. ReviewPage chỉ lấy từ đang due trong `user_vocab_progress`. F-04 (đánh dấu từ) đã bị xóa cùng UnitDetailPage. Sau khi upload, bấm card deck → `/review/:deckId` sẽ hiện "Không có từ nào cần ôn hôm nay" dù deck có từ.

**Cách tái hiện:** Tạo deck mới, lưu file hợp lệ, click deck trên `/decks`.

**Hướng fix:** Active Pool Enrollment — `enrollActivePool` trong `startReview` khi có `deckId`; cột `decks.active_pool_size` (migration 008).  
**Trạng thái:** Closed — 2026-09-16. Owner apply 008 (SQL Editor, xác nhận Table Editor). Verify: `active_pool_size = 10`, upload 15 từ, `/review/:deckId` → enroll đúng 10 từ; `/review` mix không insert `user_vocab_progress` mới.

---

## KI-001 — UnitDetailPage hiện `exercises.prompt` / `correct_answer` dạng markdown thô, chưa render

**Mức độ:** Low  
**File liên quan:** `src/pages/UnitDetailPage.tsx`  
**Mô tả:** Nhiều exercise (đặc biệt `type=reference_table`) có `prompt` chứa markdown (bảng, heading, list) nhưng UnitDetailPage hiện bằng `<p>{exercise.prompt}</p>` — render như text thô, không xuống dòng, không có bảng. Khó đọc, đặc biệt với `reference_table` có bảng chia động từ dài. Không chặn chức năng (đánh dấu từ / F-04 vẫn hoạt động); chỉ ảnh hưởng UX đọc nội dung bài tập / bảng tham khảo.  
**Cách tái hiện:** 2026-09-08, test T1.3/T1.4 với data thật Unit 1 — mở unit, xem exercise `reference_table`.  
**Hướng fix:** Thêm markdown renderer (vd `react-markdown`) cho `prompt` + phần text trong `correct_answer` / `options` khi hiện exercises. Làm sau khi hoàn tất styling pass (theo `PLAN_1.md`, styling để ngỏ lúc scaffold, làm khi xong tính năng MVP).  
**Trạng thái:** Closed — page/bảng liên quan (`UnitDetailPage`, `exercises`) đã bị xóa trong migration 007 (deck-based), không còn tái hiện được.

---

## KI-002 — Ý tưởng mở rộng SRS: chèn ngẫu nhiên ~20% từ "đã thuộc lâu" vào hàng đợi ôn tập

**Mức độ:** Enhancement (không phải bug — ý tưởng mở rộng, chưa implement)  
**File liên quan:** `src/pages/ReviewPage.tsx`, bảng `user_vocab_progress`

**Bối cảnh / vấn đề gốc:** Thuật toán SM-2 rút gọn đã chốt (xem `DECISIONS.md` entry "Thuật toán SRS...") chỉ đưa từ vào hàng đợi ôn khi `due_date <= hôm nay`. Với từ đã ôn đúng nhiều lần liên tiếp, interval tăng theo cấp số nhân (vd sau 3 lần nhớ dễ liên tục, interval có thể nhảy lên ~11 ngày, sau đó ~40 ngày...) — nghĩa là từ "đã thuộc lâu" gần như biến mất khỏi tầm mắt user trong nhiều tuần.

**Ý tưởng đề xuất (chủ dự án, 2026-09-08):** Ngoài hàng đợi `due_date <= hôm nay`, bổ sung thêm ngẫu nhiên khoảng 20% số lượng từ "đã thuộc lâu" (`interval` dài, `review_count` cao) vào session ôn tập, để test bất chợt — vì lý luận: "từ đó cũng phải đúng nhiều lần rồi mới lên được interval dài như vậy, nên chỉ cần kiểm tra bất chợt một phần, không cần tất cả."

**Căn cứ tham khảo lúc research (2026-09-08):**
- Khái niệm "mature card" trong Anki: thẻ có interval >= 21 ngày, được coi là đã học xong, chỉ cần duy trì (nguồn: controlaltbackspace.org/sr-glossary)
- Anki/SM-2/FSRS chuẩn **không** có cơ chế "test bất chợt ngoài lịch" — họ tin hoàn toàn vào `due_date` đã tính (dựa trên retrievability ước tính ~90%), không chèn thêm review ngẫu nhiên trước hạn
- Có bằng chứng khoa học gián tiếp ủng hộ ý tưởng: nghiên cứu về "massed practice" cho thấy học dồn dập tạo overconfidence — người học tưởng đã thuộc nhưng thực ra dễ quên hơn dự đoán (Emeny, Hartwig, & Rohrer 2021, qua justinmath.com/cognitive-science-of-learning-spaced-repetition) — nhưng nghiên cứu này nói về việc học ban đầu (initial learning), không trực tiếp nói về việc "test bất chợt thẻ đã mature" trong hệ thống SRS đang chạy

**Vấn đề chưa giải quyết được nếu implement ngay:**
1. Định nghĩa "đã thuộc lâu": chưa chốt ngưỡng cụ thể (`interval_days` >= bao nhiêu? `review_count` >= bao nhiêu? hay kết hợp cả hai?)
2. Cách chọn 20%: random đều trên toàn bộ từ "đã thuộc lâu", hay ưu tiên từ lâu nhất chưa test lại, hay có trọng số nào khác?
3. Quan trọng nhất — xử lý kết quả: nếu 1 từ nằm trong nhóm "test bất chợt" này bị user trả lời sai, cập nhật DB thế nào?
   - Nếu áp dụng y hệt công thức "Quên" (reset interval, `due_date` = mai) → phá vỡ toàn bộ lịch `due_date` đã tính cho từ đó, coi như hạ cấp 1 từ đang mature xuống mức mới học lại — có hợp lý không?
   - Nếu **không** cập nhật gì (chỉ để user luyện tập, không ảnh hưởng `due_date`) → vậy mục đích "phát hiện ảo tưởng đã thuộc" của ý tưởng gốc không đạt được, vì DB vẫn nghĩ từ đó ổn
   - Cần 1 quyết định rõ ràng trước khi code, chưa có câu trả lời ở thời điểm ghi issue này

**Cập nhật 2026-09-14 (schema deck-based, wipe):** Hàng đợi ReviewPage giờ có 2 chế độ — mix tất cả due của user, hoặc lọc due theo 1 `deck_id`. Vẫn **chỉ** lấy `due_date <= hôm nay`; chưa chèn ngẫu nhiên thẻ mature. Thuật toán SM-2 không đổi. Progress / data ôn cũ đã bị wipe trong migration 007 — không còn “data thật” từ T1.5 để quan sát interval dài; ý tưởng 20% mature review vẫn hợp lệ khi user ôn lại trên deck mới.

**Trạng thái:** Open — ý tưởng đã ghi nhận, chưa implement. Cần bàn kỹ và chốt DECISIONS riêng trước khi code; làm sau khi SRS đã chạy ổn định với progress mới (sau upload deck), không còn phụ thuộc data T1.5 cũ.

---

## KI-003 — Ý tưởng: cho phép nạp file từ vựng ngoài để tự học/kiểm tra tạm thời (không lưu DB)

**Mức độ:** Enhancement (tính năng mới, chưa implement)  
**File liên quan:** Có thể tái dùng `src/lib/srs.ts` (session/retry-queue logic), `src/pages/ReviewPage.tsx` (UI hỏi/đáp) — nhưng cần tách nguồn dữ liệu ra khỏi Supabase

**Ý tưởng (chủ dự án, 2026-09-08):** Thêm 1 chế độ học riêng, cho phép user tự upload 1 file (JSON/CSV, format tiếng Phần - nghĩa) để luyện tập/kiểm tra ngay trong session, dùng đúng cơ chế session + retry queue đã có ở F-05, nhưng **không** insert vào `user_vocab_progress` hay bất kỳ bảng nào — dữ liệu chỉ tồn tại trong bộ nhớ trình duyệt lúc đó, mất đi khi rời trang.

**Lý do:** Cho phép luyện một file từ vựng tạm (vd từ gặp ngoài các deck đã lưu) mà **không** ghi `decks` / `vocab_items` / `user_vocab_progress`. Khác với upload deck chính thức (ghi DB, RLS, sở hữu).

**Vấn đề cần giải quyết trước khi implement:**
1. Format file input: JSON hay CSV? Cấu trúc cột/field ra sao?
2. UI upload: nơi nào trong app, luồng thao tác thế nào?
3. Vì không lưu DB, không có SRS liên-ngày cho các từ này — session này có tính là "ôn tập" theo nghĩa SRS không, hay chỉ là "luyện tập tự do" một lần?
4. Validate file input: xử lý file sai format, file rỗng, file quá lớn ra sao?

**Trạng thái:** Resolved (2026-09-28) — hiện thực thành tính năng Tự luyện file tự do (F-07), `FilePracticePage` + `lib/session.ts`, route `/practice-file`. Xem REQUIREMENTS v0.3.4.

---

## KI-004 — Ý tưởng: pretest toàn bộ unit mới thay vì đánh dấu thủ công

**Mức độ:** Enhancement (tính năng bổ sung, chưa implement — **không** thay thế F-04, có thể làm song song)  
**File liên quan:** `src/pages/UnitDetailPage.tsx` (F-04 hiện có), tương lai có thể là 1 trang/luồng riêng "Unit Pretest"

**Ý tưởng (chủ dự án, 2026-09-08):** Khi bắt đầu học 1 unit mới, hầu hết từ vựng đều chưa biết — việc tự bấm "Đánh dấu" từng từ một (F-04 hiện tại) khá thừa thãi. Đề xuất: cho phép "test nhanh" toàn bộ từ vựng của unit trước khi học chính thức — từ nào trả lời sai trong lúc pretest thì tự động thêm vào `user_vocab_progress` (giống hệt hành vi insert của `handleMark` hiện tại, nhưng trigger tự động thay vì user tự bấm), từ nào đúng thì bỏ qua không thêm vào.

**Quan hệ với F-04:** Bổ sung, không thay thế. F-04 (đánh dấu thủ công) vẫn hữu ích khi đọc bài/làm exercise gặp từ lạ giữa chừng. Pretest chỉ tối ưu hoá bước "bắt đầu 1 unit mới".

**Vấn đề cần giải quyết trước khi implement:**
1. Hình thức hỏi trong pretest — dùng chung hình thức với `ReviewPage` (gõ chữ/MCQ) hay hình thức riêng đơn giản hơn (vd chỉ "Biết/Không biết" tự nhận, không cần gõ/chọn)?
2. Unit có 100–200+ từ (Unit 1: 166, Unit 2: 211) — pretest 1 lần hết toàn bộ có quá tải không? Xem KI-007 (giới hạn batch) — có thể cần áp dụng cùng cơ chế giới hạn số từ mỗi lần.
3. Nếu user pretest dở dang (thoát giữa chừng) — xử lý thế nào? Các từ đã test nên giữ kết quả hay huỷ hết (tương tự nguyên tắc session dở dang của F-05 đã chốt trong `DECISIONS.md`)?
4. Từ pretest đúng ngay từ đầu (không thêm vào `user_vocab_progress`) — nếu user pretest lại unit đó lần 2 (vd ôn lại), có test lại từ đã pretest đúng không?

**Trạng thái:** Closed — page/bảng liên quan (`UnitDetailPage`, unit, F-04) đã bị xóa trong migration 007 (deck-based), không còn tái hiện được.

---

## KI-005 — Ý tưởng: đánh dấu từ trực tiếp trong lúc làm exercises (bôi đen → chuột phải)

**Mức độ:** Enhancement (mở rộng UX của F-04, chưa implement)  
**File liên quan:** `src/pages/UnitDetailPage.tsx` (phần render exercises), F-04 (`user_vocab_progress` insert logic đã có)

**Ý tưởng (chủ dự án, 2026-09-08):** Hiện F-04 chỉ có nút "Đánh dấu" cạnh mỗi từ trong danh sách `vocab_items`. Đề xuất mở rộng: khi đọc nội dung exercises (`prompt`, `reading_passage`, `dialogue`...), cho phép bôi đen 1 từ bất kỳ trong đoạn văn, chuột phải (hoặc menu tương tự) để thêm từ đó vào `user_vocab_progress` ngay lập tức.

**Vấn đề kỹ thuật cốt lõi chưa giải quyết được:** Từ user bôi đen trong 1 đoạn văn tự do **chưa chắc** đã tồn tại sẵn trong bảng `vocab_items` (exercises chứa câu văn tự nhiên, không phải mọi từ trong câu đều có sẵn dưới dạng 1 row `vocab_items`). Nếu từ đó chưa có trong DB:
1. Phải tạo mới 1 `vocab_items` row với `finnish_word` = từ vừa bôi đen — nhưng `translation` (nghĩa tiếng Việt) lấy từ đâu? Không có sẵn.
   - Option A: bắt user tự nhập nghĩa tay ngay lúc đó (thêm 1 bước UX, làm gián đoạn lúc đang đọc bài)
   - Option B: để `translation` trống/null, user tự điền sau — nhưng schema hiện tại `translation` là NOT NULL
   - Option C: gọi API dịch tự động bên ngoài — **vi phạm** negative scope đã chốt trong `REQUIREMENTS.md` §5 ("Tra cứu trang web ngoài — dữ liệu đổi theo thời gian thực" đã bị loại khỏi v0.1)
2. Nếu từ bôi đen là 1 dạng biến cách (declined/conjugated form) của từ gốc đã có trong `vocab_items` (vd bôi đen "kirjoitin" trong khi `vocab_items` đã có "kirjoittaa") — hệ thống không có cách nào tự nhận diện đây là cùng 1 từ, sẽ tạo duplicate

**Trạng thái:** Closed — page/bảng liên quan (`UnitDetailPage`, `exercises`) đã bị xóa trong migration 007 (deck-based), không còn tái hiện được.

---

## KI-006 — Kiểm tra: index cho `user_vocab_progress.due_date` khi data lớn dần

**Mức độ:** Low (phòng ngừa, chưa phải vấn đề thật ở quy mô hiện tại)  
**File liên quan:** `supabase/schema.sql`, bảng `user_vocab_progress`

**Bối cảnh:** Dòng `user_vocab_progress` tồn tại cho đến khi bị xóa (không có cơ chế tự động dọn). UI unmark F-04 (trên UnitDetailPage) **không còn**. Vocab tăng khi user upload / thêm từ vào deck (public hoặc private), không còn giới hạn theo giáo trình unit. Số row có thể lên tới vài nghìn/user trong dài hạn — vẫn nên phòng ngừa.

**Câu hỏi đặt ra (chủ dự án, 2026-09-08):** Số lượng từ tăng dần có cần cơ chế xoá/dọn dẹp không?

**Đánh giá:** Postgres xử lý hàng triệu row dễ dàng với bảng đơn giản như `user_vocab_progress` (8 cột). **Không** cần cơ chế "xoá tự động" ở quy mô Muisti. Vấn đề thật duy nhất là hiệu năng QUERY khi lọc `due_date <= hôm nay` nếu bảng lớn dần mà **thiếu index** phù hợp.

**Cần kiểm tra:** Bảng `user_vocab_progress` hiện có index nào ngoài PRIMARY KEY (`id`) và UNIQUE (`user_id`, `vocab_item_id`) hay chưa? Query chính của F-05 (`.eq('user_id', ...).lte('due_date', ...)`) có tận dụng được UNIQUE constraint hiện có làm index không, hay cần thêm index riêng cho (`user_id`, `due_date`)?

**Trạng thái:** Open — cần audit lại schema, có thể cần 1 migration nhỏ thêm composite index (`user_id`, `due_date`) nếu chưa tối ưu. Chưa cấp bách khi data còn nhỏ (sau wipe 007, progress trống cho đến khi có upload deck).

---

## KI-007 — Giới hạn số từ MỚI đưa vào 1 session ôn tập (batch limit)

**Mức độ:** Medium — đã xử lý (deck + mix)
**File liên quan:** `src/pages/ReviewPage.tsx` (fetch hàng đợi due), `src/lib/sessionLimits.ts`

**Vấn đề (chủ dự án, 2026-09-08; cập nhật 2026-09-14 / 2026-09-24 / 2026-09-25):** Hàng đợi SRS từng lấy **tất cả** từ có `due_date <= hôm nay`, không giới hạn số lượng. Upload deck lớn → session đầu 80–100 từ; retry queue có thể > 150–200 lượt.

**Đã làm:** `/review/:deckId` cắt `DECK_SESSION_LIMIT` (20) mỗi phiên (2026-09-24). Mix `/review` cắt `MIX_SESSION_LIMIT` (30) cùng order `due_date` + `id` (2026-09-25). Leftover giữ `due_date`. Done deck/mix: «Còn N…» + «Ôn tiếp». Extra `.limit(20)` inline không liên quan KI này.

**Trạng thái:** Closed (2026-09-25) — deck + mix đều capped theo phiên.

---

## KI-008 — Hiệu năng lấy nhiễu MCQ khi `vocab_items` lớn dần (khác KI-006)

**Mức độ:** Low (phòng ngừa; sau wipe 007 pool không còn cố định ~377 từ giáo trình)  
**File liên quan:** `src/pages/ReviewPage.tsx` (hàm `pickMcqOptions` + đoạn fetch pool truyền vào)

**Lưu ý phân biệt với KI-006:** KI-006 nói về index cho query hàng đợi SRS (`user_vocab_progress.due_date`). Entry này nói về vấn đề khác — cách lấy dữ liệu **nhiễu** cho MCQ trong `ReviewPage`.

**Bối cảnh:** `pickMcqOptions` nhận vào 1 pool (mảng string `finnish_word`) và random chọn 3 từ làm nhiễu. Pool này hiện được tạo bằng cách fetch `finnish_word` từ `vocab_items` về phía client (RLS: deck public + deck của user; ôn 1 deck thì filter theo `deck_id`), rồi random bằng JavaScript (`shuffle`) — **không** random ở phía database. Không còn mốc cố định 377 từ SM2.

**Vấn đề khi data lớn dần:** Cách "tải hết cột `finnish_word` về client rồi random" chấp nhận được khi user mới thấy ít từ, nhưng sẽ chậm dần nếu `vocab_items` tăng lên rất lớn (hàng chục nghìn, trăm nghìn từ trên các deck user được SELECT) — tốn băng thông mạng và bộ nhớ trình duyệt mỗi lần vào `ReviewPage` / bấm bắt đầu ôn, dù chỉ cần đúng 3 từ ngẫu nhiên trong số đó.

**Hướng xử lý dự kiến (chưa chốt, chưa cấp bách):** Đổi sang random ở phía database thay vì tải hết về client — ví dụ dùng RPC/SQL function kiểu `ORDER BY random() LIMIT 3` (loại trừ đáp án đúng) qua Supabase, thay vì `select('finnish_word')` rồi shuffle trong JS. Cần đánh giá lại nếu/khi vocab user thấy tăng đáng kể.

**Trạng thái:** Open — không cấp bách. Ghi nhận để theo dõi khi pool MCQ (theo deck user đang thấy) lớn hơn nhiều so với vài trăm từ. MCQ hai chiều (2026-09-28) thêm `meaningPool` (cùng SELECT `translation`) — cùng mô hình tải pool về client; hướng RPC random vẫn áp dụng nếu pool lớn.

---



