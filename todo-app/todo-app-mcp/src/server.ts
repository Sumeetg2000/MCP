import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { workflows } from "./workflow/index.js";
import { tools } from "./tools/index.js";

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

async function executeAddTodo(args: unknown): Promise<ToolResult> {
  const { task } = addTodoInputSchema.parse(args);
  log("add_todo", { task });
  const todo = await workflows.handleAddTodo({ task });
  return {
    content: [{ type: "text", text: `Added todo: ${todo.task}` }],
    structuredContent: { todo },
  };
}

async function executeListTodos(): Promise<ToolResult> {
  log("list_todos");
  const todos = await workflows.handleListTodos();
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

async function executeCompleteTodo(args: unknown): Promise<ToolResult> {
  const { id } = idInputSchema.parse(args);
  log("complete_todo", { id });
  const todo = await tools.completeTodo(id);
  return {
    content: [{ type: "text", text: `Completed todo: ${todo.task}` }],
    structuredContent: { todo },
  };
}

async function executeDeleteTodo(args: unknown): Promise<ToolResult> {
  const { id } = idInputSchema.parse(args);
  log("delete_todo", { id });
  const deleted = await tools.deleteTodo(id);
  return {
    content: [{ type: "text", text: `Deleted todo: ${deleted.id}` }],
    structuredContent: { deleted },
  };
}

async function executeUpdateTodo(args: unknown): Promise<ToolResult> {
  const { id, task } = updateTodoInputSchema.parse(args);
  log("update_todo", { id, task });
  const todo = await tools.updateTodo({ id, task });
  return {
    content: [{ type: "text", text: `Updated todo: ${todo.task}` }],
    structuredContent: { todo },
  };
}

function createWorkflowExecutors(): WorkflowExecutors {
  return {
    add_todo: async ({ task }) => executeAddTodo({ task }),
    list_todos: async () => executeListTodos(),
    complete_todo: async ({ id }) => executeCompleteTodo({ id }),
    delete_todo: async ({ id }) => executeDeleteTodo({ id }),
    update_todo: async ({ id, task }) => executeUpdateTodo({ id, task }),
  };
}

const toolDefinitions = {
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
    execute: executeAddTodo,
  },
  list_todos: {
    description: "List all todo items",
    inputSchema: emptyInputSchema,
    execute: async () => executeListTodos(),
  },
  complete_todo: {
    description: "Mark a todo as completed by id",
    inputSchema: idInputSchema,
    execute: executeCompleteTodo,
  },
  delete_todo: {
    description: "Delete a todo by id",
    inputSchema: idInputSchema,
    execute: executeDeleteTodo,
  },
  update_todo: {
    description: "Update the task text of a todo by id",
    inputSchema: updateTodoInputSchema,
    execute: executeUpdateTodo,
  },
  todo_workflow: {
    description:
      "Interpret user input and decide whether to add a todo or list todos",
    inputSchema: workflowInputSchema,
    execute: async (args: unknown) => {
      const { input } = workflowInputSchema.parse(args);
      const { action, args: intentArgs, result } = await workflows.handleUserInput(
        input,
        createWorkflowExecutors(),
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

/**
 * Create a fresh McpServer with all tools registered.
 * A new instance is created per request so each Streamable HTTP
 * transport gets its own clean connection (stateless mode).
 * The in-memory todos array lives at module level in tools/index.ts
 * and persists across requests regardless.
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "todo-app-mcp",
    version: "1.0.0",
  });

  for (const [name, definition] of Object.entries(toolDefinitions)) {
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

async function main(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use((_, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    next();
  });

  app.options("*", (_req, res) => {
    res.sendStatus(204);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Frontend-friendly endpoint. Accepts command input and always returns current todo list.
  app.post("/ai", async (req: Request, res: Response) => {
    try {
      const { input } = workflowInputSchema.parse(req.body ?? {});
      await workflows.handleUserInput(input, createWorkflowExecutors());
      const todos = await workflows.handleListTodos();
      res.json({ todos });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid request",
      });
    }
  });

  // Simple workflow endpoint for plain user input.
  // Delegates to workflow layer (LLM classifier), which then invokes MCP tool executors.
  // Returns structured output: { success, action, args, result }
  app.post("/workflow", async (req: Request, res: Response) => {
    try {
      const { input } = workflowInputSchema.parse(req.body ?? {});
      const { action, args, result } = await workflows.handleUserInput(
        input,
        createWorkflowExecutors(),
      );
      res.json({ success: true, action, args, result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      });
    }
  });

  // MCP Streamable HTTP — handles both regular POST calls and SSE streaming.
  // Compatible with MCP Inspector and any MCP-spec client.
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: no session persistence needed
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => transport.close());
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Server error",
        });
      }
    }
  });

  // GET /mcp — required by MCP spec for SSE-based streaming responses
  app.get("/mcp", async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Server error",
        });
      }
    }
  });

  // DELETE /mcp — required to respond correctly per MCP spec
  app.delete("/mcp", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method not allowed" });
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.error(`MCP server listening on http://localhost:${port}/mcp`);
  });

  process.on("SIGINT", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
