'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Task, TaskStatus, TaskPriority } from '@/types'

export async function getTasks(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:profiles!tasks_created_by_fkey (id, full_name, email),
      assignments:task_assignments (
        id,
        assignee_id,
        assigned_at,
        assignee:profiles (id, full_name, email)
      ),
      comments:task_comments (
        id,
        comment,
        created_at,
        user_id,
        author:profiles (id, full_name, email)
      ),
      reminders:reminders (*)
    `)
    .or(`created_by.eq.${userId},assignments.assignee_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTaskById(taskId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:profiles!tasks_created_by_fkey (id, full_name, email),
      assignments:task_assignments (
        id,
        assignee_id,
        assigned_at,
        assignee:profiles (id, full_name, email)
      ),
      comments:task_comments (
        id,
        comment,
        created_at,
        user_id,
        author:profiles (id, full_name, email)
      ),
      reminders:reminders (*)
    `)
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

export async function createTask(task: Partial<Task>, assigneeIds: string[]) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      progress: task.progress || 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (taskError) throw taskError

  // Add assignments
  if (assigneeIds.length > 0) {
    const assignments = assigneeIds.map(assigneeId => ({
      task_id: taskData.id,
      assignee_id: assigneeId,
    }))

    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .insert(assignments)

    if (assignmentError) throw assignmentError
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  return taskData
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
  return data
}

export async function deleteTask(taskId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
}

export async function getProfiles() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .order('full_name')

  if (error) throw error
  return data
}

export async function addComment(taskId: string, comment: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      comment,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/tasks/${taskId}`)
  return data
}

export async function addReminder(taskId: string, reminderTime: string, reminderType: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      task_id: taskId,
      user_id: user.id,
      reminder_time: reminderTime,
      reminder_type: reminderType,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/tasks/${taskId}`)
  return data
}

export async function deleteReminder(reminderId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)

  if (error) throw error

  return true
}

export async function getNotifications(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error

  revalidatePath('/dashboard')
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'info',
  taskId?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      task_id: taskId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
