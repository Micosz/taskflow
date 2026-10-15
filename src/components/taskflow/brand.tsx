import type { TranslationMessages } from "@/i18n";

export interface BrandProps {
  messages: TranslationMessages;
  compact?: boolean;
  className?: string;
}

export function Brand({ messages, compact = false, className = "" }: BrandProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-baseline whitespace-nowrap text-[1.12rem] font-medium tracking-[-0.045em] text-[#f1efe7]">
        <span>Task</span>
        <span className="text-[#9aaa91]">Flow</span>
      </div>
      {!compact && (
        <p className="mt-1 truncate text-[0.62rem] font-normal uppercase tracking-[0.14em] text-[#777b76] max-[359px]:hidden">
          {messages.app.eyebrow}
        </p>
      )}
    </div>
  );
}
