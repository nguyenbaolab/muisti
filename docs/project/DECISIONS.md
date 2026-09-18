# DECISIONS — Quyết định kiến trúc

Ghi theo thời gian, mới nhất ở trên. Mỗi entry: tên ngắn, ngày, quyết định, lý do, phạm vi, không làm gì.

---

## profiles + trigger sync email; tên chia sẻ = phần trước @

**Ngày:** 2026-09-17

**Quyết định:** Bảng `public.profiles` (`id` PK = `auth.users.id`, `email text NOT NULL`). Trigger `on_auth_user_created` AFTER INSERT trên `auth.users` (function `handle_new_user` SECURITY DEFINER) copy `id` + `email`. Backfill user hiện có. RLS SELECT: mọi `authenticated` đọc mọi dòng email — chấp nhận vì quy mô nhỏ / invite-only. Tên hiển thị luôn `email.slice(0, indexOf('@'))`; thiếu email → «Ẩn danh». Không hiện email đầy đủ. Không hiện trên deck `owned`.

**Client:** không embed PostgREST `decks.select('..., profiles(email)')` vì `decks.owner_id` FK `auth.users`, không FK `profiles`. Fetch `profiles` query riêng (`.in('id', ownerIds)` / `.eq('id', owner_id)`).

**Phạm vi:** migration 009 + `schema.sql`; `DecksPage`, `DeckPreviewPage`. Không đụng ReviewPage / DeckDetailPage / AppShell.

**Không làm gì:** Cursor không apply SQL. Không display name riêng.

---

## Số liệu thời gian học / số ngày đã ôn trên trang chi tiết deck là ước lượng

**Ngày:** 2026-09-16

**Quyết định:** Tab Tổng kết trên `/decks/:id` (owner) dùng dữ liệu có sẵn, không thêm bảng `review_sessions`. «Bắt đầu học từ» = `decks.created_at` (ngày tạo deck, không phải lần ôn đầu). «Số ngày đã ôn» = số ngày local distinct từ `user_vocab_progress.last_reviewed_at` (mỗi từ chỉ giữ lần ôn gần nhất) — có thể thấp hơn số ngày thật đã mở phiên.

**Lý do:** Tránh schema mới; chấp nhận ước lượng.

**Phạm vi:** `DeckDetailPage` tab Tổng kết. Không đụng `srs.ts` / `ReviewPage` / `DeckPreviewPage`.

**Không làm gì:** Không tính streak. Không log từng phiên ôn.

---

## Deck public người khác: Preview + Clone, không học trực tiếp; bỏ guard public→private

**Ngày:** 2026-09-16

**Quyết định:** Non-owner không ôn trực tiếp trên deck public của người khác. Họ xem `/decks/:id/preview` (đọc-only danh sách từ) và **Clone** thành deck riêng rồi mới học. Deck của chính mình (public hay private) vẫn `/review/:deckId` như cũ. `/review` mix không đổi.

**Clone:** deck mới `name` = gốc + ` (Copy)` (không cho sửa trước khi clone); `visibility = private`; `active_pool_size = 20` (không copy từ gốc); copy `vocab_items`; không copy `user_vocab_progress`. Insert + rollback nếu vocab lỗi — cùng pattern `CreateDeckPage`.

**ReviewPage:** `startReview` khi có `scopedDeckId` fetch `owner_id`; không phải owner → error, không enroll. Mix không vào nhánh này.

**Bỏ guard public→private** trong `EditDeckPage`: người học dùng bản clone độc lập, không phụ thuộc deck gốc nên owner đổi visibility tự do.

**Không hồi tố:** chưa có user thật học deck public của người khác.

**Implemented:** 2026-09-16 — `DeckPreviewPage`, route `/decks/:id/preview`, DecksPage link theo `owned`, ReviewPage owner check, xóa guard EditDeckPage. KI-011 Closed vì đổi kiến trúc, không phải vì sửa được guard RLS.

**Phạm vi:** `DeckPreviewPage`, `DecksPage` link, `ReviewPage.startReview`, `EditDeckPage` bỏ guard, `App.tsx` route. Không đụng `CreateDeckPage` / `srs.ts`.

**Không làm gì:** Không sửa tên trước clone. Không copy pool size / progress. Không xử lý data cũ.

---

## Sửa metadata deck tại `/decks/:id/edit`; chặn public→private nếu user khác đang học

