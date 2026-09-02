# REQUIREMENTS — Muisti (Finnish Learning App)

**Phiên bản:** v0.1  
**Cập nhật:** 2026-09-02

---

## 1. Tổng quan

Muisti là web app học tiếng Phần Lan theo giáo trình Suomen Mestari 1. Nội dung bài học dùng chung cho mọi người; tiến độ ôn tập từ vựng (SRS) thì riêng từng người. v0.1 phục vụ chủ dự án và nhóm bạn được mời — không public.

---

## 2. Người dùng

- **Chủ dự án:** học, test, và admin — mời người khác bằng email qua Supabase Auth (`inviteUserByEmail`).
- **Bạn bè được mời:** nhận link invite, đặt mật khẩu, học cùng nội dung, có hàng đợi SRS riêng.
- **Không có** form đăng ký công khai. Admin tự thêm email; người được mời không tự tạo tài khoản.

---

## 3. Tính năng v0.1

| ID | Tên | Trạng thái | Mô tả ngắn |
|----|-----|------------|------------|
| F-01 | Đăng nhập | Pending | Login qua Supabase Auth; tài khoản chỉ có sau khi admin invite; không form đăng ký |
| F-02 | Danh sách unit | Pending | Mọi user authenticated thấy cùng một danh sách unit; không khoá unit theo tốc độ người khác |
| F-03 | Học unit | Pending | Mở 1 unit: xem từ vựng + làm exercises của unit đó |
| F-04 | Đánh dấu từ chưa biết | Pending | Bôi đen / đánh dấu từ → thêm vào `user_vocab_progress` (hàng đợi SRS) |
| F-05 | Ôn tập SRS hàng ngày | Pending | Hàng đợi các từ có `due_date <= hôm nay`, theo lịch sử nhớ/quên của từng user |
| F-06 | Chấm bài tự động | Pending | MCQ / fill-blank: so khớp string phía client; chưa cần AI runtime |

---

## 4. Schema Supabase (đề xuất, chưa chạy migration)

### Bảng dùng chung (content — chỉ ghi qua service role, không qua client)

**units**
- id (uuid, pk)
- number (int) — số thứ tự unit trong sách
- title (text)
- description (text, nullable)
- created_at (timestamptz)

**vocab_items**
- id (uuid, pk)
- unit_id (fk → units)
- finnish_word (text)
- translation (text)
- part_of_speech (text, nullable)
- example_sentence (text, nullable)
- notes (text, nullable) — vd ghi chú ngữ pháp, cách chia
- created_at (timestamptz)

**exercises**
- id (uuid, pk)
- unit_id (fk → units)
- type (text) — enum chính thức, xem bảng `exercises.type` bên dưới
- prompt (text) — câu hỏi / đề bài chữ; không chứa mô tả tranh
- scene_description (text, nullable) — dùng cho bài tập mà đề gốc phụ thuộc hoàn toàn vào tranh vẽ (không có tranh thì đề vô nghĩa). Claude mô tả lại cảnh bằng chữ lúc authoring; mô tả phải khách quan (chỉ nêu người/vật/hành động quan sát được), **không** diễn giải sẵn ý định hoặc đáp án. Tách biệt với `prompt`. UI: hiển thị khung riêng, không gộp chung đoạn văn với câu hỏi — styling để ngỏ lúc scaffold.
- correct_answer (jsonb) — linh hoạt theo type
- options (jsonb, nullable) — cho mcq/matching
- created_at (timestamptz)

**exercises.type** (core set)

