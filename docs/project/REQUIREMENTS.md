# REQUIREMENTS — Muisti (Finnish Learning App)

**Phiên bản:** v0.2  
**Cập nhật:** 2026-09-19

---

## 1. Bối cảnh đổi hướng

Muisti v1 (theo sách Suomen Mestari 2, unit/kappale) dừng ở F-06: 44 bài tập extract không đồng nhất cấu trúc `correct_answer`/`options`, không chấm tự động được một cách sạch. Bản v1 đã archive: `docs/project/REQUIREMENTS_v1_book_based.md`.

Lý do đổi hướng: ưu tiên học từ vựng hiệu quả và cho phép nguồn từ ngoài SM2, thay vì số hóa nguyên cuốn sách.

Khai thác nội dung SM2 sâu hơn (bài tập ngữ pháp, vận dụng) là mục tiêu tương lai — không phải scope giai đoạn này.

---

## 2. Mục tiêu Muisti v2 (giai đoạn hiện tại)

Ứng dụng học từ vựng **deck-based**, dùng thuật toán SRS đã kiểm chứng (SM-2 rút gọn 3 mức — xem `DECISIONS.md` và `src/lib/srs.ts`) làm lõi. Người dùng tự upload bộ từ từ bất kỳ nguồn nào (không giới hạn SM2). Roadmap nhiều cấp (Level 1–4); **giai đoạn này chỉ build Level 1**.

---

## 3. Concept cốt lõi: Deck

**Trạng thái:** Done (upload + danh sách + xóa — 2026-09-14; Active Pool Enrollment — 2026-09-16; sửa metadata — 2026-09-16; preview + clone — 2026-09-16; Session Summary — 2026-09-16; trang chi tiết deck — 2026-09-16; Tổng kết Tổng AppShell — 2026-09-17; tên người chia sẻ — 2026-09-17, chờ apply 009; 2 tab `/decks` — 2026-09-18)

- **Deck** = một bộ từ vựng người dùng upload, độc lập với “unit sách”.
- Metadata: tên deck (bắt buộc); ngôn ngữ nghĩa — Anh hoặc Việt (bắt buộc); mô tả ngắn (optional); visibility public/private (default private); **số từ học cùng lúc** `active_pool_size` (10–30, default 20) lúc tạo deck.
- **Active Pool Enrollment:** Done (verify 2026-09-16). Enroll `user_vocab_progress` khi bấm ôn `/review/:deckId` nếu số từ `interval_days < 30` của user trên deck đó < `active_pool_size`. Mix `/review` không enroll.
- **Sửa metadata deck:** Done (2026-09-16). Owner sửa `name` / `meaning_language` / `description` / `visibility` / `active_pool_size` tại `/decks/:id/edit`. Không sửa danh sách `vocab_items` (thêm/xóa/sửa từng từ) ở slice này. Public → private không còn guard (học viên dùng bản clone độc lập). Hạ `active_pool_size` dưới active_count hiện tại: cho phép (không trục xuất từ đã enroll).
- **Deck public người khác:** Done (verify 2026-09-16, tài khoản B). Xem-trước đọc-only tại `/decks/:id/preview` + **Clone** về deck riêng (`name` + ` (Copy)`, `visibility = private`, `active_pool_size = 20`, copy `vocab_items`, không copy progress). Clone + enroll Active Pool trên bản copy đã verify end-to-end. Không học trực tiếp trên deck gốc. Deck của chính mình (public hay private) vẫn ôn `/review/:deckId` như cũ.
- **Tên người chia sẻ:** Done (code 2026-09-17; **cần apply migration 009**). Deck không phải của mình trên `/decks` và `/decks/:id/preview` hiện «Chia sẻ bởi {phần trước @}» (không dấu hai chấm). Deck của mình không hiện dòng này. Không hiện email đầy đủ.
- Input: file `.txt` / `.csv`, mỗi dòng `từ_phần_lan;nghĩa`. Parse thuần code (`src/lib/deckParser.ts`) — **không** dùng AI. Tối đa 500 dòng; dòng lỗi chặn lưu.
- Sau parse: preview xác nhận «Xem trước» (bảng lỗi trước, rồi từ hợp lệ; mobile lỗi xếp chồng). **Không** sửa từng dòng trong preview ở slice này — file phải sạch mới Lưu được (mọi lỗi parse, kể cả dòng trống, khóa nút).
- Cùng mặt chữ ở hai deck = hai `vocab_items` độc lập, hai dòng `user_vocab_progress` độc lập — không gộp, không chặn trùng.
- UI: `/decks` 2 tab **Cá nhân** / **Public** (state `activeTab`, không đổi URL; default Cá nhân; tablist ARIA + roving tabindex). Click own → `/decks/:id`; click không phải mình → `/decks/:id/preview`; `/decks/new` tạo (`<Link>` giả dạng Button primary); `/decks/:id/edit` sửa metadata (owner, `<Link>` Sửa trên list và trên trang chi tiết); xóa deck (owner) CASCADE vocab + progress, `window.confirm` cũ. Ôn tập vẫn `/review/:deckId` (link trên trang chi tiết). List owned hiện visibility Việt hóa «Công khai» / «Riêng tư» (chỉ hiển thị; giá trị DB `public`/`private` không đổi).
- **2 tab `/decks`:** Done (2026-09-18; UI järvi 2026-09-19). Cá nhân = deck `owner_id === user` (Sửa/Xóa, không «Chia sẻ bởi»). Public = deck không phải mình (có «Chia sẻ bởi», không Sửa/Xóa). Filter client, không đổi fetch. Empty: Cá nhân «Bạn chưa có deck nào. Tạo deck mới để bắt đầu.» (cụm «Tạo deck mới» là link `/decks/new`); Public «Chưa có deck công khai nào.»
- **Trang chi tiết deck (owner):** Done (2026-09-16; UI järvi 2026-09-19). `/decks/:id` chỉ chủ deck. 2 tab nội dung: **Từ vựng** (bảng đọc-only + cột Trạng thái: Chưa học / Đang học `interval_days < 30` / Đã thuộc `>= 30`; dưới sm trạng thái là dòng phụ) và **Tổng kết** (lưới: tổng từ, đã/chưa học, đã thuộc/đang học, đến hạn hôm nay; «bắt đầu học từ» theo `decks.created_at`; «số ngày đã ôn» = distinct date `last_reviewed_at` — cả hai là ước lượng). Link «Bắt đầu ôn tập» `/review/:id` và link «Sửa» `/decks/:id/edit` — không phải tab nội dung. Non-owner gõ URL: thông báo không quyền + link `/preview`, không lộ số liệu.
- **Tổng kết Tổng (trang chủ):** Done (2026-09-17; UI järvi 2026-09-19). `/` (`HomePage` trong `AppLayout`) sau login hiện số liệu gộp **chỉ deck user sở hữu**: tổng deck, tổng từ, đã học / chưa học, đã thuộc / đang học, đến hạn hôm nay (số lớn + nút Ôn tập). Không tính deck public người khác chưa Clone. Không streak / thời gian học / số ngày ôn ở mức tổng (những số đó chỉ trên tab Tổng kết từng deck). Chưa có deck → gợi ý + link `/decks/new`. Header chung (Decks, Ôn tập, ThemeToggle, Đăng xuất) trên các route deck; `/review` và `/review/:deckId` không có header. Không hiện email trên header.
- **Session Summary:** Done (2026-09-16; UI järvi Đợt A 2026-09-19). Khi `pageState === 'done'`: số từ đã ôn, thời gian (`Date.now() - sessionStartTime`, không trừ idle), đếm 3 mức SRS theo `wrongCount` (Nhớ dễ = 0 / Nhớ = 1 / Quên ≥ 2), lưới 3 ô, VocabTable «Từ cần chú ý» nếu có từ Quên (không render bảng khi rỗng). Trên `/review/:deckId` hiện «Có N từ mới…» nếu `enrolledCount > 0`; mix `/review` không hiện dòng đó. Hai Link: «Về trang chủ» / «Xem decks».

