import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardStats } from '@/components/DashboardStats'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const tasks = await getTasks(user.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTasks = tasks.filter(
    task => task.due_date && new Date(task.due_date).toDateString() === today.toDateString()
  )

  const overdueTasks = tasks.filter(
    task => task.due_date && new Date(task.due_date) < today && task.status !== 'done'
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your task overview.</p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      <DashboardStats tasks={tasks} />

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Today's Tasks</h2>
          <div className="space-y-4">
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground">No tasks due today.</p>
            ) : (
              todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => (window.location.href = `/tasks/${task.id}`)}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Overdue Tasks</h2>
          <div className="space-y-4">
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground">No overdue tasks. Great job!</p>
            ) : (
              overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => (window.location.href = `/tasks/${task.id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">All Tasks</h2>
          <Link href="/tasks">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.slice(0, 6).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => (window.location.href = `/tasks/${task.id}`)}
            />
          ))}
        </div>
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
