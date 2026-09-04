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
  selectedTaskId: string | null;
  onSelect: (task: Task) => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAdd: () => void;
  onClearSearch: () => void;
  className?: string;
}

export function TaskList({
  tasks,
  view,
  searchQuery,
  locale,
  messages,
  busyTaskId,
  selectedTaskId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  onClearSearch,
  className = "",
}: TaskListProps) {
  const reduceMotion = useReducedMotion();
  const searching = searchQuery.trim().length > 0;
  const resultLabel = searching
    ? tasks.length === 1
      ? messages.search.resultCountOne
      : messages.search.resultCount.replace("{count}", formatNumber(tasks.length, locale))
    : formatTaskCount(tasks.length, locale);
  const agendaLabels = locale === "th"
    ? { now: "ตอนนี้", next: "ลำดับถัดไป", later: "ภายหลัง" }
    : { now: "Now", next: "Next", later: "Later" };
  const groups = view === "active" && !searching
    ? [
        { key: "now", label: agendaLabels.now, tasks: tasks.slice(0, 1) },
        { key: "next", label: agendaLabels.next, tasks: tasks.slice(1, 3) },
        { key: "later", label: agendaLabels.later, tasks: tasks.slice(3) },
      ].filter((group) => group.tasks.length > 0)
    : [{ key: view, label: searching ? messages.search.title : messages.view[view], tasks }];

  return (
    <section id="task-list" aria-labelledby="task-list-heading" className={`editorial-agenda scroll-mt-6 ${className}`}>
      <div className="editorial-agenda__intro">
        <div>
          <div className="flex items-center gap-2">
            {searching && <Search aria-hidden="true" size={15} className="text-[#9aaa91]" />}
            <h2 id="task-list-heading" className="text-base font-normal tracking-[-0.02em] text-[#efede6] sm:text-lg">
              {searching ? messages.search.title : messages.view[view]}
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#6f746e]">{resultLabel}</p>
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
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`agenda-${group.key}`}>
              <div className="editorial-agenda__group-heading">
                <h3 id={`agenda-${group.key}`}>{group.label}</h3>
                <span>{formatTaskCount(group.tasks.length, locale)}</span>
              </div>
              <motion.ul layout={!reduceMotion} className="editorial-task-list">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      locale={locale}
                      messages={messages}
                      busy={busyTaskId === task.id}
                      selected={selectedTaskId === task.id}
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
