'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Task } from '@/types'
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'

interface DashboardStatsProps {
  tasks: Task[]
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTasks = tasks.filter(
    task => task.due_date && new Date(task.due_date).toDateString() === today.toDateString()
  )

  const overdueTasks = tasks.filter(
    task => task.due_date && new Date(task.due_date) < today && task.status !== 'done'
  )

  const upcomingTasks = tasks.filter(
    task => task.due_date && new Date(task.due_date) > today && task.status !== 'done'
  )

  const completedTasks = tasks.filter(task => task.status === 'done')

  const stats = [
    {
      title: 'Today',
      value: todayTasks.length,
      icon: Calendar,
      color: 'text-blue-500',
    },
    {
      title: 'Overdue',
      value: overdueTasks.length,
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      title: 'Upcoming',
      value: upcomingTasks.length,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Completed',
      value: completedTasks.length,
      icon: CheckCircle,
      color: 'text-green-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
