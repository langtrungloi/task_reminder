'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reminder, ReminderType } from '@/types'
import { Bell, Mail, Clock, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface ReminderSettingsProps {
  taskId: string
  initialReminders: Reminder[]
}

export function ReminderSettings({ taskId, initialReminders }: ReminderSettingsProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [showAddForm, setShowAddForm] = useState(false)
  const [reminderTime, setReminderTime] = useState('')
  const [reminderType, setReminderType] = useState<ReminderType>('in_app')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    setReminders(initialReminders)
  }, [initialReminders])

  const setQuickReminder = (minutes: number) => {
    const date = new Date()
    date.setMinutes(date.getMinutes() + minutes)
    setReminderTime(date.toISOString().slice(0, 16))
  }

  const addReminder = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (!reminderTime) {
        throw new Error('Please select a reminder time.')
      }

      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) {
        throw new Error('Please sign in to add reminders.')
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          task_id: taskId,
          user_id: userData.user.id,
          reminder_time: reminderTime,
          reminder_type: reminderType,
        })
        .select()
        .single()

      if (error || !data) {
        throw error || new Error('Failed to add reminder.')
      }

      setReminders((current) => [...current, data])
      setReminderTime('')
      setShowAddForm(false)
      setMessage('Reminder added.')
    } catch (addError: any) {
      setError(addError.message || 'Unable to add reminder.')
    } finally {
      setLoading(false)
    }
  }

  const deleteReminder = async (reminderId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId)

      if (error) throw error
      setReminders((current) => current.filter((reminder) => reminder.id !== reminderId))
      setMessage('Reminder removed.')
    } catch (deleteError: any) {
      setError(deleteError.message || 'Unable to delete reminder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Reminders
            </CardTitle>
            <CardDescription>Nhắc nhở task bằng in-app hoặc email.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Clock className="mr-2 h-4 w-4" />
            Add Reminder
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {showAddForm && (
          <form onSubmit={addReminder} className="space-y-4 mb-4 p-4 rounded-lg border border-border bg-muted">
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder Time</Label>
              <Input
                id="reminder-time"
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Quick Add</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '30 minutes from now', minutes: 30 },
                  { label: '1 hour from now', minutes: 60 },
                  { label: '1 day from now', minutes: 1440 },
                ].map((quick) => (
                  <Button
                    key={quick.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickReminder(quick.minutes)}
                  >
                    {quick.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-type">Notification Type</Label>
              <select
                id="reminder-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as ReminderType)}
              >
                <option value="in_app">In-App Only</option>
                <option value="email">Email Only</option>
                <option value="both">In-App + Email</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Save Reminder'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {message && <p className="mb-3 text-sm text-foreground">{message}</p>}
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders set</p>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {reminder.reminder_type === 'email' ? (
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(reminder.reminder_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.reminder_type === 'both'
                        ? 'In-App + Email'
                        : reminder.reminder_type === 'email'
                        ? 'Email'
                        : 'In-App'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.is_sent ? 'Sent' : 'Pending'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteReminder(reminder.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
