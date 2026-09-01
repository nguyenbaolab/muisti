# DECISIONS — Quyết định kiến trúc

Ghi theo thời gian, mới nhất ở trên. Mỗi entry: tên ngắn, ngày, quyết định, lý do, phạm vi, không làm gì.

---

## Chung lịch trình unit, chỉ ôn tập (SRS) là riêng từng người

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
- Giáo trình Suomen Mestari 1 là tài liệu có bản quyền
- Invite-only giúp giới hạn người thấy nội dung convert
- Đây là ghi chú thực tế, không phải tư vấn pháp lý chính thức

**Phạm vi:** Invite policy, không deploy public, không index nội dung sách ra ngoài app.

**Không làm gì:** Không open registration, không marketing/public share nội dung unit.
