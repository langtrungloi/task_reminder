# GUIDE for IT Task Reminder

Hướng dẫn này giúp bạn cài đặt, cấu hình và chạy hệ thống IT Task Reminder.

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Chuẩn bị môi trường](#chuẩn-bị-môi-trường)
4. [Cài đặt dự án](#cài-đặt-dự-án)
5. [Thiết lập Supabase](#thiết-lập-supabase)
6. [Triển khai Edge Function gửi email](#triển-khai-edge-function-gửi-email)
7. [Chạy ứng dụng cục bộ](#chạy-ứng-dụng-cục-bộ)
8. [Triển khai lên Vercel](#triển-khai-lên-vercel)
9. [Cấu hình Outlook Add-in](#cấu-hình-outlook-add-in)
10. [Sử dụng ứng dụng](#sử-dụng-ứng-dụng)
11. [Hướng dẫn quản trị](#hướng-dẫn-quản-trị)
12. [Khắc phục sự cố](#khắc-phục-sự-cố)

---

## Giới thiệu

IT Task Reminder là ứng dụng quản lý task cho phòng IT.
Nó hỗ trợ:
- tạo và cập nhật task
- giao task cho người dùng
- nhắc nhở in-app và email
- Outlook Add-in: tạo task từ email Outlook

## Yêu cầu hệ thống

- Node.js 18+
- npm
- Supabase account
- Vercel account chỉ nếu bạn muốn deploy lên Vercel; nếu chỉ chạy local thì không cần

## Chuẩn bị môi trường

1. Mở terminal và vào thư mục dự án:

```bash
cd D:\Document\Project_Create_App\project_task_reminder
```

2. Cài đặt dependency:

```bash
npm install
```

3. Tạo file môi trường `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Nếu bạn dùng email reminder qua Resend Edge Function, thêm:

```env
RESEND_API_KEY=your_resend_api_key
APP_URL=https://your-deployed-app-url
```

> `APP_URL` cần là URL thực tế khi deploy. Nếu chạy local, để `http://localhost:3000`.

---

## Cài đặt dự án

1. Kiểm tra Node version:

```bash
node -v
```

2. Nếu chưa cài Node, hãy cài Node 18+.

3. Cài lại dependency nếu cần:

```bash
npm install
```

---

## Thiết lập Supabase

### 1. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com)
2. Tạo project mới
3. Chờ Supabase khởi tạo

### 2. Cấu hình API

1. Vào Supabase Dashboard > Settings > API
2. Sao chép:
   - `Project URL`
   - `anon public key`
3. Dán vào `.env.local`

### 3. Tạo database schema

1. Vào Supabase Dashboard > SQL Editor
2. Mở file `supabase/schema.sql`
3. Sao chép toàn bộ nội dung
4. Dán và chạy script

### 4. Kiểm tra schema

Script `supabase/schema.sql` tạo:
- `profiles`
- `tasks`
- `task_assignments`
- `reminders`
- `notifications`
- `task_comments`

Nó cũng tạo các chính sách RLS và trigger tự động.

### 5. Thiết lập Authentication

1. Vào Supabase Dashboard > Authentication > Settings
2. Bật Email và Password
3. Cập nhật URL redirect:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-url/auth/callback`

---

## Triển khai Edge Function gửi email

Ứng dụng có Edge Function `supabase/functions/send-reminder-email` để gửi nhắc nhở email.

### 1. Cài Supabase CLI

```bash
npm install -g supabase
```

### 2. Đăng nhập Supabase

```bash
supabase login
```

### 3. Liên kết dự án

```bash
supabase link --project-ref your-project-ref
```

### 4. Triển khai function

```bash
supabase functions deploy send-reminder-email
```

### 5. Cấu hình biến môi trường cho function

Trong Supabase Dashboard > Settings > Environment Variables, thêm:
- `RESEND_API_KEY`
- `APP_URL`

---

## Chạy ứng dụng cục bộ

1. Chạy server Next.js:

```bash
npm run dev
```

2. Mở trình duyệt tại:

```text
http://localhost:3000
```

3. Đăng ký hoặc đăng nhập bằng email.

---

## Triển khai lên Vercel (tùy chọn)

Nếu bạn muốn dùng Vercel, làm theo các bước sau. Nếu không muốn deploy trên Vercel, bạn có thể chạy ứng dụng local hoặc chọn nền tảng hosting khác hỗ trợ Next.js như Render, Fly, Netlify, hoặc VPS Node.js.

### 1. Chuẩn bị repository

1. Khởi tạo git:

```bash
git init
git add .
git commit -m "Initial commit"
```

2. Đẩy lên GitHub

```bash
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy trên Vercel

1. Đăng nhập Vercel
2. Chọn "New Project"
3. Chọn repository GitHub
4. Cấu hình:
   - Framework: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Thêm environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` (nếu dùng)
   - `APP_URL`
6. Deploy

### 3. Cấu hình Supabase Auth

Đăng nhập Supabase > Authentication > URL Configuration:
- `Site URL`: `https://your-vercel-domain`
- `Redirect URLs`: `https://your-vercel-domain/auth/callback`

---

## Cấu hình Outlook Add-in

Outlook Add-in nằm ở đường dẫn `/outlook-addin`.

### 1. Triển khai app lên Vercel

### 2. Cập nhật `outlook-addin/manifest.xml`

Thay các URL:
- `SourceLocation`
- `functionFile`
- `taskPaneUrl`

với `https://your-vercel-domain/outlook-addin`

### 3. Cài manifest vào Outlook

1. Mở Outlook for Windows hoặc Outlook Web
2. Chọn `Get Add-ins` > `My add-ins`
3. Chọn `Add a custom add-in` > `Add from file`
4. Chọn `outlook-addin/manifest.xml`

### 4. Sử dụng Outlook Add-in

1. Mở email trong Outlook
2. Mở pane add-in
3. Nhấn `Lấy email hiện tại`
4. Chỉnh sửa thông tin task
5. Tạo task và reminder

---

## Sử dụng ứng dụng

### 1. Đăng nhập

- Đăng nhập bằng email/password hoặc Magic Link

### 2. Tạo task

- Chọn `New Task`
- Điền tiêu đề, mô tả, ngày hạn, ưu tiên

### 3. Nhắc nhở task

- Vào chi tiết task
- Mở `ReminderSettings`
- Thêm thời gian reminder
- Chọn `In-App`, `Email`, hoặc `Both`

### 4. Xem danh sách task

- `My Tasks`
- `Assigned to me`
- `All Tasks` (theo quyền)

### 5. Comment task

- Vào chi tiết task
- Thêm comment để trao đổi

---

## Quản trị hệ thống

### 1. Kiểm tra trạng thái Supabase

- Kiểm tra Supabase project
- Kiểm tra các bảng có tồn tại
- Kiểm tra RLS policy

### 2. Kiểm tra biến môi trường

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `APP_URL`

### 3. Bảo trì database

- Backup dữ liệu Supabase thường xuyên
- Kiểm tra log Edge Function if needed

---

## Khắc phục sự cố

### 1. Lỗi kết nối Supabase

- Kiểm tra `.env.local`
- Kiểm tra `Project URL` và `anon key`
- Kiểm tra Supabase dashboard

### 2. Lỗi auth

- Kiểm tra `Redirect URLs` trong Supabase
- Kiểm tra email đã đăng ký
- Kiểm tra browser console

### 3. Lỗi build trên Vercel

- Kiểm tra `Node.js` version
- Kiểm tra các biến môi trường
- Xem logs deploy

### 4. Lỗi Outlook Add-in

- Kiểm tra manifest đã trỏ đúng URL chưa
- Kiểm tra Outlook có hỗ trợ custom add-in
- Kiểm tra console của Add-in

---

## Ghi chú

- Nếu dùng Resend, đảm bảo `RESEND_API_KEY` hợp lệ.
- Nếu chưa muốn deploy, dùng local app với `npm run dev`.
- Outlook Add-in chỉ hoạt động khi app đã chạy trên HTTPS hoặc domain hợp lệ.
