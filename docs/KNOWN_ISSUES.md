# KNOWN_ISSUES

Lỗi / sai lệch đã biết. Đánh số từ **KI-001**. Entry mới ở đầu (sau header).

**Format mỗi issue:**

- **Mức độ:** Critical / High / Medium / Low
- **File liên quan:**
- **Mô tả:**
- **Cách tái hiện:**
- **Hướng fix:**
- **Trạng thái:** Open / Partial / Resolved

---

## KI-001 — UnitDetailPage hiện `exercises.prompt` / `correct_answer` dạng markdown thô, chưa render

**Mức độ:** Low  
**File liên quan:** `src/pages/UnitDetailPage.tsx`  
**Mô tả:** Nhiều exercise (đặc biệt `type=reference_table`) có `prompt` chứa markdown (bảng, heading, list) nhưng UnitDetailPage hiện bằng `<p>{exercise.prompt}</p>` — render như text thô, không xuống dòng, không có bảng. Khó đọc, đặc biệt với `reference_table` có bảng chia động từ dài. Không chặn chức năng (đánh dấu từ / F-04 vẫn hoạt động); chỉ ảnh hưởng UX đọc nội dung bài tập / bảng tham khảo.  
**Cách tái hiện:** 2026-09-08, test T1.3/T1.4 với data thật Unit 1 — mở unit, xem exercise `reference_table`.  
**Hướng fix:** Thêm markdown renderer (vd `react-markdown`) cho `prompt` + phần text trong `correct_answer` / `options` khi hiện exercises. Làm sau khi hoàn tất styling pass (theo `PLAN_1.md`, styling để ngỏ lúc scaffold, làm khi xong tính năng MVP).  
**Trạng thái:** Open

---
