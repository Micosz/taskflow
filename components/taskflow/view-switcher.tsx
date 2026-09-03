import { motion, useReducedMotion } from "motion/react";
import { formatNumber, type Locale, type TranslationMessages } from "@/i18n";
import { TASK_VIEWS, type TaskView } from "@/types/task";

interface ViewSwitcherProps {
  view: TaskView;
  counts: Record<TaskView, number>;
  locale: Locale;
  messages: TranslationMessages;
  onChange: (view: TaskView) => void;
}

export function ViewSwitcher({ view, counts, locale, messages, onChange }: ViewSwitcherProps) {
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label={messages.navigation.label} className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
      <div className="flex min-w-max gap-2">
        {TASK_VIEWS.map((option) => {
          const active = option === view;
          const alert = option === "overdue" && counts.overdue > 0;
          return (
            <motion.button
              key={option}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(option)}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              className={`relative min-h-10 overflow-hidden rounded-full border px-3.5 text-xs font-semibold transition ${
                active
                  ? "border-violet-300/20 bg-violet-400/15 text-violet-100"
                  : alert
                    ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200"
                    : "border-white/[0.075] bg-white/[0.03] text-[#8c92ad] hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              <span className="relative z-10">
                {messages.navigation[option]}
                <span className={`ml-2 tabular-nums ${active ? "text-violet-200/70" : "text-[#686e8c]"}`}>
                  {formatNumber(counts[option], locale)}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
