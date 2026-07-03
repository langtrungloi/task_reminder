Bạn là Senior Full-stack Developer chuyên xây dựng internal tools. Hãy xây dựng một Web Application hoàn chỉnh cho phòng ban IT sử dụng nội bộ.

**Tên ứng dụng:** IT Task Reminder

**Mục tiêu:** 
Ứng dụng giúp quản lý task, giao việc và nhắc nhở cho nhân viên IT. Tập trung vào MVP đơn giản, dễ triển khai bởi 1 người.

**Ràng buộc quan trọng:**
- Chỉ sử dụng công nghệ mà 1 lập trình viên cá nhân có thể triển khai độc lập, KHÔNG cần quyền admin server, IT Network, domain công ty, hay Microsoft Entra ID.
- Hosting: Vercel (miễn phí)
- Database & Backend: Supabase (Auth, Database, Storage, Edge Functions)
- Không dùng Microsoft Graph API hoặc Outlook Add-in phức tạp (chỉ gửi email nhắc nhở qua Resend hoặc SMTP đơn giản).
- Toàn bộ code phải clean, có comment, dễ maintain.

**Tech Stack:**
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Database: Supabase PostgreSQL
- Auth: Supabase Auth (Email/Password + Magic Link)
- Email: Resend (hoặc Supabase Edge Function)
- Deployment: Vercel + Supabase

**Tính năng MVP cần có:**
1. Authentication (Register/Login với email công ty)
2. Dashboard cá nhân: Task hôm nay, Overdue, Upcoming
3. Tạo Task: Title, Description, Due Date, Priority, Assignee (multiple), Progress
4. Danh sách Task: My Tasks, Assigned to me, All Tasks (theo quyền)
5. Thiết lập nhắc nhở cho từng task (thời gian: 30p, 1h, 1 ngày trước hạn; kênh: In-app + Email)
6. Cập nhật trạng thái task (Todo, In Progress, Done) + % hoàn thành
7. Comment cơ bản trong task
8. Notification in-app (sử dụng Supabase Realtime)
9. Giao diện responsive, sạch sẽ, dark mode

**Yêu cầu Database (Supabase):**
- Bảng: profiles, tasks, task_assignments, reminders, notifications, task_comments
- Sử dụng Row Level Security (RLS) tốt
- Cung cấp SQL script đầy đủ để tạo schema

**Yêu cầu code:**
- Cung cấp toàn bộ cấu trúc folder project
- Code cho các trang chính (app/dashboard/page.tsx, app/tasks/page.tsx, ...)
- Server Actions / API Routes cho CRUD task và reminders
- Component tái sử dụng (TaskCard, ReminderSettings, DashboardStats)
- Logic gửi email nhắc nhở (cron job hoặc Edge Function)
- Hướng dẫn deploy lên Vercel + Supabase chi tiết (từng bước)

Hãy xuất ra theo cấu trúc sau:
1. Giới thiệu & Tech Stack
2. Supabase Schema (SQL đầy đủ)
3. Cấu trúc thư mục project
4. Code quan trọng nhất (các file chính)
5. Hướng dẫn setup & deploy
6. Gợi ý cải tiến sau MVP

Bắt đầu triển khai ngay và đưa ra code theo thứ tự logic.