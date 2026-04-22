---
description: Guidelines for developing the TypeScript-based MCP Todo application
applyTo: todo-app/**
---

# Todo App MCP Development Instructions

## Project Scope
- **Focus area**: `/todo-app` folder only
- **Other folders** (research-prompt, resources, shell-mcp, weather-mcp) should be ignored unless explicitly referenced
- All work, code, and configuration should remain within the todo-app workspace
- Never run commands outside `/todo-app` for this project
- If a requested command/path targets outside `/todo-app`, ignore it directly and continue with in-scope actions only

## Overview
This is a TypeScript-based MCP (Model Context Protocol) Todo application that combines:
- **MCP tools**: Low-level functions for todo operations (add_todo, list_todos, complete_todo, etc.)
- **Workflow layer**: High-level logic that interprets user input and orchestrates tool calls
- **Clean separation**: Tools handle data; workflows handle user interaction and logic flow

**Transport**: Streamable HTTP (`StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`) served via Express on `POST /mcp` and `GET /mcp`. Compatible with MCP Inspector. Do not use stdio transport.

## Development Approach

### Plan Before Building
- Start with a rough outline of what needs to happen
- Break larger features into phases
- Write a simple step-by-step plan before implementing

### Build Incrementally
- Implement features in small, testable increments
- Build and validate as you go—don't try to build everything at once
- Test each piece before moving to the next

### Think in Small Steps
- Prefer many small, focused functions over large monolithic ones
- Each function should have a clear, single responsibility
- Group related functionality logically but keep code minimal

## Technical Conventions

### TypeScript & Code Style
- Use **async/await** for asynchronous operations
- Keep code **clean and minimal**—avoid overengineering
- Use meaningful names for functions, variables, and types
- Prefer simple, readable implementations over clever ones

### MCP Tools vs Workflow Logic
- **MCP Tools**: Pure data operations (CRUD, queries, validation)
  - Should be focused, composable, and independent
  - No complex business logic—just execute the operation
- **Workflow Layer**: Interprets input, chains tools, handles user interactions
  - Contains decision logic and flow control
  - Calls MCP tools to accomplish goals
  - Handles error scenarios and user feedback

Keep these layers separate so tools are reusable and workflows stay maintainable.

### MCP Tool Schema Pattern
- Every `server.registerTool(...)` must include an explicit `inputSchema`
- Use `z.object({ ... })` with only required/expected fields
- For tools with no input, use `z.object({})`
- Prefer destructured handler arguments (e.g., `async ({ task }) => { ... }`)
- Keep schema validation in the tool definition and keep workflow handlers focused on orchestration

### Tool Router Mapping
- Maintain a single centralized mapping from MCP tool name to execution function
- Reuse this mapping for both MCP registration and HTTP endpoint dispatch
- Avoid duplicating tool logic across handlers; route to workflow functions through the mapping

### HTTP Transport Pattern
- Use `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` (stateless)
- Create a fresh `McpServer` per request and connect it to a fresh transport
- In-memory state (e.g. todos array) lives at module level and persists across requests naturally
- Always handle `POST /mcp`, `GET /mcp`, and `DELETE /mcp` per MCP spec
- Never mix stdio and HTTP transports in the same process

### File Organization
- Tools in a dedicated module (e.g., `tools/` or `mcp-tools/`)
- Workflows in a separate module (e.g., `workflow/` or `handlers/`)
- Configuration and utilities as needed
- Avoid "utils" folders with mixed purposes—use specific module names

## When to Introduce Extra Structure

Only add structure (helpers, prompts, plans, extra layers) when it:
- **Actually helps** with clarity or reusability
- **Reduces duplication** or complexity
- **Makes testing easier**

Avoid:
- Extra files with no clear purpose
- Abstraction layers that don't simplify the code
- Premature optimization or over-generalization

## Guidelines for This Project

1. **Stay focused**: Only work on todo-app; ignore other demo projects
2. **Keep it simple**: Minimal dependencies, straightforward patterns
3. **Validate often**: Test each feature as it's built
4. **Document as you go**: Keep `todo-app/README.md` updated whenever behavior, transport, tools, or workflow changes
5. **Iterate based on feedback**: Adjust structure and approach as needed

## Example Development Flow
1. Define the feature (e.g., "add a new todo with a due date")
2. Identify which tools are needed (e.g., `add_todo` with date validation)
3. Plan the workflow steps (e.g., parse input → validate → call tool → respond)
4. Implement tools first (simpler, more testable)
5. Build the workflow layer to use those tools
6. Test and validate the full flow
7. Move to the next feature

## Validation and Fix Loop

After every code change (small or large):

- Run validation commands before considering work done:
  - cd /home/sumeet/Desktop/workspace/goals/MCP/MCP/todo-app && npm run build
  - cd /home/sumeet/Desktop/workspace/goals/MCP/MCP/todo-app && npm run dev (quick startup smoke test)
- Check for:
  - TypeScript errors
  - runtime errors
  - incorrect behavior

If issues are found:
- Analyze the error
- Fix the issue
- Re-run validation

Repeat until:
- no errors
- feature works as expected

Prefer small fixes over large rewrites.

## SDK/API Freshness

When touching MCP integration code:

- Verify classes/imports against official MCP TypeScript SDK docs or examples
- Replace deprecated APIs with current recommended ones before finalizing changes
- Re-run the validation loop after migration changes