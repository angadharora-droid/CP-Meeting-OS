import { getMeetingCallerLabel, toDateLabel } from '../lib/meetingOs'
import { useRef, useState } from 'react'
import { DateField, TimeField } from '../components/DateTimePickers'

const P = {
  primary:  'w-full min-h-[48px] px-5 py-[13px] rounded-xl bg-[#AACC33] text-black font-bold text-[13px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-[#BADA44] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_0_16px_rgba(170,204,51,0.15)]',
  ghost:    'w-full min-h-[44px] px-4 py-3 rounded-xl bg-transparent text-[#F0F0F0] border border-[#252525] text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#3a3a3a] hover:bg-white/[0.02]',
  danger:   'bg-transparent border-none text-[#FF5A5A]/70 text-[11px] tracking-[0.08em] uppercase cursor-pointer p-0 transition-colors hover:text-[#FF5A5A]',
  input:    'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#2e2e2e] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  select:   'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-[#AACC33]/45 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23555\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9 [color-scheme:dark]',
  textarea: 'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none appearance-none resize-y min-h-[80px] leading-[1.6] transition-[border-color,box-shadow] duration-150 placeholder:text-[#2e2e2e] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  card:     'p-4 grid gap-4 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl',
  label:    'flex flex-col gap-[6px] text-[10px] tracking-[0.15em] uppercase text-[#444]',
  secHead:  'flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#AACC33] font-semibold',
}

function SecHead({ n, children }) {
  return (
    <div className={P.secHead}>
      {n && <span className="text-[#AACC33]/35 font-mono">{n}</span>}
      {n && <span className="text-[#222]">/</span>}
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

  function handleAddActionPoint() {
    app.addActionPoint()
    if (actionPointsRef.current) {
      actionPointsRef.current.open = true
    }
  }

  return (
    <section className="grid gap-4">

      {/* ── Hero ── */}
      <div className={P.card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#333]">Centre Point Hospitality</p>
            <h1 className="m-0 font-bold text-[22px] text-[#F0F0F0] leading-tight">Close Meeting</h1>
            <p className="m-0 mt-[6px] text-[#3a3a3a] text-[12px] leading-[1.6]">
              Capture concluding notes, action points, and follow-up details.
            </p>
          </div>
          <div className={`shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full border ${
            app.overdueCount
              ? 'text-[#FF5A5A] bg-[#FF5A5A]/8 border-[#FF5A5A]/18'
              : 'text-[#3a3a3a] bg-white/[0.02] border-[#1e1e1e]'
          }`}>
            {app.overdueCount ? `${app.overdueCount} overdue` : 'All clear'}
          </div>
        </div>
      </div>

      {/* ── 01 Select Meeting ── */}
      <div className={P.card}>
        <SecHead n="01">Select Meeting</SecHead>

        <Field label="Meeting *">
          <select className={P.select} value={app.closeMeetingId}
            onChange={(e) => app.setCloseMeetingId(e.target.value)}>
            <option value="">— Choose an open meeting —</option>
            {app.openMeetings.map((m) => (
              <option key={m.meetingId} value={m.meetingId}>
                {m.title}{m.date ? ` · ${toDateLabel(m.date)}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {app.activeMeeting && (
          <div className="grid gap-[5px] p-4 rounded-xl bg-[#080808] border border-[#1e1e1e]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#AACC33] shadow-[0_0_6px_rgba(170,204,51,0.6)]" />
              <span className="text-[#F0F0F0] font-semibold text-[14px]">{app.activeMeeting.title}</span>
            </div>
              <span className="text-[#3a3a3a] text-[12px] pl-4">
                {toDateLabel(app.activeMeeting.date)}{app.activeMeeting.time ? ` · ${app.activeMeeting.time}` : ''}
                {` · ${getMeetingCallerLabel(app.activeMeeting, app.user)}`}
            </span>
          </div>
        )}
      </div>

      {/* ── 02 Concluding Notes ── */}
      <div className={P.card}>
        <SecHead n="02">Concluding Notes</SecHead>
        <Field label="Minutes &amp; key points discussed">
          <textarea className={P.textarea} style={{ minHeight: '110px' }}
            value={app.closureNotes}
            placeholder="Summarise what was discussed and decided…"
            onChange={(e) => app.setClosureNotes(e.target.value)} />
        </Field>
      </div>

      {/* ── 03 Action Points — collapsed by default, opens on add ── */}
      <details ref={actionPointsRef} className={P.card}>
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-4">
          <SecHead n="03">Action Points</SecHead>
          <span className="text-[#3a3a3a] text-[10px] uppercase tracking-[0.1em]">
            {app.actionPoints.length ? `${app.actionPoints.length} added` : 'Click to expand'}
          </span>
        </summary>

        <div className="grid gap-4 pt-2">
          {app.actionPoints.length === 0 && (
            <div className="py-5 px-4 border border-dashed border-[#1e1e1e] rounded-xl text-[#2e2e2e] text-[12px] text-center leading-[1.6]">
              No action points yet — add one below
            </div>
          )}

          {app.actionPoints.map((row, index) => (
            <div key={row.taskId} className="p-4 grid gap-4 border border-[#1e1e1e] bg-[#080808] rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="uppercase tracking-[0.15em] text-[10px] text-[#AACC33]/50 font-semibold">
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

      {/* ── 04 Follow-up ── */}
      <div className={P.card}>
        <SecHead n="04">Follow-up</SecHead>

        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            app.followup ? 'bg-[#AACC33] border-[#AACC33]' : 'bg-transparent border-[#333]'
          }`}>
            {app.followup && <span className="text-black text-[11px] font-bold leading-none">✓</span>}
            <input type="checkbox" className="sr-only" checked={app.followup}
              onChange={(e) => app.setFollowup(e.target.checked)} />
          </div>
          <span className="text-[#F0F0F0] text-[13px]">Schedule a follow-up meeting</span>
        </label>

        {app.followup && (
          <div className="grid gap-4 pt-2 border-t border-[#1a1a1a] mt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Follow-up date">
                <DateField
                  value={app.followupForm.date}
                  onChange={(date) => app.setFollowupForm((c) => ({ ...c, date }))}
                />
              </Field>
              <Field label="Follow-up time">
                <TimeField
                  value={app.followupForm.time}
                  onChange={(time) => app.setFollowupForm((c) => ({ ...c, time }))}
                />
              </Field>
            </div>
            <Field label="Purpose / agenda">
              <textarea className={P.textarea} value={app.followupForm.purpose}
                placeholder="What will the follow-up cover?"
                onChange={(e) => app.setFollowupForm((c) => ({ ...c, purpose: e.target.value }))} />
            </Field>
            <Field label="Special note">
              <input className={P.input} value={app.followupForm.note}
                placeholder="Any special instructions…"
                onChange={(e) => app.setFollowupForm((c) => ({ ...c, note: e.target.value }))} />
            </Field>
          </div>
        )}

        <div className="h-px bg-[#1a1a1a]" />

        <button className={P.primary} onClick={app.closeMeeting} disabled={!app.closeMeetingId}>
          Save &amp; Close Meeting →
        </button>
        {!app.closeMeetingId && (
          <p className="text-[10px] text-[#2e2e2e] text-center m-0">Select a meeting above to continue</p>
        )}
      </div>

      {/* ── 05 Postpone / Cancel ── */}
      <details className={P.card}>
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-4">
          <SecHead n="05">Postpone or Cancel</SecHead>
          <span className="text-[#2e2e2e] text-[10px] uppercase tracking-[0.1em]">Expand</span>
        </summary>

        <div className="grid gap-4 pt-2">
          {/* Postpone */}
          <div className="grid gap-3 p-4 rounded-xl border border-[#1e1e1e] bg-[#080808]">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#AACC33]/50 font-semibold">Postpone</span>
              <span className="text-[#2e2e2e] text-[10px]">Caller or admin only</span>
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
          <div className="grid gap-3 p-4 rounded-xl border border-[#FF5A5A]/12 bg-[#FF5A5A]/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#FF5A5A]/60 font-semibold">Cancel meeting</span>
              <span className="text-[#2e2e2e] text-[10px]">Caller or admin only</span>
            </div>
            <Field label="Cancellation reason">
              <textarea className={P.textarea} style={{ minHeight: '75px' }} value={cancelReason}
                placeholder="Why is the meeting being cancelled?"
                onChange={(e) => setCancelReason(e.target.value)} />
            </Field>
            <button
              className="min-h-[44px] px-4 py-3 rounded-xl bg-transparent text-[#FF5A5A] border border-[#FF5A5A]/20 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#FF5A5A]/40 hover:bg-[#FF5A5A]/5 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!app.closeMeetingId}
              onClick={() => app.cancelMeeting({ meetingId: app.closeMeetingId, reason: cancelReason })}>
              Cancel meeting
            </button>
          </div>
        </div>
      </details>

    </section>
  )
}
