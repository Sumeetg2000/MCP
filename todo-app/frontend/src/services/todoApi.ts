import type { Todo } from '@/types/todo'

type AiResponse = {
  todos: Todo[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function sendTodoCommand(input: string): Promise<AiResponse> {
  const response = await fetch(`${API_BASE_URL}/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  if (!response.ok) {
    const errorText = await response.text()

    try {
      const parsed = JSON.parse(errorText) as { error?: string }
      throw new Error(parsed.error || 'Failed to process command')
    } catch {
      throw new Error(errorText || 'Failed to process command')
    }
  }

  return (await response.json()) as AiResponse
}
