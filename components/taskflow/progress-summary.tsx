"use client";

import { CheckCircle2, Flame, SunMedium, TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  formatNumber,
  interpolate,
  type Locale,
  type TranslationMessages,
} from "@/i18n";

export interface ProgressStats {
  completed: number;
  total: number;
  dueToday: number;
  overdue: number;
  highPriority: number;
}

export interface ProgressSummaryProps {
  messages: TranslationMessages;
  locale: Locale;
  stats: ProgressStats;
  className?: string;
}

interface MetricProps {
  icon: typeof SunMedium;
  label: string;
  value: string;
  tone: "violet" | "amber" | "rose";
}

const metricTones: Record<MetricProps["tone"], string> = {
  violet: "bg-violet-400/10 text-violet-200 ring-violet-300/10",
  amber: "bg-amber-400/10 text-amber-200 ring-amber-300/10",
  rose: "bg-rose-400/10 text-rose-200 ring-rose-300/10",
};

function Metric({ icon: Icon, label, value, tone }: MetricProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-center sm:gap-3 sm:p-3">
      <span
        aria-hidden="true"
        className={`grid size-8 shrink-0 place-items-center rounded-xl ring-1 sm:size-9 ${metricTones[tone]}`}
      >
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <strong className="block text-base font-semibold leading-none text-white tabular-nums">{value}</strong>
        <span className="mt-1 block truncate text-[0.68rem] text-slate-400">{label}</span>
      </span>
    </div>
  );
}

export function ProgressSummary({
  messages,
  locale,
  stats,
  className = "",
}: ProgressSummaryProps) {
  const shouldReduceMotion = useReducedMotion();
  const safeTotal = Math.max(0, stats.total);
  const safeCompleted = Math.min(Math.max(0, stats.completed), safeTotal);
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  const progressText = interpolate(messages.stats.progressValue, {
    completed: formatNumber(safeCompleted, locale),
    total: formatNumber(safeTotal, locale),
  });

  return (
    <motion.section
      aria-label={messages.stats.label}
      className={`relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[linear-gradient(135deg,rgba(20,27,49,0.94),rgba(11,17,32,0.88))] p-4 shadow-[0_24px_75px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-5 ${className}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-20 -z-10 size-52 rounded-full bg-violet-500/15 blur-3xl motion-reduce:opacity-50"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 size-44 rounded-full bg-cyan-400/[0.08] blur-3xl motion-reduce:opacity-50"
      />

      <div className="grid gap-4 md:grid-cols-[minmax(11rem,0.72fr)_minmax(0,1.28fr)] md:items-center">
        <div className="flex items-center gap-4">
          <div
            role="progressbar"
            aria-label={messages.stats.focusProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
            aria-valuetext={progressText}
            className="relative grid size-24 shrink-0 place-items-center rounded-full p-[7px] shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-[background] duration-500 motion-reduce:transition-none sm:size-28"
            style={{
              background: `conic-gradient(#a78bfa 0%, #6366f1 ${percentage}%, rgba(148,163,184,0.12) ${percentage}%, rgba(148,163,184,0.12) 100%)`,
            }}
          >
            <div className="grid size-full place-items-center rounded-full border border-white/[0.08] bg-[#0b1120]/95 shadow-[inset_0_4px_18px_rgba(2,6,23,0.6)]">
              <div className="text-center">
                <span className="block text-xl font-semibold tracking-[-0.04em] text-white tabular-nums sm:text-2xl">
                  {formatNumber(percentage, locale)}%
                </span>
                <CheckCircle2 aria-hidden="true" className="mx-auto mt-0.5 size-3.5 text-emerald-300" strokeWidth={2} />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-violet-200/75">
              {messages.stats.focusProgress}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{progressText}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Metric
            icon={SunMedium}
            label={messages.stats.dueToday}
            tone="violet"
            value={formatNumber(Math.max(0, stats.dueToday), locale)}
          />
          <Metric
            icon={Flame}
            label={messages.stats.highPriority}
            tone="rose"
            value={formatNumber(Math.max(0, stats.highPriority), locale)}
          />
          <Metric
            icon={TriangleAlert}
            label={messages.stats.overdue}
            tone="amber"
            value={formatNumber(Math.max(0, stats.overdue), locale)}
          />
        </div>
      </div>
    </motion.section>
  );
}
