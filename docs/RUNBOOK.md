# RUNBOOK — Vận hành & phát triển

Phần dashboard Cloudflare/Supabase chờ người dùng thực hiện. Repo đã chuẩn bị Workers Static Assets (`wrangler.jsonc`).

---

## §1 Setup môi trường dev

**Yêu cầu:**

- Node.js 22 (ghim trong `.node-version`; `package.json` `engines.node` = `^20.19.0 || >=22.12.0` — khớp Vite 8)
- npm đi kèm Node
- Tài khoản [Supabase](https://supabase.com) — project đã có; schema trong `supabase/schema.sql` + `supabase/migrations/`
- Tài khoản [Cloudflare](https://dash.cloudflare.com) (khi deploy Worker)

**Clone & cài:**

```bash
git clone https://github.com/nguyenbaolab/muisti.git
cd muisti
npm ci
cp .env.example .env
```

Điền `.env` (không commit). Hai biến `VITE_*` bắt buộc để SPA chạy local. Biến Worker (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) chỉ cần khi chạy/deploy Worker — xem §3 secrets.

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

## §3 Deploy (Cloudflare Workers Static Assets)

**Trạng thái:** Chuẩn bị xong phía repo; các bước dashboard chờ người dùng thực hiện và xác nhận.

Project là **Cloudflare Workers với Static Assets**, không phải Pages cổ điển. Tên Worker `muisti` khớp `wrangler.jsonc` `"name"`. Git integration: push `main` → Cloudflare tự build rồi `npx wrangler deploy`. Không thêm wrangler vào `package.json`. SPA fallback do `assets.not_found_handling = "single-page-application"`. **Không** dùng `_redirects`. Header: `public/_headers`. Node: `.node-version` = `22`.

### Cloudflare Dashboard (người dùng làm)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create application → kết nối Git (repo `nguyenbaolab/muisti`, nhánh `main`). Worker đã tạo tên `muisti`.
2. Build / deploy:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (mặc định luồng Workers)
   - Root directory: để trống
3. Biến môi trường — tách **Build** (Vite) và **Worker runtime**:

   **Build variables** (Dashboard → Settings → **Build** → Variables and secrets), đặt **trước** build đầu (Vite nhúng lúc `npm run build`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - **Không** đặt `SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / bất kỳ secret nào vào Build vars (lộ vào log/bundle).

   **Worker runtime** (SPA + API cùng origin nhờ `main` + `ASSETS`):
   - Secrets — set **trước** deploy có Worker API, nếu không `/api/generate-exercise` trả `server_misconfigured`:
     ```bash
     npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
     npx wrangler secret put ANTHROPIC_API_KEY
     npx wrangler secret put SUPABASE_ANON_KEY
     ```
   - Plain var (Dashboard → Worker → Settings → Variables **runtime**, hoặc `wrangler secret`/`vars` — **không** Build):
     - `SUPABASE_URL` = URL project Supabase (cùng giá trị với `VITE_SUPABASE_URL`, nhưng **không** dùng tên `VITE_` — Worker runtime không đọc `VITE_*`).

4. Cloudflare đọc `.node-version` (Node 22). Có thể thêm `NODE_VERSION=22` nếu cần — không bắt buộc.

5. Test tay API sau deploy (thay domain + token + vocab uuid):
   ```bash
   curl -X POST https://muisti.<subdomain>.workers.dev/api/generate-exercise \
     -H "Authorization: Bearer <supabase_access_token>" \
     -H "Content-Type: application/json" \
     -d "{\"vocab_item_id\":\"<uuid>\",\"exercise_type\":\"mcq\"}"
   ```

### Supabase Dashboard (phòng ngừa)

Authentication → URL Configuration:

- Site URL = URL production của Worker (`https://muisti.<subdomain>.workers.dev` hoặc domain riêng)
- Redirect URLs: URL production, `http://localhost:5173`, và wildcard preview nếu dùng

Hiện app chỉ dùng `signInWithPassword` — bước này phòng ngừa (OAuth / magic link / reset password chưa có trong `src/`).

### Checklist sau deploy (người dùng làm)

- Mở URL Worker: trang đăng nhập hiện đúng, font Inter tải, theme đúng.
- Đăng nhập được; F5 trên `/decks`, `/decks/<id>`, `/review` đều không ra 404 (SPA fallback hoạt động).
- Gõ thẳng `https://<url>/decks` trên thanh địa chỉ (không qua nút trong app) để kiểm SPA fallback.
- Mở DevTools Network: `/assets/*.js` trả header `cache-control` immutable; `index.html` không cache dài; response có `X-Content-Type-Options: nosniff`. Không cần mở `https://<url>/_headers` — file `_headers` không phải URL công khai; chỉ đọc header trong DevTools.
- Đăng xuất và đăng nhập lại; tạo deck nhỏ, ôn một phiên, kiểm tra dữ liệu ghi được (RLS hoạt động trên production).
- Console không lỗi `Missing environment variable`.
- Mở một deck của tài khoản khác bằng URL: bị chặn như local (RLS).
- Xóa deck test sau khi kiểm.

### Sự cố đã gặp

- **100324 — Invalid `_redirects` configuration:** *Line 1: Infinite loop detected in this rule. This would cause a redirect to strip `.html` or `/index` and end up triggering this rule again.*  
  Deploy gọi `/workers/scripts/muisti/versions` (luồng Workers, không phải Pages). Rule `/* /index.html 200` trong `_redirects` bị từ chối.  
  **Cách giải:** xóa `public/_redirects`; SPA bằng `wrangler.jsonc` `assets.not_found_handling = "single-page-application"`.

---

## §4 Troubleshooting

(trống — sẽ fill khi gặp lỗi thật lúc setup/deploy)
