"use client";

import { Cloud, Plus, Search, Settings2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { formatNumber, type Locale, type TranslationMessages } from "@/i18n";
import type { TaskStorageMode } from "@/data";
import type { TaskView } from "@/types/task";

import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";

interface NavigationItem {
  view: TaskView;
  label: keyof TranslationMessages["navigation"];
}

const navigationItems: readonly NavigationItem[] = [
  { view: "completed", label: "completed" },
];

export interface SidebarProps {
  messages: TranslationMessages;
  locale: Locale;
  activeView: TaskView;
  projectActive: boolean;
  onProjects: () => void;
  todoActive: boolean;
  onTodo: () => void;
  counts: Record<TaskView, number>;
  searchQuery: string;
  onViewChange: (view: TaskView) => void;
  onSearchChange: (query: string) => void;
  onLocaleChange: (locale: Locale) => void;
  onAdd: () => void;
  onSettings: () => void;
  onAccount: () => void;
  accountDetail: string;
  accountLabel: string;
  storageMode: TaskStorageMode;
  className?: string;
}

export function Sidebar({
  messages,
  locale,
  activeView,
  projectActive,
  onProjects,
  todoActive,
  onTodo,
  counts,
  searchQuery,
  onViewChange,
  onSearchChange,
  onLocaleChange,
  onAdd,
  onSettings,
  onAccount,
  accountDetail,
  accountLabel,
  storageMode,
  className = "",
}: SidebarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <aside className={`editorial-topbar ${className}`}>
      <button
        type="button"
        className="text-left outline-none focus-visible:ring-2 focus-visible:ring-[#a7b49c]"
        onClick={() => onViewChange("active")}
        aria-label={messages.navigation.active}
      >
        <Brand messages={messages} />
      </button>

      <nav aria-label={messages.accessibility.desktopNavigation} className="editorial-topbar__nav">
        <button type="button" className="editorial-nav-link" data-active={!todoActive && !projectActive && activeView === "active" || undefined} aria-current={!todoActive && !projectActive && activeView === "active" ? "page" : undefined} onClick={() => onViewChange("active")}>{messages.navigation.active}</button>
        <button type="button" className="editorial-nav-link" data-active={projectActive || undefined} aria-current={projectActive ? "page" : undefined} onClick={onProjects}>{locale === "th" ? "โปรเจกต์" : "Projects"}</button>
        {navigationItems.map(({ view, label }) => {
          const selected = !todoActive && !projectActive && view === activeView;
          const isAlert = view === "overdue" && counts.overdue > 0;

          return (
            <motion.button
              key={view}
              type="button"
              aria-current={selected ? "page" : undefined}
              className="editorial-nav-link"
              data-active={selected || undefined}
              data-alert={isAlert || undefined}
              onClick={() => onViewChange(view)}
              whileTap={reduceMotion ? undefined : { y: 1 }}
            >
              <span>{messages.navigation[label]}</span>
              {isAlert && (
                <span className="editorial-nav-count">{formatNumber(counts.overdue, locale)}</span>
              )}
            </motion.button>
          );
        })}
        <button type="button" className="editorial-nav-link" data-active={todoActive || undefined} aria-current={todoActive ? "page" : undefined} onClick={onTodo}>{messages.todo.title}</button>
      </nav>

      <label className="editorial-search editorial-topbar__search" hidden={todoActive || projectActive}>
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

      <div className="editorial-topbar__actions">
        <motion.button
          type="button"
          className="editorial-add-button"
          onClick={onAdd}
          whileHover={reduceMotion ? undefined : { y: -1 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        >
          <Plus aria-hidden="true" size={18} strokeWidth={1.6} />
          <span>{todoActive ? messages.todo.add : messages.header.addTask}</span>
        </motion.button>

        <button
          type="button"
          aria-label={messages.auth.openAccount}
          title={accountDetail}
          onClick={onAccount}
          className="editorial-account-button"
        >
          <Cloud aria-hidden="true" size={18} strokeWidth={1.45} />
          <span>{accountLabel}</span>
          <span
            aria-hidden="true"
            className="editorial-account-status"
            data-cloud={storageMode === "cloud" || undefined}
          />
        </button>

        <LanguageSwitcher
          compact
          locale={locale}
          messages={messages}
          onLocaleChange={onLocaleChange}
        />

        <button
          type="button"
          aria-label={messages.navigation.settings}
          onClick={onSettings}
          className="editorial-icon-button"
        >
          <Settings2 aria-hidden="true" size={18} strokeWidth={1.45} />
        </button>
      </div>
    </aside>
  );
}
