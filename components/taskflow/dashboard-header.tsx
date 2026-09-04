import { motion, useReducedMotion } from "motion/react";
import { Search, Settings2, X } from "lucide-react";
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
  onSettings: () => void;
}

const viewHeadingKeys: Record<
  TaskView,
  { title: keyof TranslationMessages["header"]; subtitle: keyof TranslationMessages["header"] }
> = {
  active: { title: "activeTitle", subtitle: "activeSubtitle" },
  today: { title: "todayTitle", subtitle: "todaySubtitle" },
  upcoming: { title: "upcomingTitle", subtitle: "upcomingSubtitle" },
  overdue: { title: "overdueTitle", subtitle: "overdueSubtitle" },
  completed: { title: "completedTitle", subtitle: "completedSubtitle" },
};

export function DashboardHeader({
  messages,
  locale,
  view,
  now,
  searchQuery,
  onSearchChange,
  onLocaleChange,
  onSettings,
}: DashboardHeaderProps) {
  const reduceMotion = useReducedMotion();
  const heading = viewHeadingKeys[view];
  const greetingPeriod = getGreetingPeriod(now);

  return (
    <header className="editorial-dashboard-header">
      <div className="safe-top flex items-center justify-between gap-3 lg:hidden">
        <Brand messages={messages} />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact messages={messages} locale={locale} onLocaleChange={onLocaleChange} />
          <button
            type="button"
            onClick={onSettings}
            aria-label={messages.navigation.settings}
            className="editorial-icon-button"
          >
            <Settings2 aria-hidden="true" size={18} strokeWidth={1.45} />
          </button>
        </div>
      </div>

      <motion.div
        key={`${locale}-${view}`}
        className="mt-9 lg:hidden"
        initial={reduceMotion ? false : { opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
      >
        <p className="editorial-kicker">{messages.greeting[greetingPeriod]}</p>
        <h1 className="mt-3 max-w-2xl text-[2.25rem] font-normal leading-[1.03] tracking-[-0.055em] text-[#f1efe7] sm:text-[3rem]">
          {messages.header[heading.title]}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#8f938d]">
          {messages.header[heading.subtitle]}
        </p>
        <p className="mt-4 text-xs text-[#6f746e]">{formatLongDate(now, locale)}</p>
      </motion.div>

      <div className="editorial-search-row">
        <label className="editorial-search">
          <span className="sr-only">{messages.header.searchLabel}</span>
          <Search aria-hidden="true" size={18} strokeWidth={1.45} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={messages.header.searchPlaceholder}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={messages.header.clearSearch}
            >
              <X aria-hidden="true" size={15} />
            </button>
          )}
        </label>
      </div>
    </header>
  );
}
