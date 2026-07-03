import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ReminderSettings } from '@/components/ReminderSettings'
import { Reminder } from '@/types'

export default async function TaskDetailPage(props: any) {
  const params = props.params as { id: string }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const task = await getTaskById(params.id)
  const reminders = await getTaskReminders(params.id)

  if (!task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Task not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TaskCard task={task} />
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground">No description provided</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Comments feature coming soon</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/tasks/${task.id}/edit`}>
                <Button className="w-full" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </Button>
              </Link>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </Button>
            </CardContent>
          </Card>

          <ReminderSettings taskId={task.id} initialReminders={reminders} />
        </div>
      </div>
    </div>
  )
}

async function getTaskById(taskId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

async function getTaskReminders(taskId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('task_id', taskId)
    .order('reminder_time', { ascending: true })

  if (error) throw error
  return data as Reminder[]
}

async function deleteTask(taskId: string) {
  'use server'
  
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}
