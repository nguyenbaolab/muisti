# RUNBOOK — Vận hành & phát triển

Phần chưa verify ghi rõ. Sẽ update khi deploy lần đầu.

---

## §1 Setup môi trường dev

**Yêu cầu (dự kiến, chưa verify trên máy mới):**

- Node.js 20+ (LTS)
- npm đi kèm Node
- Tài khoản [Supabase](https://supabase.com) (khi bắt đầu schema)
- Tài khoản [Cloudflare](https://dash.cloudflare.com) (khi deploy)

**Clone & cài (sau khi có git + `package.json`):**

```bash
git clone <repo-url>
cd muisti
npm install
cp .env.example .env
```

Nội dung `.env` dự kiến (không commit):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Chạy local (sau scaffold):**

```bash
npm run dev      # thường http://localhost:5173
npm run build
npm run preview
npx tsc --noEmit
```

Hiện **chưa scaffold** — các lệnh trên chưa chạy được cho đến khi có Vite + `package.json`.

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

**Chưa verify, sẽ update khi deploy lần đầu.**

Dự kiến:

1. Push repo lên Git (branch `main`).
2. Cloudflare Dashboard → Workers & Pages → Create → Connect Git → chọn repo.
3. Build: command `npm run build`, output `dist` (Vite mặc định).
4. Environment variables (Production và Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. SPA fallback: mọi route trả `index.html`.
6. Supabase → URL Configuration / Allowed Origins: thêm URL Pages + `http://localhost:5173`.

---

## §4 Troubleshooting

(trống — sẽ fill khi gặp lỗi thật lúc setup/deploy)