| Type | Mô tả |
|------|--------|
| `mcq` | Trắc nghiệm chọn 1 đáp án |
| `fill_blank` | Điền từ vào chỗ trống |
| `matching` | Nối cặp |
| `true_false_correction` | Đúng/sai + sửa câu nếu sai |
| `true_false` | Đúng/sai đơn giản, không cần sửa |
| `sentence_correction` | Cho câu sai sẵn, viết lại đúng |
| `conjugation_drill` | Chia động từ theo mẫu |
| `case_fill` | Biến cách danh/tính từ theo mẫu |
| `sentence_transform` | Viết lại câu ở dạng/thì khác, chấp nhận nhiều đáp án |
| `cloze_passage` | Điền nhiều chỗ trống trong đoạn văn liền mạch |
| `word_arrange` | Ghép từ rời thành câu đúng |
| `reading_comprehension_qa` | Đọc đoạn văn, trả lời câu hỏi mở, chấm linh hoạt |
| `odd_one_out` | Chọn từ lạc loài trong nhóm + giải thích |
| `picture_prompt_writing` | Viết đoạn/câu chuyện dựa trên chuỗi tranh dẫn dắt (không chấm điểm tự động; cần `scene_description`) |
| `guided_composition` | Viết đoạn theo khung câu hỏi gợi ý, không chấm điểm tự động |
| `free_practice` | Luyện nói/viết tự do, không chấm điểm |
| `reference_table` | Bảng dữ liệu tham khảo, không phải bài chấm điểm |

Enum này chốt từ scan cấu trúc 3 unit đầu (Suomen Mestari 2, Kappale 1–3), được coi là **core set** — có thể mở rộng thêm khi full-extract các unit sau phát hiện pattern mới lặp lại, không phải danh sách đóng băng vĩnh viễn.

### Bảng theo từng user (progress — RLS theo `auth.uid()`)

**user_vocab_progress**
- id (uuid, pk)
- user_id (fk → auth.users)
- vocab_item_id (fk → vocab_items)
- ease_factor (float, default 2.5)
- interval_days (int, default 0)
- due_date (date)
- review_count (int, default 0)
- last_reviewed_at (timestamptz, nullable)
- unique(user_id, vocab_item_id)

**quiz_attempts**
- id (uuid, pk)
- user_id (fk → auth.users)
- exercise_id (fk → exercises)
- submitted_answer (jsonb)
- is_correct (bool)
- attempted_at (timestamptz)

**user_unit_progress**
- id (uuid, pk)
- user_id (fk → auth.users)
- unit_id (fk → units)
- status (text) — `'not_started'` \| `'in_progress'` \| `'completed'`
- updated_at (timestamptz)
- unique(user_id, unit_id)
- Chỉ dùng để thống kê cá nhân, **không** dùng để khoá quyền xem unit khác (xem `DECISIONS.md`)

### RLS

- Mọi bảng theo user (`user_vocab_progress`, `quiz_attempts`, `user_unit_progress`): policy `user_id = auth.uid()` cho select/insert/update
- Bảng content (`units`, `vocab_items`, `exercises`): select cho mọi authenticated user; insert/update/delete chỉ qua service role

---

## 5. Negative scope — Cố ý không làm ở v0.1

- Cá nhân hoá pacing / unlock unit theo tốc độ riêng của từng người (đã quyết định không làm — xem `DECISIONS.md`)
- Chấm bài tự luận bằng AI (Anthropic API / Cloudflare Function)
- App báo thức (đọc chung Supabase — dự án tách riêng)
- Bài nghe (cần audio, sách không kèm file âm thanh)
- Tra cứu trang web ngoài (dữ liệu đổi theo thời gian thực)
- Trò chơi xúc xắc / bàn cờ (cơ chế UI riêng, effort không đáng)
- Bản đồ / dữ liệu địa phương cá nhân của người học (phụ thuộc thông tin riêng từng người dùng, không phải nội dung tĩnh trong sách)
- Ô chữ (crossword) — quy đổi thành `fill_blank` dạng danh sách khi extract thật, không xây UI lưới ô chữ riêng

---

## 6. Versioning

Bắt đầu **v0.1**. Bump khi đóng phase hoặc đổi schema/tính năng đã ship. Schema đề xuất ở §4 chưa chạy migration.
