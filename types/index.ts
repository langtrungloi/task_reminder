export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ReminderType = 'in_app' | 'email' | 'both'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  progress: number
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface TaskAssignment {
  id: string
  task_id: string
  assignee_id: string
  assigned_at: string
}

export interface Reminder {
  id: string
  task_id: string
  user_id: string
  reminder_time: string
  reminder_type: ReminderType
  is_sent: boolean
  sent_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  task_id: string | null
  is_read: boolean
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
}

export interface TaskWithAssignments extends Task {
  assignments: (TaskAssignment & { assignee: Profile })[]
  creator: Profile | null
  comments: (TaskComment & { author: Profile })[]
  reminders: Reminder[]
}
