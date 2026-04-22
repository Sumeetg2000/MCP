import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  onAddTodo: (task: string) => void
  isLoading: boolean
}

export default function TodoInput({ onAddTodo, isLoading }: Props) {
  const [input, setInput] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const task = input.trim()
    if (!task) return
    onAddTodo(`add ${task}`)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="What needs to be done?"
        disabled={isLoading}
        className="h-10 flex-1 rounded-md border border-primary bg-background px-3 text-primary placeholder:text-primary/60 disabled:opacity-50"
      />
      <Button type="submit" disabled={isLoading} className="whitespace-nowrap text-white">
        {isLoading ? 'Adding...' : 'Add'}
      </Button>
    </form>
  )
}
