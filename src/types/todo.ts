/** An undated reminder. It is deliberately independent of the Task domain. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateTodoInput { title: string }
export type UpdateTodoInput = Partial<Pick<Todo, "title" | "completed">>;
export function normalizeTodoTitle(title: string): string {
  const value = title.trim();
  if (!value || value.length > 240) throw new Error("Todo title must contain 1–240 characters.");
  return value;
}
export function sortTodos(items: readonly Todo[]): Todo[] {
  return [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
