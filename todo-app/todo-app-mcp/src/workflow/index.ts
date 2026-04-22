/**
 * Workflow Layer
 *
 * High-level logic that interprets user input and orchestrates tool calls.
 * Uses LLM-based intent classification to determine action and args.
 */

import { z } from "zod";
import { tools } from "../tools/index.js";
import type { AddTodoParams, Todo } from "../types/index.js";

const log = (msg: string, data?: unknown) =>
	console.error(`[workflow] ${msg}`, data !== undefined ? data : "");

// --- Intent schema -------------------------------------------------------

const intentResultSchema = z.object({
	action: z.enum(["add_todo", "list_todos", "complete_todo", "delete_todo", "update_todo"]),
	args: z.object({
		task: z.string().optional(),
		id: z.string().optional(),
	}),
});

export type IntentResult = z.infer<typeof intentResultSchema>;

// --- Internal types ------------------------------------------------------

type WorkflowToolResult = {
	content: Array<{ type: "text"; text: string }>;
	structuredContent?: Record<string, unknown>;
};

type TodoToolExecutors = {
	add_todo: (args: { task: string }) => Promise<WorkflowToolResult>;
	list_todos: () => Promise<WorkflowToolResult>;
	complete_todo: (args: { id: string }) => Promise<WorkflowToolResult>;
	delete_todo: (args: { id: string }) => Promise<WorkflowToolResult>;
	update_todo: (args: { id: string; task: string }) => Promise<WorkflowToolResult>;
};

export type WorkflowResult = IntentResult & {
	result: WorkflowToolResult;
};

// --- LLM intent classifier -----------------------------------------------

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier for a todo application.
Given user input, return a JSON object with:
- "action": one of "add_todo", "list_todos", "complete_todo", "delete_todo", "update_todo"
- "args": object with relevant fields:
  - add_todo:     { "task": "<task text>" }
  - list_todos:   {}
  - complete_todo:{ "id": "<todo id>" }
  - delete_todo:  { "id": "<todo id>" }
  - update_todo:  { "id": "<todo id>", "task": "<new task text>" }

Examples:
"add buy milk"                        -> {"action":"add_todo","args":{"task":"buy milk"}}
"list"                                -> {"action":"list_todos","args":{}}
"remind me to call Alice"             -> {"action":"add_todo","args":{"task":"call Alice"}}
"show all todos"                      -> {"action":"list_todos","args":{}}
"complete abc-123"                    -> {"action":"complete_todo","args":{"id":"abc-123"}}
"mark abc-123 as done"                -> {"action":"complete_todo","args":{"id":"abc-123"}}
"delete abc-123"                      -> {"action":"delete_todo","args":{"id":"abc-123"}}
"remove todo abc-123"                 -> {"action":"delete_todo","args":{"id":"abc-123"}}
"update abc-123 to buy oat milk"      -> {"action":"update_todo","args":{"id":"abc-123","task":"buy oat milk"}}
"change abc-123 task to buy oat milk" -> {"action":"update_todo","args":{"id":"abc-123","task":"buy oat milk"}}

Respond with ONLY valid JSON, no explanation.`;

function classifyIntentFallback(input: string): IntentResult {
	const normalized = input.trim();
	const lowered = normalized.toLowerCase();

	if (lowered === "list" || lowered === "list todos" || lowered.startsWith("show")) {
		return { action: "list_todos", args: {} };
	}

	if (lowered.startsWith("add ")) {
		return { action: "add_todo", args: { task: normalized.slice(4).trim() } };
	}

	if (lowered.startsWith("complete ")) {
		return { action: "complete_todo", args: { id: normalized.slice(9).trim() } };
	}

	if (lowered.startsWith("mark ")) {
		const afterMark = normalized.slice(5).trim();
		const id = afterMark.replace(/\s+as\s+done$/i, "").trim();
		return { action: "complete_todo", args: { id } };
	}

	if (lowered.startsWith("delete ")) {
		return { action: "delete_todo", args: { id: normalized.slice(7).trim() } };
	}

	if (lowered.startsWith("remove ")) {
		const id = normalized.slice(7).replace(/^todo\s+/i, "").trim();
		return { action: "delete_todo", args: { id } };
	}

	if (lowered.startsWith("update ")) {
		const payload = normalized.slice(7).trim();
		const [idPart, ...taskParts] = payload.split(/\s+to\s+/i);
		return {
			action: "update_todo",
			args: { id: idPart?.trim(), task: taskParts.join(" to ").trim() },
		};
	}

	if (lowered.startsWith("change ")) {
		const payload = normalized.slice(7).trim();
		const [idPart, ...taskParts] = payload.split(/\s+task\s+to\s+/i);
		return {
			action: "update_todo",
			args: { id: idPart?.trim(), task: taskParts.join(" task to ").trim() },
		};
	}

	return { action: "add_todo", args: { task: normalized } };
}

async function classifyIntent(input: string): Promise<IntentResult> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		const fallbackIntent = classifyIntentFallback(input);
		log("classified intent (fallback)", fallbackIntent);
		return fallbackIntent;
	}

	const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022";

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model,
			max_tokens: 128,
			system: CLASSIFY_SYSTEM_PROMPT,
			messages: [{ role: "user", content: input }],
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		log(`anthropic API error ${response.status}, using fallback`, body);
		const fallbackIntent = classifyIntentFallback(input);
		log("classified intent (fallback)", fallbackIntent);
		return fallbackIntent;
	}

	const data = (await response.json()) as {
		content: Array<{ type: string; text: string }>;
	};

	try {
		const text = data.content.find((c) => c.type === "text")?.text ?? "";
		const intent = intentResultSchema.parse(JSON.parse(text));
		log("classified intent", intent);
		return intent;
	} catch (error) {
		log("invalid LLM response, using fallback", error);
		const fallbackIntent = classifyIntentFallback(input);
		log("classified intent (fallback)", fallbackIntent);
		return fallbackIntent;
	}
}

async function handleAddTodo(input: AddTodoParams): Promise<Todo> {
	const params: AddTodoParams = { task: input.task.trim() };
	return tools.addTodo(params);
}

async function handleListTodos(): Promise<Todo[]> {
	return tools.listTodos();
}

async function handleUserInput(
	input: string,
	executors: TodoToolExecutors,
): Promise<WorkflowResult> {
	if (input.trim().length === 0) {
		throw new Error("Input cannot be empty");
	}

	const intent = await classifyIntent(input.trim());
	log(`routing to ${intent.action}`, intent.args);

	let result: WorkflowToolResult;
	if (intent.action === "add_todo") {
		const task = intent.args.task?.trim();
		if (!task) throw new Error("LLM did not extract a task for add_todo");
		result = await executors.add_todo({ task });
	} else if (intent.action === "complete_todo") {
		const id = intent.args.id?.trim();
		if (!id) throw new Error("LLM did not extract an id for complete_todo");
		result = await executors.complete_todo({ id });
	} else if (intent.action === "delete_todo") {
		const id = intent.args.id?.trim();
		if (!id) throw new Error("LLM did not extract an id for delete_todo");
		result = await executors.delete_todo({ id });
	} else if (intent.action === "update_todo") {
		const id = intent.args.id?.trim();
		const task = intent.args.task?.trim();
		if (!id) throw new Error("LLM did not extract an id for update_todo");
		if (!task) throw new Error("LLM did not extract a task for update_todo");
		result = await executors.update_todo({ id, task });
	} else {
		result = await executors.list_todos();
	}

	return { ...intent, result };
}

export const workflows = {
	handleAddTodo,
	handleListTodos,
	handleUserInput,
};
