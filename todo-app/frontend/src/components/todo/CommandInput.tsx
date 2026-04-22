import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  onSubmitCommand: (input: string) => void
  isLoading: boolean
}

export default function CommandInput({ onSubmitCommand, isLoading }: Props) {
  const [input, setInput] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const command = input.trim()
    if (!command) return
    onSubmitCommand(command)
    setInput('')
  }

  return (
    <div className="mt-8 rounded-lg border border-primary/40 bg-background/50 p-4">
      <p className="mb-3 text-sm text-primary/70">
        <strong>Advanced:</strong> You can also use natural language commands:
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <code className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
          add buy milk
        </code>
        <code className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
          delete buy milk
        </code>
        <code className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
          complete buy milk
        </code>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Try a command..."
          disabled={isLoading}
          className="h-9 flex-1 rounded-md border border-primary/40 bg-background px-3 text-sm text-primary placeholder:text-primary/60 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          variant="outline"
        >
          Send
        </Button>
      </form>
    </div>
  )
}
