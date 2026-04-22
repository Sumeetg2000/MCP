# Todo App MCP

A TypeScript-based MCP (Model Context Protocol) server for todo management over Streamable HTTP.

## Project Structure

```
todo-app/
├── src/
│   ├── server.ts          # Main MCP server setup with Streamable HTTP transport
│   ├── tools/             # MCP tools (add_todo, list_todos, etc.)
│   ├── workflow/          # Workflow layer for orchestrating tools
│   └── types/             # Shared TypeScript types and interfaces
├── dist/                  # Compiled JavaScript (auto-generated)
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd todo-app
npm install
```

### Development

Run the server in watch mode:

```bash
npm run dev
```

This will rebuild and restart the server automatically when files change.

### Production

Build and run:

```bash
npm run build
npm start
```

## MCP Protocol

This server uses **Streamable HTTP transport**:
- MCP endpoint: `http://localhost:3000/mcp`
- Health endpoint: `http://localhost:3000/health`
- Workflow endpoint: `http://localhost:3000/workflow`
- Supports MCP `POST /mcp` and `GET /mcp` requests (plus `DELETE /mcp` returning 405)
- Compatible with MCP Inspector and HTTP MCP clients

## Testing with MCP Inspector

To test the server with the official MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector
```

Then connect Inspector to:

```text
http://localhost:3000/mcp
```

Or in development mode from the todo-app folder:

```bash
npm run inspect
```

## Architecture

This server uses a stateless Streamable HTTP pattern:
- A fresh `McpServer` is created per request
- A fresh `StreamableHTTPServerTransport` is connected per request
- In-memory todo state persists via module-level storage in `src/tools/index.ts`

### MCP Tools
- Located in `src/tools/`
- Handle low-level todo operations (add, list)
- Pure data functions with input validation
- Independent and composable

### Workflow Layer
- Located in `src/workflow/`
- Classifies user intent via LLM (Anthropic API) — no string matching
- Returns structured output: `{ action, args, result }`
- Handles error scenarios and provides structured responses to MCP clients

### Workflow Endpoint
- `POST /workflow` accepts JSON input and runs LLM-based workflow routing
- The endpoint calls the workflow layer (LLM classifier), which calls MCP tool executors (`add_todo` or `list_todos`)
- Returns `{ success, action, args, result }` — structured output with the classified action and extracted args

Example requests:

```bash
curl -s -X POST http://localhost:3000/workflow \
  -H "Content-Type: application/json" \
  -d '{"input":"add buy milk"}'
# → {"success":true,"action":"add_todo","args":{"task":"buy milk"},"result":{...}}

curl -s -X POST http://localhost:3000/workflow \
  -H "Content-Type: application/json" \
  -d '{"input":"list"}'
# → {"success":true,"action":"list_todos","args":{},"result":{...}}

### Available MCP Tools
- `ping`: basic connectivity check
- `add_todo`: add a todo with `{ "task": "..." }`
- `list_todos`: return all todos
- `todo_workflow`: accepts `{ "input": "..." }` and routes to add/list behavior

## Environment Variables

Current optional variables:
- `PORT` - HTTP port (defaults to `3000`)
- `ANTHROPIC_API_KEY` - **Required** for workflow intent classification via LLM
- `ANTHROPIC_MODEL` - Anthropic model to use (defaults to `claude-3-5-haiku-20241022`)

Can be extended for:
- `LOG_LEVEL` - Set logging verbosity (debug, info, warn, error)
- `DEBUG` - Enable debug mode for detailed output

## Development Guidelines

Follow the guidelines in [`.github/instructions/todo-app.instructions.md`](../.github/instructions/todo-app.instructions.md):

- Plan before building
- Implement incrementally
- Keep MCP tools and workflow logic separate
- Use clean, minimal TypeScript with async/await
- Only introduce structure when it helps
- Test and validate as you go
- Keep README aligned with behavior and transport changes
- Run and edit only inside the todo-app folder for this project

## Next Steps

1. Add unit tests for workflow intent parsing
2. Add update and delete todo tools
3. Add persistent storage (sqlite or file-backed)
4. Expand workflow commands (complete, remove, clear)
