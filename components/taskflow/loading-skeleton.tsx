import type { TranslationMessages } from "@/i18n";

export interface LoadingSkeletonProps {
  messages: TranslationMessages;
  rowCount?: number;
  className?: string;
}

export function LoadingSkeleton({
  messages,
  rowCount = 4,
  className = "",
}: LoadingSkeletonProps) {
  const rows = Array.from({ length: Math.max(1, rowCount) });

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className={`space-y-4 ${className}`}
      role="status"
    >
      <span className="sr-only">{messages.common.loading}</span>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_20px_65px_rgba(2,6,23,0.24)]"
      >
        <div className="animate-pulse space-y-4 motion-reduce:animate-none">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 rounded-full bg-[linear-gradient(110deg,rgba(255,255,255,0.045),rgba(139,92,246,0.13),rgba(255,255,255,0.045))] sm:size-24" />
            <div className="w-full space-y-3">
              <div className="h-3 w-24 rounded-full bg-white/[0.07]" />
              <div className="h-5 w-40 max-w-[72%] rounded-full bg-white/[0.09]" />
              <div className="h-3 w-28 rounded-full bg-white/[0.05]" />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="space-y-3">
        {rows.map((_, index) => (
          <div
            key={index}
            className="rounded-[1.45rem] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-4 shadow-[0_12px_38px_rgba(2,6,23,0.2)]"
          >
            <div
              className="animate-pulse motion-reduce:animate-none"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <div className="flex gap-3.5">
                <div className="mt-0.5 size-6 shrink-0 rounded-full bg-white/[0.08]" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className={`h-4 rounded-full bg-white/[0.09] ${index % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
                  <div className="h-3 w-full max-w-md rounded-full bg-white/[0.045]" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-6 w-20 rounded-full bg-violet-400/[0.07]" />
                    <div className="h-6 w-24 rounded-full bg-white/[0.045]" />
                  </div>
                </div>
                <div className="size-9 shrink-0 rounded-xl bg-white/[0.045]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
