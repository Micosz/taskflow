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
        className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.62rem] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#a7b49c] motion-reduce:transition-none ${
          selected ? "text-[#f1efe7]" : "text-[#747972]"
        }`}
        onClick={() => onViewChange(view)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
      >
        {selected && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-2 inset-y-1 -z-10 rounded-xl border border-white/[0.08] bg-white/[0.04]"
            layoutId="taskflow-mobile-selection"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 470, damping: 36, mass: 0.7 }
            }
          />
        )}
        <span className="relative">
          <Icon aria-hidden="true" className={`size-5 ${selected ? "text-[#a7b49c]" : ""}`} strokeWidth={1.7} />
          {counts[view] > 0 && (
            <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-[#181c18] px-1 text-center text-[0.55rem] leading-4 text-[#a8aca6] ring-1 ring-white/[0.08] tabular-nums">
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
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.09] bg-[#090b0a]/94 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_55px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:hidden ${className}`}
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-0.5">
        {leadingItems.map(renderItem)}

        <div className="relative flex min-h-14 items-center justify-center">
          <motion.button
            type="button"
            aria-label={messages.header.addTask}
            className="absolute -top-6 grid size-15 place-items-center rounded-xl border border-[#b7c3ac]/25 bg-[#899781] text-white shadow-[0_14px_30px_rgba(0,0,0,0.42),0_0_0_5px_rgba(9,11,10,0.92)] outline-none focus-visible:ring-2 focus-visible:ring-[#b7c3ac] focus-visible:ring-offset-4 focus-visible:ring-offset-[#090b0a]"
            onClick={onAdd}
            whileHover={shouldReduceMotion ? undefined : { y: -2, rotate: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.91, rotate: 0 }}
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={2.4} />
          </motion.button>
          <span className="mt-auto truncate pb-1 text-[0.6rem] font-medium text-[#b7c3ac]">
            {messages.header.addTask}
          </span>
        </div>

        {trailingItems.map(renderItem)}
      </div>
    </nav>
  );
}
