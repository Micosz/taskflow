"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import {
  applyDocumentLocale,
  formatNumber,
  getTranslations,
  interpolate,
  persistLocale,
  readStoredLocale,
  type Locale,
} from "@/i18n";
import {
  createSessionCourseRepositorySelection,
  createWorkspaceMigrationFingerprint,
  createSessionTaskRepositorySelection,
  isTaskMigrationDismissed,
  localWorkspaceMigrationSource,
  migrateLocalWorkspaceToCloud,
  persistTaskMigrationDismissal,
  readLocalWorkspaceMigrationData,
} from "@/data";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { useCourseManager } from "@/features/courses/use-course-manager";
import {
  getTaskViewCounts,
  selectPreviewTask,
  selectTaskById,
  selectTasks,
} from "@/features/tasks/task-selectors";
import { useTaskManager } from "@/features/tasks/use-task-manager";
import { DEFAULT_TASK_VIEW, type CreateTaskInput, type Task, type TaskView } from "@/types/task";
import { DashboardHeader } from "./dashboard-header";
import { AuthDialog } from "./auth-dialog";
import { CourseManagementDialog } from "./course-management-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { LoadingSkeleton } from "./loading-skeleton";
import { MobileNavigation } from "./mobile-navigation";
import { LocalTaskMigrationDialog } from "./local-task-migration-dialog";
import { FocusHero } from "./focus-hero";
import { SettingsDialog } from "./settings-dialog";
import { Sidebar } from "./sidebar";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskList } from "./task-list";
import { TaskCalendar } from "./task-calendar";
import { Toast, type ToastMessage } from "./toast";
import { TodoPanel } from "./todo-panel";
import { ViewSwitcher } from "./view-switcher";

