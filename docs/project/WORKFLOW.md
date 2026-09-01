# WORKFLOW — Quy trình làm việc

Dự án nhỏ, 1 người vừa dev vừa test (cùng AI). Không tách role DEV/TEST. Mọi task là “làm + verify bằng acceptance criteria trong PLAN”.

---

## §1 Trước mọi task — đọc theo thứ tự

1. `docs/CURRENT.md` — phase hiện tại, path PLAN active
2. `docs/project/WORKFLOW.md` (file này)
3. `docs/project/REQUIREMENTS.md` — business rules, feature, schema
4. `docs/project/CONTEXT.md` — tech context, conventions
5. `docs/project/PATTERNS.md` — pattern lặp lại
6. `docs/BLOCKERS.md` — tránh lặp câu hỏi / chờ quyết định
7. PLAN phase active — path lấy từ `CURRENT.md`

---

## §2 Sau mỗi task — 3 mức permission

### Tự động (không cần hỏi)

- `docs/project/CONTEXT.md` — khi đổi cấu trúc file, store, convention
- `docs/WORKLOG.md` — entry mới ở **đầu file** (sau tiêu đề)
- `docs/KNOWN_ISSUES.md` — bug mới
- `docs/phases/phase-X/PLAN_X.md` — **chỉ** trạng thái task (Pending / In Progress / Done)

### Đề xuất, chờ user confirm

- `docs/project/REQUIREMENTS.md`
- `docs/project/DECISIONS.md`
- `docs/project/PATTERNS.md`
- `docs/phases/phase-X/PLAN_X.md` — đổi scope (thêm/bớt/sửa task), không phải status

### Không bao giờ tự update

- `docs/project/WORKFLOW.md`
- `docs/CURRENT.md` (trừ khi user yêu cầu rõ)
- `docs/USER_GUIDE.md`
- `README.md`
- `.cursorrules`

---

## §3 Khi bí hoặc thiếu thông tin

1. **Dừng lại** — không tự đoán
2. Ghi vào `docs/BLOCKERS.md`: vấn đề là gì, cần thông tin / quyết định gì
3. Hỏi user
4. Chờ confirm trước khi tiếp tục

---

## §4 Quy tắc schema

Mỗi migration mới trong `supabase/migrations/` phải cập nhật `supabase/migrations/schema.sql` **cùng lúc** trong cùng task. Không tạo migration mà quên schema.sql.
