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

## KI-003 — Ý tưởng: cho phép nạp file từ vựng ngoài để tự học/kiểm tra tạm thời (không lưu DB)

**Mức độ:** Enhancement (tính năng mới, chưa implement)  
**File liên quan:** Có thể tái dùng `src/lib/srs.ts` (session/retry-queue logic), `src/pages/ReviewPage.tsx` (UI hỏi/đáp) — nhưng cần tách nguồn dữ liệu ra khỏi Supabase

**Ý tưởng (chủ dự án, 2026-09-08):** Thêm 1 chế độ học riêng, cho phép user tự upload 1 file (JSON/CSV, format tiếng Phần - nghĩa) để luyện tập/kiểm tra ngay trong session, dùng đúng cơ chế session + retry queue đã có ở F-05, nhưng **không** insert vào `user_vocab_progress` hay bất kỳ bảng nào — dữ liệu chỉ tồn tại trong bộ nhớ trình duyệt lúc đó, mất đi khi rời trang.

**Lý do:** Cho phép học từ vựng ngoài phạm vi Suomen Mestari 2 (vd tự thêm từ gặp ở nơi khác) mà không cần thay đổi cấu trúc DB nội dung chính thức của Muisti.

**Vấn đề cần giải quyết trước khi implement:**
1. Format file input: JSON hay CSV? Cấu trúc cột/field ra sao?
2. UI upload: nơi nào trong app, luồng thao tác thế nào?
3. Vì không lưu DB, không có SRS liên-ngày cho các từ này — session này có tính là "ôn tập" theo nghĩa SRS không, hay chỉ là "luyện tập tự do" một lần?
4. Validate file input: xử lý file sai format, file rỗng, file quá lớn ra sao?

**Trạng thái:** Open — ý tưởng ghi nhận, **không** đưa vào Phase 1 (MVP). Nằm ngoài `REQUIREMENTS.md` hiện tại, cần thêm feature ID mới nếu làm (vd F-07) và REQUIREMENTS riêng.

---

## KI-004 — Ý tưởng: pretest toàn bộ unit mới thay vì đánh dấu thủ công

**Mức độ:** Enhancement (tính năng bổ sung, chưa implement — **không** thay thế F-04, có thể làm song song)  
**File liên quan:** `src/pages/UnitDetailPage.tsx` (F-04 hiện có), tương lai có thể là 1 trang/luồng riêng "Unit Pretest"

**Ý tưởng (chủ dự án, 2026-09-08):** Khi bắt đầu học 1 unit mới, hầu hết từ vựng đều chưa biết — việc tự bấm "Đánh dấu" từng từ một (F-04 hiện tại) khá thừa thãi. Đề xuất: cho phép "test nhanh" toàn bộ từ vựng của unit trước khi học chính thức — từ nào trả lời sai trong lúc pretest thì tự động thêm vào `user_vocab_progress` (giống hệt hành vi insert của `handleMark` hiện tại, nhưng trigger tự động thay vì user tự bấm), từ nào đúng thì bỏ qua không thêm vào.

**Quan hệ với F-04:** Bổ sung, không thay thế. F-04 (đánh dấu thủ công) vẫn hữu ích khi đọc bài/làm exercise gặp từ lạ giữa chừng. Pretest chỉ tối ưu hoá bước "bắt đầu 1 unit mới".

**Vấn đề cần giải quyết trước khi implement:**
1. Hình thức hỏi trong pretest — dùng chung hình thức với `ReviewPage` (gõ chữ/MCQ) hay hình thức riêng đơn giản hơn (vd chỉ "Biết/Không biết" tự nhận, không cần gõ/chọn)?
2. Unit có 100–200+ từ (Unit 1: 166, Unit 2: 211) — pretest 1 lần hết toàn bộ có quá tải không? Xem KI-007 (giới hạn batch) — có thể cần áp dụng cùng cơ chế giới hạn số từ mỗi lần.
3. Nếu user pretest dở dang (thoát giữa chừng) — xử lý thế nào? Các từ đã test nên giữ kết quả hay huỷ hết (tương tự nguyên tắc session dở dang của F-05 đã chốt trong `DECISIONS.md`)?
4. Từ pretest đúng ngay từ đầu (không thêm vào `user_vocab_progress`) — nếu user pretest lại unit đó lần 2 (vd ôn lại), có test lại từ đã pretest đúng không?

**Trạng thái:** Open — ý tưởng ghi nhận, **không** đưa vào Phase 1 (MVP).

---

## KI-005 — Ý tưởng: đánh dấu từ trực tiếp trong lúc làm exercises (bôi đen → chuột phải)

**Mức độ:** Enhancement (mở rộng UX của F-04, chưa implement)  
**File liên quan:** `src/pages/UnitDetailPage.tsx` (phần render exercises), F-04 (`user_vocab_progress` insert logic đã có)

