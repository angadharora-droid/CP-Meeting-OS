import { getMeetingCallerLabel, toDateLabel } from '../lib/meetingOs'
import { useRef, useState } from 'react'
import { DateField, TimeField } from '../components/DateTimePickers'
import NewMeetingPage from './NewMeetingPage'

const P = {
  primary:  'w-full min-h-[48px] px-5 py-[13px] rounded-xl bg-slate-700 text-white font-semibold text-[13px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.10)]',
  ghost:    'w-full min-h-[44px] px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-200 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed',
  danger:   'bg-transparent border-none text-red-500 text-[11px] tracking-[0.08em] uppercase cursor-pointer p-0 transition-colors hover:text-red-700 font-semibold',
  input:    'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  select:   'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-slate-500 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%2394A3B8\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9',
  textarea: 'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none appearance-none resize-y min-h-[80px] leading-[1.6] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  card:     'p-4 grid gap-4 border border-slate-200 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  label:    'flex flex-col gap-[6px] text-[11px] tracking-[0.15em] uppercase text-slate-500 font-semibold',
  secHead:  'flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-700 font-semibold',
}

function SecHead({ n, children }) {
  return (
    <div className={P.secHead}>
      {n && <span className="text-slate-400 font-mono">{n}</span>}
      {n && <span className="text-slate-300">/</span>}
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className={P.label}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function CloseMeetingPage({ app }) {
  const [postponeForm, setPostponeForm] = useState({ date: '', time: '', reason: '' })
  const [cancelReason, setCancelReason] = useState('')
  const actionPointsRef = useRef(null)
  const followupModalApp = app.followupDraft
    ? {
        ...app,
        meetingForm: app.followupDraft,
        setMeetingForm: app.setFollowupDraft,
        editingMeetingId: 'followup-draft',
        followupMode: true,
        generateMeeting: app.saveFollowupDraftAndClose,
        cancelEditMeeting: app.closeFollowupDraft,
      }
    : null

  function handleAddActionPoint() {
    app.addActionPoint()
    if (actionPointsRef.current) {
      actionPointsRef.current.open = true
    }
  }

  return (
    <section className="grid gap-4">

      {/* Hero */}
      <div className={P.card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-slate-500 font-semibold">Centre Point Hospitality</p>
            <h1 className="m-0 font-bold text-[22px] text-slate-900 leading-tight tracking-tight">Close Meeting</h1>
          </div>
          <div className={`shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full border font-semibold ${
            app.overdueCount
              ? 'text-red-700 bg-red-50 border-red-200'
              : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            {app.overdueCount ? `${app.overdueCount} overdue` : 'All clear'}
          </div>
        </div>
      </div>

      {/* 01 Select Meeting */}
      <div className={P.card}>
        <SecHead n="01">Select Meeting</SecHead>

        <Field label="Meeting *">
          <select className={P.select} value={app.closeMeetingId}
            onChange={(e) => app.setCloseMeetingId(e.target.value)}>
            <option value="">Choose an open meeting</option>
            {app.openMeetings.map((m) => (
              <option key={m.meetingId} value={m.meetingId}>
                {m.title}{m.date ? ` - ${toDateLabel(m.date)}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {app.activeMeeting && (
          <div className="grid gap-[5px] p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-slate-900 font-semibold text-[14px]">{app.activeMeeting.title}</span>
            </div>
              <span className="text-slate-600 text-[12px] pl-4">
                {toDateLabel(app.activeMeeting.date)}{app.activeMeeting.time ? ` - ${app.activeMeeting.time}` : ''}
                {` - ${getMeetingCallerLabel(app.activeMeeting, app.user)}`}
            </span>
          </div>
        )}
      </div>

      {/* 02 Concluding Notes */}
      <div className={P.card}>
        <SecHead n="02">Concluding Notes</SecHead>
        <Field label="Minutes &amp; key points discussed">
          <textarea className={P.textarea} style={{ minHeight: '110px' }}
            value={app.closureNotes}
            placeholder="Summarise what was discussed and decided..."
            onChange={(e) => app.setClosureNotes(e.target.value)} />
        </Field>
      </div>

      {/* 03 Action Points - collapsed by default, opens on add */}
      <details ref={actionPointsRef} className={P.card}>
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-4">
          <SecHead n="03">Action Points</SecHead>
          <span className="text-slate-400 text-[10px] uppercase tracking-[0.1em]">
            <span className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-semibold">{app.actionPoints.length ? `${app.actionPoints.length} added` : 'Click to expand'}</span>
          </span>
        </summary>

        <div className="grid gap-4 pt-2">
          {app.actionPoints.length === 0 && (
            <div className="py-5 px-4 border border-dashed border-slate-300 rounded-xl text-slate-500 text-[12px] text-center leading-[1.6]">
              No action points yet - add one below
            </div>
          )}

          {app.actionPoints.map((row, index) => (
            <div key={row.taskId} className="p-4 grid gap-4 border border-slate-200 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="uppercase tracking-[0.15em] text-[10px] text-slate-700 font-semibold">
                  Point {index + 1}
                </span>
                <button className={P.danger} onClick={() => app.removeActionPoint(row.taskId)}>Remove</button>
              </div>

              <Field label="Task description">
                <textarea className={P.textarea} style={{ minHeight: '70px' }}
                  value={row.task}
                  placeholder='e.g. "Arjun to submit project sheet by 30th April"'
                  onChange={(e) => app.updateActionPoint(row.taskId, 'task', e.target.value)} />
              </Field>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Assigned to name">
                    <input className={P.input} value={row.assignedTo}
                      placeholder="Person name"
                      onChange={(e) => {
                        app.updateActionPoint(row.taskId, 'assignedTo', e.target.value)
                        app.updateActionPoint(row.taskId, 'assignedToSource', 'manual')
                      }} />
                  </Field>
                  <Field label="Mobile no.">
                    <input className={P.input} value={row.assignedToMobile || ''}
                      placeholder="+91..."
                      onChange={(e) => {
                        app.updateActionPoint(row.taskId, 'assignedToMobile', e.target.value)
                        app.updateActionPoint(row.taskId, 'assignedToSource', 'manual')
                      }} />
                  </Field>
                  <Field label="Designation">
                    <input className={P.input} value={row.assignedToDesig || ''}
                      placeholder="Role"
                      onChange={(e) => {
                        app.updateActionPoint(row.taskId, 'assignedToDesig', e.target.value)
                        app.updateActionPoint(row.taskId, 'assignedToSource', 'manual')
                      }} />
                  </Field>
                </div>
                <Field label="Due date">
                  <DateField
                    value={row.dueDate}
                    onChange={(date) => app.updateActionPoint(row.taskId, 'dueDate', date)}
                  />
                </Field>
              </div>
            </div>
          ))}

          <button className={P.ghost} onClick={handleAddActionPoint}>+ Add action point</button>
        </div>
      </details>

      {/* 04 Follow-up */}
      <div className={P.card}>
        <SecHead n="04">Follow-up</SecHead>

        <p className="m-0 text-slate-600 text-[12px] leading-[1.6]">
          Create a new follow-up meeting draft using this meeting's header, department, caller, attendees, venue, and agenda context.
        </p>
        <button className={P.ghost} onClick={() => app.startFollowupDraft()} disabled={!app.closeMeetingId}>
          Schedule follow-up meeting
        </button>
        <div className="h-px bg-slate-200" />

        <button className={P.primary} onClick={app.closeMeeting} disabled={!app.closeMeetingId}>
          Save &amp; Close Meeting
        </button>
        {!app.closeMeetingId && (
          <p className="text-[11px] text-slate-500 text-center m-0">Select a meeting above to continue</p>
        )}
      </div>

      {/* 05 Postpone / Cancel */}
      <details className={P.card}>
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-4">
          <SecHead n="05">Postpone or Cancel</SecHead>
          <span className="text-slate-500 text-[10px] uppercase tracking-[0.1em] font-semibold">Expand</span>
        </summary>

        <div className="grid gap-4 pt-2">
          {/* Postpone */}
          <div className="grid gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-slate-700 font-semibold">Postpone</span>
              <span className="text-slate-500 text-[10px]">Caller or admin only</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="New date">
                <DateField
                  value={postponeForm.date}
                  onChange={(date) => setPostponeForm((c) => ({ ...c, date }))}
                />
              </Field>
              <Field label="New time">
                <TimeField
                  value={postponeForm.time}
                  onChange={(time) => setPostponeForm((c) => ({ ...c, time }))}
                />
              </Field>
            </div>
            <Field label="Reason">
              <textarea className={P.textarea} style={{ minHeight: '75px' }} value={postponeForm.reason}
                placeholder="Why is the meeting being postponed?"
                onChange={(e) => setPostponeForm((c) => ({ ...c, reason: e.target.value }))} />
            </Field>
            <button className={P.ghost} disabled={!app.closeMeetingId}
              onClick={() => app.postponeMeeting({
                meetingId: app.closeMeetingId,
                postponedToDate: postponeForm.date,
                postponedToTime: postponeForm.time,
                reason: postponeForm.reason,
              })}>
              Postpone meeting
            </button>
          </div>

          {/* Cancel */}
          <div className="grid gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-red-700 font-semibold">Cancel meeting</span>
              <span className="text-slate-500 text-[10px]">Caller or admin only</span>
            </div>
            <Field label="Cancellation reason">
              <textarea className={P.textarea} style={{ minHeight: '75px' }} value={cancelReason}
                placeholder="Why is the meeting being cancelled?"
                onChange={(e) => setCancelReason(e.target.value)} />
            </Field>
            <button
              className="min-h-[44px] px-4 py-3 rounded-xl bg-white text-red-700 border border-red-200 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
              disabled={!app.closeMeetingId}
              onClick={() => app.cancelMeeting({ meetingId: app.closeMeetingId, reason: cancelReason })}>
              Cancel meeting
            </button>
          </div>
        </div>
      </details>

      {followupModalApp && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end sm:justify-center sm:items-center bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full sm:max-w-[660px] bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_-20px_60px_rgba(15,23,42,0.18)] sm:shadow-[0_24px_60px_rgba(15,23,42,0.20)] flex flex-col max-h-[92dvh] sm:max-h-[88dvh]">

            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="m-0 text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Close Meeting</p>
                <h2 className="m-0 text-[17px] font-bold text-slate-900 leading-tight">Schedule Follow-up Meeting</h2>
              </div>
              <button
                type="button"
                onClick={app.closeFollowupDraft}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border-none cursor-pointer transition-colors flex items-center justify-center text-slate-500 text-[16px] font-bold shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <NewMeetingPage app={followupModalApp} />
            </div>

          </div>
        </div>
      )}

    </section>
  )
}