**[SUPERSEDED một phần — guard public→private, 2026-09-16]** — phần chặn public→private không còn áp dụng (xem entry Preview + Clone cùng ngày). Phần sửa 5 cột metadata / trang edit / nút Sửa vẫn còn hiệu lực.

**Ngày:** 2026-09-16

**Quyết định:** Owner được sửa metadata deck sau khi tạo: `name`, `meaning_language`, `description`, `visibility`, `active_pool_size` (đủ 5 cột, không chỉ 4). Trang `/decks/:id/edit`; nút Sửa cạnh Xóa trên `/decks` khi `owner_id === user.id`. Không sửa danh sách `vocab_items` (thêm/xóa/sửa từng từ) ở slice này.

**Guard visibility:** Chỉ khi deck đang `public` trong DB và form đổi sang `private`: nếu có `user_vocab_progress` của user khác (không phải owner) trên từ thuộc deck → chặn submit toàn form, không lưu field nào, cho đến khi user để lại `public` hoặc hủy. Chiều private → public luôn cho phép. Hạ `active_pool_size` dưới `active_count`: cho sửa tự do (không trục xuất).

**Implemented:** 2026-09-16 — `EditDeckPage` + route + nút Sửa. Guard query đúng spec (join `vocab_items!inner`, `.neq('user_id', owner)`). **Hạn chế:** RLS `user_vocab_progress` chỉ SELECT own-rows nên query này **không thấy** progress của user khác khi chạy với session owner; chặn thật sự cần RPC `SECURITY DEFINER` (chưa làm).

**Lý do:** Chốt UX sửa pool size / metadata sau tạo (thay “chưa chốt modal vs edit page”). Public deck đã có người khác enroll thì không được kéo về private (mất quyền SELECT vocab).

**Phạm vi:** `EditDeckPage`, `DecksPage` nút Sửa, route `/decks/:id/edit`. Không đụng `CreateDeckPage` / `ReviewPage` / `srs.ts`.

**Không làm gì:** Không sửa từng từ trong deck. Không thêm RPC/bypass RLS cho guard. Không chặn hạ pool size.

---

## Active Pool Enrollment: enroll progress khi mở ôn 1 deck, không lazy-create lúc trả lời

**Ngày:** 2026-09-16

**Quyết định:** Thay thế hoàn toàn “lazy creation” (tạo progress lúc ôn lần đầu — **chưa từng được code**) và F-04 đánh dấu thủ công (đã xóa). Cơ chế mới: **Active Pool**, tự động, user chỉ bấm vào học.

**Enroll** = INSERT dòng `user_vocab_progress` đầu tiên (`due_date` = hôm nay, `review_count` = 0, SRS defaults còn lại). Trước enroll, từ chỉ nằm trong `vocab_items`, không vào hàng đợi ôn.

**Active pool** = các từ của user trên deck đó có `interval_days < 30` (tính động, không lưu cờ). **Graduated** = `interval_days >= 30` — vẫn ở `user_vocab_progress` và vẫn due theo SRS, chỉ không tính vào `active_count`.

**`decks.active_pool_size`:** integer 10–30, default 20, **sửa được sau khi tạo deck**. Không dùng tên `daily_new_words_limit` — không giới hạn theo ngày, không đếm “hôm nay đã enroll bao nhiêu”.

**Công thức:** nếu `active_count < active_pool_size` thì enroll `active_pool_size - active_count` từ ngẫu nhiên trong `vocab_items` của deck mà user **chưa** có progress. Pool tạm vượt N (nhiều từ graduated cùng “Quên” → `interval_days` reset 1): **không trục xuất**, chỉ ngừng enroll thêm cho đến khi pool tụt dưới N.

**Khi chạy:** mỗi lần user vào `/review/:deckId`, **trước** fetch due queue; client-side, không cron. `/review` mix **không** enroll (không biết deck nào).

**Quên từ graduated:** `computeNextReview` đã reset `intervalDays = 1` khi Quên — không sửa `srs.ts`. Lần mở review sau, từ tự vào lại `active_count`.

**Lý do:** KI-009 — ReviewPage chỉ đọc `user_vocab_progress` + `.update()`; upload không tạo progress → ôn trống.

**Phạm vi (khi implement):** migration 008 cột `active_pool_size`; `CreateDeckPage` nhập lúc tạo; `ReviewPage` enroll trên `/review/:deckId` only. Không đụng `srs.ts` / retry queue / persist khi trả hết nợ.

