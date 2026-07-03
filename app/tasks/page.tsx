import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const tasks = await getTasks(user.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your tasks</p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => (window.location.href = `/tasks/${task.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

async function getTasks(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .or(`created_by.eq.${userId},id.in.(select task_id from task_assignments where assignee_id.eq.${userId})`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
