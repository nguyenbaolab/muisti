# PLAN — Phase 1: Nền tảng + MVP học unit

**Trạng thái phase:** In Progress  
**Version mục tiêu:** v0.1

## §1 Mục tiêu

Scaffold web app (Vite + React + TS + Supabase + Cloudflare Pages) và ship MVP: login invite-only, xem/học unit, đánh dấu từ, ôn SRS, chấm MCQ/fill-blank phía client.

## §2 Scope

**In scope:** T1.0 (scaffold) + F-01 … F-06 trong `docs/project/REQUIREMENTS.md`.

**Phụ thuộc ngoài code:** PDF unit 1 và unit 2 — full-extract nội dung thật (từ vựng, ngữ pháp, bài tập, đã qua soát) phải hoàn tất trước khi bắt đầu bất kỳ task nào trong §3, kể cả T1.0 (scaffold). Không code trước khi có nội dung thật để tránh phải sửa lại cấu trúc project sau này.

## §3 Tasks

### T1.0 — Scaffold Vite + React + TypeScript + Supabase client

**Trạng thái:** Pending  
**Feature:** (nền tảng, chưa có ID F-)

**Acceptance:**
- [ ] `npm run dev` chạy được, không lỗi build
- [ ] `npx tsc --noEmit` pass
- [ ] Supabase client khởi tạo từ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (file `.env.example` có mặt, `.env` không commit)
- [ ] Có chỗ đặt `supabase/migrations/schema.sql` (có thể chưa có bảng nếu migration đi kèm F-01/F-02)
- [ ] `docs/project/CONTEXT.md` §2 module map được fill sau khi có cây thư mục thật

---

### T1.1 — Đăng nhập (F-01)

**Trạng thái:** Pending  
**Feature:** F-01

**Acceptance:**
- [ ] Màn login email/password qua Supabase Auth
- [ ] User chưa invite: không tự đăng ký được (không có form sign-up; public sign-up tắt trên project)
- [ ] Sai email/mật khẩu: báo lỗi rõ
- [ ] Login thành công → vào app; refresh vẫn giữ session
- [ ] Logout được

---

### T1.2 — Danh sách unit (F-02)

**Trạng thái:** Pending  
**Feature:** F-02

**Acceptance:**
- [ ] User authenticated thấy danh sách unit từ bảng `units` (cùng list cho mọi user)
- [ ] Không có UI/logic khoá unit theo `user_unit_progress` của người khác hay của chính mình
- [ ] Guest / chưa login không đọc được content (RLS)

---

### T1.3 — Học 1 unit (F-03)

**Trạng thái:** Pending  
**Feature:** F-03

**Acceptance:**
- [ ] Mở 1 unit: hiện từ vựng (`vocab_items`) của unit đó
- [ ] Hiện exercises của unit đó
- [ ] Unit không có vocab/exercise: empty state, không crash

---

### T1.4 — Đánh dấu từ chưa biết (F-04)

**Trạng thái:** Pending  
**Feature:** F-04

**Acceptance:**
- [ ] User đánh dấu từ → row `user_vocab_progress` của đúng `auth.uid()` + `vocab_item_id`
- [ ] Đánh dấu trùng: không tạo bản ghi trùng (unique user + vocab)
- [ ] User A không thấy / không sửa progress của user B (RLS)

---

### T1.5 — Ôn tập SRS hàng ngày (F-05)

**Trạng thái:** Pending  
**Feature:** F-05

**Acceptance:**
- [ ] Hàng đợi chỉ gồm từ của user hiện tại có `due_date <= hôm nay`
- [ ] Ôn xong cập nhật `ease_factor` / `interval_days` / `due_date` / `review_count` / `last_reviewed_at`
- [ ] Ngày không có từ due: empty state rõ

---

### T1.6 — Chấm bài tự động MCQ / fill-blank (F-06)

**Trạng thái:** Pending  
**Feature:** F-06

**Acceptance:**
- [ ] MCQ: chọn đáp án, so khớp với `correct_answer` phía client, hiện đúng/sai
- [ ] Fill-blank: so khớp string phía client (quy tắc normalize ghi vào PATTERNS khi lặp lần 2)
- [ ] Lưu `quiz_attempts` (`submitted_answer`, `is_correct`, `user_id`)
- [ ] Không gọi AI runtime để chấm

---

## §4 Out of scope (v0.1 / phase này)

- Cá nhân hoá pacing / unlock unit theo tốc độ riêng
- Chấm bài tự luận bằng AI
- App báo thức (dự án riêng)
- Tự ý thêm exercise type mới ngoài core set đã chốt trong `docs/project/REQUIREMENTS.md` — chỉ mở rộng khi full-extract unit thật cho thấy pattern mới cần thiết.
- Form đăng ký công khai

## §5 Definition of done

- [ ] T1.0–T1.6 pass acceptance
- [ ] `npx tsc --noEmit` pass
- [ ] CONTEXT.md §2 / §6 đã fill khi có code
- [ ] WORKLOG có entry cho từng task lớn
- [ ] Không có KI Critical/High còn open
