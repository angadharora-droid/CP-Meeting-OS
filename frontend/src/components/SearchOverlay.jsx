import { useEffect, useRef } from 'react'
import { getMeetingCallerLabel, toDateLabel } from '../lib/meetingOs'

function StatusPill({ status }) {
  const styles = {
    Closed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Postponed: 'text-amber-700 bg-amber-50 border-amber-200',
    Cancelled: 'text-red-700 bg-red-50 border-red-200',
    Open: 'text-slate-600 bg-slate-100 border-slate-200',
    Overdue: 'text-red-700 bg-red-50 border-red-200',
    Done: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  }
  return (
    <span className={`shrink-0 rounded-full border px-[8px] py-[3px] text-[9px] font-bold uppercase tracking-[0.1em] ${styles[status] || styles.Open}`}>
      {status}
    </span>
  )
}

function Initials({ name }) {
  const letters = (name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700">
      {letters}
    </div>
  )
}

function ResultRow({ onClick, children }) {
  return (
    <button
      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left cursor-pointer transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Section({ title, count, children }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">{title}</span>
        <span className="text-[10px] text-slate-400 font-medium">{count}</span>
      </div>
      {children}
    </div>
  )
}

export default function SearchOverlay({ open, query, onQueryChange, onClose, meetings, tasks, people, navigate }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const hasResults = meetings.length || tasks.length || people.length
  const total = meetings.length + tasks.length + people.length

  return (
    <div className="fixed inset-0 z-[900] bg-slate-900/30 backdrop-blur-md animate-fade-in">
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-[720px] p-4 pb-10">
          <div className="sticky top-0 z-10 mb-4 pt-1">
            <div className="surface-panel flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700">Search</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Meetings, action points, people..."
                className="h-auto min-h-0 flex-1 border-none bg-transparent p-0 text-[14px] text-slate-900 shadow-none outline-none placeholder:text-slate-400"
              />
              <div className="flex shrink-0 items-center gap-2">
                {query && total > 0 && (
                  <span className="hidden text-[10px] text-slate-400 sm:inline">{total} result{total !== 1 ? 's' : ''}</span>
                )}
                <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-[3px] font-mono text-[9px] text-slate-500 sm:block">ESC</kbd>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-[6px] text-[11px] text-slate-500 cursor-pointer transition-colors hover:border-slate-300 hover:text-slate-700"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {!query && (
            <div className="surface-muted rounded-3xl px-6 py-16 text-center">
              <p className="m-0 text-[13px] text-slate-500">Start typing to search meetings, action points, and people.</p>
              <p className="m-0 mt-2 text-[11px] text-slate-400">Use Ctrl K from anywhere in Meeting OS.</p>
            </div>
          )}

          {query && !hasResults && (
            <div className="surface-muted rounded-3xl px-6 py-16 text-center">
              <p className="m-0 text-[13px] text-slate-500">No results for "<span className="text-slate-900 font-medium">{query}</span>"</p>
            </div>
          )}

          {query && hasResults && (
            <div className="grid gap-5">
              {meetings.length > 0 && (
                <Section title="Meetings" count={meetings.length}>
                  {meetings.slice(0, 6).map((m) => (
                    <ResultRow key={m.meetingId} onClick={() => { navigate?.('/bank'); onClose() }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold leading-snug text-slate-900">{m.title}</div>
                          <div className="mt-[4px] flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{m.date ? toDateLabel(m.date) : 'Date not set'}</span>
                            <span className="text-slate-300">/</span>
                            <span>{getMeetingCallerLabel(m, null)}</span>
                          </div>
                        </div>
                        <StatusPill status={m.status} />
                      </div>
                    </ResultRow>
                  ))}
                </Section>
              )}

              {tasks.length > 0 && (
                <Section title="Action Points" count={tasks.length}>
                  {tasks.slice(0, 6).map((t) => (
                    <ResultRow key={t.taskId} onClick={() => { navigate?.('/tracker'); onClose() }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{t.task}</div>
                          <div className="mt-[4px] flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{t.assignedTo || 'Unassigned'}</span>
                            {t.dueDate ? <><span className="text-slate-300">/</span><span>Due {t.dueDate}</span></> : null}
                          </div>
                        </div>
                        <StatusPill status={t.status} />
                      </div>
                    </ResultRow>
                  ))}
                </Section>
              )}

              {people.length > 0 && (
                <Section title="People" count={people.length}>
                  {people.slice(0, 6).map((p) => (
                    <ResultRow key={p.id} onClick={() => { navigate?.('/people'); onClose() }}>
                      <div className="flex items-center gap-3">
                        <Initials name={p.name} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-slate-900">{p.name}</div>
                          <div className="truncate text-[11px] text-slate-500">{p.desig || p.email || ''}</div>
                        </div>
                      </div>
                    </ResultRow>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
