/**
 * MCP Tools Module
 *
 * Low-level todo operations with input validation.
 * Each tool is independent and focused on a single operation.
 */

import type { AddTodoParams, Todo, UpdateTodoParams } from "../types/index.js";

const todos: Todo[] = [];

async function addTodo(params: AddTodoParams): Promise<Todo> {
	const todo: Todo = {
		id: crypto.randomUUID(),
		task: params.task,
		completed: false,
		createdAt: new Date().toISOString(),
	};

	todos.push(todo);
	return todo;
}

async function listTodos(): Promise<Todo[]> {
	return [...todos];
}

async function completeTodo(id: string): Promise<Todo> {
	const todo = todos.find((t) => t.id === id);
	if (!todo) throw new Error(`Todo not found: ${id}`);
	todo.completed = true;
	return { ...todo };
}

async function deleteTodo(id: string): Promise<{ id: string }> {
	const index = todos.findIndex((t) => t.id === id);
	if (index === -1) throw new Error(`Todo not found: ${id}`);
	todos.splice(index, 1);
	return { id };
}

async function updateTodo(params: UpdateTodoParams): Promise<Todo> {
	const todo = todos.find((t) => t.id === params.id);
	if (!todo) throw new Error(`Todo not found: ${params.id}`);
	todo.task = params.task;
	return { ...todo };
}

export const tools = {
	addTodo,
	listTodos,
	completeTodo,
	deleteTodo,
	updateTodo,
};
