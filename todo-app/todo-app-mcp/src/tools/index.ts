/**
 * MCP Tools Module
 *
 * Low-level todo operations with persistence.
 * Each tool is independent and focused on a single operation.
 */

import type { AddTodoParams, AppBindings, Todo, UpdateTodoParams } from "../types/index.js";

const TODO_STORAGE_KEY = "todos";
let todosCache: Todo[] | null = null;

async function loadTodos(env: AppBindings): Promise<Todo[]> {
	if (todosCache) {
		return todosCache;
	}

	const storedTodos = await env.TODO_STORE.get<Todo[]>(TODO_STORAGE_KEY, "json");
	todosCache = Array.isArray(storedTodos) ? storedTodos : [];
	return todosCache;
}

async function saveTodos(env: AppBindings, todos: Todo[]): Promise<void> {
	todosCache = todos;
	await env.TODO_STORE.put(TODO_STORAGE_KEY, JSON.stringify(todos));
}

async function addTodo(env: AppBindings, params: AddTodoParams): Promise<Todo> {
	const todos = await loadTodos(env);
	const todo: Todo = {
		id: crypto.randomUUID(),
		task: params.task,
		completed: false,
		createdAt: new Date().toISOString(),
	};

	todos.push(todo);
	await saveTodos(env, todos);
	return todo;
}

async function listTodos(env: AppBindings): Promise<Todo[]> {
	const todos = await loadTodos(env);
	return [...todos];
}

async function completeTodo(env: AppBindings, id: string): Promise<Todo> {
	const todos = await loadTodos(env);
	const todo = todos.find((t) => t.id === id);
	if (!todo) throw new Error(`Todo not found: ${id}`);
	todo.completed = !todo.completed;
	await saveTodos(env, todos);
	return { ...todo };
}

async function deleteTodo(env: AppBindings, id: string): Promise<{ id: string }> {
	const todos = await loadTodos(env);
	const index = todos.findIndex((t) => t.id === id);
	if (index === -1) throw new Error(`Todo not found: ${id}`);
	todos.splice(index, 1);
	await saveTodos(env, todos);
	return { id };
}

async function updateTodo(env: AppBindings, params: UpdateTodoParams): Promise<Todo> {
	const todos = await loadTodos(env);
	const todo = todos.find((t) => t.id === params.id);
	if (!todo) throw new Error(`Todo not found: ${params.id}`);
	todo.task = params.task;
	await saveTodos(env, todos);
	return { ...todo };
}

export const tools = {
	addTodo,
	listTodos,
	completeTodo,
	deleteTodo,
	updateTodo,
};
