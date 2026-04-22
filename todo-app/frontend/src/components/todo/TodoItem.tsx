import { useState } from 'react'
import type { Todo } from '@/types/todo'
import { Button } from '@/components/ui/button'

type Props = {
  todo: Todo
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, newTask: string) => void
  isLoading: boolean
}

export default function TodoItem({
  todo,
  onToggleComplete,
  onDelete,
  onUpdate,
  isLoading,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.task)

  function handleSaveEdit() {
    const newTask = editText.trim()
    if (newTask && newTask !== todo.task) {
      onUpdate(todo.id, newTask)
    }
    setIsEditing(false)
  }

  function handleCancelEdit() {
    setEditText(todo.task)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li className="flex items-center gap-2 rounded-md border border-primary bg-background px-3 py-2">
        <input
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1 border border-primary/40 bg-background px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          size="sm"
          onClick={handleSaveEdit}
          disabled={isLoading}
          variant="default"
        >
          Save
        </Button>
        <Button
          size="sm"
          onClick={handleCancelEdit}
          disabled={isLoading}
          variant="outline"
        >
          Cancel
        </Button>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 rounded-md border border-primary bg-background px-3 py-2">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggleComplete(todo.id)}
        disabled={isLoading}
        className="h-4 w-4 cursor-pointer"
      />
      <span
        className={`flex-1 ${
          todo.completed
            ? 'line-through text-primary/50'
            : 'text-primary'
        }`}
      >
        {todo.task}
      </span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(todo.id)}
          disabled={isLoading}
        >
          Delete
        </Button>
      </div>
    </li>
  )
}
