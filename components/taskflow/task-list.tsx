import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import {
  formatNumber,
  formatTaskCount,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import type { Task, TaskView } from "@/types/task";
import { EmptyState } from "./empty-state";
import { TaskCard } from "./task-card";

interface TaskListProps {
  tasks: Task[];
  view: TaskView;
  searchQuery: string;
  locale: Locale;
  messages: TranslationMessages;
  busyTaskId: string | null;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAdd: () => void;
  onClearSearch: () => void;
}

export function TaskList({
  tasks,
  view,
  searchQuery,
  locale,
  messages,
  busyTaskId,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onClearSearch,
}: TaskListProps) {
  const reduceMotion = useReducedMotion();
  const searching = searchQuery.trim().length > 0;
  const resultLabel = searching
    ? tasks.length === 1
      ? messages.search.resultCountOne
      : messages.search.resultCount.replace("{count}", formatNumber(tasks.length, locale))
    : formatTaskCount(tasks.length, locale);

  return (
    <section id="task-list" aria-labelledby="task-list-heading" className="scroll-mt-6">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2">
            {searching && <Search aria-hidden="true" size={15} className="text-violet-300" />}
            <h2 id="task-list-heading" className="text-base font-semibold tracking-[-0.02em] text-white sm:text-lg">
              {searching ? messages.search.title : messages.view[view]}
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#777d9b]">{resultLabel}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          view={view}
          searching={searching}
          messages={messages}
          onAdd={onAdd}
          onClearSearch={onClearSearch}
        />
      ) : (
        <motion.ul layout={!reduceMotion} className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                locale={locale}
                messages={messages}
                busy={busyTaskId === task.id}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </section>
  );
}