**Implemented:** 2026-09-16 — migration 008 + form tạo deck + `enrollActivePool` trong `startReview`. Verify cùng ngày: 008 apply (Table Editor); pool=10 / 15 từ → enroll 10 trên `/review/:deckId`; mix `/review` không insert progress mới. UI sửa `active_pool_size` sau khi tạo: `EditDeckPage` `/decks/:id/edit` (cùng ngày).

**Không làm gì:** Không enroll trên mix.

---

## Schema deck-based: wipe data, ownership + visibility, 2 chế độ ôn

**Ngày:** 2026-09-14

**Quyết định:** Bỏ schema unit-based (`units`, `exercises`) và chuyển sang deck-based. Wipe toàn bộ data cũ — không backup, không migrate-in-place. Recreate `vocab_items` + `user_vocab_progress` trên schema mới.

**Ownership + visibility:**
- `decks.owner_id` FK `auth.users`; `visibility` `'public' | 'private'` (default `'private'`)
- Public deck: mọi authenticated SELECT deck + `vocab_items` của nó; chỉ owner UPDATE/DELETE deck
- Private deck: chỉ owner SELECT/INSERT/UPDATE/DELETE deck + `vocab_items`
- Client được INSERT `vocab_items` (luồng upload): chỉ owner của deck cha
- `user_vocab_progress`: giữ nguyên cột; mỗi user có progress riêng khi ôn (kể cả deck public)

**Hai chế độ ôn (ReviewPage):**
1. Theo 1 deck: chỉ từ due thuộc deck đó
2. Mix tất cả: mọi dòng `user_vocab_progress` của user hiện tại đang due (`user_id = auth.uid()` AND `due_date <= today`) — không join lại `decks` để check quyền (có progress nghĩa là user đã từng ôn từ đó)

**`vocab_items` cột mới:** `id`, `deck_id`, `finnish_word`, `translation`, `created_at` — không mang lại `part_of_speech` / `example_sentence` / `notes` / `scene_description`.

**Lý do:** REQUIREMENTS v0.2 đổi hướng khỏi unit/sách; data cũ (unit + exercise) không còn dùng; ownership theo deck cho phép user upload và chia sẻ public/private.

**Phạm vi:** Schema (`decks`, `vocab_items`, `user_vocab_progress` + RLS), types, routes (`/units` xóa, `/decks` placeholder, `/review` + `/review/:deckId`), xóa seed Unit 1/2.

**Không làm gì:** Không backup data. Không build UI chọn/tạo deck trong task migrate. Không đổi thuật toán SRS (`srs.ts` / entry SM-2 bên dưới). Không tự thêm cột vocab cũ.

---

## Thuật toán SRS: SM-2 rút gọn 3 mức, đánh giá tự động từ số lần sai trong session

**Ngày:** 2026-09-08

**Quyết định:** Thuật toán ôn tập SRS (F-05) dùng biến thể SM-2 rút gọn, 3 mức độ, suy ra tự động từ hành vi trong session — không cho user tự chấm độ khó.

**Cơ chế 2 tầng:**

Tầng 1 (trong session, client-side, không ghi DB giữa chừng): mỗi từ trong hàng đợi ôn hôm nay có 1 "retry queue" riêng. Trả lời sai 1 từ → +1 lần hỏi lại từ đó trong session. Sai tiếp (liên tiếp) → +1 lần nữa mỗi lần sai. Session chỉ kết thúc khi mọi từ trong hàng đợi đã "trả hết nợ" (đúng ở lần hỏi cuối cùng của nó). Nếu user thoát app khi session còn dở dang (chưa trả hết nợ) → coi như CHƯA ôn, không ghi DB, `due_date` giữ nguyên.

Tầng 2 (khi 1 từ trả hết nợ trong session, ghi DB đúng 1 lần): đếm `wrong_count` = tổng số lần trả lời sai từ đó trong session (trước khi đúng lần cuối). Map sang 1 trong 3 mức:

| `wrong_count` | Mức độ |
|---|---|
| 0 | Nhớ dễ |
| 1 | Nhớ |
| >=2 | Quên |

**Công thức cập nhật `ease_factor`** (sàn 1.3, trần 2.8):
- Nhớ dễ: +0.15
- Nhớ: -0.05
- Quên: -0.20

