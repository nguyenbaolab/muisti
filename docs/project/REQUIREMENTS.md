# REQUIREMENTS — Muisti (Finnish Learning App)

**Phiên bản:** v0.2.6  
**Cập nhật:** 2026-09-25

**Changelog v0.2.6:** Mix `/review` tối đa 30 từ due mỗi phiên (`MIX_SESSION_LIMIT`); leftover giữ `due_date`; done mix có «Ôn tiếp» khi còn due (cùng UI deck).

**Changelog v0.2.5:** Tốt nghiệp deck (mọi từ đã enroll và `interval_days >= 30`) + «Học lại từ đầu» xóa toàn bộ `user_vocab_progress` của deck, giữ `vocab_items`.

**Changelog v0.2.4:** Phiên ôn deck (`/review/:deckId`) tối đa 20 từ đến hạn mỗi phiên (không phải mỗi ngày); leftover giữ `due_date`; màn done có «Ôn tiếp» khi còn due.

**Changelog v0.2.3:** Trang chủ là danh sách việc hôm nay theo deck sở hữu (tick từ `due_date` + `last_reviewed_at`); bỏ hero/nút Ôn tập trên Home; `?tab=public` chỉ mở tab Public lần đầu.

**Changelog v0.2.2:** Ôn thêm một deck (`/review/:deckId/extra`) — luyện từ đang học chưa đến hạn, không ghi SRS / không enroll.

**Changelog v0.2.1:** Đồng bộ docs với code — timing enroll, ghi DB giữa phiên, lỗi enroll fatal (trừ 23505), làm rõ SM-2 rút gọn, Level 1/2 roadmap, bỏ todo 377 từ ngoài phạm vi.

---

## 1. Bối cảnh đổi hướng

Muisti v1 (theo sách Suomen Mestari 2, unit/kappale) dừng ở F-06: 44 bài tập extract không đồng nhất cấu trúc `correct_answer`/`options`, không chấm tự động được một cách sạch. Bản v1 đã archive: `docs/project/REQUIREMENTS_v1_book_based.md`.

Lý do đổi hướng: ưu tiên học từ vựng hiệu quả và cho phép nguồn từ ngoài SM2, thay vì số hóa nguyên cuốn sách.

Khai thác nội dung SM2 sâu hơn (bài tập ngữ pháp, vận dụng) là mục tiêu tương lai — không phải scope giai đoạn này.

---

## 2. Mục tiêu Muisti v2 (giai đoạn hiện tại)

Ứng dụng học từ vựng **deck-based**, dùng thuật toán SRS đã kiểm chứng (scheduler lấy cảm hứng SM-2 đã rút gọn 3 mức — xem `DECISIONS.md` và `src/lib/srs.ts`) làm lõi. Người dùng tự upload bộ từ từ bất kỳ nguồn nào (không giới hạn SM2). Roadmap nhiều cấp (Level 1–4); **giai đoạn này chỉ build Level 1**.

---

## 3. Concept cốt lõi: Deck

**Trạng thái:** Done (upload + danh sách + xóa — 2026-09-14; Active Pool Enrollment — 2026-09-16; sửa metadata — 2026-09-16; preview + clone — 2026-09-16; Session Summary — 2026-09-16; trang chi tiết deck — 2026-09-16; Tổng kết Tổng AppShell — 2026-09-17; tên người chia sẻ — 2026-09-17, chờ apply 009; 2 tab `/decks` — 2026-09-18)

