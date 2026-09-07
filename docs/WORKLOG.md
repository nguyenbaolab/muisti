# WORKLOG

Nhật ký thay đổi có ý nghĩa. Entry mới ở **đầu file** (sau tiêu đề và dòng kẻ). Đọc từ trên xuống = mới nhất → cũ nhất.

---

## [2026-09-07] — docs: mở rộng exercises.type +2 (dialogue, reading_passage)

- REQUIREMENTS.md: core set 17 → 19; ghi chú lines/speaker trong `correct_answer`
- DECISIONS.md: prepend entry (lưu nguyên văn bài khoá; hồi tố Unit 1, áp Unit 2)
- Chốt trong chat Claude lúc full-extract Unit 2 — ghi docs trước khi JSON Unit 1/2 áp dụng
- Chưa có migration/data thật trên Supabase

---

## [2026-09-03] — docs: đồng bộ README / .cursorrules / entry bản quyền theo SM2

- README.md dòng 3: điểm bắt đầu SM2, SM1 để tương lai
- `.cursorrules` dòng 16: cùng ý
- DECISIONS.md entry bản quyền (2026-09-01): bổ sung SM2 (+ SM1 nếu mở rộng) vào bullet lý do — không tạo entry mới

---

## [2026-09-02] — docs(decisions): bổ sung 2 entry còn thiếu (SM2 + book_code)

- Quyết định đã chốt trong chat Claude trước đó nhưng chưa được ghi vào DECISIONS.md
- Entry A: điểm bắt đầu Suomen Mestari 2 (SM1 retro-fit sau, không loại khỏi scope)
- Entry B: `units.book_code` + `unit_number` độc lập theo cuốn, unique composite
- REQUIREMENTS.md không đổi (đã khớp)

---

## [2026-09-02] — docs(req): đồng bộ REQUIREMENTS.md với SM2 / book_code (bug đồng bộ)

- §1: điểm bắt đầu là Suomen Mestari 2 (SM1 để tương lai) — schema cũ còn ghi SM1
- Bảng `units`: `number` → `unit_number`; thêm `book_code`; unique composite (`book_code`, `unit_number`)
- Không phải quyết định mới — REQUIREMENTS.md chưa được cập nhật khi đã chốt SM2 + đánh số độc lập theo cuốn
- Chưa có migration/data thật trên Supabase

---

## [2026-09-02] — docs(plan): full-extract Unit 1 xong mới được code (kể cả scaffold)

- Cập nhật PLAN_1.md §2: bỏ ngoại lệ “không chặn scaffold / F-01”
- Full-extract nội dung Unit 1 thật (đã soát) phải xong trước mọi task §3, kể cả T1.0

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
