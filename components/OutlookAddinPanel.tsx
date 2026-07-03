'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Task, ReminderType } from '@/types'
import { format } from 'date-fns'

declare global {
  interface Window {
    Office?: any
  }
}

function getSupabaseClient() {
  return createClient()
}

function formatTaskDate(dateString: string | null) {
  if (!dateString) return 'No due date'
  return format(new Date(dateString), 'MMM d, yyyy h:mm a')
}

function buildIcsContent(task: Task) {
  const start = task.due_date ? new Date(task.due_date) : new Date()
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const uid = `${task.id}@it-task-reminder`
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IT Task Reminder//Outlook Add-in//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${task.title}`,
    `DESCRIPTION:${task.description || 'Task from IT Task Reminder'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function extractDueDate(text: string) {
  const lower = text.toLowerCase()
  const now = new Date()

  if (lower.includes('due tomorrow') || lower.includes('by tomorrow')) {
    now.setDate(now.getDate() + 1)
    now.setHours(17, 0, 0, 0)
    return now
  }

  if (lower.includes('due today') || lower.includes('by today')) {
    now.setHours(17, 0, 0, 0)
    return now
  }

  const dateRegex = /(?:due|by)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\w+ \d{1,2})/i
  const match = text.match(dateRegex)
  if (match) {
    const parsed = new Date(match[1])
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  if (lower.includes('urgent') || lower.includes('asap')) {
    now.setHours(now.getHours() + 4)
    return now
  }

  return null
}

function extractPriority(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) {
    return 'urgent'
  }
  if (lower.includes('high priority') || lower.includes('important')) {
    return 'high'
  }
  if (lower.includes('low priority') || lower.includes('whenever')) {
    return 'low'
  }
  return 'medium'
}

function getFirstLine(text: string) {
  return text.split('\n').find((line) => line.trim().length > 0)?.trim() ?? ''
}

export function OutlookAddinPanel() {
  const [officeReady, setOfficeReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [draftEmail, setDraftEmail] = useState({ subject: '', body: '', from: '' })
  const [draftTask, setDraftTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    reminder_type: 'both' as ReminderType,
    reminder_time: '',
    assignToMe: true,
  })
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadOffice = () => {
      if (window.Office) {
        window.Office.onReady(() => setOfficeReady(true))
        return
      }

      const script = document.createElement('script')
      script.id = 'office-js'
      script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js'
      script.async = true
      script.onload = () => {
        if (window.Office) {
          window.Office.onReady(() => setOfficeReady(true))
        }
      }
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }

    loadOffice()
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true)
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setAuthenticated(true)
        await loadTasks()
      }
      setLoading(false)
    }

    restoreSession()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setAuthenticated(false)
      setTasks([])
      setLoading(false)
      return
    }

    const client = getSupabaseClient()
    const userId = userData.user.id
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .or(`created_by.eq.${userId},id.in.(select task_id from task_assignments where assignee_id.eq.${userId})`)
      .order('due_date', { ascending: true })

    if (error) {
      setError(error.message)
      setTasks([])
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const loadEmailFromOutlook = async () => {
    try {
      setIsLoadingEmail(true)
      setError('')
      setSuccessMessage('')

      if (!window.Office?.context?.mailbox?.item) {
        throw new Error('Không tìm thấy môi trường Outlook Add-in.')
      }

      const item = window.Office.context.mailbox.item
      const subject = item.subject || ''
      const from = item.from?.emailAddress || item.sender?.emailAddress || ''

      const bodyAsync = new Promise<string>((resolve, reject) => {
        item.body.getAsync('text', (result: any) => {
          if (result.status === 'succeeded') {
            resolve(result.value || '')
          } else {
            reject(new Error(result.error?.message || 'Không thể đọc nội dung email.'))
          }
        })
      })

      const body = await bodyAsync
      const subjectLine = subject || getFirstLine(body) || 'New task from Outlook email'
      const suggestedDue = extractDueDate(`${subject}\n${body}`)
      const suggestedPriority = extractPriority(`${subject}\n${body}`)
      const suggestedReminder = suggestedDue ? new Date(suggestedDue.getTime() - 60 * 60 * 1000) : null

      setDraftEmail({ subject: subjectLine, body, from })
      setDraftTask({
        title: subjectLine,
        description: `From: ${from}\n\n${body}`,
        due_date: suggestedDue ? toDateTimeLocal(suggestedDue.toISOString()) : '',
        priority: suggestedPriority,
        reminder_type: 'both',
        reminder_time: suggestedReminder ? toDateTimeLocal(suggestedReminder.toISOString()) : '',
        assignToMe: true,
      })
    } catch (e: any) {
      setError(e.message || 'Không thể đọc email Outlook.')
    } finally {
      setIsLoadingEmail(false)
    }
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      setAuthenticated(true)
      await loadTasks()
    } catch (authError: any) {
      setError(authError.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()
      const { error: magicError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/outlook-addin` } })
      if (magicError) throw magicError
      setMagicSent(true)
    } catch (magicError: any) {
      setError(magicError.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    setAuthenticated(false)
    setTasks([])
    setLoading(false)
  }

  const openTaskInApp = (taskId: string) => {
    window.open(`/tasks/${taskId}`, '_blank')
  }

  const downloadIcs = (task: Task) => {
    const ics = buildIcsContent(task)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'task'}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const supabase = getSupabaseClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('Người dùng chưa đăng nhập')

      const taskPayload = {
        title: draftTask.title,
        description: draftTask.description || null,
        due_date: draftTask.due_date || null,
        priority: draftTask.priority,
        status: 'todo',
        progress: 0,
        created_by: userData.user.id,
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert(taskPayload)
        .select()
        .single()

      if (taskError || !taskData) throw taskError || new Error('Không tạo được task')

      if (draftTask.assignToMe) {
        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert({ task_id: taskData.id, assignee_id: userData.user.id })
        if (assignmentError) throw assignmentError
      }

      if (draftTask.reminder_time) {
        const { error: reminderError } = await supabase
          .from('reminders')
          .insert({
            task_id: taskData.id,
            user_id: userData.user.id,
            reminder_time: draftTask.reminder_time,
            reminder_type: draftTask.reminder_type,
          })
        if (reminderError) throw reminderError
      }

      await loadTasks()
      setSuccessMessage('Task đã được tạo và lưu nhắc nhở thành công.')
      setDraftTask({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        reminder_type: 'both',
        reminder_time: '',
        assignToMe: true,
      })
    } catch (e: any) {
      setError(e.message || 'Tạo task thất bại')
    } finally {
      setLoading(false)
    }
  }

  const outlookStatus = useMemo(() => {
    if (!officeReady) return 'Office.js is loading or this is not Outlook environment.'
    return 'Outlook Add-in ready.'
  }, [officeReady])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outlook Add-in</CardTitle>
          <CardDescription>
            {outlookStatus} Use this pane to read the selected email and create a task in IT Task Reminder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add-in không dùng Microsoft Graph API. Nó kết nối trực tiếp đến backend app và quản lý task bằng Supabase.
            </p>
            <Button onClick={() => window.open('/dashboard', '_blank')}>
              Open full task app
            </Button>
          </div>
        </CardContent>
      </Card>

      {authenticated ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Tạo task từ email Outlook</CardTitle>
                  <CardDescription>
                    Nếu bạn đang mở email trong Outlook, nhấn nút để lấy nội dung và gợi ý task.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={loadEmailFromOutlook} disabled={!officeReady || isLoadingEmail}>
                {isLoadingEmail ? 'Đang tải email...' : 'Lấy email hiện tại'}
              </Button>
              {draftEmail.subject && (
                <div className="space-y-2 rounded-lg border p-4 bg-surface">
                  <p className="text-sm font-semibold">Email hiện tại</p>
                  <p><strong>From:</strong> {draftEmail.from || 'Unknown'}</p>
                  <p><strong>Subject:</strong> {draftEmail.subject}</p>
                </div>
              )}
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Tiêu đề task</Label>
                    <Input
                      id="task-title"
                      value={draftTask.title}
                      onChange={(e) => setDraftTask({ ...draftTask, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-priority">Ưu tiên</Label>
                    <select
                      id="task-priority"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={draftTask.priority}
                      onChange={(e) => setDraftTask({ ...draftTask, priority: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-description">Mô tả</Label>
                  <textarea
                    id="task-description"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draftTask.description}
                    onChange={(e) => setDraftTask({ ...draftTask, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="task-due-date">Ngày hạn</Label>
                    <Input
                      id="task-due-date"
                      type="datetime-local"
                      value={draftTask.due_date}
                      onChange={(e) => setDraftTask({ ...draftTask, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminder-time">Thời gian nhắc nhở</Label>
                    <Input
                      id="reminder-time"
                      type="datetime-local"
                      value={draftTask.reminder_time}
                      onChange={(e) => setDraftTask({ ...draftTask, reminder_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-type">Loại nhắc nhở</Label>
                    <select
                      id="reminder-type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={draftTask.reminder_type}
                      onChange={(e) => setDraftTask({ ...draftTask, reminder_type: e.target.value as ReminderType })}
                    >
                      <option value="in_app">In-App only</option>
                      <option value="email">Email only</option>
                      <option value="both">In-App + Email</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="assign-to-me"
                      type="checkbox"
                      checked={draftTask.assignToMe}
                      onChange={(e) => setDraftTask({ ...draftTask, assignToMe: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="assign-to-me">Giao cho tôi</Label>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" disabled={loading}>{loading ? 'Đang lưu...' : 'Tạo task từ email'}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDraftTask({
                        title: '',
                        description: '',
                        due_date: '',
                        priority: 'medium',
                        reminder_type: 'both',
                        reminder_time: '',
                        assignToMe: true,
                      })
                      setDraftEmail({ subject: '', body: '', from: '' })
                    }}
                  >
                    Xóa form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách task</CardTitle>
              <CardDescription>Dùng để kiểm tra nhanh các task hiện có.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-muted-foreground">Không có task nào.</p>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <CardTitle>{task.title}</CardTitle>
                            <CardDescription>{formatTaskDate(task.due_date)}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openTaskInApp(task.id)}>
                              Open
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadIcs(task)}>
                              Download ICS
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{task.description || 'No description'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Sign in with your email to access tasks from Outlook.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {magicSent && <p className="text-sm text-foreground">Magic link sent. Check your email.</p>}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
                <Button type="button" variant="outline" onClick={handleMagicLink} disabled={loading}>
                  Send Magic Link
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