**Ý tưởng (chủ dự án, 2026-09-08):** Hiện F-04 chỉ có nút "Đánh dấu" cạnh mỗi từ trong danh sách `vocab_items`. Đề xuất mở rộng: khi đọc nội dung exercises (`prompt`, `reading_passage`, `dialogue`...), cho phép bôi đen 1 từ bất kỳ trong đoạn văn, chuột phải (hoặc menu tương tự) để thêm từ đó vào `user_vocab_progress` ngay lập tức.

**Vấn đề kỹ thuật cốt lõi chưa giải quyết được:** Từ user bôi đen trong 1 đoạn văn tự do **chưa chắc** đã tồn tại sẵn trong bảng `vocab_items` (exercises chứa câu văn tự nhiên, không phải mọi từ trong câu đều có sẵn dưới dạng 1 row `vocab_items`). Nếu từ đó chưa có trong DB:
1. Phải tạo mới 1 `vocab_items` row với `finnish_word` = từ vừa bôi đen — nhưng `translation` (nghĩa tiếng Việt) lấy từ đâu? Không có sẵn.
   - Option A: bắt user tự nhập nghĩa tay ngay lúc đó (thêm 1 bước UX, làm gián đoạn lúc đang đọc bài)
   - Option B: để `translation` trống/null, user tự điền sau — nhưng schema hiện tại `translation` là NOT NULL
   - Option C: gọi API dịch tự động bên ngoài — **vi phạm** negative scope đã chốt trong `REQUIREMENTS.md` §5 ("Tra cứu trang web ngoài — dữ liệu đổi theo thời gian thực" đã bị loại khỏi v0.1)
2. Nếu từ bôi đen là 1 dạng biến cách (declined/conjugated form) của từ gốc đã có trong `vocab_items` (vd bôi đen "kirjoitin" trong khi `vocab_items` đã có "kirjoittaa") — hệ thống không có cách nào tự nhận diện đây là cùng 1 từ, sẽ tạo duplicate

**Trạng thái:** Open — ý tưởng ghi nhận, **không** đưa vào Phase 1 (MVP). Cần giải pháp UX rõ ràng cho vấn đề "từ chưa có trong DB" trước khi implement — đây không phải việc nhỏ.

---

## KI-006 — Kiểm tra: index cho `user_vocab_progress.due_date` khi data lớn dần

**Mức độ:** Low (phòng ngừa, chưa phải vấn đề thật ở quy mô hiện tại)  
**File liên quan:** `supabase/schema.sql`, bảng `user_vocab_progress`

**Bối cảnh:** Từ đã đánh dấu vào `user_vocab_progress` tồn tại vĩnh viễn (không có cơ chế tự động xoá/dọn dẹp — chỉ xoá thủ công qua unmark, đã có ở F-04). Với vocab tăng dần theo mỗi unit mới, số row có thể lên tới vài nghìn/user trong dài hạn (không phải "vài trăm nghìn" theo nghĩa đen — giáo trình có giới hạn số unit/từ vựng thực tế, nhưng vẫn nên phòng ngừa).

**Câu hỏi đặt ra (chủ dự án, 2026-09-08):** Số lượng từ tăng dần có cần cơ chế xoá/dọn dẹp không?

**Đánh giá:** Postgres xử lý hàng triệu row dễ dàng với bảng đơn giản như `user_vocab_progress` (8 cột). **Không** cần cơ chế "xoá tự động" ở quy mô Muisti. Vấn đề thật duy nhất là hiệu năng QUERY khi lọc `due_date <= hôm nay` nếu bảng lớn dần mà **thiếu index** phù hợp.

**Cần kiểm tra:** Bảng `user_vocab_progress` hiện có index nào ngoài PRIMARY KEY (`id`) và UNIQUE (`user_id`, `vocab_item_id`) hay chưa? Query chính của F-05 (`.eq('user_id', ...).lte('due_date', ...)`) có tận dụng được UNIQUE constraint hiện có làm index không, hay cần thêm index riêng cho (`user_id`, `due_date`)?

**Trạng thái:** Open — cần audit lại schema, có thể cần 1 migration nhỏ thêm composite index (`user_id`, `due_date`) nếu chưa tối ưu. Chưa cấp bách ở quy mô data hiện tại (vài trăm từ), nên làm khi thuận tiện, không chặn Phase 1.

---

## KI-007 — Giới hạn số từ MỚI đưa vào 1 session ôn tập (batch limit)

**Mức độ:** Medium — có thể ảnh hưởng trải nghiệm thật sớm (ngay khi user đánh dấu nhiều từ cùng lúc, hoặc nếu KI-004 pretest được làm)  
**File liên quan:** `src/pages/ReviewPage.tsx` (fetch hàng đợi due)

**Vấn đề (chủ dự án, 2026-09-08):** Hàng đợi SRS hiện tại (F-05) lấy **tất cả** từ có `due_date <= hôm nay`, không giới hạn số lượng. Nếu user đánh dấu 80–100 từ mới trong 1 lần (vd mới bắt đầu học 1 unit, hoặc tương lai làm KI-004 pretest cả unit), `due_date` mặc định là hôm nay cho tất cả — nghĩa là ngay session ôn tập đầu tiên đã phải xử lý 80–100 từ cùng lúc. Với retry queue (từ sai phải hỏi lại), tổng số lượt hỏi trong 1 session có thể vượt 150–200+ lượt — quá tải, dễ gây chán nản, bỏ dở giữa chừng.

