import { useState } from 'react'
import { DateField } from '../components/DateTimePickers'

const P = {
  primary: 'min-h-[40px] px-4 py-[9px] rounded-xl bg-[#AACC33] text-black font-bold text-[11px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-[#BADA44] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed',
  ghost:   'min-h-[40px] px-4 py-[9px] rounded-xl bg-transparent text-[#F0F0F0] border border-[#222] text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#3a3a3a] hover:bg-white/[0.02]',
}

const STATUS_STYLE = {
  Overdue: { badge: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/20', bar: 'bg-[#FF5A5A]', text: 'text-[#FF5A5A]' },
  Done:    { badge: 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/20', bar: 'bg-[#AACC33]', text: 'text-[#AACC33]' },
  Open:    { badge: 'text-white/30 bg-white/[0.04] border-white/[0.07]',   bar: 'bg-[#2a2a2a]', text: 'text-white/40' },
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
    <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-[10px] font-bold text-[#555] shrink-0">
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

export default function TrackerPage({ app }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  const filteredTasks = (app.visibleTasks || []).filter(t => {
    if (!fromDate && !toDate) return true
    const d = toISODate(t.dueDate) || toISODate(t.meetingDate)
    if (!d) return true
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  })

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
      <div className="p-5 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl grid gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#333]">Centre Point Hospitality</p>
            <h1 className="m-0 font-bold text-[22px] text-[#F0F0F0] leading-tight">Tracker</h1>
            <p className="m-0 mt-[6px] text-[#3a3a3a] text-[12px] leading-[1.6]">
              Keep open action points visible and mark them complete.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[26px] font-black text-[#F0F0F0] leading-none tabular-nums">{pct}%</div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-[#2e2e2e] mt-[2px]">complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-[#2e2e2e] mb-[6px] uppercase tracking-[0.1em]">
            <span>{doneCount} of {total} done</span>
            {overdue > 0 && <span className="text-[#FF5A5A]/60">{overdue} overdue</span>}
          </div>
          <div className="h-[6px] rounded-full bg-[#141414] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#AACC33] shadow-[0_0_8px_rgba(170,204,51,0.4)] transition-all duration-500"
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
            className={`flex items-center gap-[6px] px-4 py-[8px] rounded-xl border text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-all ${
              app.taskFilter === key
                ? key === 'Overdue' ? 'bg-[#FF5A5A]/10 text-[#FF5A5A] border-[#FF5A5A]/25'
                : key === 'Done'    ? 'bg-[#AACC33]/10 text-[#AACC33] border-[#AACC33]/25'
                : 'bg-white/[0.04] text-white/50 border-white/[0.08]'
                : 'bg-transparent text-[#3a3a3a] border-[#1e1e1e] hover:border-[#2e2e2e] hover:text-[#666]'
            }`}
            onClick={() => app.setTaskFilter(key)}
          >
            {label}
            {count > 0 && (
              <span className="opacity-50 tabular-nums">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Date range + export ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#2e2e2e] shrink-0">From</span>
          <div className="flex-1 min-w-[180px]">
            <DateField value={fromDate} onChange={setFromDate} />
          </div>
          <span className="text-[#252525] shrink-0">→</span>
          <div className="flex-1 min-w-[180px]">
            <DateField value={toDate} onChange={setToDate} />
          </div>
          {(fromDate || toDate) && (
            <button
              className="text-[11px] text-[#333] hover:text-[#666] transition-colors shrink-0 cursor-pointer"
              onClick={() => { setFromDate(''); setToDate('') }}
            >✕</button>
          )}
        </div>
        <button
          onClick={exportTasks}
          disabled={!filteredTasks.length}
          className="shrink-0 min-h-[36px] px-4 py-[7px] rounded-xl bg-transparent text-[#AACC33]/60 border border-[#AACC33]/20 text-[10px] tracking-[0.08em] uppercase cursor-pointer transition-all hover:bg-[#AACC33]/[0.06] hover:text-[#AACC33] hover:border-[#AACC33]/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      {/* ── Task list ── */}
      {filteredTasks.length ? (
        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const s = STATUS_STYLE[task.status] || STATUS_STYLE.Open
            const isDone = task.status === 'Done'
            const dueDateLabel = formatDateLabel(task.dueDate)
            return (
              <article key={task.taskId} className="border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl overflow-hidden">
                {/* Status indicator bar */}
                <div className={`h-[2px] ${s.bar} opacity-70`} />

                <div className="p-4 grid gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={`m-0 font-semibold text-[14px] leading-snug ${isDone ? 'line-through text-[#333]' : 'text-[#F0F0F0]'}`}>
                        {task.task}
                      </h3>
                      <p className="m-0 mt-[4px] text-[#2e2e2e] text-[11px] truncate">{task.meetingTitle || 'From meeting'}</p>
                    </div>
                    <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.12em] font-semibold rounded-full border ${s.badge}`}>
                      {task.status}
                    </span>
                  </div>

                  {/* Assignee & due date */}
                  <div className="flex items-center gap-3">
                    {task.assignedTo ? (
                      <>
                        <Initials name={task.assignedTo} />
                        <div>
                          <div className="text-[#555] text-[11px] font-medium">{task.assignedTo}</div>
                          <div className="text-[#2e2e2e] text-[10px]">
                            {[task.assignedToDesig, task.assignedToMobile, dueDateLabel ? `Due ${dueDateLabel}` : 'No due date'].filter(Boolean).join(' - ')}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-[#2e2e2e] text-[11px]">
                        Unassigned{dueDateLabel ? ` · Due ${dueDateLabel}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isDone && (
                    <div className="flex gap-2 pt-1 border-t border-[#161616]">
                      <button className={P.primary} onClick={() => app.markTask(task.taskId, 'Done')}>
                        ✓ Mark done
                      </button>
                      {task.status !== 'Overdue' && (
                        <button
                          className="min-h-[40px] px-4 py-[9px] rounded-xl bg-transparent text-[#FF5A5A]/70 border border-[#FF5A5A]/15 text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#FF5A5A]/30 hover:text-[#FF5A5A]"
                          onClick={() => app.markTask(task.taskId, 'Overdue')}
                        >
                          Flag overdue
                        </button>
                      )}
                      {task.status === 'Overdue' && (
                        <button className={P.ghost} onClick={() => app.markTask(task.taskId, 'Open')}>
                          Reset to open
                        </button>
                      )}
                      <button
                        className={P.ghost}
                        onClick={() => app.setPreview({
                          title: 'Action Update Notice',
                          content: buildActionUpdateNotice(task, app.meetings),
                        })}
                      >
                        Preview notice
                      </button>
                    </div>
                  )}
                  {isDone && (
                    <div className="flex gap-2 pt-1 border-t border-[#161616]">
                      <button className={P.ghost} onClick={() => app.markTask(task.taskId, 'Open')}>
                        Reopen task
                      </button>
                      <button
                        className={P.ghost}
                        onClick={() => app.setPreview({
                          title: 'Action Update Notice',
                          content: buildActionUpdateNotice(task, app.meetings),
                        })}
                      >
                        Preview notice
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-[#1e1e1e] rounded-2xl text-[#2e2e2e] text-[12px] text-center leading-[1.6]">
          <div className="text-[32px] mb-3 opacity-30 select-none">✓</div>
          {app.taskFilter === 'all'
            ? 'No action points yet. They appear here when you close a meeting.'
            : `No ${app.taskFilter.toLowerCase()} tasks.`}
        </div>
      )}

    </section>
  )
}
