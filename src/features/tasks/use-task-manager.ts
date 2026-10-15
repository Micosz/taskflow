import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { TaskRepository } from "@/data/task-repository";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";

import {
  createTaskManagerState,
  reduceTaskManagerState,
} from "./task-manager-state";

export interface UseTaskManagerOptions {
  enabled?: boolean;
  repository: TaskRepository;
  scopeKey: string;
}

export function useTaskManager({
  enabled = true,
  repository,
  scopeKey,
}: UseTaskManagerOptions) {
  const [state, dispatch] = useReducer(
    reduceTaskManagerState,
    createTaskManagerState(scopeKey),
  );

  const visibleState = useMemo(
    () =>
      state.scopeKey === scopeKey
        ? state
        : createTaskManagerState(scopeKey),
    [scopeKey, state],
  );

  const loadTasks = useCallback(async () => {
    if (!enabled) return;
    dispatch({ type: "loading", scopeKey });
    try {
      const tasks = await repository.getTasks();
      dispatch({ type: "loaded", scopeKey, tasks });
    } catch {
      dispatch({ type: "failed", scopeKey });
    }
  }, [enabled, repository, scopeKey]);

  useEffect(() => {
    dispatch({ type: "switch_scope", scopeKey });
    if (!enabled) return;

    let active = true;
    const unsubscribe = repository.subscribe((tasks) => {
      if (active) dispatch({ type: "loaded", scopeKey, tasks });
    });

    void repository
      .getTasks()
      .then((tasks) => {
        if (active) dispatch({ type: "loaded", scopeKey, tasks });
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", scopeKey });
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, repository, scopeKey]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      const task = await repository.createTask(input);
      dispatch({ type: "upserted", scopeKey, task });
      return task;
    },
    [repository, scopeKey],
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      const task = await repository.updateTask(id, input);
      dispatch({ type: "upserted", scopeKey, task, prepend: false });
      return task;
    },
    [repository, scopeKey],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await repository.deleteTask(id);
      dispatch({ type: "deleted", scopeKey, taskId: id });
    },
    [repository, scopeKey],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      const updated = await repository.updateTask(task.id, {
        completed: !task.completed,
      });
      dispatch({ type: "upserted", scopeKey, task: updated, prepend: false });
      return updated;
    },
    [repository, scopeKey],
  );

  return {
    createTask,
    deleteTask,
    loadTasks,
    status: visibleState.status,
    tasks: visibleState.tasks,
    toggleTask,
    updateTask,
  };
}