- **Deck** = một bộ từ vựng người dùng upload, độc lập với “unit sách”.
- Metadata: tên deck (bắt buộc); ngôn ngữ nghĩa — Anh hoặc Việt (bắt buộc); mô tả ngắn (optional); visibility public/private (default private); **số từ học cùng lúc** `active_pool_size` (10–30, default 20) lúc tạo deck.
- **Active Pool Enrollment:** Done (verify 2026-09-16). Enroll `user_vocab_progress` trong `startReview` khi bấm «Bắt đầu ôn tập» trên `/review/:deckId` nếu số từ `interval_days < 30` của user trên deck đó < `active_pool_size`. Mix `/review` và extra `/review/:deckId/extra` không enroll. Không chạy lúc mount hay lúc upload.
- **Sửa metadata deck:** Done (2026-09-16). Owner sửa `name` / `meaning_language` / `description` / `visibility` / `active_pool_size` tại `/decks/:id/edit`. Không sửa danh sách `vocab_items` (thêm/xóa/sửa từng từ) ở slice này. Public → private không còn guard (học viên dùng bản clone độc lập). Hạ `active_pool_size` dưới active_count hiện tại: cho phép (không trục xuất từ đã enroll).
- **Deck public người khác:** Done (verify 2026-09-16, tài khoản B). Xem-trước đọc-only tại `/decks/:id/preview` + **Clone** về deck riêng (`name` + ` (Copy)`, `visibility = private`, `active_pool_size = 20`, copy `vocab_items`, không copy progress). Clone + enroll Active Pool trên bản copy đã verify end-to-end. Không học trực tiếp trên deck gốc. Deck của chính mình (public hay private) vẫn ôn `/review/:deckId` như cũ.
- **Tên người chia sẻ:** Done (code 2026-09-17; **cần apply migration 009**). Deck không phải của mình trên `/decks` và `/decks/:id/preview` hiện «Chia sẻ bởi {phần trước @}» (không dấu hai chấm). Deck của mình không hiện dòng này. Không hiện email đầy đủ.
- Input: file `.txt` / `.csv`, mỗi dòng `từ_phần_lan;nghĩa`. Parse thuần code (`src/lib/deckParser.ts`) — **không** dùng AI. Tối đa 500 dòng (đếm sau khi cắt dòng trống cuối); dòng trống giữa file vẫn là lỗi; dòng lỗi chặn lưu.
- Sau parse: preview xác nhận «Xem trước» (bảng lỗi trước, rồi từ hợp lệ; mobile lỗi xếp chồng). **Không** sửa từng dòng trong preview ở slice này — file phải sạch mới Lưu được (mọi lỗi parse, kể cả dòng trống giữa file, khóa nút). Newline / dòng trống cuối file không còn là lỗi (KI-016 Closed).
- Cùng mặt chữ ở hai deck = hai `vocab_items` độc lập, hai dòng `user_vocab_progress` độc lập — không gộp, không chặn trùng.
- UI: `/decks` 2 tab **Cá nhân** / **Public** (state `activeTab`; `?tab=public` mở Public lúc mount, mọi giá trị khác / không có param mở Cá nhân; không sync tab lại URL; tablist ARIA + roving tabindex). Click own → `/decks/:id`; click không phải mình → `/decks/:id/preview`; `/decks/new` tạo (`<Link>` giả dạng Button primary); `/decks/:id/edit` sửa metadata (owner, `<Link>` Sửa trên list và trên trang chi tiết); xóa deck (owner) CASCADE vocab + progress, `window.confirm` cũ. Ôn tập vẫn `/review/:deckId` (link trên trang chi tiết). List owned hiện visibility Việt hóa «Công khai» / «Riêng tư» (chỉ hiển thị; giá trị DB `public`/`private` không đổi).
- **Nhịp học khuyến nghị (copy UI 2026-09-19):** mỗi ngày vào một hoặc vài deck bấm «Bắt đầu ôn tập» (ôn từ đến hạn của deck đó và thêm từ mới cho đủ số từ học cùng lúc), sau đó vào «Ôn tập» chung `/review` để ôn thêm một lượt các từ đến hạn của mọi deck. Mix **không** thêm từ mới. Nav `title`: Decks «Xem và học các deck của bạn»; Ôn tập «Ôn các từ đến hạn trong mọi deck».
- **2 tab `/decks`:** Done (2026-09-18; UI järvi 2026-09-19; `?tab=public` 2026-09-24). Cá nhân = deck `owner_id === user` (Sửa/Xóa, không «Chia sẻ bởi»). Public = deck không phải mình (có «Chia sẻ bởi», không Sửa/Xóa). Filter client, không đổi fetch. `tab=public` chỉ set `activeTab` ban đầu (`'public'` / `'mine'`); đổi tab không ghi URL. Dưới h1: dòng nhịp học. Tab Public (không lúc loading): «Deck công khai của người khác. Bấm vào để xem trước, rồi clone về để học.» Empty: Cá nhân «Bạn chưa có deck nào. Tạo deck mới để bắt đầu.» (cụm «Tạo deck mới» là link `/decks/new`); Public «Chưa có deck công khai nào.»
- **Trang chi tiết deck (owner):** Done (2026-09-16; UI järvi 2026-09-19; Ôn thêm 2026-09-23; cap phiên 2026-09-24; tốt nghiệp + reset 2026-09-25). `/decks/:id` chỉ chủ deck. Dưới header: «Bắt đầu ôn tập sẽ ôn các từ đến hạn (tối đa 20 từ mỗi phiên) và thêm từ mới…». 2 tab nội dung: **Từ vựng** (chú giải Chưa học / Đang học / Đã thuộc + bảng đọc-only; trạng thái: Chưa học = chưa progress, Đang học `interval_days < 30`, Đã thuộc `>= 30`; dưới sm trạng thái là dòng phụ) và **Tổng kết** (lưới: tổng từ, đã/chưa học, đã thuộc/đang học, đến hạn hôm nay; dòng «Đã học gồm cả Đã thuộc. Đến hạn hôm nay gồm cả từ đã quá hạn.» rồi «bắt đầu học từ» theo `decks.created_at`; «số ngày đã ôn» = distinct date `last_reviewed_at` — cả hai là ước lượng). Link «Bắt đầu ôn tập» `/review/:id` và link «Sửa» `/decks/:id/edit` — không phải tab nội dung. **Ôn thêm:** từ `progressRows` đã tải (không query mới), `dueTodayCount` = `due_date <= today`, `extraCandidatesCount` = `interval_days < 30` AND `due_date > today`. Chỉ khi `dueTodayCount === 0` AND `extraCandidatesCount > 0`: Link secondary «Ôn thêm (không tính vào lịch)» → `/review/:id/extra` cạnh «Bắt đầu ôn tập», cộng đoạn giải thích dưới header. Không hiện khi còn due hôm nay hoặc hết từ đang học chưa đến hạn. **Tốt nghiệp deck:** `isGraduated` = `totalWords > 0` AND `notEnrolledCount === 0` AND `graduatedCount === totalWords` (mọi từ trong deck đã enroll và đều `interval_days >= 30` — không chỉ “từ đã enroll đều thuộc” khi còn từ chưa học). Khi true: đoạn muted «Chúc mừng! Bạn đã tốt nghiệp toàn bộ deck này…» + Button secondary «Học lại từ đầu» (sau «Sửa»). **Reset:** `window.confirm` (không hoàn tác); DELETE toàn bộ `user_vocab_progress` của user trên các `vocab_item_id` của deck (giữ nguyên `vocab_items` và `decks.active_pool_size`); refetch progress tại chỗ; lỗi hiện `actionError` trên trang. Non-owner gõ URL: thông báo không quyền + link `/preview`, không lộ số liệu.
- **Tổng kết Tổng (trang chủ):** Done (2026-09-17; UI järvi 2026-09-19; việc hôm nay 2026-09-24). `/` (`HomePage` trong `AppLayout`) sau login, khi user có ≥ 1 deck sở hữu: khối viền **Việc hôm nay** thay hero số «Đến hạn hôm nay» + nút Ôn tập + dòng mix (nav Ôn tập → `/review` giữ). Dưới khối: lưới 6 số **chỉ deck sở hữu** (tổng deck, tổng từ, đã học / chưa học, đã thuộc / đang học) — không đổi. Không tính deck public người khác chưa Clone. Không streak / thời gian học / số ngày ôn ở mức tổng. **Hàng việc:** mỗi deck sở hữu tối đa một hàng, cả hàng là `<Link>` → `/decks/{id}`; indicator check không tương tác (`<span role="img">` «Đã xong» / «Chưa xong», không button/input). `dueCount > 0` (progress deck đó, `due_date <= hôm nay` qua `todayLocalIsoDate()`): chưa xong; title tên deck; subtitle «{n} từ đến hạn». `dueCount === 0` và có ≥ 1 progress deck đó `last_reviewed_at` thuộc ngày lịch **local** hôm nay (lọc `.gte('last_reviewed_at', localMidnightIso)`, `localMidnightIso = new Date(y, m, d, 0, 0, 0, 0).toISOString()` — không so prefix UTC): đã xong; title muted gạch ngang; subtitle «Xong hôm nay»; indicator xanh có dấu check. Deck khác: không hàng. Thứ tự: chưa xong trước (`dueCount` giảm, hòa `created_at` tăng), rồi hàng đã xong. **Gợi ý:** chỉ khi `totalDueRemaining` (tổng `dueCount` deck sở hữu) `<= LOW_WORK_THRESHOLD` (hằng 10 trên `HomePage`). Tìm deck sở hữu đầu theo `created_at` tăng, `vocab_items` count > 0, **zero** `user_vocab_progress` (query rẻ `id` + `vocab_items!inner(deck_id)`, `.eq` deck, `.limit(1)`, tuần tự, chỉ khi đủ điều kiện gợi ý, dừng ở match đầu). Có: «Bắt đầu học: {tên}» → `/decks/{id}`. Không: «Tìm deck công khai để học» → `/decks?tab=public`. Hàng gợi ý không indicator, nhẹ hơn hàng việc. Không có hàng việc: «Hôm nay không còn từ nào đến hạn.» phía trên gợi ý. Chưa có deck → empty cũ: «Chưa có deck nào.» + dòng phụ file (`từ tiếng Phần Lan;nghĩa`) + `<Link>` «Tạo deck mới» (`/decks/new`). Header chung (Decks, Ôn tập, ThemeToggle, Đăng xuất) trên các route deck; `/review`, `/review/:deckId` và `/review/:deckId/extra` không có header. Không hiện email trên header.
- **Cap phiên ôn deck / mix:** Done (deck 2026-09-24; mix 2026-09-25). `/review/:deckId` (không extra) lấy tối đa `DECK_SESSION_LIMIT` (20) dòng due (`due_date` tăng, hòa `id`). Mix `/review` lấy tối đa `MIX_SESSION_LIMIT` (30) cùng order; **không** cân bằng theo deck, **không** chọn deck trong mix. Leftover **giữ** `due_date` — không dời lịch. Extra giữ `.limit(20)` inline riêng. Enroll Active Pool không đổi.
- **Session Summary:** Done (2026-09-16; UI järvi Đợt A 2026-09-19; Ôn tiếp deck 2026-09-24; Ôn tiếp mix 2026-09-25). Khi `pageState === 'done'`: số từ đã ôn, thời gian (`Date.now() - sessionStartTime`, không trừ idle), đếm 3 mức SRS theo `wrongCount` (Nhớ dễ = 0 / Nhớ = 1 / Quên ≥ 2), lưới 3 ô, VocabTable «Từ cần chú ý» nếu có từ Quên (không render bảng khi rỗng). Trên `/review/:deckId` hiện «Có N từ mới…» nếu `enrolledCount > 0`; mix `/review` không hiện dòng đó. Extra `/review/:deckId/extra`: không dòng từ mới, không ngày ôn kế, dòng muted «Phiên này chỉ để luyện tập. Lịch ôn không đổi.» (wrongCount / bảng quên vẫn tính trong memory). Deck hoặc mix (không extra) khi `remainingDue > 0`: dòng tổng bỏ «hôm nay», thêm «Còn N từ đến hạn hôm nay.», Button primary «Ôn tiếp» gọi `startReview`; «Về trang chủ» / «Xem decks» chuyển secondary. Extra / không leftover: hai Link «Về trang chủ» / «Xem decks» như cũ.
- **Setup Review:** Mix: «Tất cả từ đang đến hạn» + «Chỉ ôn các từ đến hạn trong mọi deck (tối đa 30 từ mỗi phiên), không thêm từ mới…». Deck: «Deck: {name}» + «Ôn các từ đến hạn của deck này (tối đa 20 từ mỗi phiên) và tự thêm từ mới…». Extra: badge «Ôn thêm, không tính vào lịch» + «Luyện các từ đang học chưa đến hạn…». Không hiện số due/enroll. Gợi ý phím setup `hidden sm:block`.
- **Ôn thêm (extra, một deck):** Done (2026-09-23). Route `/review/:deckId/extra` (không query string). Owner + scope deck như `/review/:deckId`. Không `enrollActivePool`. Fetch tối đa 20 dòng `interval_days < 30` AND `due_date > today`, `due_date` tăng dần. Cùng UI gõ chữ / MCQ / queue / feedback / done. **Không ghi DB** (`persistCard` bỏ qua; `saving` không phụ thuộc UPDATE). 0 hàng → empty «Không còn từ nào để ôn thêm.» + link về deck. Badge extra trên setup và lúc ôn. Không đổi hành vi mix / deck.
- **Preview người khác:** dưới header «Clone tạo một bản sao riêng tư cho bạn. Tiến độ học không được sao chép.»
- **Số từ học cùng lúc (DeckForm):** «Mỗi lần vào ôn deck, hệ thống thêm từ mới cho đủ số này. Từ nhớ lâu rời khỏi nhóm đang học.» Edit thêm: «Đổi số này không xóa từ đang học…»

