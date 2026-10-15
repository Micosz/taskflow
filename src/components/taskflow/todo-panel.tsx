"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { localTodoRepository } from "@/data/local-todo-repository";
import { SupabaseTodoRepository } from "@/data/supabase-todo-repository";
import { useTodoManager } from "@/features/todos/use-todo-manager";
import type { Locale, TranslationMessages } from "@/i18n";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";
import type { Todo } from "@/types/todo";
import { LanguageSwitcher } from "./language-switcher";

export function TodoPanel({ userId, client, enabled, locale, messages, onLocaleChange, onSettings }: {
  userId: string | null; client: TaskFlowSupabaseClient | null; enabled: boolean;
  locale: Locale; messages: TranslationMessages; onLocaleChange: (locale: Locale) => void; onSettings: () => void;
}) {
  const repository = useMemo(() => userId && client ? new SupabaseTodoRepository(userId, client) : localTodoRepository, [userId, client]);
  const manager = useTodoManager({ enabled, repository, scopeKey: userId && client ? `cloud:${userId}` : "local" });
  const copy = messages.todo;
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guestTodos, setGuestTodos] = useState<Todo[]>([]);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    const update = (items: readonly Todo[]) => { if (active) setGuestTodos([...items]); };
    void localTodoRepository.getTodos().then(update).catch(() => { if (active) setError(copy.storageError); });
    const unsubscribe = localTodoRepository.subscribe(update);
    return () => { active = false; unsubscribe(); };
  }, [copy.storageError]);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return false;
    setBusy(true); setError(""); setNotice("");
    try { await action(); return true; } catch { setError(copy.failure); return false; } finally { setBusy(false); }
  };
  const visible = manager.todos.filter((item) => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const unfinished = visible.filter((item) => !item.completed);
  const completed = visible.filter((item) => item.completed);
  const migrate = () => run(async () => {
    if (!(repository instanceof SupabaseTodoRepository)) return;
    const snapshot = await localTodoRepository.getTodos();
    await repository.importTodos(snapshot);
    await localTodoRepository.removeImported(snapshot);
    await manager.loadTodos();
    setNotice(copy.importSuccess);
  });
  const renderRow = (item: Todo) => <TodoRow key={item.id} item={item} busy={busy} messages={messages}
    onUpdate={(value) => run(() => manager.updateTodo(item.id, value))}
    onDelete={() => run(() => manager.deleteTodo(item.id))} />;
  return (
    <section aria-labelledby="todo-heading" className="mx-auto w-full max-w-3xl py-5 sm:py-8 lg:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div><h1 id="todo-heading" className="text-3xl font-medium tracking-tight text-[#f1efe7]">{copy.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#b4bdb0]">{copy.subtitle}</p>
          <p className="mt-3 text-xs text-[#b7c3ac]">{copy.remaining.replace("{count}", String(manager.todos.filter((item) => !item.completed).length))}</p>
        </div>
        <div className="flex items-center gap-2 lg:hidden"><LanguageSwitcher compact locale={locale} messages={messages} onLocaleChange={onLocaleChange} />
          <button type="button" className="editorial-icon-button" onClick={onSettings} aria-label={messages.navigation.settings}><Settings2 size={18} /></button>
        </div>
      </header>
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#ef654a]/30 bg-[#ef654a]/10 p-3 text-sm text-[#ffa18e]">{error}</p>}
      {notice && <p role="status" className="mb-4 text-sm text-[#b7c3ac]">{notice}</p>}
      {repository instanceof SupabaseTodoRepository && guestTodos.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#9aaa91]/25 p-4">
          <p className="text-sm text-[#b4bdb0]">{copy.localItems.replace("{count}", String(guestTodos.length))}</p>
          <button type="button" disabled={busy || manager.status !== "ready"} onClick={migrate} className="min-h-10 rounded-lg border border-[#9aaa91]/50 px-3 text-sm text-[#b7c3ac] disabled:opacity-50">{copy.import}</button>
        </div>
      )}
      <form onSubmit={(event) => { event.preventDefault(); void run(async () => { await manager.createTodo({ title }); setTitle(""); document.getElementById("todo-title")?.focus(); }); }}>
        <label htmlFor="todo-title" className="mb-2 block text-sm text-[#b4bdb0]">{copy.inputLabel}</label>
        <div className="flex gap-2"><input id="todo-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} autoComplete="off"
          placeholder={copy.placeholder} className="form-field min-w-0 flex-1 rounded-xl" disabled={busy || manager.status !== "ready"} />
          <button type="submit" disabled={busy || !title.trim() || manager.status !== "ready"} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#b7c3ac] px-4 text-sm font-semibold text-[#1b2418] disabled:opacity-50"><Plus size={16} aria-hidden="true" />{copy.add}</button>
        </div>
      </form>
      <label className="mt-5 block"><span className="sr-only">{copy.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="w-full border-b border-white/15 bg-transparent py-3 text-sm text-[#f1efe7] placeholder:text-[#b4bdb0]" /></label>
      {manager.status === "loading" && <div aria-label={copy.loading} className="mt-5 space-y-3">{[0,1,2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}</div>}
      {manager.status === "error" && <div role="alert" className="py-8"><p className="text-sm text-[#ffa18e]">{copy.failure}</p><button type="button" onClick={manager.loadTodos} className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-sm">{messages.common.retry}</button></div>}
      {manager.status === "ready" && <>
        <ul className="mt-4 space-y-2" aria-label={copy.pending}>{unfinished.map(renderRow)}</ul>
        {visible.length === 0 && <div className="py-12 text-center"><CheckCheck aria-hidden="true" size={30} className="mx-auto text-[#9aaa91]" /><p className="mt-4 text-[#f1efe7]">{query ? copy.noResults : copy.empty}</p><p className="mt-2 text-sm text-[#b4bdb0]">{query ? copy.searchHint : copy.emptyHint}</p></div>}
        {completed.length > 0 && <details className="mt-7"><summary className="cursor-pointer rounded-lg py-3 text-sm text-[#b4bdb0]">{copy.completed} ({completed.length})</summary><ul className="mt-2 space-y-2">{completed.map(renderRow)}</ul></details>}
      </>}
    </section>
  );
}

function TodoRow({ item, busy, messages, onUpdate, onDelete }: {
  item: Todo; busy: boolean; messages: TranslationMessages;
  onUpdate: (input: { title?: string; completed?: boolean }) => Promise<boolean>; onDelete: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const copy = messages.todo;
  return <li className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
    {editing ? <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void onUpdate({ title: draft }).then((saved) => { if (saved) setEditing(false); }); }}>
      <label className="sr-only" htmlFor={`edit-${item.id}`}>{copy.edit}</label><input autoFocus id={`edit-${item.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={240} className="form-field min-w-0 flex-1 rounded-lg" onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }} />
      <button type="submit" disabled={busy || !draft.trim()} className="rounded-lg bg-[#b7c3ac] px-3 text-sm font-semibold text-[#1b2418]">{messages.common.save}</button>
      <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border border-white/20 px-3 text-sm">{messages.common.cancel}</button>
    </form> : <div className="flex items-start gap-3">
      <label className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-[#9aaa91] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#b7c3ac]">
        <input type="checkbox" checked={item.completed} disabled={busy} onChange={() => void onUpdate({ completed: !item.completed })} aria-label={copy.toggle.replace("{title}", item.title)} className="absolute inset-0 cursor-pointer opacity-0" />
        {item.completed && <Check size={16} aria-hidden="true" className="text-[#b7c3ac]" />}
      </label>
      <p className={`min-w-0 flex-1 break-words text-sm leading-6 ${item.completed ? "text-[#b4bdb0] line-through" : "text-[#f1efe7]"}`}>{item.title}</p>
      <button type="button" disabled={busy} onClick={() => { setDraft(item.title); setEditing(true); }} aria-label={`${copy.edit}: ${item.title}`} className="rounded-lg p-2 text-[#b4bdb0] hover:bg-white/5"><Pencil size={15} /></button>
      <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} aria-label={`${copy.remove}: ${item.title}`} className="rounded-lg p-2 text-[#b4bdb0] hover:bg-white/5"><Trash2 size={15} /></button>
    </div>}
    {confirmDelete && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span>{copy.confirmDelete}</span><button type="button" disabled={busy} onClick={() => void onDelete()} className="rounded-lg px-3 py-2 text-[#ffa18e]">{copy.remove}</button><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2">{messages.common.cancel}</button></div>}
  </li>;
}
