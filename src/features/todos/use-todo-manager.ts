import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { TodoRepository } from "@/data/todo-repository";
import type { CreateTodoInput, UpdateTodoInput } from "@/types/todo";
import {
  createTodoManagerState,
  reduceTodoManagerState,
} from "./todo-manager-state";

interface UseTodoManagerOptions {
  enabled?: boolean;
  repository: TodoRepository;
  scopeKey: string;
}

export function useTodoManager({
  enabled = true,
  repository,
  scopeKey,
}: UseTodoManagerOptions) {
  const [state, dispatch] = useReducer(
    reduceTodoManagerState,
    createTodoManagerState(scopeKey),
  );
  const visibleState = useMemo(
    () =>
      state.scopeKey === scopeKey
        ? state
        : createTodoManagerState(scopeKey),
    [scopeKey, state],
  );

  const loadTodos = useCallback(async () => {
    if (!enabled) return;
    dispatch({ type: "loading", scopeKey });
    try {
      const todos = await repository.getTodos();
      dispatch({ type: "loaded", scopeKey, todos });
    } catch {
      dispatch({ type: "failed", scopeKey });
    }
  }, [enabled, repository, scopeKey]);

  useEffect(() => {
    dispatch({ type: "switch_scope", scopeKey });
    if (!enabled) return;
    let active = true;
    const unsubscribe = repository.subscribe((todos) => {
      if (active) dispatch({ type: "loaded", scopeKey, todos });
    });
    void repository
      .getTodos()
      .then((todos) => {
        if (active) dispatch({ type: "loaded", scopeKey, todos });
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", scopeKey });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, repository, scopeKey]);

  const createTodo = useCallback(
    async (input: CreateTodoInput) => {
      const todo = await repository.createTodo(input);
      dispatch({ type: "upserted", scopeKey, todo });
      return todo;
    },
    [repository, scopeKey],
  );
  const updateTodo = useCallback(
    async (id: string, input: UpdateTodoInput) => {
      const todo = await repository.updateTodo(id, input);
      dispatch({ type: "upserted", scopeKey, todo });
      return todo;
    },
    [repository, scopeKey],
  );
  const deleteTodo = useCallback(
    async (id: string) => {
      await repository.deleteTodo(id);
      dispatch({ type: "deleted", scopeKey, todoId: id });
    },
    [repository, scopeKey],
  );

  return {
    todos: visibleState.todos,
    status: visibleState.status,
    createTodo,
    updateTodo,
    deleteTodo,
    loadTodos,
  };
}
