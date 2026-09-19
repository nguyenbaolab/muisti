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

**Trạng thái:** Open — ý tưởng ghi nhận, **không** đưa vào Phase 1 (MVP). Nằm ngoài `REQUIREMENTS.md` hiện tại, cần thêm feature ID mới nếu làm (vd F-07) và REQUIREMENTS riêng.

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

**Mức độ:** Medium — có thể ảnh hưởng trải nghiệm thật sớm (ngay khi user đưa nhiều từ mới vào ôn cùng lúc, vd upload một deck lớn)  
**File liên quan:** `src/pages/ReviewPage.tsx` (fetch hàng đợi due)

**Vấn đề (chủ dự án, 2026-09-08; cập nhật 2026-09-14):** Hàng đợi SRS lấy **tất cả** từ có `due_date <= hôm nay`, không giới hạn số lượng. Nếu user thêm 80–100 từ mới trong 1 lần (vd upload một deck), `due_date` mặc định là hôm nay cho tất cả — nghĩa là ngay session ôn đầu tiên đã phải xử lý 80–100 từ cùng lúc. Với retry queue (từ sai phải hỏi lại), tổng số lượt hỏi trong 1 session có thể vượt 150–200+ lượt — quá tải, dễ gây chán nản, bỏ dở giữa chừng.

**Nghiên cứu tham khảo (2026-09-08):** Anki có khái niệm "new cards per day" — giới hạn số thẻ **mới** (chưa từng ôn) được đưa vào hàng đợi mỗi ngày, tách biệt với số lượt "review" (thẻ cũ quay lại theo lịch). Khuyến nghị phổ biến: 10–20 thẻ mới/ngày là mức bền vững; vượt quá dễ dẫn tới "review overload" tích luỹ (mỗi thẻ mới thêm vào sẽ quay lại nhiều lần trong tương lai, cộng dồn theo cấp số nhân nếu học quá nhanh). Nguồn: Anki official docs (docs.ankiweb.net/deck-options.html), cộng đồng khuyến nghị 10–20/ngày (nhiều bài viết độc lập).

**Hướng xử lý dự kiến (chưa chốt, cần bàn kỹ trước khi implement):**
1. Giới hạn số từ `review_count = 0` (chưa từng ôn lần nào) được đưa vào 1 session — vd tối đa N từ mới/ngày (N cụ thể cần bàn, tham khảo 10–20 theo Anki). Muisti hiện **là** deck-based: user tự upload deck (public/private), không còn giáo trình unit cố định — bối cảnh gần Anki hơn hướng sách cũ.
2. Từ mới **vượt** quá giới hạn N thì xử lý sao — vẫn hiện `due_date` = hôm nay trong DB (để sau này tự nhiên due) nhưng **không** đưa vào session hôm nay? Hay dời `due_date` của phần dư sang ngày mai/các ngày sau (dàn đều ra)?
3. Từ `review_count > 0` (đã ôn ít nhất 1 lần, đang quay lại theo lịch SRS bình thường) — có tính vào giới hạn N không, hay chỉ áp dụng riêng cho từ hoàn toàn mới?
4. Cần UI thông báo rõ cho user khi có từ due nhưng bị hoãn do giới hạn batch (vd "Còn 45 từ mới sẽ xuất hiện trong các ngày tới")

**Trạng thái:** Open — vấn đề thật, dễ gặp ngay khi upload deck lớn (mọi từ mới due hôm nay). Ưu tiên bàn kỹ + chốt DECISIONS trước khi implement; ảnh hưởng trực tiếp ReviewPage / SRS.

---

## KI-008 — Hiệu năng lấy nhiễu MCQ khi `vocab_items` lớn dần (khác KI-006)

**Mức độ:** Low (phòng ngừa; sau wipe 007 pool không còn cố định ~377 từ giáo trình)  
**File liên quan:** `src/pages/ReviewPage.tsx` (hàm `pickMcqOptions` + đoạn fetch pool truyền vào)

**Lưu ý phân biệt với KI-006:** KI-006 nói về index cho query hàng đợi SRS (`user_vocab_progress.due_date`). Entry này nói về vấn đề khác — cách lấy dữ liệu **nhiễu** cho MCQ trong `ReviewPage`.

**Bối cảnh:** `pickMcqOptions` nhận vào 1 pool (mảng string `finnish_word`) và random chọn 3 từ làm nhiễu. Pool này hiện được tạo bằng cách fetch `finnish_word` từ `vocab_items` về phía client (RLS: deck public + deck của user; ôn 1 deck thì filter theo `deck_id`), rồi random bằng JavaScript (`shuffle`) — **không** random ở phía database. Không còn mốc cố định 377 từ SM2.

**Vấn đề khi data lớn dần:** Cách "tải hết cột `finnish_word` về client rồi random" chấp nhận được khi user mới thấy ít từ, nhưng sẽ chậm dần nếu `vocab_items` tăng lên rất lớn (hàng chục nghìn, trăm nghìn từ trên các deck user được SELECT) — tốn băng thông mạng và bộ nhớ trình duyệt mỗi lần vào `ReviewPage` / bấm bắt đầu ôn, dù chỉ cần đúng 3 từ ngẫu nhiên trong số đó.

**Hướng xử lý dự kiến (chưa chốt, chưa cấp bách):** Đổi sang random ở phía database thay vì tải hết về client — ví dụ dùng RPC/SQL function kiểu `ORDER BY random() LIMIT 3` (loại trừ đáp án đúng) qua Supabase, thay vì `select('finnish_word')` rồi shuffle trong JS. Cần đánh giá lại nếu/khi vocab user thấy tăng đáng kể.

**Trạng thái:** Open — không cấp bách. Ghi nhận để theo dõi khi pool MCQ (theo deck user đang thấy) lớn hơn nhiều so với vài trăm từ.

---