**Công thức cập nhật `interval_days`** (sàn 1, trần 180):
- Lần ôn đầu tiên của từ (`review_count == 0`, tức đang có `interval_days` = 0): Nhớ dễ → cố định 4 ngày | Nhớ → cố định 2 ngày | Quên → cố định 1 ngày
- Từ lần ôn thứ 2 trở đi (`interval_days` cũ > 0):
  - Nhớ dễ: `max(interval_days_cũ + 1, round(interval_days_cũ * ease_factor_mới))`
  - Nhớ: `max(interval_days_cũ + 1, round(interval_days_cũ * ease_factor_mới * 0.6))`
  - Quên: reset về 1

`due_date` = hôm nay + `interval_days` mới. `review_count += 1` và `last_reviewed_at = now()` áp dụng cho cả 3 mức.

**Lý do:**
- Đánh giá tự động từ `wrong_count` thay vì để user tự chấm ("Dễ/Khó") — dùng hành vi khách quan đã đo được thay vì cảm nhận chủ quan, đúng hướng các SRS hiện đại (FSRS) đang đi
- 3 mức (không phải 4) sau khi kiểm chứng: mức thứ 4 ("Khó nhớ", tách riêng `wrong_count=2` khỏi `wrong_count>=3`) khi test toán học phát hiện không thực sự phạt được (interval vẫn luôn tăng dù ease giảm) và gây lỗi thứ tự khi ease chạm sàn (trường hợp `ease=1.3`, `interval=1`: "Khó nhớ" cho kết quả dài hơn "Nhớ" — sai logic). Gộp `wrong_count>=1` thành 2 mức rõ ràng (Nhớ / Quên ở `>=2`) loại bỏ được lỗi này.
- Sàn `interval_days_cũ + 1` cho cả 2 nhánh Nhớ dễ/Nhớ: chống "low interval hell" — nếu chỉ nhân ease mà không có sàn, từ có ease thấp có thể bị kẹt ở cùng 1 interval nhiều lần liên tiếp dù vẫn đang nhớ được, đi ngược nguyên tắc Anki khuyến nghị (thành công không nên bị phạt bằng cách không tăng khoảng cách)
- Bước khởi đầu cố định (4/2/1 ngày) cho lần ôn đầu tiên, tách khỏi công thức nhân dùng từ lần 2 trở đi: công thức nhân với interval gốc quá nhỏ (0 hoặc 1) không tạo đủ khác biệt có ý nghĩa giữa các mức
- Trần 180 ngày: chặn tăng vô hạn theo cấp số nhân, đảm bảo mọi từ quay lại định kỳ dù đã rất vững
- Đã kiểm chứng bằng test toán học exhaustive (không phải chỉ vài kịch bản chọn mẫu): thứ tự interval/ease luôn giảm dần hoặc bằng khi `wrong_count` tăng, luôn trong biên [1,180] và [1.3,2.8], không có trường hợp kẹt vĩnh viễn, quyết định deterministic

**Phạm vi:** Logic tính SRS khi kết thúc 1 từ trong session ôn tập (F-05, T1.5). Áp dụng cho toàn bộ `user_vocab_progress` từ đây về sau.

**Không làm gì:** Không cho user tự chọn mức độ (không có nút "Dễ/Khó" thủ công). Không ghi DB giữa session (chỉ ghi khi từ đã trả hết nợ). Không implement cơ chế "test bất chợt từ đã thuộc lâu" (xem KI-002, để dành sau).

---

## `exercises.correct_answer` cho phép NULL

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-08
**Quyết định:** Bỏ NOT NULL trên cột `exercises.correct_answer`.
null có ý nghĩa thật: bài không có đáp án cố định (`free_practice`,
`guided_composition` — luyện nói/viết tự do). Không coerce thành `{}`
khi seed.

**Lý do:**
- `{}` và `null` có ý nghĩa khác nhau: `{}` gợi ý "có object đáp án nhưng
  rỗng", `null` gợi ý "type này vốn không cần correct_answer" — UI
  chấm bài (T1.6) cần phân biệt rõ để biết khi nào bỏ qua chấm điểm
- Giữ đúng dữ liệu gốc từ content JSON thay vì biến đổi lúc seed

**Phạm vi:** Schema cột `exercises.correct_answer`, seed script,
logic chấm bài tương lai (T1.6) sẽ cần check null trước khi chấm.

**Không làm gì:** Không đổi ý nghĩa NOT NULL của `options`
(`options` vẫn nullable như cũ, không liên quan).

