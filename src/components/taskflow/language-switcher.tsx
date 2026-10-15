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
      className={`inline-flex min-h-11 items-center rounded-md border border-white/[0.08] bg-white/[0.025] p-1 ${className}`}
      role="group"
    >
      {!compact && (
        <Languages aria-hidden="true" className="ml-2 mr-1 size-4 text-[#858a84]" strokeWidth={1.6} />
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
            className={`relative isolate min-h-9 min-w-10 rounded px-2.5 text-xs font-medium tracking-[0.08em] outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#a7b49c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0a] motion-reduce:transition-none ${
              selected ? "text-[#f1efe7]" : "text-[#747972] hover:text-[#d8d6cf]"
            }`}
            onClick={() => onLocaleChange(option)}
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
          >
            {selected && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded border border-[#b7c3ac]/18 bg-[#899781]/20"
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
