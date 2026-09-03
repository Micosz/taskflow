import { CheckCheck, Sparkles } from "lucide-react";

import type { TranslationMessages } from "@/i18n";

export interface BrandProps {
  messages: TranslationMessages;
  compact?: boolean;
  className?: string;
}

export function Brand({ messages, compact = false, className = "" }: BrandProps) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div
        aria-hidden="true"
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(145deg,#8b5cf6_0%,#6366f1_48%,#22d3ee_120%)] shadow-[0_12px_34px_rgba(99,102,241,0.38),inset_0_1px_0_rgba(255,255,255,0.35)]"
      >
        <span className="absolute inset-px rounded-[0.9rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.18),transparent_58%)]" />
        <Sparkles className="absolute right-1.5 top-1.5 size-2.5 text-cyan-100/80" strokeWidth={2.25} />
        <CheckCheck className="relative size-6 text-white drop-shadow-[0_2px_7px_rgba(255,255,255,0.35)]" strokeWidth={2.4} />
      </div>

      {!compact && (
        <div className="min-w-0 max-[359px]:hidden">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[1.05rem] font-semibold tracking-[-0.035em] text-white">
              {messages.app.name}
            </span>
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
            />
          </div>
          <p className="mt-0.5 truncate text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-400">
            {messages.app.eyebrow}
          </p>
        </div>
      )}
    </div>
  );
}
