/**
 * Type definitions for Todo operations
 */

/**
 * Todo item structure
 */
export interface Todo {
  id: string;
  task: string;
  completed: boolean;
  createdAt: string;
}

/**
 * Parameters for adding a todo
 */
export interface AddTodoParams {
  task: string;
}

/**
 * Parameters for updating a todo's task text
 */
export interface UpdateTodoParams {
  id: string;
  task: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
