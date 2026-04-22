# Todo App Frontend

A clean, intuitive React + Vite + TypeScript todo app with natural language command support.

## Features

- **Primary UI**: Add, complete, delete, and edit todos directly via buttons
- **Natural Language Commands**: Advanced users can use text-based commands at the bottom
- **Real-time Sync**: App updates immediately after each action
- **Smart ID Resolution**: Backend automatically resolves task text to todo IDs

### Tech Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- TanStack React Query

## Component Structure

```
src/components/todo/
├── TodoInput.tsx       # Main input for adding todos
├── TodoItem.tsx        # Individual todo with action buttons
├── TodoList.tsx        # List of todos with empty state
├── TodoCommandForm.tsx # Legacy command-based input
└── CommandInput.tsx    # New advanced command input (bottom)

src/pages/todo/
└── TodoPage.tsx        # Main page layout and orchestration

src/hooks/
└── useTodoCommands.ts  # React Query mutation for API calls

src/services/
└── todoApi.ts          # Backend API communication
```

## UI Layout

1. **Header**: App title and subtitle
2. **Main Card**: Todo management section
   - Add Input: Quick way to add new todos
   - Todo List: Displays all todos with action buttons
   - Error Messages: Shows any API errors
3. **Advanced Section**: Command-based input
   - Natural language commands for power users
   - Helpful examples of supported commands

## UI-Based Actions

All todo operations are available via buttons:

- **Complete/Uncomplete**: Toggle completion status with checkbox
- **Edit**: Inline edit mode to update task text
- **Delete**: Remove a todo
- **Add**: Create a new todo from the main input

Each button uses the todo's ID internally, ensuring accurate operations.

## Command-Based Input (Advanced)

For users who prefer text commands, the bottom section supports:

- `add task text` - Create a new todo
- `delete task text` - Delete by matching task text
- `complete task text` - Mark todo as done
- `update task text to new text` - Change a task
- `list` - Show all todos

The backend intelligently matches task text to todo IDs, so you don't need to copy/paste IDs.

## Backend Integration

- **Endpoint**: `POST /ai`
- **Request Body**: `{ "input": "your command or text" }`
- **Response**: `{ "todos": Todo[] }`

The backend receives either:
- **UI Commands**: `"add task"`, `"complete uuid"`, `"delete uuid"`, `"update uuid to new text"`
- **Text Commands**: `"delete buy milk"`, `"complete buy milk"` (backend resolves text to ID)

Configure backend URL in `.env`:

```bash
cp .env.example .env
```

Default:
```text
VITE_API_BASE_URL=http://localhost:3000
```

## Scripts

- `npm run dev` - Start development server (default port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Tech Setup

- Path alias `@/*` points to `src/*`
- Vite includes Tailwind v4 plugin
- React Query initialized in `src/main.tsx`
- shadcn button component: `src/components/ui/button.tsx`

## API Flow

### UI Action (e.g., Delete)
```
User clicks Delete → TodoItem.onDelete(id) 
  → TodoPage.handleDelete(id) 
  → mutate(`delete ${id}`)
  → sendTodoCommand(`delete ${id}`)
  → POST /ai with command
  → Backend processes with id
  → Response updates todos
  → UI refreshes
```

### Text Command (e.g., "delete buy milk")
```
User types command → CommandInput.onSubmitCommand(text)
  → TodoPage.handleCommand(text)
  → mutate(text)
  → sendTodoCommand(text)
  → POST /ai with command
  → Backend resolves task text to id
  → Backend processes with resolved id
  → Response updates todos
  → UI refreshes
```

## Notes

- Previous MCP project: `../todo-app-mcp`
- This folder contains only the frontend React app
- All backend logic remains in the MCP server