---

## 4. Hệ thống cấp độ học (Level system)

Level thuộc về **từng từ** (`vocab_item`), không phải cả deck. Trong một deck, các từ có thể ở level khác nhau tùy tốc độ học.

### Level 1 (scope hiện tại) — Nhận diện + Recall qua SRS

Chính là thuật toán đã chốt và implement ở T1.5 — **không thiết kế lại**, chỉ đổi nguồn dữ liệu từ unit sang deck. Chi tiết công thức: `DECISIONS.md` (entry “Thuật toán SRS: SM-2 rút gọn 3 mức…”); code: `src/lib/srs.ts` (`classifyAttempt`, `computeNextReview`).

- Cơ chế 2 tầng: retry queue trong session (client-side, không ghi DB giữa chừng) + cập nhật DB đúng 1 lần khi từ “trả hết nợ” (đúng ở lần hỏi cuối).
- 3 mức tự động theo `wrong_count`: Nhớ dễ (`0` → `easy`) / Nhớ (`1` → `good`) / Quên (`>=2` → `forgot`).
- Điều kiện “sẵn sàng lên Level 2” (chỉ đánh dấu; Level 2 chưa build): 3 lần đúng liên tiếp trong SRS.
- Hai chế độ trả lời: Gõ chữ; Trắc nghiệm (MCQ). Fallback về gõ chữ khi không đủ 3 distractor (`pickMcqOptions` trả `null`).
- **Phím tắt lúc ôn** (`pageState === 'reviewing'`): Gõ chữ — Enter submit form (lần 1), Enter lần 2 (đã có feedback) → câu tiếp. MCQ — A/B/C/D chọn + submit ngay; Enter sau feedback → câu tiếp. Chuột (radio / Trả lời / Tiếp theo) vẫn dùng được. Không áp dụng ở setup/done/error/empty.

### Level 2 (tương lai — không build giai đoạn này)

Recall chủ động: thấy nghĩa, gõ ra từ tiếng Phần Lan.

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

- Giữ: Supabase Auth, RLS pattern, Vite + React + TypeScript, Cloudflare Pages, `src/lib/srs.ts` (SM-2), ReviewPage + retry queue, cấu trúc cốt lõi bảng `user_vocab_progress`.
- 377 từ đã soạn (Unit 1+2 SM2) re-import thành deck đầu tiên **qua luồng upload deck thật** — không viết script seed riêng; vừa có data vừa test tính năng.