**Nghiên cứu tham khảo (2026-09-08):** Anki có khái niệm "new cards per day" — giới hạn số thẻ **mới** (chưa từng ôn) được đưa vào hàng đợi mỗi ngày, tách biệt với số lượt "review" (thẻ cũ quay lại theo lịch). Khuyến nghị phổ biến: 10–20 thẻ mới/ngày là mức bền vững; vượt quá dễ dẫn tới "review overload" tích luỹ (mỗi thẻ mới thêm vào sẽ quay lại nhiều lần trong tương lai, cộng dồn theo cấp số nhân nếu học quá nhanh). Nguồn: Anki official docs (docs.ankiweb.net/deck-options.html), cộng đồng khuyến nghị 10–20/ngày (nhiều bài viết độc lập).

**Hướng xử lý dự kiến (chưa chốt, cần bàn kỹ trước khi implement):**
1. Giới hạn số từ `review_count = 0` (chưa từng ôn lần nào) được đưa vào 1 session — vd tối đa N từ mới/ngày (N cụ thể cần bàn, tham khảo 10–20 theo Anki nhưng phải cân nhắc bối cảnh khác: Muisti là app cá nhân/nhóm nhỏ học theo giáo trình cố định, không phải deck tự do như Anki)
2. Từ mới **vượt** quá giới hạn N thì xử lý sao — vẫn hiện `due_date` = hôm nay trong DB (để sau này tự nhiên due) nhưng **không** đưa vào session hôm nay? Hay dời `due_date` của phần dư sang ngày mai/các ngày sau (dàn đều ra)?
3. Từ `review_count > 0` (đã ôn ít nhất 1 lần, đang quay lại theo lịch SRS bình thường) — có tính vào giới hạn N không, hay chỉ áp dụng riêng cho từ hoàn toàn mới?
4. Cần UI thông báo rõ cho user khi có từ due nhưng bị hoãn do giới hạn batch (vd "Còn 45 từ mới sẽ xuất hiện trong các ngày tới")

**Trạng thái:** Open — vấn đề thật, cần giải quyết trước khi KI-004 (pretest cả unit) khả thi, vì pretest sẽ tạo chính xác tình huống 80–100+ từ mới cùng lúc. Ưu tiên bàn kỹ + chốt DECISIONS trước khi implement, có thể cần làm **sớm hơn** KI-001/002/003/004/005 vì ảnh hưởng trực tiếp đến F-05 đã có.

---

## KI-008 — Hiệu năng lấy nhiễu MCQ khi `vocab_items` lớn dần (khác KI-006)

**Mức độ:** Low (phòng ngừa, chưa phải vấn đề thật ở quy mô hiện tại ~377 từ)  
**File liên quan:** `src/pages/ReviewPage.tsx` (hàm `pickMcqOptions` + đoạn fetch pool truyền vào)

**Lưu ý phân biệt với KI-006:** KI-006 nói về index cho query hàng đợi SRS (`user_vocab_progress.due_date`). Entry này nói về vấn đề khác — cách lấy dữ liệu **nhiễu** cho MCQ trong `ReviewPage`.

**Bối cảnh:** `pickMcqOptions` nhận vào 1 pool (mảng string `finnish_word`) và random chọn 3 từ làm nhiễu. Pool này hiện được tạo bằng cách fetch **mọi row** `vocab_items` về phía client (chỉ cột `finnish_word`, không `SELECT *`), rồi random bằng JavaScript (`shuffle`) — **không** random ở phía database.

**Vấn đề khi data lớn dần:** Cách "tải hết cột `finnish_word` về client rồi random" chấp nhận được ở quy mô hiện tại (377 từ) nhưng sẽ chậm dần nếu `vocab_items` tăng lên rất lớn (hàng chục nghìn, trăm nghìn từ) — tốn băng thông mạng và bộ nhớ trình duyệt mỗi lần vào `ReviewPage` / bấm bắt đầu ôn, dù chỉ cần đúng 3 từ ngẫu nhiên trong số đó.

**Hướng xử lý dự kiến (chưa chốt, chưa cấp bách):** Đổi sang random ở phía database thay vì tải hết về client — ví dụ dùng RPC/SQL function kiểu `ORDER BY random() LIMIT 3` (loại trừ đáp án đúng) qua Supabase, thay vì `select('finnish_word')` toàn bảng rồi shuffle trong JS. Cần đánh giá lại nếu/khi vocab thực tế tăng đáng kể so với quy mô giáo trình hiện tại.

**Trạng thái:** Open — không cấp bách, không chặn Phase 1. Ghi nhận để theo dõi khi `vocab_items` tăng lớn hơn nhiều so với ~377 từ hiện tại.

---



