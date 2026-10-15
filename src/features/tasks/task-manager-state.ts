import type { Task } from "@/types/task";

export type TaskLoadStatus = "loading" | "ready" | "error";

export interface TaskManagerState {
  scopeKey: string;
  status: TaskLoadStatus;
  tasks: Task[];
}

export type TaskManagerAction =
  | { type: "switch_scope"; scopeKey: string }
  | { type: "loading"; scopeKey: string }
  | { type: "loaded"; scopeKey: string; tasks: readonly Task[] }
  | { type: "failed"; scopeKey: string }
  | { type: "upserted"; scopeKey: string; task: Task; prepend?: boolean }
  | { type: "deleted"; scopeKey: string; taskId: string };

export function createTaskManagerState(scopeKey: string): TaskManagerState {
  return {
    scopeKey,
    status: "loading",
    tasks: [],
  };
}

export function reduceTaskManagerState(
  state: TaskManagerState,
  action: TaskManagerAction,
): TaskManagerState {
  if (action.type === "switch_scope") {
    return action.scopeKey === state.scopeKey
      ? state
      : createTaskManagerState(action.scopeKey);
  }

  if (action.scopeKey !== state.scopeKey) {
    return state;
  }

  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "loaded":
      return { ...state, status: "ready", tasks: [...action.tasks] };
    case "failed":
      return { ...state, status: "error" };
    case "upserted": {
      const exists = state.tasks.some((task) => task.id === action.task.id);
      const tasks = exists
        ? state.tasks.map((task) =>
            task.id === action.task.id ? action.task : task,
          )
        : action.prepend === false
          ? [...state.tasks, action.task]
          : [action.task, ...state.tasks];
      return { ...state, status: "ready", tasks };
    }
    case "deleted":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.taskId),
      };
  }
}
