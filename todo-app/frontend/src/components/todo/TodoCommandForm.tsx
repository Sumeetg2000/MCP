import { useState, type FormEvent } from 'react'
// import { Button } from '@/components/ui/button'

type Props = {
  onSubmitCommand: (input: string) => void
  isLoading: boolean
}

export default function TodoCommandForm({ onSubmitCommand, isLoading }: Props) {
  const [input, setInput] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const command = input.trim()
    if (!command) return
    onSubmitCommand(command)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Try: add buy milk or list"
        className="h-10 flex-1 rounded-md border border-primary bg-background px-3 text-primary placeholder:text-primary"
      />
      {/* <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send'}
      </Button> */}
    </form>
  )
}
