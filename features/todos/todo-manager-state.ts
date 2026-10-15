import { type Todo } from "@/types/todo";

import { sortTodos } from "@/types/todo";

export type TodoLoadStatus = "loading" | "ready" | "error";

export interface TodoManagerState {
  scopeKey: string;
  status: TodoLoadStatus;
  todos: Todo[];
}

export type TodoManagerAction =
  | { type: "switch_scope"; scopeKey: string }
  | { type: "loading"; scopeKey: string }
  | { type: "loaded"; scopeKey: string; todos: readonly Todo[] }
  | { type: "failed"; scopeKey: string }
  | { type: "upserted"; scopeKey: string; todo: Todo }
  | { type: "deleted"; scopeKey: string; todoId: string };

export function createTodoManagerState(scopeKey: string): TodoManagerState {
  return { scopeKey, status: "loading", todos: [] };
}

export function reduceTodoManagerState(
  state: TodoManagerState,
  action: TodoManagerAction,
): TodoManagerState {
  if (action.type === "switch_scope") {
    return action.scopeKey === state.scopeKey
      ? state
      : createTodoManagerState(action.scopeKey);
  }
  if (action.scopeKey !== state.scopeKey) return state;
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "loaded":
      return { ...state, status: "ready", todos: sortTodos(action.todos) };
    case "failed":
      return { ...state, status: "error" };
    case "upserted": {
      const exists = state.todos.some(({ id }) => id === action.todo.id);
      const todos = exists
        ? state.todos.map((todo) =>
            todo.id === action.todo.id ? action.todo : todo,
          )
        : [action.todo, ...state.todos];
      return { ...state, status: "ready", todos: sortTodos(todos) };
    }
    case "deleted":
      return {
        ...state,
        todos: state.todos.filter(({ id }) => id !== action.todoId),
      };
  }
}
