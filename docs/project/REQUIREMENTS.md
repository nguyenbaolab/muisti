# REQUIREMENTS — Muisti (Finnish Learning App)

**Phiên bản:** v0.1  
**Cập nhật:** 2026-09-01

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
- type (text) — `'mcq'` \| `'fill_blank'` \| `'matching'` \| … (mở rộng sau khi recon sách thật, chưa chốt hết loại)
- prompt (text)
- correct_answer (jsonb) — linh hoạt theo type
- options (jsonb, nullable) — cho mcq/matching
- created_at (timestamptz)

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

---

## 6. Versioning

Bắt đầu **v0.1**. Bump khi đóng phase hoặc đổi schema/tính năng đã ship. Schema đề xuất ở §4 chưa chạy migration.
