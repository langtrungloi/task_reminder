-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- 'admin', 'manager', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'done', 'cancelled'
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Task assignments (many-to-many relationship)
CREATE TABLE public.task_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(task_id, assignee_id)
);

-- Reminders for tasks
CREATE TABLE public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT DEFAULT 'in_app', -- 'in_app', 'email', 'both'
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Notifications (in-app)
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Task comments
CREATE TABLE public.task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_assignee_id ON public.task_assignments(assignee_id);
CREATE INDEX idx_reminders_task_id ON public.reminders(task_id);
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_reminder_time ON public.reminders(reminder_time);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks they created or are assigned to" ON public.tasks
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT task_id FROM public.task_assignments WHERE assignee_id = auth.uid())
  );

CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (SELECT task_id FROM public.task_assignments WHERE assignee_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks they created" ON public.tasks
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments" ON public.task_assignments
  FOR SELECT USING (
    assignee_id = auth.uid() OR
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can create task assignments for their tasks" ON public.task_assignments
  FOR INSERT WITH CHECK (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can delete task assignments for their tasks" ON public.task_assignments
  FOR DELETE USING (
    task_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
  );

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders" ON public.reminders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders" ON public.reminders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments for accessible tasks" ON public.task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tasks
      WHERE created_by = auth.uid() OR
      id IN (SELECT task_id FROM public.task_assignments WHERE assignee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments for accessible tasks" ON public.task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
      SELECT id FROM public.tasks
      WHERE created_by = auth.uid() OR
      id IN (SELECT task_id FROM public.task_assignments WHERE assignee_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own comments" ON public.task_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE USING (user_id = auth.uid());

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to set completed_at when task status is 'done'
CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = TIMEZONE('utc', NOW());
    NEW.progress = 100;
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task status change
CREATE TRIGGER on_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_status_change();

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
