# Todo App MCP (Cloudflare Workers)

A TypeScript MCP (Model Context Protocol) backend for todo management, running on Cloudflare Workers with Hono and Streamable HTTP.

## Runtime

- Worker entrypoint: `src/server.ts`
- Framework: Hono
- MCP transport: `WebStandardStreamableHTTPServerTransport` in stateless mode
- Todo state: persisted as a JSON blob in Cloudflare KV via `TODO_STORE`

## Project Structure

```text
todo-app-mcp/
├── src/
│   ├── server.ts
│   ├── tools/
│   │   └── index.ts
│   ├── workflow/
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── wrangler.jsonc
```

## API Surface

- `GET /health`
  - Returns `{ "status": "ok" }`

- `POST /ai`
  - Request body: `{ "input": "<user command>" }`
  - Executes workflow orchestration and returns current todos: `{ "todos": [...] }`

- `ALL /mcp`
  - MCP Streamable HTTP endpoint used by MCP clients/Inspector
  - Handles `GET`, `POST`, and `DELETE` via SDK transport

The legacy `/workflow` route is intentionally removed.

## Workflow Behavior

The workflow layer in `src/workflow/index.ts` uses a deterministic fallback classifier only (no Anthropic branch). It supports:

- `add_todo`
- `list_todos`
- `complete_todo` (toggle complete / unmark)
- `delete_todo`
- `update_todo`

Text-based commands (for example, "delete buy milk") are resolved to todo IDs by searching existing todos.

Completion commands toggle the todo state. Commands such as "complete buy milk", "toggle buy milk", "unmark buy milk", and "mark buy milk as not done" all route through the workflow layer and flip the current `completed` value.

Todos are loaded from KV on first use in each worker instance and written back after every change.

## Development

From `todo-app/todo-app-mcp`:

```bash
npm install
npm run build
npm run dev
```

## Deploy

```bash
npm run deploy
```

Before deploying, create a KV namespace and replace the placeholder `id` and `preview_id` values in `wrangler.jsonc`.

## MCP Inspector

```bash
npm run inspect
```

Then connect Inspector to your local Worker MCP endpoint shown by Wrangler (typically `/mcp`).

## Notes

- No Node `process.env` or `app.listen()` runtime path is used.
- No Anthropic environment configuration is required.