---

## Thêm cột `exercises.source_harjoitus` + `exercises.authoring_notes`

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-08
**Quyết định:** Thêm 2 cột nullable vào bảng `exercises`:
`source_harjoitus` (int, số thứ tự bài tập gốc trong sách Suomen Mestari 2)
và `authoring_notes` (text, ghi chú của Claude lúc soạn nội dung — vd nguồn
đáp án, cảnh báo cần double-check). Áp dụng khi seed data Unit 1 + Unit 2.

**Lý do:**
- Content JSON (`unit1_complete.json`, `unit2_complete.json`) đã có sẵn 2
  field này ở mỗi exercise — bỏ đi sẽ mất khả năng trace về bài gốc
  trong sách và mất cảnh báo QA quan trọng (vd "không có đáp án chính
  thức từ sách, cần soát kỹ hơn")
- Tách riêng khỏi `correct_answer`/`options` thay vì nhét vào jsonb —
  giữ 2 cột đó sạch, đúng shape theo từng exercise type

**Phạm vi:** Schema bảng `exercises`. Áp dụng cho toàn bộ seed data
từ đây về sau.

**Không làm gì:** Không hiển thị 2 cột này ra UI học viên (chỉ dùng
nội bộ/authoring, không phải nội dung học).

---

## Convention: `supabase/schema.sql` + `supabase/migrations/`

**Ngày:** 2026-09-08  
**Quyết định:** Tách DDL thành 2 lớp:
- `supabase/schema.sql` — full schema luôn up-to-date, dùng để setup project Supabase mới từ đầu
- `supabase/migrations/<YYYYMMDD>_<seq>_<name>.sql` — file incremental riêng cho mỗi lần thay đổi DB, chạy theo thứ tự khi update DB đang có data

**Lý do:**
- Convention rõ ràng hơn
- Dễ track lịch sử thay đổi schema
- Tách biệt "setup mới" vs "update đang chạy"

**Phạm vi:** Toàn bộ thay đổi DB từ đây về sau.

**Không làm gì:** Không dùng Supabase CLI migration runner (vẫn apply thủ công qua SQL Editor).

---

## Mở rộng enum `exercises.type`: thêm `dialogue`, `reading_passage` (lưu nguyên văn bài khoá)

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-07  
**Quyết định:** Mở rộng core set `exercises.type` từ 17 lên 19, thêm `dialogue` (hội thoại có speaker) và `reading_passage` (văn xuôi không phân vai). Cả 2 dùng `correct_answer` để lưu cấu trúc `{lines: [{speaker, text}]}`. Áp dụng hồi tố cho Unit 1 đã full-extract trước đó (bổ sung thêm, không sửa nội dung cũ) và cho Unit 2 đang full-extract.

**Lý do:**
- Bài khoá (đoạn văn, hội thoại) trước đó chỉ dùng làm nguồn rút từ vựng/câu hỏi đọc hiểu rồi bị bỏ qua nguyên văn — lãng phí dữ liệu học tự nhiên có giá trị (ngữ điệu, khẩu ngữ thật)
- Cấu trúc `lines`/`speaker` mở đường cho tính năng tương lai (đọc theo vai, TTS phân biệt giọng, shadowing, sinh bài tập tự động) mà không cần nhập liệu lại từ đầu

**Phạm vi:** Schema cột `correct_answer` của bảng `exercises` (không đổi cấu trúc cột, chỉ mở rộng enum type và định nghĩa thêm 1 hình dạng jsonb mới cho `correct_answer`). Áp dụng cho toàn bộ unit đã/đang extract.

**Không làm gì:** Không đổi tên/cấu trúc 17 type cũ đã có. Không thêm cột DB mới.

---

## Điểm bắt đầu: Suomen Mestari 2 (không phải 1)

**Ngày:** 2026-09-02  
**Quyết định:** App bắt đầu nội dung từ Suomen Mestari 2 (không phải cuốn 1) — quyết định có chủ đích, không phải nhầm lẫn. Cuốn 1 **không** bị loại khỏi scope: có thể retro-fit làm nội dung mở rộng trong tương lai, chỉ là chưa làm ở giai đoạn này.

**Lý do:**
- Nhu cầu học thực tế của chủ dự án bắt đầu từ cuốn 2

**Phạm vi:** Toàn bộ nội dung content pipeline, schema `units`.

**Không làm gì:** Không lấy Suomen Mestari 1 làm điểm bắt đầu v0.1. Không loại SM1 khỏi scope vĩnh viễn.

---

## Schema `units`: `book_code` + `unit_number` độc lập theo từng cuốn

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-02  
**Quyết định:** Bảng `units` có cột `book_code` (text, ví dụ `'suomen_mestari_2'`) tách biệt với `unit_number` (int). `unit_number` là số thứ tự **độc lập theo từng cuốn** — Kappale 1 của Suomen Mestari 2 và Kappale 1 của Suomen Mestari 1 (nếu retro-fit sau) đều có thể là `unit_number = 1`, không tiếp nối số thứ tự giữa các cuốn. Unique phải là composite (`book_code`, `unit_number`), không unique toàn cục trên `unit_number`.

**Lý do:**
- Cho phép mở rộng thêm cuốn 1 trong tương lai (xem entry Điểm bắt đầu: Suomen Mestari 2) mà không phải đánh lại số thứ tự của cuốn 2 đã có

**Phạm vi:** Schema bảng `units`.

**Không làm gì:** Không unique toàn cục trên `unit_number`. Không đánh số unit tiếp nối xuyên cuốn.

---

## Core set `exercises.type` + cột `scene_description` cho bài phụ thuộc tranh

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-02  
**Quyết định:** Chốt enum `exercises.type` thành core set 17 type sau scan cấu trúc 3 unit đầu Suomen Mestari 2 (Kappale 1–3). Coi là bộ lõi — mở rộng dần khi full-extract unit sau phát hiện pattern lặp lại, không quét thêm unit chỉ để “hội tụ” enum cho đủ. Thêm cột `exercises.scene_description` (text, nullable), tách khỏi `prompt`, cho bài tập mà đề gốc phụ thuộc hoàn toàn vào tranh vẽ. Claude mô tả cảnh khách quan lúc authoring (người/vật/hành động quan sát được), không diễn giải ý định hay đáp án. UI hiện khung riêng; styling để ngỏ lúc scaffold.

**Lý do:**
- Scan 3 unit đầu đã đủ để có bộ type dùng được; quét thêm để “đóng băng” enum tốn effort, pattern mới vẫn có thể xuất hiện khi extract thật
- Không tái tạo / hiển thị hình gốc từ sách (bản quyền)
- Mô tả khách quan giữ độ khó: học viên vẫn phải tự hiểu cảnh, không bị lộ đáp án trong text

**Phạm vi:** Schema bảng `exercises`, content pipeline (authoring), UI hiển thị đề bài có tranh.

**Không làm gì:** Không scan thêm unit chỉ để hoàn thiện enum. Không lưu/hiển thị ảnh scan từ sách. Không gộp `scene_description` vào `prompt`.

---

## Chung lịch trình unit, chỉ ôn tập (SRS) là riêng từng người

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-01  
**Quyết định:** Tất cả user thấy cùng một danh sách unit. Không khoá/mở unit theo tốc độ của người khác. Chỉ hàng đợi ôn từ vựng (SRS) mỗi ngày khác nhau theo lịch sử nhớ/quên. Vẫn track `user_unit_progress` cho thống kê cá nhân, nhưng không dùng để khoá quyền truy cập unit tiếp theo.

**Lý do:**
- Nhóm học cùng giáo trình — lịch trình chung dễ bàn và theo dõi
- SRS vẫn cần cá nhân hoá vì trí nhớ từng người khác nhau
- Tránh complexity “gating” unit khi quy mô 1 người + bạn bè

**Phạm vi:** Navigation / danh sách unit, bảng `user_unit_progress`, hàng đợi SRS (`user_vocab_progress`).

**Không làm gì:** Không implement unlock/lock unit theo tiến độ cá nhân.

---

## Đăng ký: chỉ admin mời qua email

**Ngày:** 2026-09-01  
**Quyết định:** Không có form đăng ký công khai. Dùng Supabase Auth `inviteUserByEmail` — admin (chủ dự án) thêm từng người; người được mời chỉ set password khi nhận link.

**Lý do:**
- App cá nhân + nhóm nhỏ, không public
- Kiểm soát ai vào được (ưu tiên người đã có sách thật — xem entry Bản quyền)
- Tránh spam / tài khoản lạ trên nội dung giáo trình

**Phạm vi:** Auth, onboarding, RLS authenticated.

**Không làm gì:** Không làm sign-up công khai, magic-link tự đăng ký, hay OAuth social login ở v0.1.

---

## Chuyển từ Cloudflare D1 + Access sang Supabase

**Ngày:** 2026-09-01  
**Quyết định:** Backend/data và identity dùng Supabase (Postgres + Auth). Client gọi trực tiếp qua `supabase-js`, bảo vệ bằng RLS. Không dùng Cloudflare D1 + Access làm data/identity layer.

**Lý do:**
- Cần data dùng chung được cho nhiều app sau này (vd. ý tưởng app báo thức đọc chung quiz/từ vựng)
- Cần identity layer tái dùng được nhiều client — Cloudflare Access chỉ khoá đúng 1 site
- Postgres + RLS phù hợp content dùng chung / progress theo user

**Phạm vi:** Toàn bộ persistence, auth, RLS. Deploy frontend vẫn Cloudflare Pages.

**Không làm gì:** Không dùng D1, KV, hay Cloudflare Access làm auth cho app này.

---

## Bỏ hướng local LLM (Ollama) + app desktop/mobile riêng

**Ngày:** 2026-09-01  
**Quyết định:** Một web app duy nhất. Claude đọc/cấu trúc nội dung sách **một lần lúc soạn bài**. App runtime v0.1 không gọi LLM.

**Lý do:**
- Hướng cũ (2 app desktop + mobile, Ollama local, đồng bộ Tailscale) quá phức tạp so với nhu cầu
- Phải quản lý nhiều model, lo chất lượng tiếng Phần Lan của model 7–9B local
- Một SPA + một nguồn dữ liệu thì các thiết bị tự “linked”
- Claude quy mô lớn hơn, tiếng Phần Lan tốt hơn, phù hợp soạn bài offline khỏi runtime

**Phạm vi:** Kiến trúc sản phẩm, content pipeline, runtime app.

**Không làm gì:** Không Ollama, không app desktop/mobile riêng, không Tailscale sync, không AI chấm bài lúc runtime ở v0.1.

---

## Frontend: Vite + React + TypeScript

**Ngày:** 2026-09-01  
**Quyết định:** Frontend là Vite + React + TypeScript, deploy static SPA lên Cloudflare Pages, gọi Supabase trực tiếp từ client qua `supabase-js`.

**Lý do:**
- Tái dùng kinh nghiệm React/TypeScript từ Chino's Store
- Không cần SSR: app cá nhân sau login, không cần SEO
- Static SPA trên Cloudflare Pages đủ cho quy mô này

**Phạm vi:** Toàn bộ UI, tooling (`tsc`, Vite), deploy Pages.

**Không làm gì:** Không Next.js, Astro, hay SSR framework khác trừ khi chủ dự án đổi quyết định này.

---

## Tách data dùng chung và theo từng user

**[SUPERSEDED bởi migration 007, 2026-09-14]** — quyết định này không còn áp dụng, xem entry 2026-09-14 deck-based.

**Ngày:** 2026-09-01  
**Quyết định:** Content (`units`, `vocab_items`, `exercises`) dùng chung, chỉ ghi qua service role. Progress (`user_vocab_progress`, `quiz_attempts`, `user_unit_progress`) theo user, RLS `user_id = auth.uid()`.

**Lý do:**
- Nội dung trích từ sách giống nhau cho mọi người
- SRS / bài làm / thống kê unit phải riêng từng người
- Client user thường không được ghi đè nội dung sách

**Phạm vi:** Schema, RLS, cách Cursor/Claude thêm unit mới.

**Không làm gì:** Không cho client authenticated insert/update/delete bảng content.

---

## Bản quyền nội dung sách

**Ngày:** 2026-09-01  
**Quyết định:** Dùng cá nhân + nhóm bạn học chung. Không public / share nội dung đã convert ra ngoài nhóm. Ưu tiên chỉ mời người đã có sách thật.

**Lý do:**
- Giáo trình Suomen Mestari 2 (và Suomen Mestari 1, nếu mở rộng sau này) là tài liệu có bản quyền
- Invite-only giúp giới hạn người thấy nội dung convert
- Đây là ghi chú thực tế, không phải tư vấn pháp lý chính thức

**Phạm vi:** Invite policy, không deploy public, không index nội dung sách ra ngoài app.

**Không làm gì:** Không open registration, không marketing/public share nội dung unit.
