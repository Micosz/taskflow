import { useCallback, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloudUpload, HardDrive, LoaderCircle, ShieldCheck, X } from "lucide-react";

import { formatNumber, interpolate, type Locale, type TranslationMessages } from "@/i18n";

import { useDialogA11y } from "./use-dialog-a11y";

interface LocalTaskMigrationDialogProps {
  count: number;
  isMigrating: boolean;
  locale: Locale;
  messages: TranslationMessages;
  onKeepLocal: () => void;
  onLater: () => void;
  onMigrate: () => Promise<void>;
  open: boolean;
}

export function LocalTaskMigrationDialog({
  count,
  isMigrating,
  locale,
  messages,
  onKeepLocal,
  onLater,
  onMigrate,
  open,
}: LocalTaskMigrationDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const handleClose = useCallback(() => {
    if (!isMigrating) onLater();
  }, [isMigrating, onLater]);

  useDialogA11y(open, dialogRef, handleClose);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-[65] flex items-end justify-center bg-[#050611]/80 backdrop-blur-md sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="modal-sheet glass-panel relative w-full max-w-lg overflow-y-auto rounded-t-[1.8rem] p-5 sm:rounded-[1.8rem] sm:p-7"
            initial={reduceMotion ? false : { opacity: 0, y: 38, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
          >
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <button
              data-autofocus
              type="button"
              disabled={isMigrating}
              aria-label={messages.migration.close}
              onClick={handleClose}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-xl text-[#969bb8] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40 sm:right-5 sm:top-5"
            >
              <X aria-hidden="true" size={20} />
            </button>

            <div className="flex items-start gap-4 pr-12">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-violet-100 ring-1 ring-inset ring-violet-300/20">
                <CloudUpload aria-hidden="true" size={23} />
              </span>
              <div>
                <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                  {messages.migration.title}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#989db8]">
                  {interpolate(messages.migration.description, {
                    count: formatNumber(count, locale),
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] p-4">
              <div className="flex gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-200" size={18} />
                <p className="text-xs leading-5 text-[#a9c8bd]">{messages.migration.privacyNote}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                disabled={isMigrating}
                onClick={() => void onMigrate()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b74f6] to-[#4aaecb] px-4 text-sm font-semibold text-white shadow-[0_13px_30px_rgba(94,76,220,0.24)] transition hover:brightness-110 active:scale-[0.985] disabled:cursor-wait disabled:opacity-65"
              >
                {isMigrating ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} />
                ) : (
                  <CloudUpload aria-hidden="true" size={17} />
                )}
                {isMigrating ? messages.migration.moving : messages.migration.move}
              </button>
              <button
                type="button"
                disabled={isMigrating}
                onClick={onKeepLocal}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-[#d5d8e8] transition hover:bg-white/[0.07] hover:text-white active:scale-[0.985] disabled:opacity-50"
              >
                <HardDrive aria-hidden="true" size={17} />
                {messages.migration.keep}
              </button>
            </div>
            <button
              type="button"
              disabled={isMigrating}
              onClick={onLater}
              className="mt-2 min-h-11 w-full rounded-xl text-xs font-semibold text-[#969bb8] transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              {messages.migration.later}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
