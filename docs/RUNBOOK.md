# RUNBOOK — Vận hành & phát triển

Phần dashboard Cloudflare/Supabase chờ người dùng thực hiện. Repo đã chuẩn bị file Pages.

---

## §1 Setup môi trường dev

**Yêu cầu:**

- Node.js 22 (ghim trong `.node-version`; `package.json` `engines.node` = `^20.19.0 || >=22.12.0` — khớp Vite 8)
- npm đi kèm Node
- Tài khoản [Supabase](https://supabase.com) — project đã có; schema trong `supabase/schema.sql` + `supabase/migrations/`
- Tài khoản [Cloudflare](https://dash.cloudflare.com) (khi deploy Pages)

**Clone & cài:**

```bash
git clone https://github.com/nguyenbaolab/muisti.git
cd muisti
npm ci
cp .env.example .env
```

Điền `.env` (không commit). Hai biến `VITE_*` bắt buộc để app chạy. `SUPABASE_SERVICE_ROLE_KEY` chỉ cho script server local — không cần để `npm run dev` / `npm run build`.

**Chạy local (đã scaffold Vite + React + TypeScript):**

```bash
npm run dev      # thường http://localhost:5173
npm run build
npm run preview
npx tsc --noEmit
```

---

## §2 Database (Supabase migration workflow)

**Chưa có project Supabase thật.** Sẽ update khi tạo project và chạy migration lần đầu.

Quy trình dự kiến:

1. Tạo project trên supabase.com.
2. Schema nguồn sự thật: `supabase/migrations/schema.sql` (file này chưa tồn tại — tạo khi scaffold/migration đầu).
3. Project mới: SQL Editor → dán toàn bộ `schema.sql` → Run.
4. Thay đổi sau này: một thay đổi độc lập = một file `supabase/migrations/YYYYMMDD_mo_ta_ngan.sql`, **đồng thời** cập nhật `schema.sql` (xem `WORKFLOW.md` §4).
5. Auth: bật Email provider; **tắt** public sign-up. User mới chỉ qua `inviteUserByEmail`.
6. RLS: bảng progress theo `auth.uid()`; bảng content SELECT authenticated, ghi chỉ service role.

---

## §3 Deploy (Cloudflare Pages)

**Trạng thái:** Chuẩn bị xong phía repo; các bước dashboard chờ người dùng thực hiện và xác nhận.

Repo dùng Git integration (push `main` → Cloudflare tự build). Không wrangler, không GitHub Actions. SPA fallback: `public/_redirects` (`/* /index.html 200`). Header: `public/_headers`. Node: `.node-version` = `22`.

### Cloudflare Dashboard (người dùng làm)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect to Git.
2. Chọn repo `nguyenbaolab/muisti`, nhánh production `main`.
3. Build settings:
   - Framework preset: **Vite** hoặc **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: để trống
4. Environment variables — đặt cho **cả Production và Preview, trước build đầu tiên** (Vite nhúng lúc build):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - **Không** đặt `SUPABASE_SERVICE_ROLE_KEY`
5. Cloudflare đọc `.node-version` (Node 22). Có thể thêm biến `NODE_VERSION=22` nếu cần — không bắt buộc.

### Supabase Dashboard (phòng ngừa)

Authentication → URL Configuration:

- Site URL = URL production của Pages (`https://<project>.pages.dev` hoặc domain riêng)
- Redirect URLs: URL production, `http://localhost:5173`, và wildcard preview nếu muốn (`https://*.<project>.pages.dev`)

Hiện app chỉ dùng `signInWithPassword` — bước này phòng ngừa (OAuth / magic link / reset password chưa có trong `src/`).

### Checklist sau deploy (người dùng làm)

- Mở URL Pages: trang đăng nhập hiện đúng, font Inter tải, theme đúng.
- Đăng nhập được; F5 trên `/decks`, `/decks/<id>`, `/review` đều không ra 404 (SPA fallback hoạt động).
- Mở DevTools Network: `/assets/*.js` trả header `cache-control` immutable; `index.html` không cache dài; response có `X-Content-Type-Options: nosniff`.
- Đăng xuất và đăng nhập lại; tạo deck nhỏ, ôn một phiên, kiểm tra dữ liệu ghi được (RLS hoạt động trên production).
- Console không lỗi `Missing environment variable`.
- Mở một deck của tài khoản khác bằng URL: bị chặn như local (RLS).
- Xóa deck test sau khi kiểm.

---

## §4 Troubleshooting

(trống — sẽ fill khi gặp lỗi thật lúc setup/deploy)
