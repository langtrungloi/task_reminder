'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { Calendar, User, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'

interface TaskCardProps {
  task: Task
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onClick?: () => void
}

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusColors = {
  todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export function TaskCard({ task, onStatusChange, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${isOverdue ? 'border-red-500' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            {task.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {task.description}
              </CardDescription>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                {format(new Date(task.due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{task.progress}%</span>
          </div>
        </div>
        {task.progress > 0 && task.progress < 100 && (
          <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
