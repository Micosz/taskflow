import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import type { TranslationMessages } from "@/i18n";

export interface ToastMessage {
  id: number;
  title: string;
  description: string;
  tone?: "success" | "error";
}

interface ToastProps {
  toast: ToastMessage | null;
  messages: TranslationMessages;
  onDismiss: () => void;
}

export function Toast({ toast, messages, onDismiss }: ToastProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast]);

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[80] flex justify-center sm:inset-x-auto sm:right-5 sm:top-5">
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            className="glass-panel pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 shadow-[0_20px_70px_rgba(0,0,0,0.38)]"
            initial={reduceMotion ? false : { opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
          >
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                toast.tone === "error"
                  ? "bg-rose-400/12 text-rose-300"
                  : "bg-emerald-400/12 text-emerald-300"
              }`}
            >
              {toast.tone === "error" ? (
                <CircleAlert aria-hidden="true" size={18} />
              ) : (
                <CheckCircle2 aria-hidden="true" size={18} />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-[#979cb8]">{toast.description}</p>
            </div>
            <button
              type="button"
              aria-label={messages.toast.dismiss}
              onClick={onDismiss}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[#858ba8] transition hover:bg-white/[0.06] hover:text-white"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
