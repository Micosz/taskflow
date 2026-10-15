import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/types/todo";
export type TodoRepositoryListener = (items: readonly Todo[]) => void;
export interface TodoRepository {
  getTodos(): Promise<Todo[]>;
  createTodo(input: CreateTodoInput): Promise<Todo>;
  updateTodo(id: string, input: UpdateTodoInput): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;
  subscribe(listener: TodoRepositoryListener): () => void;
}
