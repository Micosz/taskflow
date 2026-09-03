"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Cloud, RotateCcw } from "lucide-react";
import {
  applyDocumentLocale,
  getTranslations,
  persistLocale,
  readStoredLocale,
  type Locale,
} from "@/i18n";
import {
  getNextActiveTask,
  getTaskStats,
  getTaskViewCounts,
  selectTasks,
} from "@/features/tasks/task-selectors";
import { useTaskManager } from "@/features/tasks/use-task-manager";
import type { CreateTaskInput, Task, TaskView } from "@/types/task";
import { DashboardHeader } from "./dashboard-header";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { LoadingSkeleton } from "./loading-skeleton";
import { MobileNavigation } from "./mobile-navigation";
import { ProgressSummary } from "./progress-summary";
import { SettingsDialog } from "./settings-dialog";
import { Sidebar } from "./sidebar";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskList } from "./task-list";
import { Toast, type ToastMessage } from "./toast";
import { ViewSwitcher } from "./view-switcher";

export function TaskFlowApp() {
  const reduceMotion = useReducedMotion();
  const taskManager = useTaskManager();
  const [locale, setLocale] = useState<Locale>("en");
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<TaskView>("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const messages = getTranslations(locale);

  useEffect(() => {
    const storedLocale = readStoredLocale();
    applyDocumentLocale(storedLocale);
    const frame = window.requestAnimationFrame(() => {
      setLocale(storedLocale);
      setNow(new Date());
    });
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const handleLocaleChange = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    persistLocale(nextLocale);
    applyDocumentLocale(nextLocale);
  }, []);

  const referenceDate = useMemo(() => now ?? new Date(0), [now]);
  const counts = useMemo(
    () => getTaskViewCounts(taskManager.tasks, referenceDate),
    [referenceDate, taskManager.tasks],
  );
  const stats = useMemo(
    () => getTaskStats(taskManager.tasks, referenceDate),
    [referenceDate, taskManager.tasks],
  );
  const visibleTasks = useMemo(
    () => selectTasks(taskManager.tasks, view, searchQuery, referenceDate),
    [referenceDate, searchQuery, taskManager.tasks, view],
  );
  const nextTask = useMemo(() => getNextActiveTask(taskManager.tasks), [taskManager.tasks]);
  const categories = useMemo(
    () => [...new Set(taskManager.tasks.map((task) => task.category))].sort(),
    [taskManager.tasks],
  );

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback(
    (title: string, description: string, tone: ToastMessage["tone"] = "success") => {
      setToast({ id: Date.now(), title, description, tone });
    },
    [],
  );

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setFormRevision((revision) => revision + 1);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setFormRevision((revision) => revision + 1);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTask(null);
  }, []);

  const closeDeleteDialog = useCallback(() => setDeleteTarget(null), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const handleSave = async (input: CreateTaskInput) => {
    try {
      if (editingTask) {
        await taskManager.updateTask(editingTask.id, input);
        showToast(messages.toast.updated, messages.toast.updatedDescription);
      } else {
        await taskManager.createTask(input);
        showToast(messages.toast.created, messages.toast.createdDescription);
      }
      setFormOpen(false);
      setEditingTask(null);
    } catch {
      showToast(messages.toast.error, messages.toast.errorDescription, "error");
    }
  };

  const handleToggle = async (task: Task) => {
    if (busyTaskId) return;
    setBusyTaskId(task.id);
    try {
      await taskManager.toggleTask(task);
      showToast(
        task.completed ? messages.toast.restored : messages.toast.completed,
        task.completed ? messages.toast.restoredDescription : messages.toast.completedDescription,
      );
    } catch {
      showToast(messages.toast.error, messages.toast.errorDescription, "error");
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await taskManager.deleteTask(task.id);
      setDeleteTarget(null);
      showToast(messages.toast.deleted, messages.toast.deletedDescription);
    } catch {
      showToast(messages.toast.error, messages.toast.errorDescription, "error");
    }
  };

  const handleReset = async () => {
    try {
      await taskManager.resetTasks();
      showToast(messages.toast.reset, messages.toast.createdDescription);
    } catch {
      showToast(messages.toast.error, messages.toast.errorDescription, "error");
    }
  };

  const handleViewChange = useCallback((nextView: TaskView) => {
    setView(nextView);
    window.requestAnimationFrame(() => {
      document
        .getElementById("task-list")
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }, [reduceMotion]);

  const isReady = taskManager.status === "ready" && now !== null;

  return (
    <div className="app-canvas">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111329] transition focus:translate-y-0"
      >
        {messages.accessibility.skipToContent}
      </a>
      <div aria-hidden="true" className="ambient-orb -right-44 top-[-8rem] bg-violet-600/15" />
      <div aria-hidden="true" className="ambient-orb -bottom-44 -left-40 bg-cyan-500/[0.08] [animation-delay:-7s]" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1600px]">
        <Sidebar
          messages={messages}
          locale={locale}
          activeView={view}
          counts={counts}
          onViewChange={handleViewChange}
          onLocaleChange={handleLocaleChange}
          onAdd={openCreate}
          onSettings={() => setSettingsOpen(true)}
        />

        <main
          id="main-content"
          aria-label={messages.accessibility.mainContent}
          tabIndex={-1}
          className="app-main min-w-0 flex-1 pb-28 pt-5 sm:pt-7 lg:pb-12"
        >
          {now ? (
            <DashboardHeader
              messages={messages}
              locale={locale}
              view={view}
              now={now}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onLocaleChange={handleLocaleChange}
              onAdd={openCreate}
              onSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="h-48" aria-hidden="true" />
          )}

          <div className="mt-6">
            <ViewSwitcher
              view={view}
              counts={counts}
              locale={locale}
              messages={messages}
              onChange={handleViewChange}
            />
          </div>

          {!isReady ? (
            taskManager.status === "error" ? (
              <div className="glass-panel mt-6 rounded-[1.6rem] p-8 text-center">
                <RotateCcw aria-hidden="true" className="mx-auto text-rose-300" size={26} />
                <h2 className="mt-4 font-semibold text-white">{messages.toast.error}</h2>
                <p className="mt-2 text-sm text-[#9398b4]">{messages.toast.errorDescription}</p>
                <button
                  type="button"
                  onClick={taskManager.loadTasks}
                  className="mt-5 min-h-11 rounded-xl bg-violet-400/15 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/20"
                >
                  {messages.common.retry}
                </button>
              </div>
            ) : (
              <LoadingSkeleton className="mt-6" messages={messages} />
            )
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="mt-6"
              >
                <ProgressSummary
                  messages={messages}
                  locale={locale}
                  stats={{
                    completed: stats.completedToday,
                    total: stats.completedToday + stats.dueToday,
                    dueToday: stats.dueToday,
                    overdue: stats.overdue,
                    highPriority: stats.highPriority,
                  }}
                />

                <div className="mt-7 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_17rem]">
                  <TaskList
                    tasks={visibleTasks}
                    view={view}
                    searchQuery={searchQuery}
                    locale={locale}
                    messages={messages}
                    busyTaskId={busyTaskId}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onAdd={openCreate}
                    onClearSearch={() => setSearchQuery("")}
                  />

                  <aside className="hidden space-y-4 2xl:block">
                    <div className="glass-panel rounded-[1.45rem] p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-cyan-200/75">
                        <Cloud aria-hidden="true" size={14} />
                        {messages.app.localMode}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#9aa0bb]">
                        {messages.app.localModeDescription}
                      </p>
                      <div className="mt-4 h-px bg-white/[0.07]" />
                      <p className="mt-4 text-xs font-medium text-[#858ba8]">{messages.stats.focusProgress}</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white">
                        {nextTask?.title ?? messages.empty.upcomingTitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="w-full rounded-[1.45rem] border border-violet-300/10 bg-gradient-to-br from-violet-400/[0.08] to-cyan-300/[0.035] p-5 text-left transition hover:border-violet-300/20 hover:from-violet-400/[0.11]"
                    >
                      <p className="text-sm font-semibold text-white">{messages.pwa.installTitle}</p>
                      <p className="mt-2 text-xs leading-5 text-[#8f95b1]">{messages.pwa.installDescription}</p>
                    </button>
                  </aside>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <MobileNavigation
        messages={messages}
        locale={locale}
        activeView={view}
        counts={counts}
        onViewChange={handleViewChange}
        onAdd={openCreate}
      />

      <TaskFormDialog
        key={`task-form-${formRevision}`}
        open={formOpen}
        task={editingTask}
        categories={categories}
        messages={messages}
        onClose={closeForm}
        onSubmit={handleSave}
      />
      <DeleteTaskDialog
        task={deleteTarget}
        messages={messages}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
      />
      <SettingsDialog
        open={settingsOpen}
        locale={locale}
        messages={messages}
        onLocaleChange={handleLocaleChange}
        onReset={handleReset}
        onClose={closeSettings}
      />
      <Toast toast={toast} messages={messages} onDismiss={dismissToast} />
    </div>
  );
}
