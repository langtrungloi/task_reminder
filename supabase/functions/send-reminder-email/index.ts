import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task_id, user_id, reminder_time } = await req.json()

    if (!task_id || !user_id || !reminder_time) {
      throw new Error('Missing task_id, user_id or reminder_time')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, description, due_date')
      .eq('id', task_id)
      .single()

    if (taskError) throw taskError
    if (!task) throw new Error('Task not found')

    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*')
      .eq('task_id', task_id)
      .eq('user_id', user_id)
      .eq('reminder_time', reminder_time)
      .single()

    if (reminderError) throw reminderError
    if (!reminder) throw new Error('Reminder not found')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single()

    if (profileError) throw profileError
    if (!profile) throw new Error('Profile not found')

    const appUrl = Deno.env.get('APP_URL') ?? 'https://your-app-url'
    const taskUrl = `${appUrl}/tasks/${task.id}`
    const subject = `Reminder: ${task.title}`
    const dueDateText = task.due_date ? new Date(task.due_date).toLocaleString('en-US', { timeZone: 'UTC' }) : 'No due date'
    const bodyText = `Hello ${profile.full_name || profile.email},\n\nThis is a reminder for your task:\n\nTitle: ${task.title}\nDue date: ${dueDateText}\n\n${task.description || ''}\n\nView task: ${taskUrl}\n\nThank you.`
    const bodyHtml = `
      <p>Hello ${profile.full_name || profile.email},</p>
      <p>This is a reminder for your task:</p>
      <ul>
        <li><strong>Title:</strong> ${task.title}</li>
        <li><strong>Due date:</strong> ${dueDateText}</li>
      </ul>
      <p>${task.description || ''}</p>
      <p><a href="${taskUrl}">View task in IT Task Reminder</a></p>
      <p>Thank you.</p>
    `

    if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY is not configured')
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'no-reply@yourdomain.com',
          to: profile.email,
          subject,
          text: bodyText,
          html: bodyHtml,
        }),
      })

      if (!response.ok) {
        const responseBody = await response.text()
        throw new Error(`Failed to send reminder email: ${response.statusText} ${responseBody}`)
      }
    }

    const { error: updateError } = await supabase
      .from('reminders')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', reminder.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
