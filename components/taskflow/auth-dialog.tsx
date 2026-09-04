import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, Cloud, LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";

import type {
  AuthErrorCode,
  AuthSubmissionResult,
} from "@/features/auth/use-auth-session";
import { TaskFlowAuthError } from "@/features/auth/use-auth-session";
import type { TranslationMessages } from "@/i18n";

import { useDialogA11y } from "./use-dialog-a11y";

type AuthMode = "sign_in" | "sign_up";

interface AuthDialogProps {
  messages: TranslationMessages;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<AuthSubmissionResult>;
  onSignUp: (email: string, password: string) => Promise<AuthSubmissionResult>;
  open: boolean;
}

const authErrorKeys: Record<
  AuthErrorCode,
  keyof TranslationMessages["auth"]
> = {
  email_not_confirmed: "emailNotConfirmed",
  invalid_credentials: "invalidCredentials",
  rate_limited: "rateLimited",
  unknown: "genericError",
  user_exists: "userExists",
  weak_password: "weakPassword",
};

export function AuthDialog({
  messages,
  onClose,
  onSignIn,
  onSignUp,
  open,
}: AuthDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const resetAndClose = useCallback(() => {
    if (submitting) return;
    setError(null);
    setEmail("");
    setMode("sign_in");
    setPassword("");
    setConfirmationRequired(false);
    onClose();
  }, [onClose, submitting]);

  useDialogA11y(open, dialogRef, resetAndClose);

  const switchMode = () => {
    setMode((current) => (current === "sign_in" ? "sign_up" : "sign_in"));
    setError(null);
    setConfirmationRequired(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(messages.auth.emailRequired);
      return;
    }
    if (!password) {
      setError(messages.auth.passwordRequired);
      return;
    }
    if (mode === "sign_up" && password.length < 6) {
      setError(messages.auth.passwordTooShort);
      return;
    }

    setSubmitting(true);
    try {
      const result =
        mode === "sign_in"
          ? await onSignIn(email, password)
          : await onSignUp(email, password);
      if (result.confirmationRequired) {
        setConfirmationRequired(true);
        setPassword("");
      } else {
        resetAndClose();
      }
    } catch (caught) {
      const code =
        caught instanceof TaskFlowAuthError ? caught.code : "unknown";
      setError(messages.auth[authErrorKeys[code]]);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "sign_in" ? messages.auth.signInTitle : messages.auth.signUpTitle;
  const description =
    mode === "sign_in"
      ? messages.auth.signInSubtitle
      : messages.auth.signUpSubtitle;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-[70] flex items-end justify-center bg-[#050611]/80 backdrop-blur-md sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resetAndClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="modal-sheet glass-panel relative w-full max-w-md overflow-y-auto rounded-t-[1.8rem] p-5 sm:rounded-[1.8rem] sm:p-7"
            initial={reduceMotion ? false : { opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
          >
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <button
              data-autofocus
              type="button"
              aria-label={messages.auth.close}
              disabled={submitting}
              onClick={resetAndClose}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-xl text-[#969bb8] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50 sm:right-5 sm:top-5"
            >
              <X aria-hidden="true" size={20} />
            </button>

            {confirmationRequired ? (
              <div className="py-7 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-200 ring-1 ring-inset ring-emerald-300/20">
                  <CheckCircle2 aria-hidden="true" size={27} />
                </span>
                <h2 id={titleId} className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
                  {messages.auth.checkEmailTitle}
                </h2>
                <p id={descriptionId} className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#989db8]">
                  {messages.auth.checkEmailDescription}
                </p>
                <button
                  type="button"
                  onClick={switchMode}
                  className="mt-6 min-h-11 rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
                >
                  {messages.auth.signIn}
                </button>
              </div>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-400/20 to-cyan-300/10 text-violet-100 ring-1 ring-inset ring-white/10">
                  <Cloud aria-hidden="true" size={23} />
                </span>
                <h2 id={titleId} className="mt-5 pr-12 text-2xl font-semibold tracking-[-0.03em] text-white">
                  {title}
                </h2>
                <p id={descriptionId} className="mt-2 pr-5 text-sm leading-6 text-[#989db8]">
                  {description}
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                  <label className="block">
                    <span className="text-xs font-semibold text-[#c9cce0]">{messages.auth.emailLabel}</span>
                    <span className="relative mt-2 block">
                      <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737997]" size={17} />
                      <input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={messages.auth.emailPlaceholder}
                        disabled={submitting}
                        className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/15 py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-[#676d8b] focus:border-violet-300/40 focus:ring-4 focus:ring-violet-400/[0.08] disabled:opacity-60 sm:text-sm"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#c9cce0]">{messages.auth.passwordLabel}</span>
                    <span className="relative mt-2 block">
                      <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737997]" size={17} />
                      <input
                        type="password"
                        autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={messages.auth.passwordPlaceholder}
                        disabled={submitting}
                        className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/15 py-3 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-[#676d8b] focus:border-violet-300/40 focus:ring-4 focus:ring-violet-400/[0.08] disabled:opacity-60 sm:text-sm"
                      />
                    </span>
                    {mode === "sign_up" ? (
                      <span className="mt-1.5 block text-[11px] text-[#747a99]">{messages.auth.passwordHint}</span>
                    ) : null}
                  </label>

                  {error ? (
                    <p role="alert" className="rounded-xl border border-rose-300/15 bg-rose-400/[0.07] px-3.5 py-3 text-xs leading-5 text-rose-100">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b74f6] to-[#4aaecb] px-5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(94,76,220,0.25)] transition hover:brightness-110 active:scale-[0.985] disabled:cursor-wait disabled:opacity-65"
                  >
                    {submitting ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={17} />
                    ) : (
                      <ArrowRight aria-hidden="true" size={17} />
                    )}
                    {submitting
                      ? messages.auth.submitting
                      : mode === "sign_in"
                        ? messages.auth.submitSignIn
                        : messages.auth.submitSignUp}
                  </button>
                </form>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={switchMode}
                  className="mt-4 min-h-11 w-full rounded-xl text-xs font-semibold text-violet-200 transition hover:bg-violet-400/[0.06] hover:text-white disabled:opacity-50"
                >
                  {mode === "sign_in"
                    ? messages.auth.switchToSignUp
                    : messages.auth.switchToSignIn}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
