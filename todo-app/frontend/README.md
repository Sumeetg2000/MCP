# Todo App Frontend

React + Vite + TypeScript app configured with:

- Tailwind CSS v4
- shadcn/ui
- TanStack React Query

It is integrated with the MCP backend via a simple AI command API.

## Notes

- The previous MCP project was moved to `../todo-app-mcp`.
- This folder (`todo-app`) now contains the frontend app.

## Scripts

- `npm run dev` start development server
- `npm run build` build for production
- `npm run preview` preview production build

## Backend Integration

- Frontend sends commands to `POST /ai`
- Request body: `{ "input": "add buy milk" }`
- Response shape: `{ "todos": Todo[] }`

Configure backend URL in `.env`:

```bash
cp .env.example .env
```

Default value in `.env.example`:

```text
VITE_API_BASE_URL=http://localhost:3000
```

## Command Behavior

- `add buy milk` adds a todo and immediately updates the list
- `list` fetches all todos and updates the list
- update/complete/delete commands are also supported by the backend workflow

## Tech Setup

- Path alias `@/*` points to `src/*`
- Vite includes the Tailwind v4 plugin
- React Query is initialized in `src/main.tsx`
- A starter shadcn button component is available in `src/components/ui/button.tsx`
- Todo API service: `src/services/todoApi.ts`
- React Query hook: `src/hooks/useTodoCommands.ts`
- Todo page and components: `src/pages/todo/` and `src/components/todo/`
