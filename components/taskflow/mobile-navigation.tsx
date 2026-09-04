"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarClock, CheckCircle2, ListTodo, Plus, SunMedium } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { formatNumber, type Locale, type TranslationMessages } from "@/i18n";
import type { TaskView } from "@/types/task";

interface MobileNavigationItem {
  view: Extract<TaskView, "active" | "today" | "upcoming" | "completed">;
  label: keyof TranslationMessages["navigation"];
  icon: LucideIcon;
}

const leadingItems: readonly MobileNavigationItem[] = [
  { view: "active", label: "active", icon: ListTodo },
  { view: "today", label: "today", icon: SunMedium },
];

const trailingItems: readonly MobileNavigationItem[] = [
  { view: "upcoming", label: "upcoming", icon: CalendarClock },
  { view: "completed", label: "completed", icon: CheckCircle2 },
];

export interface MobileNavigationProps {
  messages: TranslationMessages;
  locale: Locale;
  activeView: TaskView;
  counts: Record<TaskView, number>;
  onViewChange: (view: TaskView) => void;
  onAdd: () => void;
  className?: string;
}

export function MobileNavigation({
  messages,
  locale,
  activeView,
  counts,
  onViewChange,
  onAdd,
  className = "",
}: MobileNavigationProps) {
  const shouldReduceMotion = useReducedMotion();

  const renderItem = ({ view, label, icon: Icon }: MobileNavigationItem) => {
    const selected = activeView === view;

    return (
      <motion.button
        key={view}
        type="button"
        aria-current={selected ? "page" : undefined}
        className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.62rem] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300/90 motion-reduce:transition-none ${
          selected ? "text-white" : "text-slate-400/80"
        }`}
        onClick={() => onViewChange(view)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        {selected && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-2 inset-y-1 -z-10 rounded-2xl border border-white/[0.08] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            layoutId="taskflow-mobile-selection"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 470, damping: 36, mass: 0.7 }
            }
          />
        )}
        <span className="relative">
          <Icon aria-hidden="true" className={`size-5 ${selected ? "text-violet-300" : ""}`} strokeWidth={1.9} />
          {counts[view] > 0 && (
            <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-slate-800 px-1 text-center text-[0.55rem] leading-4 text-slate-300 ring-1 ring-white/[0.08] tabular-nums">
              {formatNumber(counts[view], locale)}
            </span>
          )}
        </span>
        <span className="max-w-full truncate">{messages.navigation[label]}</span>
      </motion.button>
    );
  };

  return (
    <nav
      aria-label={messages.accessibility.mobileNavigation}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#080d19]/88 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_55px_rgba(2,6,23,0.58)] backdrop-blur-2xl lg:hidden ${className}`}
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-0.5">
        {leadingItems.map(renderItem)}

        <div className="relative flex min-h-14 items-center justify-center">
          <motion.button
            type="button"
            aria-label={messages.header.addTask}
            className="absolute -top-6 grid size-15 place-items-center rounded-[1.35rem] border border-violet-200/25 bg-[linear-gradient(145deg,#a78bfa,#6366f1_52%,#2563eb)] text-white shadow-[0_14px_30px_rgba(79,70,229,0.48),0_0_0_5px_rgba(8,13,25,0.9),inset_0_1px_0_rgba(255,255,255,0.38)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#080d19]"
            onClick={onAdd}
            whileHover={shouldReduceMotion ? undefined : { y: -2, rotate: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.91, rotate: 0 }}
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={2.4} />
          </motion.button>
          <span className="mt-auto truncate pb-1 text-[0.6rem] font-medium text-violet-200">
            {messages.header.addTask}
          </span>
        </div>

        {trailingItems.map(renderItem)}
      </div>
    </nav>
  );
}
