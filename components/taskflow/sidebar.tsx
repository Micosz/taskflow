"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Cloud,
  Layers3,
  Plus,
  Settings2,
  SunMedium,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { formatNumber, type Locale, type TranslationMessages } from "@/i18n";
import type { TaskView } from "@/types/task";

import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";

interface NavigationItem {
  view: TaskView;
  label: keyof TranslationMessages["navigation"];
  icon: LucideIcon;
}

const navigationItems: readonly NavigationItem[] = [
  { view: "today", label: "today", icon: SunMedium },
  { view: "upcoming", label: "upcoming", icon: CalendarClock },
  { view: "overdue", label: "overdue", icon: CircleAlert },
  { view: "completed", label: "completed", icon: CheckCircle2 },
  { view: "all", label: "all", icon: Layers3 },
];

export interface SidebarProps {
  messages: TranslationMessages;
  locale: Locale;
  activeView: TaskView;
  counts: Record<TaskView, number>;
  onViewChange: (view: TaskView) => void;
  onLocaleChange: (locale: Locale) => void;
  onAdd: () => void;
  onSettings: () => void;
  className?: string;
}

export function Sidebar({
  messages,
  locale,
  activeView,
  counts,
  onViewChange,
  onLocaleChange,
  onAdd,
  onSettings,
  className = "",
}: SidebarProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <aside
      className={`sticky top-0 hidden h-[100dvh] w-[17.5rem] shrink-0 flex-col border-r border-white/[0.07] bg-[#080d19]/82 pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-5 pt-[max(1.5rem,env(safe-area-inset-top))] shadow-[24px_0_80px_rgba(2,6,23,0.25)] backdrop-blur-2xl lg:flex ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden"
      >
        <div className="absolute -left-16 -top-24 size-52 rounded-full bg-violet-500/15 blur-3xl motion-reduce:hidden" />
        <div className="absolute left-24 -top-24 size-44 rounded-full bg-cyan-400/[0.07] blur-3xl motion-reduce:hidden" />
      </div>

      <Brand className="relative px-1" messages={messages} />

      <motion.button
        type="button"
        className="group relative mt-8 flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-violet-300/20 bg-[linear-gradient(135deg,#8b5cf6,#4f46e5_56%,#2563eb)] px-4 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.28)] outline-none transition-shadow hover:shadow-[0_18px_42px_rgba(79,70,229,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d19] motion-reduce:transition-none"
        onClick={onAdd}
        whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.975 }}
      >
        <span
          aria-hidden="true"
          className="absolute -left-12 top-0 h-full w-10 skew-x-[-18deg] bg-white/20 opacity-0 blur-sm transition-all duration-500 group-hover:left-[115%] group-hover:opacity-100 motion-reduce:hidden"
        />
        <Plus aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
        <span>{messages.header.addTask}</span>
      </motion.button>

      <nav aria-label={messages.accessibility.desktopNavigation} className="mt-8">
        <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {messages.navigation.label}
        </p>
        <ul className="space-y-1.5">
          {navigationItems.map(({ view, label, icon: Icon }) => {
            const selected = view === activeView;
            const isAlert = view === "overdue" && counts.overdue > 0;

            return (
              <li key={view}>
                <motion.button
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  className={`group relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-2xl px-3 text-left text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d19] motion-reduce:transition-none ${
                    selected ? "text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
                  }`}
                  onClick={() => onViewChange(view)}
                  whileHover={shouldReduceMotion || selected ? undefined : { x: 2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                >
                  {selected && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-2xl border border-white/[0.09] bg-[linear-gradient(100deg,rgba(124,58,237,0.25),rgba(59,130,246,0.08))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      layoutId="taskflow-sidebar-selection"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 450, damping: 35, mass: 0.72 }
                      }
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative grid size-8 shrink-0 place-items-center rounded-xl transition-colors motion-reduce:transition-none ${
                      selected
                        ? "bg-violet-400/15 text-violet-200"
                        : isAlert
                          ? "bg-amber-400/10 text-amber-300"
                          : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    <Icon className="size-[1.05rem]" strokeWidth={1.9} />
                  </span>
                  <span className="relative min-w-0 flex-1 truncate">{messages.navigation[label]}</span>
                  <span
                    className={`relative min-w-7 rounded-full px-2 py-0.5 text-center text-[0.68rem] tabular-nums ${
                      isAlert
                        ? "bg-amber-300/10 text-amber-200"
                        : selected
                          ? "bg-white/[0.08] text-slate-200"
                          : "text-slate-500"
                    }`}
                  >
                    {formatNumber(counts[view], locale)}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-2xl border border-cyan-300/[0.08] bg-cyan-300/[0.035] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-cyan-300/[0.08] text-cyan-200">
              <Cloud aria-hidden="true" className="size-4" strokeWidth={1.8} />
              <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-emerald-300 shadow-[0_0_7px_rgba(110,231,183,0.9)]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-200">{messages.app.localMode}</p>
              <p className="mt-0.5 truncate text-[0.66rem] text-slate-500">
                {messages.app.syncReady}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher
            className="shrink-0"
            compact
            locale={locale}
            messages={messages}
            onLocaleChange={onLocaleChange}
          />
          <motion.button
            type="button"
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 text-xs font-medium text-slate-400 outline-none transition-colors hover:bg-white/[0.065] hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d19] motion-reduce:transition-none"
            onClick={onSettings}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.975 }}
          >
            <Settings2 aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{messages.navigation.settings}</span>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
