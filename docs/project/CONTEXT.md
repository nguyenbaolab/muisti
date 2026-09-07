# CONTEXT — Bản đồ kỹ thuật

Tài liệu kỹ thuật cho Cursor khi đọc/ghi code. Business: `REQUIREMENTS.md`. Quy trình: `WORKFLOW.md`.

---

## §1 Tech stack

- **Frontend:** Vite + React + TypeScript, static SPA
- **Data / Auth:** Supabase (Postgres + Auth), client gọi `supabase-js`, bảo vệ bằng RLS
- **Auth model:** admin invite (`inviteUserByEmail`); không form đăng ký công khai
- **Deploy:** Cloudflare Pages
- **AI content:** Claude đọc PDF unit lúc soạn bài; app v0.1 không gọi LLM lúc runtime
- **Phân công:** Claude thiết kế + prompt; Cursor thực thi code/data; chủ dự án test và quyết định cuối

---

## §2 Module map

```
src/
  main.tsx              # entry point (Vite template)
  App.tsx               # root component (Vite template)
  App.css
  index.css
  assets/               # vite.svg, react.svg, hero.png
  lib/
    supabase.ts         # Supabase client (createClient, requireEnv guard)
public/                 # static assets
supabase/migrations/
  schema.sql            # DDL placeholder (chưa có bảng)
.env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## §3 Navigation skeleton

Chưa có. Sau scaffold dự kiến: login → danh sách unit → học unit (vocab + exercises) → hàng đợi ôn SRS. Chi tiết UI nằm ở `REQUIREMENTS.md`, không ghi ở đây.

---

## §4 Data flow patterns

Xem `docs/project/PATTERNS.md` (pattern lặp lại) và `docs/project/DECISIONS.md` (tách content vs progress, RLS). Không lặp lại ở đây.

Hướng đã chốt:

- Content (`units`, `vocab_items`, `exercises`): authenticated SELECT; ghi chỉ service role
- Progress (`user_vocab_progress`, `quiz_attempts`, `user_unit_progress`): RLS `user_id = auth.uid()`

---

## §5 Conventions

- Comment code và commit message: **tiếng Anh**
- Trao đổi với chủ dự án qua Claude: **tiếng Việt**, giọng thân mật (mình / bạn)
- Functional components + TypeScript; không thêm framework/backend mới nếu chưa bàn với Claude
- `npx tsc --noEmit` phải pass trước khi báo done
- Không đổi kiến trúc đã chốt trong `DECISIONS.md` nếu chưa được chủ dự án xác nhận
- Khi bí: ghi `docs/BLOCKERS.md`, dừng, hỏi user

---

## §6 Store/API index

- `src/lib/supabase.ts`: `export const supabase` — Supabase client dùng chung toàn app; khởi tạo từ `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
