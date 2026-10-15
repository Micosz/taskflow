import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Trash2, TriangleAlert, X } from "lucide-react";
import { interpolate, type TranslationMessages } from "@/i18n";
import type { Task } from "@/types/task";
import { useDialogA11y } from "./use-dialog-a11y";

interface DeleteTaskDialogProps {
  task: Task | null;
  messages: TranslationMessages;
  onClose: () => void;
  onConfirm: (task: Task) => Promise<void>;
}

export function DeleteTaskDialog({
  task,
  messages,
  onClose,
  onConfirm,
}: DeleteTaskDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [isDeleting, setIsDeleting] = useState(false);

  useDialogA11y(Boolean(task), dialogRef, onClose);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!task) return;
    setIsDeleting(true);
    try {
      await onConfirm(task);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-[60] flex items-end justify-center bg-[#050611]/80 backdrop-blur-md sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="glass-panel w-full max-w-md rounded-t-[1.75rem] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[1.5rem] sm:p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-rose-400/12 text-rose-300 ring-1 ring-inset ring-rose-300/18">
                <TriangleAlert aria-hidden="true" size={21} />
              </div>
              <button
                type="button"
                aria-label={messages.deleteDialog.close}
                onClick={onClose}
                className="grid size-11 place-items-center rounded-xl text-[#9297b4] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <h2 id={titleId} className="mt-4 text-xl font-semibold tracking-[-0.025em] text-white">
              {messages.deleteDialog.title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#a1a6c1]">
              {interpolate(messages.deleteDialog.description, { title: task.title })}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                data-autofocus
                type="button"
                onClick={onClose}
                className="min-h-12 rounded-xl border border-white/[0.09] px-5 text-sm font-semibold text-[#c5c8da] transition hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
              >
                {messages.deleteDialog.cancel}
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(244,63,94,0.18)] transition hover:bg-rose-500 disabled:cursor-wait disabled:opacity-70 active:scale-[0.98]"
              >
                <Trash2 aria-hidden="true" size={17} />
                {messages.deleteDialog.confirm}
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
