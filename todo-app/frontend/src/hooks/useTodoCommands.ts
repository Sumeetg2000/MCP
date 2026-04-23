import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sendTodoCommand } from '@/services/todoApi'
import type { Todo } from '@/types/todo'

export const TODO_QUERY_KEY = ['todos'] as const

export function useTodosQuery() {
  return useQuery({
    queryKey: TODO_QUERY_KEY,
    queryFn: async () => {
      const data = await sendTodoCommand('list')
      return data.todos
    },
  })
}

export function useTodoCommands() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: string) => sendTodoCommand(input),
    onSuccess: (data) => {
      queryClient.setQueryData<Todo[]>(TODO_QUERY_KEY, data.todos)
    },
  })
}
