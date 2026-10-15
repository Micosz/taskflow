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
              className={`relative min-h-10 overflow-hidden rounded-full border px-3.5 text-xs font-medium transition ${
                active
                  ? "border-[#a7b49c]/25 bg-[#9aaa91]/10 text-[#dfe5da]"
                  : alert
                    ? "border-[#ef654a]/20 bg-[#ef654a]/[0.06] text-[#ef806b]"
                    : "border-white/[0.075] bg-white/[0.025] text-[#858a84] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <span className="relative z-10">
                {messages.navigation[option]}
                <span className={`ml-2 tabular-nums ${active ? "text-[#b7c3ac]/70" : "text-[#666b65]"}`}>
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