---

## 4. Hệ thống cấp độ học (Level system)

Level thuộc về **từng từ** (`vocab_item`), không phải cả deck. Trong một deck, các từ có thể ở level khác nhau tùy tốc độ học.

### Level 1 (scope hiện tại) — Nhận diện + Recall qua SRS

Chính là thuật toán đã chốt và implement ở T1.5 — **không thiết kế lại**, chỉ đổi nguồn dữ liệu từ unit sang deck. Chi tiết công thức: `DECISIONS.md` (entry “Thuật toán SRS: SM-2 rút gọn 3 mức…”); code: `src/lib/srs.ts` (`classifyAttempt`, `computeNextReview`). Màn học hiện nghĩa và hỏi từ tiếng Phần Lan (`ReviewPage` không đọc `meaning_language`).

- Cơ chế 2 tầng: retry queue trong session (sai không ghi DB) + `persistCard` UPDATE đúng 1 lần khi từ trả đúng lần cuối trong session; trên `/review/:deckId`, `enrollActivePool` INSERT từ mới lúc bắt đầu phiên (trước khi trả lời). Extra `/review/:deckId/extra` không enroll và không `persistCard`.
- 3 mức tự động theo `wrong_count`: Nhớ dễ (`0` → `easy`) / Nhớ (`1` → `good`) / Quên (`>=2` → `forgot`).
- Điều kiện “sẵn sàng lên Level 2” (3 lần đúng liên tiếp trong SRS): **chưa triển khai / roadmap** — không có cột hay logic trong code.
- Hai chế độ trả lời: Gõ chữ; Trắc nghiệm (MCQ). Fallback về gõ chữ khi không đủ 3 distractor (`pickMcqOptions` trả `null`).
- **Màn học (UI järvi Đợt B 2026-09-19):** tiến độ `{đã xong} / {tổng phiên} từ` derived (`completedCards.length` và `queue.length`), không state mới. Gợi ý phím (chỉ `sm+`, `aria-hidden`): Enter để trả lời / A–D / Enter để tiếp tục — không đổi logic phím.
- **Phím tắt lúc ôn** (`pageState === 'reviewing'`): Gõ chữ — Enter submit form (lần 1), Enter lần 2 (đã có feedback) → câu tiếp. MCQ — A/B/C/D chọn + submit ngay; Enter sau feedback → câu tiếp. Chuột (radio / Trả lời / Tiếp theo) vẫn dùng được. Không áp dụng ở setup/done/error/empty.

