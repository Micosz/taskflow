import { useCallback, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Cloud,
  Database,
  Languages,
  LogIn,
  LogOut,
  Share,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { TaskStorageMode } from "@/data";
import { formatNumber, type Locale, type TranslationMessages } from "@/i18n";
import { useDialogA11y } from "./use-dialog-a11y";

interface SettingsDialogProps {
  open: boolean;
  locale: Locale;
  messages: TranslationMessages;
  onLocaleChange: (locale: Locale) => void;
  onClose: () => void;
  authConfigured: boolean;
  accountDetail: string;
  accountLabel: string;
  isSigningOut: boolean;
  onOpenAuth: () => void;
  onSignOut: () => Promise<void>;
  onManageCourses: () => void;
  courseCount: number;
  storageMode: TaskStorageMode;
  userEmail: string | null;
}

export function SettingsDialog({
  open,
  locale,
  messages,
  onLocaleChange,
  onClose,
  authConfigured,
  accountDetail,
  accountLabel,
  isSigningOut,
  onOpenAuth,
  onSignOut,
  onManageCourses,
  courseCount,
  storageMode,
  userEmail,
}: SettingsDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useDialogA11y(open, dialogRef, handleClose);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-50 flex items-end justify-center bg-[#050611]/75 backdrop-blur-md sm:items-center sm:py-8"
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
            className="modal-sheet glass-panel w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] p-5 sm:rounded-[1.75rem] sm:p-7"
            initial={reduceMotion ? false : { opacity: 0, y: 38, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
          >
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                  {messages.settings.title}
                </h2>
                <p id={descriptionId} className="mt-1 text-sm text-[#989db8]">
                  {messages.settings.subtitle}
                </p>
              </div>
              <button
                data-autofocus
                type="button"
                aria-label={messages.settings.close}
                onClick={handleClose}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[#969bb8] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-3.5">
              <section className="rounded-2xl border border-white/[0.075] bg-black/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-200">
                    <UserRound aria-hidden="true" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{messages.auth.accountTitle}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#d9dbea]">{accountLabel}</p>
                    <p className="mt-1 break-all text-xs leading-5 text-[#8f94b1]">
                      {storageMode === "cloud"
                        ? userEmail ?? messages.auth.signedIn
                        : accountDetail}
                    </p>
                    {storageMode === "cloud" ? (
                      <button
                        type="button"
                        disabled={isSigningOut}
                        onClick={() => void onSignOut()}
                        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] px-3.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/[0.1] disabled:cursor-wait disabled:opacity-55"
                      >
                        <LogOut aria-hidden="true" size={15} />
                        {isSigningOut ? messages.auth.signingOut : messages.auth.signOut}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!authConfigured}
                        onClick={onOpenAuth}
                        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <LogIn aria-hidden="true" size={15} />
                        {messages.auth.signIn}
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.075] bg-black/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/12 text-violet-200">
                    <BookOpen aria-hidden="true" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{messages.settings.coursesTitle}</h3>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#b4b8cf]">
                        {formatNumber(courseCount, locale)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#8f94b1]">{messages.settings.coursesDescription}</p>
                    <button
                      type="button"
                      onClick={onManageCourses}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/15"
                    >
                      <BookOpen aria-hidden="true" size={15} />
                      {messages.settings.manageCourses}
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.075] bg-black/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/12 text-violet-200">
                    <Languages aria-hidden="true" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{messages.settings.languageTitle}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#8f94b1]">{messages.settings.languageDescription}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={messages.language.selectorLabel}>
                      {(["en", "th"] as Locale[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={locale === option}
                          onClick={() => onLocaleChange(option)}
                          className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.98] ${
                            locale === option
                              ? "border-violet-300/30 bg-violet-400/15 text-violet-100"
                              : "border-white/[0.07] bg-white/[0.025] text-[#969bb6] hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          {option === "en" ? messages.language.english : messages.language.thai}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.075] bg-black/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-200">
                    <Database aria-hidden="true" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">{messages.settings.dataTitle}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#8f94b1]">
                      {storageMode === "cloud"
                        ? messages.settings.cloudDataDescription
                        : messages.settings.dataDescription}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.075] bg-black/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-200">
                    <Cloud aria-hidden="true" size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{messages.settings.syncTitle}</h3>
                      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200 ring-1 ring-inset ring-emerald-300/15">
                        {storageMode === "cloud"
                          ? messages.settings.syncActiveStatus
                          : messages.settings.syncStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#8f94b1]">
                      {storageMode === "cloud"
                        ? messages.settings.syncActiveDescription
                        : messages.settings.syncDescription}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-[#747a99]">
                      <ShieldCheck aria-hidden="true" size={14} className="text-emerald-300/70" />
                      {messages.app.syncReady}
                    </div>
                  </div>
                </div>
              </section>

              {(isIOS || isStandalone) && (
                <section className="rounded-2xl border border-violet-300/10 bg-violet-400/[0.04] p-4">
                  <div className="flex gap-3">
                    <Share aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-violet-200" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{messages.pwa.installTitle}</h3>
                      <p className="mt-1 text-xs leading-5 text-[#979cb8]">
                        {isStandalone ? messages.pwa.standaloneReady : messages.pwa.iosInstruction}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
