import { useEffect, useRef } from 'react'
import { getMeetingCallerLabel, toDateLabel } from '../lib/meetingOs'

function StatusPill({ status }) {
  const styles = {
    Closed:    'text-[#AACC33] bg-[#AACC33]/10',
    Postponed: 'text-[#8fb339] bg-[#8fb339]/10',
    Cancelled: 'text-[#FF5A5A] bg-[#FF5A5A]/10',
    Open:      'text-white/35 bg-white/4',
    Overdue:   'text-[#FF5A5A] bg-[#FF5A5A]/10',
    Done:      'text-[#AACC33] bg-[#AACC33]/10',
  }
  return (
    <span className={`shrink-0 px-[7px] py-[2px] rounded text-[9px] uppercase tracking-[0.1em] font-semibold ${styles[status] || styles.Open}`}>
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
    <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-[11px] font-bold text-[#AACC33] shrink-0">
      {letters}
    </div>
  )
}

function ResultRow({ onClick, children }) {
  return (
    <button
      className="w-full text-left p-3 rounded-xl bg-[#0f0f0f] border border-[#222] hover:border-[#333] hover:bg-[#141414] active:scale-[0.99] transition-all cursor-pointer"
      onClick={onClick}
    >
      {children}
    </button>
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
    <div className="fixed inset-0 z-[900] bg-black/88 backdrop-blur-sm animate-fade-in">
      <div className="h-full overflow-auto">
        <div className="max-w-[700px] mx-auto p-4 pb-10">

          {/* Search bar */}
          <div className="sticky top-0 z-10 mb-4 pt-1">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d0d] border border-[#252525] rounded-2xl shadow-2xl">
              <span className="text-[#444] text-[18px] leading-none shrink-0">⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search meetings, tasks, people…"
                className="flex-1 bg-transparent border-none text-[#F0F0F0] text-[14px] placeholder:text-[#333] outline-none min-h-0 h-auto p-0 shadow-none"
              />
              <div className="flex items-center gap-2 shrink-0">
                {query && total > 0 && (
                  <span className="text-[10px] text-[#444] whitespace-nowrap">{total} result{total !== 1 ? 's' : ''}</span>
                )}
                <kbd className="hidden sm:block px-2 py-[3px] rounded-md bg-[#171717] border border-[#222] text-[9px] text-[#3a3a3a] font-mono">ESC</kbd>
                <button
                  className="px-3 py-[6px] rounded-lg bg-white/4 border border-white/8 text-[#555] text-[11px] cursor-pointer hover:text-[#aaa] hover:border-white/15 transition-colors"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Empty state — no query */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-[42px] mb-4 opacity-20 select-none">⌕</div>
              <p className="text-[#444] text-[13px] m-0">Start typing to search across all meetings, tasks, and people</p>
              <p className="text-[#333] text-[11px] m-0 mt-2">Tip: use ⌘K anywhere to open this</p>
            </div>
          )}

          {/* No results */}
          {query && !hasResults && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-[42px] mb-4 opacity-15 select-none">◎</div>
              <p className="text-[#444] text-[13px] m-0">No results for "<span className="text-[#666]">{query}</span>"</p>
            </div>
          )}

          {/* Results */}
          {query && hasResults && (
            <div className="grid gap-5">

              {/* Meetings */}
              {meetings.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="uppercase tracking-[0.18em] text-[0.68rem] text-[#AACC33] font-semibold">Meetings</span>
                    <span className="text-[10px] text-[#333]">{meetings.length}</span>
                  </div>
                  {meetings.slice(0, 6).map((m) => (
                    <ResultRow key={m.meetingId} onClick={() => { navigate?.('/bank'); onClose() }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[#F0F0F0] text-[13px] font-medium leading-snug truncate">{m.title}</div>
                          <div className="text-[#444] text-[11px] mt-[3px] flex items-center gap-1">
                            {m.date ? toDateLabel(m.date) : ''}
                            <><span className="text-[#2a2a2a]">·</span>{getMeetingCallerLabel(m, null)}</>
                          </div>
                        </div>
                        <StatusPill status={m.status} />
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="uppercase tracking-[0.18em] text-[0.68rem] text-[#AACC33] font-semibold">Action Points</span>
                    <span className="text-[10px] text-[#333]">{tasks.length}</span>
                  </div>
                  {tasks.slice(0, 6).map((t) => (
                    <ResultRow key={t.taskId} onClick={() => { navigate?.('/tracker'); onClose() }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[#F0F0F0] text-[13px] font-medium leading-snug line-clamp-2">{t.task}</div>
                          <div className="text-[#444] text-[11px] mt-[3px] flex items-center gap-1">
                            {t.assignedTo ? `→ ${t.assignedTo}` : 'Unassigned'}
                            {t.dueDate ? <><span className="text-[#2a2a2a]">·</span>Due {t.dueDate}</> : ''}
                          </div>
                        </div>
                        <StatusPill status={t.status} />
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}

              {/* People */}
              {people.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="uppercase tracking-[0.18em] text-[0.68rem] text-[#AACC33] font-semibold">People</span>
                    <span className="text-[10px] text-[#333]">{people.length}</span>
                  </div>
                  {people.slice(0, 6).map((p) => (
                    <ResultRow key={p.id} onClick={() => { navigate?.('/people'); onClose() }}>
                      <div className="flex items-center gap-3">
                        <Initials name={p.name} />
                        <div className="min-w-0">
                          <div className="text-[#F0F0F0] text-[13px] font-medium truncate">{p.name}</div>
                          <div className="text-[#444] text-[11px] truncate">{p.desig || p.email || ''}</div>
                        </div>
                      </div>
                    </ResultRow>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
