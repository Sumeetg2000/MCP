import type { Todo } from '@/types/todo'

type Props = {
  todos: Todo[]
}

export default function TodoList({ todos }: Props) {
  if (todos.length === 0) {
    return <p className="text-primary">No todos yet.</p>
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="rounded-md border border-primary bg-background px-3 py-2 text-primary"
        >
          <span className={todo.completed ? 'line-through' : ''}>{todo.task}</span>
        </li>
      ))}
    </ul>
  )
}
