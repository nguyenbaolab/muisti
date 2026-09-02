# WORKLOG

Nhật ký thay đổi có ý nghĩa. Entry mới ở **đầu file** (sau tiêu đề và dòng kẻ). Đọc từ trên xuống = mới nhất → cũ nhất.

---

## [2026-09-02] — docs(plan): sửa lại bullet PLAN_1.md §4 cho khớp out of scope

- Lần sửa trước lạc ý (đọc như tham chiếu enum). Đổi thành: không tự ý thêm type ngoài core set 17 — chỉ mở rộng khi full-extract unit thật cần thiết

---

## [2026-09-02] — docs(plan): đồng bộ PLAN_1.md §4 với enum exercises.type

- Sửa câu out-of-scope cũ (“Matching và các loại… sau recon sách thật”) — trỏ về `docs/project/REQUIREMENTS.md` (core set 17 type, có thể mở rộng khi full-extract)

---

## [2026-09-02] — docs(schema): chốt exercises.type core set + scene_description

- Thay placeholder `mcq | fill_blank | matching | …` bằng enum 17 type (scan cấu trúc SM2 Kappale 1–3)
- Thêm cột `exercises.scene_description` (text, nullable) cho bài phụ thuộc tranh; tách khỏi `prompt`
- Negative scope: bài nghe, web ngoài, xúc xắc/bàn cờ, dữ liệu địa phương cá nhân, crossword → fill_blank list
- DECISIONS: entry mới (core set mở rộng dần; không tái tạo hình sách)
- Chỉ docs — chưa có migration/data thật trên Supabase

---

## [2026-09-01] — chore(docs): dựng hệ thống tài liệu chuẩn

- Chuyển 4 file gốc vào cấu trúc docs/ mới
- Thêm CURRENT.md, WORKFLOW.md, PATTERNS.md, BLOCKERS.md, KNOWN_ISSUES.md, RUNBOOK.md, USER_GUIDE.md
- Liên quan: setup ban đầu
