import { motion, useReducedMotion } from "motion/react";
import { Plus, Search, Settings2, X } from "lucide-react";
import {
  getGreetingPeriod,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import { formatLongDate } from "@/lib/date";
import type { TaskView } from "@/types/task";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";

interface DashboardHeaderProps {
  messages: TranslationMessages;
  locale: Locale;
  view: TaskView;
  now: Date;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLocaleChange: (locale: Locale) => void;
  onAdd: () => void;
  onSettings: () => void;
}

const viewHeadingKeys: Record<
  TaskView,
  { title: keyof TranslationMessages["header"]; subtitle: keyof TranslationMessages["header"] }
> = {
  today: { title: "todayTitle", subtitle: "todaySubtitle" },
  upcoming: { title: "upcomingTitle", subtitle: "upcomingSubtitle" },
  overdue: { title: "overdueTitle", subtitle: "overdueSubtitle" },
  completed: { title: "completedTitle", subtitle: "completedSubtitle" },
  all: { title: "allTitle", subtitle: "allSubtitle" },
};

export function DashboardHeader({
  messages,
  locale,
  view,
  now,
  searchQuery,
  onSearchChange,
  onLocaleChange,
  onAdd,
  onSettings,
}: DashboardHeaderProps) {
  const reduceMotion = useReducedMotion();
  const heading = viewHeadingKeys[view];
  const greetingPeriod = getGreetingPeriod(now);

  return (
    <header>
      <div className="safe-top flex items-center justify-between gap-3 lg:hidden">
        <Brand messages={messages} />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact messages={messages} locale={locale} onLocaleChange={onLocaleChange} />
          <button
            type="button"
            onClick={onSettings}
            aria-label={messages.navigation.settings}
            className="grid size-11 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#9ba0bc] backdrop-blur-xl transition hover:bg-white/[0.07] hover:text-white active:scale-95"
          >
            <Settings2 aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mt-0">
        <motion.div
          key={`${locale}-${view}`}
          initial={reduceMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300/80">
            {messages.greeting[greetingPeriod]}
          </p>
          <h1 className="mt-2 max-w-2xl text-[1.8rem] font-semibold leading-[1.12] tracking-[-0.045em] text-white sm:text-[2.15rem] xl:text-[2.4rem]">
            {messages.header[heading.title]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#969bb7]">
            {messages.header[heading.subtitle]}
          </p>
          <p className="mt-3 text-xs font-medium text-[#6f7594]">{formatLongDate(now, locale)}</p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onAdd}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="button-sheen relative hidden min-h-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-r from-[#907cff] via-[#7564f5] to-[#4bbbd8] px-5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(96,76,225,0.3)] transition hover:brightness-110 lg:inline-flex lg:items-center lg:gap-2"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            <Plus aria-hidden="true" size={18} />
            {messages.header.addTask}
          </span>
        </motion.button>
      </div>

      <label className="relative mt-6 block sm:max-w-md lg:mt-7">
        <span className="sr-only">{messages.header.searchLabel}</span>
        <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#777d9a]" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={messages.header.searchPlaceholder}
          className="min-h-12 w-full rounded-2xl border border-white/[0.075] bg-white/[0.035] py-3 pl-11 pr-11 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none backdrop-blur-lg transition placeholder:text-[#7f85a3] hover:border-white/[0.12] focus:border-violet-300/40 focus:bg-white/[0.05] focus:ring-4 focus:ring-violet-400/[0.08] sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label={messages.header.clearSearch}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-[#7f85a2] transition hover:bg-white/[0.06] hover:text-white"
          >
            <X aria-hidden="true" size={15} />
          </button>
        )}
      </label>
    </header>
  );
}
