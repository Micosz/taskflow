import { useCallback, useEffect, useState } from "react";
import { taskRepository } from "@/data";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";

export type TaskLoadStatus = "loading" | "ready" | "error";

export function useTaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<TaskLoadStatus>("loading");

  const loadTasks = useCallback(async () => {
    setStatus("loading");
    try {
      setTasks(await taskRepository.getTasks());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = taskRepository.subscribe((nextTasks) => {
      if (!active) return;
      setTasks([...nextTasks]);
      setStatus("ready");
    });

    taskRepository
      .getTasks()
      .then((nextTasks) => {
        if (!active) return;
        setTasks(nextTasks);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const created = await taskRepository.createTask(input);
    setTasks((current) =>
      current.some((task) => task.id === created.id)
        ? current.map((task) => (task.id === created.id ? created : task))
        : [created, ...current],
    );
    return created;
  }, []);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const updated = await taskRepository.updateTask(id, input);
    setTasks((current) =>
      current.map((task) => (task.id === updated.id ? updated : task)),
    );
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await taskRepository.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const toggleTask = useCallback(async (task: Task) => {
    const updated = await taskRepository.updateTask(task.id, {
      completed: !task.completed,
    });
    setTasks((current) =>
      current.map((candidate) =>
        candidate.id === updated.id ? updated : candidate,
      ),
    );
    return updated;
  }, []);

  const resetTasks = useCallback(async () => {
    const samples = await taskRepository.resetToSampleTasks();
    setTasks(samples);
    return samples;
  }, []);

  return {
    tasks,
    status,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    resetTasks,
  };
}
