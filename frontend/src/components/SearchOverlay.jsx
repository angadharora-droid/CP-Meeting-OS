import { useEffect, useRef } from 'react'
import { getMeetingCallerLabel, toDateLabel } from '../lib/meetingOs'

function StatusPill({ status }) {
  const styles = {
    Closed: 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/15',
    Postponed: 'text-[#8fb339] bg-[#8fb339]/10 border-[#8fb339]/15',
    Cancelled: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/15',
    Open: 'text-white/40 bg-white/[0.04] border-white/[0.07]',
    Overdue: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/15',
    Done: 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/15',
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold text-[#AACC33]">
      {letters}
    </div>
  )
}

function ResultRow({ onClick, children }) {
  return (
    <button
      className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-left cursor-pointer transition-all hover:border-white/[0.13] hover:bg-white/[0.045] active:scale-[0.99]"
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
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#AACC33]">{title}</span>
        <span className="text-[10px] text-white/28">{count}</span>
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
    <div className="fixed inset-0 z-[900] bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-[720px] p-4 pb-10">
          <div className="sticky top-0 z-10 mb-4 pt-1">
            <div className="surface-panel flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[#AACC33]">Search</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Meetings, action points, people..."
                className="h-auto min-h-0 flex-1 border-none bg-transparent p-0 text-[14px] text-[#F0F0F0] shadow-none outline-none placeholder:text-white/22"
              />
              <div className="flex shrink-0 items-center gap-2">
                {query && total > 0 && (
                  <span className="hidden text-[10px] text-white/32 sm:inline">{total} result{total !== 1 ? 's' : ''}</span>
                )}
                <kbd className="hidden rounded-md border border-white/[0.08] bg-black/25 px-2 py-[3px] font-mono text-[9px] text-white/32 sm:block">ESC</kbd>
                <button
                  className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-[6px] text-[11px] text-white/48 cursor-pointer transition-colors hover:border-white/[0.15] hover:text-white/80"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {!query && (
            <div className="surface-muted rounded-3xl px-6 py-16 text-center">
              <p className="m-0 text-[13px] text-white/48">Start typing to search meetings, action points, and people.</p>
              <p className="m-0 mt-2 text-[11px] text-white/28">Use Ctrl K from anywhere in Meeting OS.</p>
            </div>
          )}

          {query && !hasResults && (
            <div className="surface-muted rounded-3xl px-6 py-16 text-center">
              <p className="m-0 text-[13px] text-white/48">No results for "<span className="text-white/70">{query}</span>"</p>
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
                          <div className="truncate text-[13px] font-semibold leading-snug text-[#F0F0F0]">{m.title}</div>
                          <div className="mt-[4px] flex items-center gap-2 text-[11px] text-white/42">
                            <span>{m.date ? toDateLabel(m.date) : 'Date not set'}</span>
                            <span className="text-white/15">/</span>
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
                          <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#F0F0F0]">{t.task}</div>
                          <div className="mt-[4px] flex items-center gap-2 text-[11px] text-white/42">
                            <span>{t.assignedTo || 'Unassigned'}</span>
                            {t.dueDate ? <><span className="text-white/15">/</span><span>Due {t.dueDate}</span></> : null}
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
                          <div className="truncate text-[13px] font-semibold text-[#F0F0F0]">{p.name}</div>
                          <div className="truncate text-[11px] text-white/42">{p.desig || p.email || ''}</div>
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
