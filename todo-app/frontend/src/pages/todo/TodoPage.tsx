import TodoInput from '@/components/todo/TodoInput'
import TodoList from '@/components/todo/TodoList'
import CommandInput from '@/components/todo/CommandInput'
import { useTodoCommands, useTodosQuery } from '@/hooks/useTodoCommands'

export default function TodoPage() {
  const {
    data: todos = [],
    isLoading: isInitialLoading,
    isError: isInitialLoadError,
    error: initialLoadError,
  } = useTodosQuery()
  const { mutate, isPending, isError: isCommandError, error: commandError } = useTodoCommands()

  const isLoading = isInitialLoading || isPending
  const errorMessage = (commandError ?? initialLoadError)?.message ?? 'Something went wrong'
  const isError = isCommandError || isInitialLoadError

  const handleAddTodo = (command: string) => {
    mutate(command)
  }

  const handleToggleComplete = (id: string) => {
    mutate(`complete ${id}`)
  }

  const handleDelete = (id: string) => {
    mutate(`delete ${id}`)
  }

  const handleUpdate = (id: string, newTask: string) => {
    mutate(`update ${id} to ${newTask}`)
  }

  const handleCommand = (command: string) => {
    mutate(command)
  }

  return (
    <main className="min-h-screen bg-background p-6 text-primary">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary">Todo App</h1>
          <p className="mt-2 text-primary/60">Organize your tasks and stay productive</p>
        </div>

        {/* Main Card */}
        <section className="rounded-lg border border-primary bg-background p-6 shadow-sm">
          {isLoading && (
            <div className="mb-6 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
              {isInitialLoading ? 'Loading todos...' : 'Updating todos...'}
            </div>
          )}

          {/* Add Todo Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-primary">
              Add a new task
            </label>
            <TodoInput onAddTodo={handleAddTodo} isLoading={isLoading} />
          </div>

          {/* Error Message */}
          {isError && (
            <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600">
              <p className="text-sm font-medium">Request failed</p>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Todos List */}
          <div>
            <label className="mb-3 block text-sm font-medium text-primary">
              Your tasks ({todos.length})
            </label>
            <TodoList
              todos={todos}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Command Input (Advanced) */}
        <CommandInput onSubmitCommand={handleCommand} isLoading={isLoading} />
      </div>
    </main>
  )
}
