"use client";

import { Languages } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

import type { Locale, TranslationMessages } from "@/i18n";

export interface LanguageSwitcherProps {
  messages: TranslationMessages;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  compact?: boolean;
  className?: string;
}

const localeOptions = ["en", "th"] as const satisfies readonly Locale[];

export function LanguageSwitcher({
  messages,
  locale,
  onLocaleChange,
  compact = false,
  className = "",
}: LanguageSwitcherProps) {
  const shouldReduceMotion = useReducedMotion();
  const selectionId = useId();

  return (
    <div
      aria-label={messages.language.selectorLabel}
      className={`inline-flex min-h-11 items-center rounded-2xl border border-white/[0.08] bg-white/[0.045] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${className}`}
      role="group"
    >
      {!compact && (
        <Languages aria-hidden="true" className="ml-2 mr-1 size-4 text-slate-400" strokeWidth={1.8} />
      )}

      {localeOptions.map((option) => {
        const selected = option === locale;
        const shortLabel = option === "en" ? messages.language.englishShort : messages.language.thaiShort;
        const fullLabel = option === "en" ? messages.language.english : messages.language.thai;

        return (
          <motion.button
            key={option}
            type="button"
            aria-label={fullLabel}
            aria-pressed={selected}
            className={`relative isolate min-h-9 min-w-10 rounded-xl px-2.5 text-xs font-semibold tracking-[0.08em] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1020] motion-reduce:transition-none ${
              selected ? "text-white" : "text-slate-400 hover:text-slate-100"
            }`}
            onClick={() => onLocaleChange(option)}
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          >
            {selected && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.88),rgba(79,70,229,0.76))] shadow-[0_7px_18px_rgba(99,102,241,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]"
                layoutId={`taskflow-language-selection-${selectionId}`}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 34, mass: 0.65 }
                }
              />
            )}
            <span className="relative">{shortLabel}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