### Level 2 (tương lai — không build giai đoạn này)

Recall chủ động: thấy nghĩa, gõ ra từ tiếng Phần Lan.

**Ghi chú (2026-09-21):** Ranh giới L1 / L2 hiện **mờ** — UI Level 1 đã hỏi theo hướng nghĩa → từ Phần Lan. Cần định nghĩa lại trước khi scope L2. `user_vocab_progress` **không** có cột level; theo dõi theo level sẽ cần đổi schema.

### Level 3 (tương lai — không build giai đoạn này)

Ngữ cảnh: đọc câu/đoạn có chỗ trống chứa từ. Cần Ollama local (`qwen3.5:9b`) để sinh nội dung.

### Level 4 (tương lai — không build giai đoạn này)

Vận dụng viết tự do, cần AI chấm bài. Ollama local hiện có (`qwen3.5:9b`, `gemma4:e4b`, `deepseek-r1:7b`, `qwen2.5:latest`, `qwen2.5-coder:7b`, `llama3.1:8b`) **không** đủ độ tin cậy để chấm viết tiếng Phần Lan tự do — khi tới giai đoạn này cần cân nhắc Claude API (Haiku).

---

## 5. Negative scope — Cố ý không làm ở giai đoạn này

- Bỏ hẳn khái niệm “unit sách” / `book_code` / kappale làm trung tâm
- Bỏ hẳn bảng `exercises` và toàn bộ F-06 (chấm mcq/fill_blank theo cấu trúc sách)
- Không build Level 2 / 3 / 4 (roadmap, không phải việc đang làm)
- Không dùng AI / Ollama ở bất kỳ đâu trong Level 1 (parse deck và chấm Level 1 đều thuần code)
- Không mô phỏng format đề thi YKI (không audio, không đọc/viết theo chuẩn thi chính thức) — hướng đã cân nhắc và loại bỏ

---

## 6. Việc tái sử dụng từ Muisti v1

- Giữ: Supabase Auth, RLS pattern, Vite + React + TypeScript, Cloudflare Pages, `src/lib/srs.ts` (SM-2 rút gọn), ReviewPage + retry queue, cấu trúc cốt lõi bảng `user_vocab_progress`.
- 377 từ Unit 1+2 SM2: **ngoài phạm vi project** — user tự upload nếu cần; không còn todo / seed trong repo.
