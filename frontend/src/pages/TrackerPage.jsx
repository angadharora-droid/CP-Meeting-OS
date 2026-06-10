import { useState, useMemo } from 'react'
import { DateField } from '../components/DateTimePickers'

const P = {
  primary: 'min-h-[40px] px-4 py-[9px] rounded-xl bg-slate-700 text-white font-semibold text-[11px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-slate-800 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_rgba(15,23,42,0.10)]',
  ghost:   'min-h-[40px] px-4 py-[9px] rounded-xl bg-white text-slate-700 border border-slate-200 text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 font-medium',
}

const STATUS_STYLE = {
  Overdue: { badge: 'text-red-700 bg-red-50 border-red-200',       bar: 'bg-red-500',    text: 'text-red-600' },
  Done:    { badge: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  Open:    { badge: 'text-slate-600 bg-slate-100 border-slate-200',     bar: 'bg-slate-300',  text: 'text-slate-500' },
}

function toCSV(headers, rows) {
  const esc = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
}

function dlCSV(name, csv) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function toISODate(d) {
  if (!d || typeof d !== 'string') return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}` }
  return ''
}

function formatDateLabel(d) {
  const iso = toISODate(d)
  if (!iso) return d || ''
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

function meetingPurposeFrom(meeting) {
  if (!meeting) return ''
  return meeting.purpose || meeting.topics?.map((topic) => topic?.purpose || topic?.topic).filter(Boolean).join('; ') || ''
}

function taskMeetingPurpose(task, meetings = []) {
  const meeting = meetings.find((item) => item.meetingId === task.meetingId)
  return task.meetingPurpose || meetingPurposeFrom(meeting) || 'Not recorded'
}

function Initials({ name }) {
  const letters = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
      {letters}
    </div>
  )
}

function buildActionUpdateNotice(task, meetings = []) {
  const assignee = task.assignedTo || 'Team member'
  const meetingDate = formatDateLabel(task.meetingDate) || 'Not recorded'
  const dueDate = formatDateLabel(task.dueDate) || 'Not set'
  const meetingPurpose = taskMeetingPurpose(task, meetings)
  return [
    'Action Point Follow-up',
    '',
    `Dear ${assignee},`,
    '',
    'Please share an update on the action point assigned to you from the meeting below.',
    '',
    `Meeting purpose: ${meetingPurpose}`,
    `Date of meeting: ${meetingDate}`,
    `Due date: ${dueDate}`,
    `Current status: ${task.status || 'Open'}`,
    task.assignedToDesig ? `Designation: ${task.assignedToDesig}` : '',
    task.assignedToMobile ? `Mobile no.: ${task.assignedToMobile}` : '',
    '',
    'Action point:',
    task.task || 'Not specified',
    '',
    'Requested update:',
    'Please confirm the current progress, any blockers, and the expected completion date.',
  ].filter(Boolean).join('\n')
}

function HeaderSection({ header, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-3">
      <button
        type="button"
        className="flex items-center gap-3 text-left cursor-pointer bg-transparent border-none p-0 group"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-slate-400 transition-colors">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ color: '#94A3B8', transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[13px] font-bold text-slate-700 tracking-tight">{header}</span>
        <div className="flex-1 h-px bg-slate-200 group-hover:bg-slate-300 transition-colors" />
      </button>
      {open && <div className="grid gap-4 pl-4 sm:pl-[36px]">{children}</div>}
    </div>
  )
}

function MeetingGroup({ meetingTitle, meetingDate, taskCount, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="flex items-center gap-2 text-left cursor-pointer bg-transparent border-none p-0 group"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-5 h-5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-slate-300 transition-colors">
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" style={{ color: '#94A3B8', transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[12px] font-semibold text-slate-600 tracking-tight truncate">{meetingTitle}</span>
        {meetingDate && <span className="text-[10px] text-slate-400 font-mono shrink-0">{formatDateLabel(meetingDate)}</span>}
        <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
      </button>
      {open && <div className="grid gap-2 pl-5 sm:pl-7">{children}</div>}
    </div>
  )
}

function TaskCard({ task, app }) {
  const s = STATUS_STYLE[task.status] || STATUS_STYLE.Open
  const isDone = task.status === 'Done'
  const dueDateLabel = formatDateLabel(task.dueDate)
  return (
    <article className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={`h-[2px] ${s.bar} opacity-70`} />
      <div className="p-4 grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`m-0 font-semibold text-[14px] leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {task.task}
          </h3>
          <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.12em] font-bold rounded-full border ${s.badge}`}>
            {task.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {task.assignedTo ? (
            <>
              <Initials name={task.assignedTo} />
              <div>
                <div className="text-slate-900 text-[11px] font-medium">{task.assignedTo}</div>
                <div className="text-slate-500 text-[10px]">
                  {[task.assignedToDesig, task.assignedToMobile, dueDateLabel ? `Due ${dueDateLabel}` : 'No due date'].filter(Boolean).join(' - ')}
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-[11px]">Unassigned{dueDateLabel ? ` · Due ${dueDateLabel}` : ''}</div>
          )}
        </div>
        {!isDone && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            <button className={P.primary} onClick={() => app.markTask(task.taskId, 'Done')}>✓ Mark done</button>
            {task.status !== 'Overdue' && (
              <button
                className="min-h-[40px] px-4 py-[9px] rounded-xl bg-white text-red-700 border border-red-200 text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-red-300 hover:bg-red-50 font-semibold"
                onClick={() => app.markTask(task.taskId, 'Overdue')}
              >
                Flag overdue
              </button>
            )}
            {task.status === 'Overdue' && (
              <button className={P.ghost} onClick={() => app.markTask(task.taskId, 'Open')}>Reset to open</button>
            )}
            <button
              className={P.ghost}
              onClick={() => app.setPreview({ title: 'Action Update Notice', content: buildActionUpdateNotice(task, app.meetings) })}
            >
              Preview notice
            </button>
          </div>
        )}
        {isDone && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            <button className={P.ghost} onClick={() => app.markTask(task.taskId, 'Open')}>Reopen task</button>
            <button
              className={P.ghost}
              onClick={() => app.setPreview({ title: 'Action Update Notice', content: buildActionUpdateNotice(task, app.meetings) })}
            >
              Preview notice
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default function TrackerPage({ app }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  const filteredTasks = (app.visibleTasks || []).filter(t => {
    if (!fromDate && !toDate) return true
    const d = toISODate(t.dueDate) || toISODate(t.meetingDate)
    if (!d) return true
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  })

  const grouped = useMemo(() => {
    const meetingMap = new Map()
    filteredTasks.forEach(task => {
      const id = task.meetingId || '__none__'
      if (!meetingMap.has(id)) {
        const meeting = (app.meetings || []).find(m => m.meetingId === task.meetingId)
        meetingMap.set(id, {
          meetingId: id,
          meetingTitle: task.meetingTitle || meeting?.title || 'Unknown Meeting',
          meetingDate: task.meetingDate || meeting?.date || '',
          meetingHeader: meeting?.meetingHeader?.trim() || '',
          tasks: [],
        })
      }
      meetingMap.get(id).tasks.push(task)
    })

    const headerMap = new Map()
    meetingMap.forEach(meeting => {
      const h = meeting.meetingHeader
      if (!headerMap.has(h)) headerMap.set(h, [])
      headerMap.get(h).push(meeting)
    })

    const withHeader = []
    const noHeader = []
    headerMap.forEach((meetings, header) => {
      if (header) withHeader.push({ header, meetings })
      else noHeader.push(...meetings)
    })
    withHeader.sort((a, b) => a.header.localeCompare(b.header))

    return { withHeader, noHeader }
  }, [filteredTasks, app.meetings])

  function exportTasks() {
    const headers = ['Task', 'Status', 'Assigned To', 'Designation', 'Mobile', 'Due Date', 'Meeting', 'Meeting Date']
    const rows = filteredTasks.map(t => [
      t.task || '', t.status || '', t.assignedTo || '', t.assignedToDesig || '',
      t.assignedToMobile || '', formatDateLabel(t.dueDate), t.meetingTitle || '', formatDateLabel(t.meetingDate),
    ])
    dlCSV(`tracker-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows))
  }

  const total    = app.tasks?.length || 0
  const doneCount = app.tasks?.filter((t) => t.status === 'Done').length || 0
  const overdue  = app.tasks?.filter((t) => t.status === 'Overdue').length || 0
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const filterItems = [
    { key: 'all',     label: 'All',     count: total },
    { key: 'Open',    label: 'Open',    count: app.tasks?.filter((t) => t.status === 'Open').length    || 0 },
    { key: 'Overdue', label: 'Overdue', count: overdue },
    { key: 'Done',    label: 'Done',    count: doneCount },
  ]

  return (
    <section className="grid gap-4">

      {/* ── Hero ── */}
      <div className="p-5 border border-slate-200 bg-white rounded-2xl grid gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-slate-500 font-semibold">Centre Point Hospitality</p>
            <h1 className="m-0 font-bold text-[22px] text-slate-900 leading-tight tracking-tight">Tracker</h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[26px] font-bold text-slate-900 leading-none tabular-nums tracking-tight">{pct}%</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-[2px] font-semibold">complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-[6px] uppercase tracking-[0.1em] font-semibold">
            <span>{doneCount} of {total} done</span>
            {overdue > 0 && <span className="text-red-600">{overdue} overdue</span>}
          </div>
          <div className="h-[6px] rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-700 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Filter pills with counts ── */}
      <div className="flex gap-2 flex-wrap">
        {filterItems.map(({ key, label, count }) => (
          <button
            key={key}
            className={`flex items-center gap-[6px] px-4 py-[8px] rounded-xl border text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-all font-semibold ${
              app.taskFilter === key
                ? key === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200'
                : key === 'Done'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => app.setTaskFilter(key)}
          >
            {label}
            {count > 0 && (
              <span className="opacity-60 tabular-nums">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Date range + export ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:flex-1 sm:min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold sm:w-auto">From</span>
            <div className="flex-1 sm:min-w-[150px]">
              <DateField value={fromDate} onChange={setFromDate} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold sm:w-auto sm:text-slate-400 sm:tracking-normal">
              <span className="sm:hidden">To</span>
              <span className="hidden sm:inline">→</span>
            </span>
            <div className="flex-1 sm:min-w-[150px]">
              <DateField value={toDate} onChange={setToDate} />
            </div>
          </div>
          {(fromDate || toDate) && (
            <button
              className="self-start text-[11px] text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer sm:self-auto"
              onClick={() => { setFromDate(''); setToDate('') }}
            >✕ Clear dates</button>
          )}
        </div>
        <button
          onClick={exportTasks}
          disabled={!filteredTasks.length}
          className="w-full sm:w-auto shrink-0 min-h-[40px] px-4 py-[9px] rounded-xl bg-white text-slate-800 border border-slate-300 text-[10px] tracking-[0.08em] uppercase cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
        >
          Export CSV
        </button>
      </div>

      {/* ── Grouped task list ── */}
      {filteredTasks.length ? (
        <div className="grid gap-5">
          {grouped.withHeader.map(({ header, meetings }) => (
            <HeaderSection key={header} header={header}>
              {meetings.map(meeting => (
                <MeetingGroup
                  key={meeting.meetingId}
                  meetingTitle={meeting.meetingTitle}
                  meetingDate={meeting.meetingDate}
                  taskCount={meeting.tasks.length}
                >
                  {meeting.tasks.map(task => <TaskCard key={task.taskId} task={task} app={app} />)}
                </MeetingGroup>
              ))}
            </HeaderSection>
          ))}
          {grouped.noHeader.map(meeting => (
            <MeetingGroup
              key={meeting.meetingId}
              meetingTitle={meeting.meetingTitle}
              meetingDate={meeting.meetingDate}
              taskCount={meeting.tasks.length}
            >
              {meeting.tasks.map(task => <TaskCard key={task.taskId} task={task} app={app} />)}
            </MeetingGroup>
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-slate-300 rounded-2xl text-center leading-[1.6] bg-white/60">
          <div className="text-[32px] mb-3 text-slate-300 select-none">✓</div>
          <div className="text-slate-500 text-[12px] leading-[1.6]">
            {app.taskFilter === 'all'
              ? 'No action points yet. They appear here when you close a meeting.'
              : `No ${app.taskFilter.toLowerCase()} tasks.`}
          </div>
        </div>
      )}

    </section>
  )
}
