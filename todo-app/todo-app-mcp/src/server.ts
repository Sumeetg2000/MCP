import { Hono } from "hono";
import { cors } from "hono/cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { workflows } from "./workflow/index.js";
import { tools } from "./tools/index.js";
import type { AppBindings } from "./types/index.js";

const log = (tool: string, args?: unknown) =>
  console.error(`[tool] ${tool}`, args !== undefined ? args : "");

const emptyInputSchema = z.object({});
const addTodoInputSchema = z.object({
  task: z.string().min(1),
});
const idInputSchema = z.object({
  id: z.string().min(1),
});
const updateTodoInputSchema = z.object({
  id: z.string().min(1),
  task: z.string().min(1),
});
const workflowInputSchema = z.object({
  input: z.string().min(1),
});

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};

type ToolDefinition = {
  description: string;
  inputSchema: z.ZodTypeAny;
  execute: (args: unknown) => Promise<ToolResult>;
};

type WorkflowExecutors = {
  add_todo: (args: { task: string }) => Promise<ToolResult>;
  list_todos: () => Promise<ToolResult>;
  complete_todo: (args: { id: string }) => Promise<ToolResult>;
  delete_todo: (args: { id: string }) => Promise<ToolResult>;
  update_todo: (args: { id: string; task: string }) => Promise<ToolResult>;
};

async function executeAddTodo(env: AppBindings, args: unknown): Promise<ToolResult> {
  const { task } = addTodoInputSchema.parse(args);
  log("add_todo", { task });
  const todo = await workflows.handleAddTodo(env, { task });
  return {
    content: [{ type: "text", text: `Added todo: ${todo.task}` }],
    structuredContent: { todo },
  };
}

async function executeListTodos(env: AppBindings): Promise<ToolResult> {
  log("list_todos");
  const todos = await workflows.handleListTodos(env);
  return {
    content: [
      {
        type: "text",
        text:
          todos.length === 0 ? "No todos yet." : JSON.stringify(todos, null, 2),
      },
    ],
    structuredContent: { todos },
  };
}

async function executeCompleteTodo(env: AppBindings, args: unknown): Promise<ToolResult> {
  const { id } = idInputSchema.parse(args);
  log("complete_todo", { id });
  const todo = await tools.completeTodo(env, id);
  return {
    content: [
      {
        type: "text",
        text: `${todo.completed ? "Completed" : "Unmarked"} todo: ${todo.task}`,
      },
    ],
    structuredContent: { todo },
  };
}

async function executeDeleteTodo(env: AppBindings, args: unknown): Promise<ToolResult> {
  const { id } = idInputSchema.parse(args);
  log("delete_todo", { id });
  const deleted = await tools.deleteTodo(env, id);
  return {
    content: [{ type: "text", text: `Deleted todo: ${deleted.id}` }],
    structuredContent: { deleted },
  };
}

async function executeUpdateTodo(env: AppBindings, args: unknown): Promise<ToolResult> {
  const { id, task } = updateTodoInputSchema.parse(args);
  log("update_todo", { id, task });
  const todo = await tools.updateTodo(env, { id, task });
  return {
    content: [{ type: "text", text: `Updated todo: ${todo.task}` }],
    structuredContent: { todo },
  };
}

function createWorkflowExecutors(env: AppBindings): WorkflowExecutors {
  return {
    add_todo: async ({ task }) => executeAddTodo(env, { task }),
    list_todos: async () => executeListTodos(env),
    complete_todo: async ({ id }) => executeCompleteTodo(env, { id }),
    delete_todo: async ({ id }) => executeDeleteTodo(env, { id }),
    update_todo: async ({ id, task }) => executeUpdateTodo(env, { id, task }),
  };
}

function createToolDefinitions(env: AppBindings) {
  return {
    ping: {
      description: "Basic connectivity check",
      inputSchema: emptyInputSchema,
      execute: async () => ({
        content: [{ type: "text", text: "pong" }],
      }),
    },
    add_todo: {
      description: "Add a todo item with a task field",
      inputSchema: addTodoInputSchema,
      execute: (args: unknown) => executeAddTodo(env, args),
    },
    list_todos: {
      description: "List all todo items",
      inputSchema: emptyInputSchema,
      execute: async () => executeListTodos(env),
    },
    complete_todo: {
      description: "Toggle a todo between completed and not completed by id",
      inputSchema: idInputSchema,
      execute: (args: unknown) => executeCompleteTodo(env, args),
    },
    delete_todo: {
      description: "Delete a todo by id",
      inputSchema: idInputSchema,
      execute: (args: unknown) => executeDeleteTodo(env, args),
    },
    update_todo: {
      description: "Update the task text of a todo by id",
      inputSchema: updateTodoInputSchema,
      execute: (args: unknown) => executeUpdateTodo(env, args),
    },
    todo_workflow: {
      description:
        "Interpret user input and decide whether to add a todo or list todos",
      inputSchema: workflowInputSchema,
      execute: async (args: unknown) => {
        const { input } = workflowInputSchema.parse(args);
        const { action, args: intentArgs, result } = await workflows.handleUserInput(
          env,
          input,
          createWorkflowExecutors(env),
        );
        return {
          content: result.content,
          structuredContent: {
            action,
            args: intentArgs,
            ...(result.structuredContent ?? {}),
          },
        };
      },
    },
  } satisfies Record<string, ToolDefinition>;
}

/**
 * Create a fresh McpServer with all tools registered.
 * A new instance is created per request so each Streamable HTTP
 * transport gets its own clean connection (stateless mode).
 * Todo state is loaded from the KV-backed store inside tools/index.ts.
 */
function createMcpServer(env: AppBindings): McpServer {
  const server = new McpServer({
    name: "todo-app-mcp",
    version: "1.0.0",
  });

  for (const [name, definition] of Object.entries(createToolDefinitions(env))) {
    server.registerTool(
      name,
      {
        description: definition.description,
        inputSchema: definition.inputSchema,
      },
      async (args: unknown) => definition.execute(args),
    );
  }

  return server;
}

const app = new Hono<{ Bindings: AppBindings }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "MCP-Protocol-Version"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Frontend-friendly endpoint. Accepts command input and always returns current todo list.
app.post("/ai", async (c) => {
  try {
    const body = await c.req.json();
    const { input } = workflowInputSchema.parse(body ?? {});
    await workflows.handleUserInput(c.env, input, createWorkflowExecutors(c.env));
    const todos = await workflows.handleListTodos(c.env);
    return c.json({ todos });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      400,
    );
  }
});

app.all("/mcp", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: no session persistence needed
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(c.req.raw);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Server error" },
      500,
    );
  }
});

export default app;
