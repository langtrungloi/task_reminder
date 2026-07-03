# IT Task Reminder

Ứng dụng quản lý công việc cho phòng IT, xây dựng bằng Next.js 15, Supabase và shadcn/ui.

## Tổng quan

IT Task Reminder giúp:
- Tạo, quản lý task với trạng thái, tiến độ, ưu tiên
- Cấu hình nhắc nhở in-app và email
- Quản lý task cho cá nhân và người được giao
- Ghi nhận bình luận và thông báo thời gian thực
- Hỗ trợ Outlook Add-in để lấy email và tạo task từ Outlook

## Điểm nổi bật

- **Auth:** Email/password và Magic Link
- **Supabase:** Auth, PostgreSQL, RLS, Edge Function
- **Email reminder:** send-reminder-email Edge Function với Resend
- **Outlook Add-in:** Pane Outlook đọc email và tạo task
- **Responsive:** UI chạy tốt trên desktop và mobile
- **Hosting:** Có thể chạy local hoặc deploy lên Vercel / nền tảng Next.js khác

## Quick Start

1. Sao chép repo và cài đặt dependency:

```bash
cd D:\Document\Project_Create_App\project_task_reminder
npm install
```

2. Tạo file `.env.local` với nội dung:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Chạy app:

```bash
npm run dev
```

4. Mở [http://localhost:3000](http://localhost:3000)

5. Tham khảo `GUIDE.md` để biết hướng dẫn chi tiết cài đặt Supabase, deploy và Outlook Add-in.

## Các file quan trọng

- `app/`: Next.js App Router
- `components/OutlookAddinPanel.tsx`: Outlook Add-in pane
- `app/actions/tasks.ts`: CRUD task và reminder
- `components/ReminderSettings.tsx`: Thiết lập reminder task
- `supabase/schema.sql`: Database schema & RLS
- `supabase/functions/send-reminder-email/index.ts`: Edge Function gửi email reminder
- `outlook-addin/manifest.xml`: Outlook Add-in manifest

## Cấu trúc nhanh

```
project_task_reminder/
├── app/
├── components/
├── lib/
├── supabase/
├── types/
├── outlook-addin/
├── .env.local.example
├── package.json
├── tsconfig.json
└── README.md
```

## Lưu ý triển khai

- `GUIDE.md` chứa toàn bộ bước cài đặt và cấu hình.
- Outlook Add-in hoạt động khi app đã deploy và manifest trỏ đúng URL `https://your-app/outlook-addin`.
- Email reminder cần `RESEND_API_KEY` và `APP_URL` được cấu hình trong Supabase Edge Function.

## Hỗ trợ

Nếu cần trợ giúp thêm, mở issue trong repository GitHub.