export function TaskFlowApp() {
  const reduceMotion = useReducedMotion();
  const auth = useAuthSession();
  const authenticatedUserId = auth.client && auth.user ? auth.user.id : null;
  const repositorySelection = useMemo(
    () => createSessionTaskRepositorySelection(authenticatedUserId, auth.client),
    [auth.client, authenticatedUserId],
  );
  const courseRepositorySelection = useMemo(
    () => createSessionCourseRepositorySelection(authenticatedUserId, auth.client),
    [auth.client, authenticatedUserId],
  );
  const taskManager = useTaskManager({
    enabled: auth.isInitialized,
    repository: repositorySelection.repository,
    scopeKey: repositorySelection.scopeKey,
  });
  const courseManager = useCourseManager({
    enabled: auth.isInitialized,
    repository: courseRepositorySelection.repository,
    scopeKey: courseRepositorySelection.scopeKey,
  });
  const [locale, setLocale] = useState<Locale>("en");
  const [now, setNow] = useState<Date | null>(null);
  const [uiScopeKey, setUiScopeKey] = useState(repositorySelection.scopeKey);
  const [selectedView, setSelectedView] = useState<TaskView>(DEFAULT_TASK_VIEW);
  const [selectedSearchQuery, setSelectedSearchQuery] = useState("");
  const [section, setSection] = useState<"tasks" | "todo">("tasks");
  const [formOpen, setFormOpen] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [returnToDetailTaskId, setReturnToDetailTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courseManagerOpen, setCourseManagerOpen] = useState(false);
  const [courseManagerReturnToForm, setCourseManagerReturnToForm] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [migrationOffer, setMigrationOffer] = useState<{
    taskCount: number;
    courseCount: number;
    fingerprint: string;
    userId: string;
  } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const checkedMigrationUserRef = useRef<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const messages = getTranslations(locale);
  const scopeIsCurrent = uiScopeKey === repositorySelection.scopeKey;
  const view = scopeIsCurrent ? selectedView : DEFAULT_TASK_VIEW;
  const searchQuery = scopeIsCurrent ? selectedSearchQuery : "";

  useEffect(() => {
    const userId = auth.user?.id ?? null;
    if (
      auth.status !== "signed_in" ||
      !userId ||
      repositorySelection.mode !== "cloud"
    ) {
      checkedMigrationUserRef.current = null;
      return;
    }
    if (checkedMigrationUserRef.current === userId) return;
    checkedMigrationUserRef.current = userId;

    let active = true;
    void readLocalWorkspaceMigrationData(localWorkspaceMigrationSource).then((data) => {
      if (!active || (data.tasks.length === 0 && data.courses.length === 0)) return;
      const fingerprint = createWorkspaceMigrationFingerprint(data);
      if (!isTaskMigrationDismissed(userId, fingerprint)) {
        setMigrationOffer({
          taskCount: data.tasks.length,
          courseCount: data.courses.length,
          fingerprint,
          userId,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [auth.status, auth.user?.id, repositorySelection.mode]);

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
  const visibleTasks = useMemo(
    () => selectTasks(taskManager.tasks, view, searchQuery, referenceDate),
    [referenceDate, searchQuery, taskManager.tasks, view],
  );
  const detailTask = useMemo(
    () => scopeIsCurrent ? selectTaskById(taskManager.tasks, detailTaskId) : null,
    [detailTaskId, scopeIsCurrent, taskManager.tasks],
  );
  const focusTask = useMemo(
    () => selectPreviewTask(visibleTasks, previewTaskId),
    [previewTaskId, visibleTasks],
  );
  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback(
    (title: string, description: string, tone: ToastMessage["tone"] = "success") => {
      setToast({ id: Date.now(), title, description, tone });
    },
    [],
  );

  const activateUiScope = useCallback(() => {
    if (uiScopeKey === repositorySelection.scopeKey) return;
    setUiScopeKey(repositorySelection.scopeKey);
    setSelectedView(DEFAULT_TASK_VIEW);
    setSelectedSearchQuery("");
    setFormOpen(false);
    setEditingTask(null);
    setDeleteTarget(null);
    setDetailTaskId(null);
    setPreviewTaskId(null);
    setReturnToDetailTaskId(null);
  }, [repositorySelection.scopeKey, uiScopeKey]);

  const openCreate = useCallback(() => {
    activateUiScope();
    setEditingTask(null);
    setFormRevision((revision) => revision + 1);
    setFormOpen(true);
  }, [activateUiScope]);

  const openEdit = useCallback((task: Task) => {
    activateUiScope();
    setEditingTask(task);
    setFormRevision((revision) => revision + 1);
    setFormOpen(true);
  }, [activateUiScope]);

  const openDetail = useCallback((task: Task) => {
    activateUiScope();
    setDetailTaskId(task.id);
  }, [activateUiScope]);

  const selectPreview = useCallback((task: Task) => {
    activateUiScope();
    setPreviewTaskId(task.id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        document.querySelector(".editorial-focus")?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  }, [activateUiScope, reduceMotion]);

  const openDelete = useCallback((task: Task) => {
    activateUiScope();
    setDeleteTarget(task);
  }, [activateUiScope]);

  const openEditFromDetail = useCallback((task: Task) => {
    setReturnToDetailTaskId(task.id);
    setDetailTaskId(null);
    setEditingTask(task);
    setFormRevision((revision) => revision + 1);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTask(null);
    if (returnToDetailTaskId) setDetailTaskId(returnToDetailTaskId);
    setReturnToDetailTaskId(null);
  }, [returnToDetailTaskId]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
    if (returnToDetailTaskId) setDetailTaskId(returnToDetailTaskId);
    setReturnToDetailTaskId(null);
  }, [returnToDetailTaskId]);
  const openDeleteFromDetail = useCallback((task: Task) => {
    setReturnToDetailTaskId(task.id);
    setDetailTaskId(null);
    setDeleteTarget(task);
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openAuth = useCallback(() => {
    if (!auth.configured) return;
    setSettingsOpen(false);
    setAuthOpen(true);
  }, [auth.configured]);

  const openCourseManagerFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setCourseManagerReturnToForm(false);
    setCourseManagerOpen(true);
  }, []);

  const openCourseManagerFromForm = useCallback(() => {
    setFormOpen(false);
    setCourseManagerReturnToForm(true);
    setCourseManagerOpen(true);
  }, []);

  const closeCourseManager = useCallback(() => {
    setCourseManagerOpen(false);
    if (courseManagerReturnToForm) setFormOpen(true);
    setCourseManagerReturnToForm(false);
  }, [courseManagerReturnToForm]);

  const handleSave = async (input: CreateTaskInput) => {
    try {
      if (editingTask) {
        const updatedTask = await taskManager.updateTask(editingTask.id, input);
        if (returnToDetailTaskId === editingTask.id) {
          setDetailTaskId(updatedTask.id);
        }
        showToast(messages.toast.updated, messages.toast.updatedDescription);
      } else {
        await taskManager.createTask(input);
        showToast(messages.toast.created, messages.toast.createdDescription);
      }
      setFormOpen(false);
      setEditingTask(null);
      setReturnToDetailTaskId(null);
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
      setReturnToDetailTaskId(null);
      showToast(messages.toast.deleted, messages.toast.deletedDescription);
    } catch {
      showToast(messages.toast.error, messages.toast.errorDescription, "error");
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setFormOpen(false);
    setEditingTask(null);
    setDeleteTarget(null);
    setDetailTaskId(null);
    setReturnToDetailTaskId(null);
    setMigrationOffer(null);
    setCourseManagerOpen(false);
    try {
      await auth.signOut();
      setSettingsOpen(false);
    } catch {
      showToast(messages.toast.error, messages.auth.genericError, "error");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleMigrate = async () => {
    if (
      !migrationOffer ||
      repositorySelection.mode !== "cloud" ||
      !repositorySelection.migrationTarget ||
      courseRepositorySelection.mode !== "cloud" ||
      !courseRepositorySelection.migrationTarget
    ) {
      return;
    }

    setIsMigrating(true);
    try {
      const result = await migrateLocalWorkspaceToCloud(
        localWorkspaceMigrationSource,
        {
          tasks: repositorySelection.migrationTarget,
          courses: courseRepositorySelection.migrationTarget,
        },
      );
      setMigrationOffer(null);
      await Promise.all([taskManager.loadTasks(), courseManager.loadCourses()]);
      showToast(
        messages.migration.success,
        interpolate(messages.migration.successDescription, {
          taskCount: formatNumber(result.taskCount, locale),
          courseCount: formatNumber(result.courseCount, locale),
        }),
      );
    } catch {
      showToast(
        messages.migration.failure,
        messages.migration.failureDescription,
        "error",
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const handleKeepLocal = () => {
    if (migrationOffer) {
      persistTaskMigrationDismissal(
        migrationOffer.userId,
        migrationOffer.fingerprint,
      );
    }
    setMigrationOffer(null);
  };

  const handleViewChange = useCallback((nextView: TaskView) => {
    setSection("tasks");
    activateUiScope();
    setSelectedView(nextView);
    setPreviewTaskId(null);
    window.requestAnimationFrame(() => {
      document
        .getElementById(nextView === "active" ? "main-content" : "task-list")
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }, [activateUiScope, reduceMotion]);

  const handleSearchChange = useCallback((query: string) => {
    activateUiScope();
    setSelectedSearchQuery(query);
    setPreviewTaskId(null);
  }, [activateUiScope]);

  const isReady =
    auth.isInitialized && taskManager.status === "ready" && now !== null;
  const accountLabel =
    auth.status === "loading"
      ? messages.auth.initializing
      : repositorySelection.mode === "cloud"
        ? messages.auth.signedIn
        : messages.auth.guestMode;
  const accountDetail =
    auth.status === "error"
      ? messages.auth.sessionError
      : repositorySelection.mode === "cloud"
      ? auth.user?.email ?? messages.app.cloudModeDescription
      : auth.configured
        ? messages.auth.guestDescription
        : messages.auth.unavailable;
  const migrationOpen =
    migrationOffer !== null &&
    auth.status === "signed_in" &&
    migrationOffer.userId === auth.user?.id;

  return (
    <div className="app-canvas">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111329] transition focus:translate-y-0"
      >
        {messages.accessibility.skipToContent}
      </a>
      <div className="app-shell mx-auto min-h-[100dvh] w-full max-w-[1680px]">
        <Sidebar
          messages={messages}
          locale={locale}
          activeView={view}
          todoActive={section === "todo"}
          onTodo={() => setSection("todo")}
          counts={counts}
          searchQuery={searchQuery}
          onViewChange={handleViewChange}
          onSearchChange={handleSearchChange}
          onLocaleChange={handleLocaleChange}
          onAdd={section === "todo" ? () => document.getElementById("todo-title")?.focus() : openCreate}
          onSettings={() => setSettingsOpen(true)}
          onAccount={() =>
            repositorySelection.mode === "cloud"
              ? setSettingsOpen(true)
              : openAuth()
          }
          accountDetail={accountDetail}
          accountLabel={accountLabel}
          storageMode={repositorySelection.mode}
        />

        <main
          id="main-content"
          aria-label={messages.accessibility.mainContent}
          tabIndex={-1}
          className="app-main min-w-0 pb-28 pt-5 sm:pt-7 lg:pb-0 lg:pt-0"
        >
          {section === "todo" ? <TodoPanel key={repositorySelection.scopeKey}
            userId={authenticatedUserId} client={auth.client} enabled={auth.isInitialized}
            locale={locale} messages={messages} onLocaleChange={handleLocaleChange} onSettings={() => setSettingsOpen(true)} /> : <>
          {now ? (
            <DashboardHeader
              messages={messages}
              locale={locale}
              view={view}
              now={now}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onLocaleChange={handleLocaleChange}
              onSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="h-48 lg:hidden" aria-hidden="true" />
          )}

          <div className="mt-6 lg:hidden">
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
                className="editorial-workspace mt-6 lg:mt-0"
              >
                {now && (
                  <FocusHero
                    task={focusTask}
                    now={now}
                    locale={locale}
                    messages={messages}
                    busy={focusTask?.id === busyTaskId}
                    onOpen={openDetail}
                    onToggle={handleToggle}
                  />
                )}

                <div className="editorial-planner">
                  {view === "active" && now && (
                    <TaskCalendar
                      key={repositorySelection.scopeKey}
                      tasks={taskManager.tasks}
                      now={now}
                      locale={locale}
                      messages={messages}
                      onOpen={openDetail}
                    />
                  )}
                  <TaskList
                    tasks={visibleTasks}
                    view={view}
                    searchQuery={searchQuery}
                    locale={locale}
                    messages={messages}
                    busyTaskId={busyTaskId}
                    selectedTaskId={focusTask?.id ?? null}
                    onSelect={selectPreview}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={openDelete}
                    onAdd={openCreate}
                    onClearSearch={() => handleSearchChange("")}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
          </>}
        </main>
      </div>

      <MobileNavigation
        messages={messages}
        locale={locale}
        activeView={view}
        todoActive={section === "todo"}
        onTodo={() => setSection("todo")}
        counts={counts}
        onViewChange={handleViewChange}
        onAdd={section === "todo" ? () => document.getElementById("todo-title")?.focus() : openCreate}
      />

      <TaskFormDialog
        key={`task-form-${formRevision}`}
        open={scopeIsCurrent && formOpen}
        task={scopeIsCurrent ? editingTask : null}
        courses={courseManager.courses}
        courseStatus={courseManager.status}
        messages={messages}
        onClose={closeForm}
        onManageCourses={openCourseManagerFromForm}
        onSubmit={handleSave}
      />
      <TaskDetailDialog
        task={detailTask}
        locale={locale}
        messages={messages}
        busy={detailTask?.id === busyTaskId}
        onClose={() => setDetailTaskId(null)}
        onEdit={openEditFromDetail}
        onToggle={handleToggle}
        onDelete={openDeleteFromDetail}
      />
      <DeleteTaskDialog
        task={scopeIsCurrent ? deleteTarget : null}
        messages={messages}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
      />
      <SettingsDialog
        open={settingsOpen}
        locale={locale}
        messages={messages}
        onLocaleChange={handleLocaleChange}
        onClose={closeSettings}
        authConfigured={auth.configured}
        accountDetail={accountDetail}
        accountLabel={accountLabel}
        isSigningOut={isSigningOut}
        courseCount={courseManager.courses.length}
        onManageCourses={openCourseManagerFromSettings}
        onOpenAuth={openAuth}
        onSignOut={handleSignOut}
        storageMode={repositorySelection.mode}
        userEmail={auth.user?.email ?? null}
      />
      <CourseManagementDialog
        key={`course-manager-${courseRepositorySelection.scopeKey}`}
        open={courseManagerOpen}
        courses={courseManager.courses}
        status={courseManager.status}
        messages={messages}
        onClose={closeCourseManager}
        onCreate={courseManager.createCourse}
        onUpdate={courseManager.updateCourse}
        onDelete={courseManager.deleteCourse}
        onRetry={courseManager.loadCourses}
        onNotify={showToast}
      />
      <AuthDialog
        open={authOpen}
        messages={messages}
        onClose={() => setAuthOpen(false)}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
      />
      <LocalTaskMigrationDialog
        open={migrationOpen}
        taskCount={migrationOffer?.taskCount ?? 0}
        courseCount={migrationOffer?.courseCount ?? 0}
        isMigrating={isMigrating}
        locale={locale}
        messages={messages}
        onKeepLocal={handleKeepLocal}
        onLater={() => setMigrationOffer(null)}
        onMigrate={handleMigrate}
      />
      <Toast toast={toast} messages={messages} onDismiss={dismissToast} />
    </div>
  );
}
