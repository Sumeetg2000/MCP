# Todo App MCP

A TypeScript-based MCP (Model Context Protocol) server for todo management over Streamable HTTP with intelligent intent classification and natural language text-to-ID resolution.

## Project Structure

```
todo-app-mcp/
├── src/
│   ├── server.ts              # Main MCP server setup with Streamable HTTP transport
│   ├── tools/index.ts         # Low-level todo operations (CRUD, validation)
│   ├── workflow/index.ts      # High-level logic: intent classification, tool orchestration
│   └── types/index.ts         # Shared TypeScript types
├── dist/                      # Compiled JavaScript (auto-generated)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd todo-app-mcp
npm install
```

### Development

Run the server in watch mode:

```bash
npm run dev
```

This will rebuild and restart automatically on file changes.

### Production

```bash
npm run build
npm start
```

## Architecture

### MCP Protocol

**Streamable HTTP Transport**:
- MCP endpoint: `http://localhost:3000/mcp`
- Compatible with MCP Inspector and HTTP clients
- Fresh `McpServer` created per request (stateless)
- In-memory todo state persists via module-level storage

### MCP Tools vs Workflow

**MCP Tools Layer** (`src/tools/index.ts`)
- Pure data operations: add, list, complete, delete, update todos
- Input validation via schema
- Independent, composable, reusable
- No business logic or complex routing

**Workflow Layer** (`src/workflow/index.ts`)
- **Intent Classification**: Interprets user input to determine action
  - Uses Claude API (Anthropic) when available
  - Falls back to simple rule-based parsing
  - Extracts intent and arguments from natural language
  
- **Text-to-ID Resolution**: Converts task text to todo IDs
  - Enables commands like `"delete buy milk"` (without needing UUID)
  - Matches task text case-insensitively
  - Returns helpful errors for zero or multiple matches
  - Supports direct UUID input as fallback

- **Tool Orchestration**: Routes intents to correct MCP tool

## Intent Classification

### Supported Intents

1. **add_todo**: Create a new todo
   - Input: `"add buy milk"`, `"remind me to call Alice"`
   - Args: `{ task: "buy milk" }`

2. **list_todos**: Fetch all todos
   - Input: `"list"`, `"show all todos"`
   - Args: `{}`

3. **complete_todo**: Mark todo as done
   - Input: `"complete buy milk"`, `"mark buy milk as done"`
   - Args: `{ task: "buy milk" }` or `{ id: "uuid-here" }`

4. **delete_todo**: Remove a todo
   - Input: `"delete buy milk"`, `"remove buy milk"`
   - Args: `{ task: "buy milk" }` or `{ id: "uuid-here" }`

5. **update_todo**: Change todo task text
   - Input: `"update buy milk to buy oat milk"`
   - Args: `{ task: "buy milk", newTask: "buy oat milk" }` or `{ id: "uuid", newTask: "..." }`

### Intent Classification Methods

**Method 1: LLM-Based (Default)**
- Uses Claude API via Anthropic
- Natural language understanding
- Extracts intent and arguments intelligently
- Falls back to rule-based method if API unavailable

**Method 2: Fallback (Rule-Based)**
- Simple string prefix matching
- Detects UUID vs text for ID resolution
- No external API required
- Sufficient for standard command patterns

## Text-to-ID Resolution

When a command includes task text instead of a UUID:

```
Input: "delete buy milk"
  ↓
Intent: { action: "delete_todo", args: { task: "buy milk" } }
  ↓
Workflow resolveId({ task: "buy milk" })
  ↓
Search todos: find all matching "buy milk" (case-insensitive)
  ↓
Return found todo's ID or error message
  ↓
Execute: delete_todo({ id: "found-uuid" })
```

### Error Handling

- **No matches**: Returns clear error message with task text
- **Multiple matches**: Returns list of matching todos, asks for clarification
- **Direct UUID input**: Bypasses text matching, uses UUID directly

### Fallback to Direct UUIDs

If a command includes a UUID, it's used directly:
```
Input: "complete 797701a6-d003-42d0-8809-d2ba2e9e35a7"
  ↓
Detected as UUID (regex validation)
  ↓
Execute: complete_todo({ id: "797701a6-d003-42d0-8809-d2ba2e9e35a7" })
```

## API Endpoints

### HTTP Frontend API

**POST `/ai`**
```json
Request:
{ "input": "add buy milk" }

Response:
{ "todos": [{ id, task, completed, createdAt }, ...] }
```

Supports any natural language command. The workflow layer:
1. Classifies the intent
2. Resolves text to IDs if needed
3. Executes the appropriate tool
4. Returns updated todo list

## Testing

### Quick Test

```bash
npm run build
npm run dev
```

In another terminal:
```bash
# Add a todo
curl -X POST http://localhost:3000/ai \
  -H 'Content-Type: application/json' \
  -d '{"input": "add buy milk"}'

# List todos
curl -X POST http://localhost:3000/ai \
  -H 'Content-Type: application/json' \
  -d '{"input": "list"}'

# Complete by task text
curl -X POST http://localhost:3000/ai \
  -H 'Content-Type: application/json' \
  -d '{"input": "complete buy milk"}'
```

### With MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:3000/mcp`

## Configuration

### Environment Variables

**Optional**: Anthropic API for LLM-based intent classification

```bash
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3-5-haiku-20241022  # default
```

If not set, the workflow automatically falls back to rule-based parsing.

## Design Principles

1. **Separation of Concerns**
   - Tools: Pure data operations
   - Workflow: Intent parsing and orchestration
   - Clear boundaries between layers

2. **No LLM Required**
   - Works without external APIs
   - Rule-based fallback is sufficient for standard commands
   - LLM enhances UX but isn't a bottleneck

3. **User-Friendly Text Matching**
   - Users don't need to copy/paste UUIDs
   - Natural language like `"delete buy milk"` works out-of-the-box
   - Clear errors guide users when clarification is needed

4. **Stateless Streaming**
   - Fresh server per request
   - Streamable HTTP protocol
   - In-memory state for testing/demos (upgradeable to database)

## Development Workflow

1. Define feature in plain English
2. Add intent to classification system
3. Implement or reuse tool
4. Test with curl or MCP Inspector
5. Validate with frontend

## Next Steps

- Persist todo state to database
- Add user authentication
- Enhance LLM prompts for complex intents
- Add more sophisticated text matching (fuzzy, semantic)
- Support collaborative/multi-user workflows

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
