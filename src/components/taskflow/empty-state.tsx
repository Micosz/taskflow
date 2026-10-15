import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck2, CheckCircle2, ListChecks, SearchX, Sparkles, Sunrise } from "lucide-react";
import type { TranslationMessages } from "@/i18n";
import type { TaskView } from "@/types/task";

interface EmptyStateProps {
  view: TaskView;
  searching: boolean;
  messages: TranslationMessages;
  onAdd: () => void;
  onClearSearch: () => void;
}

const emptyIcons = {
  active: ListChecks,
  today: Sunrise,
  upcoming: CalendarCheck2,
  overdue: CheckCircle2,
  completed: Sparkles,
} as const;

export function EmptyState({ view, searching, messages, onAdd, onClearSearch }: EmptyStateProps) {
  const reduceMotion = useReducedMotion();
  const Icon = searching ? SearchX : emptyIcons[view];
  const title = searching ? messages.search.noResultsTitle : messages.empty[`${view}Title`];
  const description = searching
    ? messages.search.noResultsDescription
    : messages.empty[`${view}Description`];

  return (
    <motion.div
      className="glass-panel relative overflow-hidden rounded-[1.6rem] px-6 py-12 text-center sm:py-14"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div aria-hidden="true" className="absolute left-1/2 top-0 h-24 w-56 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl" />
      <motion.div
        aria-hidden="true"
        className="relative mx-auto grid size-16 place-items-center rounded-[1.35rem] border border-white/[0.08] bg-gradient-to-br from-violet-400/15 to-cyan-300/[0.06] text-violet-200 shadow-[0_18px_45px_rgba(80,65,180,0.18)]"
        animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon size={27} strokeWidth={1.7} />
      </motion.div>
      <h3 className="relative mt-5 text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-[#9297b4]">{description}</p>
      <button
        type="button"
        onClick={searching ? onClearSearch : onAdd}
        className="relative mt-6 min-h-11 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/15 active:scale-[0.98]"
      >
        {searching ? messages.search.clear : messages.empty.addTask}
      </button>
    </motion.div>
  );
}
