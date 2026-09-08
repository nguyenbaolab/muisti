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

## KI-002 — Ý tưởng mở rộng SRS: chèn ngẫu nhiên ~20% từ "đã thuộc lâu" vào hàng đợi ôn tập

**Mức độ:** Enhancement (không phải bug — ý tưởng mở rộng, chưa implement)  
**File liên quan:** Logic hàng đợi SRS (T1.5, chưa build), bảng `user_vocab_progress`

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

**Trạng thái:** Open — ý tưởng đã ghi nhận, **không** đưa vào T1.5 (MVP). Cần bàn kỹ và chốt DECISIONS riêng trước khi implement, dự kiến sau khi core SRS (T1.5) đã chạy ổn định với data thật.

---

