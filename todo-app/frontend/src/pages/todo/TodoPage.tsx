import { useQueryClient } from '@tanstack/react-query'
import TodoCommandForm from '@/components/todo/TodoCommandForm'
import TodoList from '@/components/todo/TodoList'
import { TODO_QUERY_KEY, useTodoCommands } from '@/hooks/useTodoCommands'
import type { Todo } from '@/types/todo'

export default function TodoPage() {
  const queryClient = useQueryClient()
  const { mutate, isPending, isError, error } = useTodoCommands()
  const todos = queryClient.getQueryData<Todo[]>(TODO_QUERY_KEY) ?? []

  return (
    <main className="min-h-screen bg-background p-6 text-primary">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-primary p-6">
        <h1 className="text-2xl font-semibold">Todos</h1>
        <TodoCommandForm onSubmitCommand={(command) => mutate(command)} isLoading={isPending} />
        {isError ? <p className="text-error">{error.message}</p> : null}
        <TodoList todos={todos} />
      </section>
    </main>
  )
}
