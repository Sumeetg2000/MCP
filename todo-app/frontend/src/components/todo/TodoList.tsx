import type { Todo } from '@/types/todo'
import TodoItem from './TodoItem'

type Props = {
  todos: Todo[]
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, newTask: string) => void
  isLoading: boolean
}

export default function TodoList({
  todos,
  onToggleComplete,
  onDelete,
  onUpdate,
  isLoading,
}: Props) {
  if (todos.length === 0) {
    return (
      <div className="rounded-md border border-primary/30 bg-background/50 px-4 py-8 text-center">
        <p className="text-primary/60">No todos yet. Create one to get started!</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
          onUpdate={onUpdate}
          isLoading={isLoading}
        />
      ))}
    </ul>
  )
}
