import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeetingCallerLabel, getMeetingModeLabel, getMeetingVenue, toDateLabel } from '../lib/meetingOs'

const ACC = 'text-[#AACC33]'

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ value, label, accent }) {
  return (
    <div className="group p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] flex flex-col gap-1 hover:border-white/[0.11] hover:bg-white/[0.04] transition-all duration-200">
      <span className={`text-[28px] font-black leading-none tabular-nums font-mono tracking-tight ${accent || 'text-[#F0F0F0]'}`}>
        {value}
      </span>
      
      <span className="text-[10.5px] text-white/55 uppercase tracking-[0.14em] mt-1">{label}</span>
    </div>
  )
}

/* ─── Status Badge ───────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cls = {
    Closed:    'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/20',
    Postponed: 'text-[#8fb339] bg-[#8fb339]/10 border-[#8fb339]/20',
    Cancelled: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/20',
    Open:      'text-white/35 bg-white/[0.04] border-white/[0.08]',
  }
  return (
    <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.12em] font-bold rounded-full border ${cls[status] || cls.Open}`}>
      {status}
    </span>
  )
}

/* ─── Meta Chip ──────────────────────────────────────────────── */
function MetaChip({ label, value }) {
  return (
    <div className="p-[10px_12px] rounded-[10px] bg-white/[0.025] border border-white/[0.05]">
      <div className="text-[9px] uppercase tracking-[0.14em] text-white/40 mb-[5px]">{label}</div>
      <div className="text-[12px] text-white/80 leading-snug truncate">{value}</div>
    </div>
  )
}

/* ─── Meeting Detail Sheet ───────────────────────────────────── */
function MeetingDetail({ meeting, onClose }) {
  if (!meeting) return null

  const attendees = meeting.attendeeDetails?.length
    ? meeting.attendeeDetails
    : (meeting.attendees || '').split(',').map((n) => ({ name: n.trim(), desig: '' })).filter((a) => a.name)

  const initials = (name = '') =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const TextBlock = ({ label, value, variant }) => {
    if (!value) return null
    const variantCls = {
      default: 'bg-white/[0.025] border-white/[0.05]',
      accent:  'bg-[#AACC33]/[0.05] border-[#AACC33]/15',
      red:     'bg-[#FF5A5A]/[0.05] border-[#FF5A5A]/15',
      amber:   'bg-[#8fb339]/[0.05] border-[#8fb339]/15',
    }
    const labelCls = {
      default: 'text-white/25',
      accent:  'text-[#AACC33]/60',
      red:     'text-[#FF5A5A]/60',
      amber:   'text-[#8fb339]/60',
    }
    return (
      <div className={`p-4 rounded-xl border ${variantCls[variant || 'default']}`}>
        <div className={`text-[9.5px] uppercase tracking-[0.16em] mb-2 ${labelCls[variant || 'default']}`}>{label}</div>
        <p className="m-0 text-[12.5px] text-white/70 leading-[1.7] whitespace-pre-line">{value}</p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-end justify-center p-0 animate-[fadeIn_.18s_ease]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ animation: 'fadeIn .18s ease' }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div
        className="w-full max-w-[680px] max-h-[92dvh] bg-[#0f0f0f] border border-[#252525] rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp .22s cubic-bezier(.22,.68,0,1.2)' }}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 rounded-full bg-white/10 mx-auto mt-3 mb-0 shrink-0" />

        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-[#1a1a1a] shrink-0">
          <div className="flex-1 min-w-0">
            <p className="m-0 mb-[5px] text-[9.5px] uppercase tracking-[0.18em] text-white/45">Meeting details</p>
            <h2 className="m-0 text-[1.1rem] font-extrabold leading-snug tracking-tight">{meeting.title}</h2>
            <p className="m-0 mt-[3px] text-[11.5px] text-white/55">
              {meeting.date ? toDateLabel(meeting.date) : 'Date TBD'}
              {meeting.time ? ` · ${meeting.time}` : ''}
              {meeting.duration ? ` · ${meeting.duration}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-[2px]">
            <StatusBadge status={meeting.status} />
            <button
              onClick={onClose}
              className="w-[30px] h-[30px] rounded-full bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.09] transition-all cursor-pointer text-[13px]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-5 grid gap-3">

          {/* Meta chips */}
          <div className="grid grid-cols-3 gap-2">
            <MetaChip label="Called by" value={getMeetingCallerLabel(meeting)} />
            <MetaChip label="Mode"      value={getMeetingModeLabel(meeting)} />
            <MetaChip label="Venue"     value={getMeetingVenue(meeting) || 'TBD'} />
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
              <div className="text-[9.5px] uppercase tracking-[0.16em] text-white/45 mb-3">
                Attendees · {attendees.length}
              </div>
              <div className="grid gap-0">
                {attendees.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-[10px] py-[7px] ${i < attendees.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <div className="w-[22px] h-[22px] rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-[8px] font-black text-[#AACC33] shrink-0 mt-[1px]">
                      {initials(a.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-white/75">{a.name}</div>
                      {(a.desig || a.mobile) && (
                        <div className="text-[10px] text-white/45 mt-[2px] flex flex-wrap gap-2">
                          {a.desig  && <span>{a.desig}</span>}
                          {a.mobile && <span>· {a.mobile}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purposes or legacy flat fields */}
          {meeting.topics?.filter((t) => t.purpose || t.topic).length > 0 ? (
            <div className="grid gap-2">
              <div className="text-[9.5px] uppercase tracking-[0.16em] text-white/45">
                Purposes - {meeting.topics.filter((t) => t.purpose || t.topic).length}
              </div>
              {meeting.topics.filter((t) => t.purpose || t.topic).map((t, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05] grid gap-3">
                  <div className="text-[11px] font-semibold text-[#AACC33]/70 uppercase tracking-[0.1em]">
                    Purpose {i + 1}
                  </div>
                  <TextBlock label="Purpose" value={t.purpose || t.topic} />
                  {t.desiredOutcome && <TextBlock label="Desired outcome"  value={t.desiredOutcome} />}
                  {t.documents     && <TextBlock label="Documents required" value={t.documents} />}
                </div>
              ))}
            </div>
          ) : (
            <>
              <TextBlock label="Purpose"            value={meeting.purpose} />
              <TextBlock label="Desired outcome"    value={meeting.outcome || meeting.desiredOutcome} />
              <TextBlock label="Documents required" value={meeting.docs || meeting.documents} />
            </>
          )}
          <TextBlock label="Special note" value={meeting.note || meeting.specialNote} />
          {meeting.status === 'Closed'     && <TextBlock label="Closing notes"       value={meeting.closingNotes}      variant="accent" />}
          {meeting.status === 'Postponed'  && <TextBlock label="Postpone reason"     value={meeting.postponeReason}    variant="amber" />}
          {meeting.status === 'Cancelled'  && <TextBlock label="Cancellation reason" value={meeting.cancellationReason} variant="red" />}

          {/* Footer meta */}
          {(meeting.unit || meeting.refNo) && (
            <div className="flex flex-wrap gap-4 pt-3 border-t border-[#1a1a1a]">
              {meeting.unit  && <span className="text-[11px] text-white/45">Dept: <span className="text-white/60">{meeting.unit}</span></span>}
              {meeting.refNo && <span className="text-[11px] text-white/45">Ref: <code className="text-white/60 font-mono text-[10.5px]">{meeting.refNo}</code></span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1a] shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/60 text-[12px] font-medium cursor-pointer hover:bg-white/[0.07] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export default function DashboardPage({ app }) {
  const navigate = useNavigate()
  const [selectedMeeting, setSelectedMeeting] = useState(null)

  const today          = new Date().toISOString().slice(0, 10)
  const closedCount    = app.meetings.filter((m) => m.status === 'Closed').length


  return (
    <section className="grid gap-3">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden p-5 border border-white/[0.07] bg-white/[0.025] rounded-3xl flex items-start justify-between gap-4">
        {/* Subtle accent glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(170,204,51,0.08)_0%,transparent_70%)]" />
        <div className="relative">
          <p className="m-0 mb-[6px] uppercase tracking-[0.2em] text-[10px] text-white/50">
            {toDateLabel(today)}
          </p>
          <h1 className="text-[26px] font-black tracking-tight leading-none">Dashboard</h1>
          <p className="m-0 mt-[10px] text-white/65 text-[13px] leading-snug flex items-center gap-[6px]">
            {app.todayMeetings.length > 0 && (
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#AACC33] shrink-0" />
            )}
            {app.todayMeetings.length
              ? `${app.todayMeetings.length} meeting${app.todayMeetings.length !== 1 ? 's' : ''} scheduled today`
              : 'No meetings scheduled for today'}
          </p>
        </div>
        <button
          className="relative shrink-0 px-[14px] py-[8px] text-[11px] font-bold uppercase tracking-[0.08em] rounded-full bg-[#AACC33]/10 text-[#AACC33] border border-[#AACC33]/20 hover:bg-[#AACC33]/[0.16] active:scale-[0.96] cursor-pointer transition-all"
          onClick={() => navigate('/new-meeting')}
        >
          ＋ New meeting
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard value={app.meetings.length} label="Total meetings" />
        <StatCard value={closedCount}          label="Completed"     accent="text-[#AACC33]" />
        <StatCard value={app.openCount}        label="Open tasks"    accent={app.openCount   > 0 ? 'text-white/80' : undefined} />
        <StatCard value={app.overdueCount}     label="Overdue"       accent={app.overdueCount > 0 ? 'text-[#FF5A5A]' : undefined} />
      </div>


      {/* ── Today's schedule ── */}
      {app.todayMeetings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-white/50 shrink-0">Today's schedule · tap to expand</p>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>
          <div className="grid gap-2">
            {app.todayMeetings.map((meeting) => (
              <button
                key={meeting.meetingId}
                className="p-[14px_16px] border border-white/[0.07] bg-white/[0.025] rounded-2xl flex items-stretch gap-[14px] w-full text-left cursor-pointer hover:bg-white/[0.04] hover:border-white/[0.11] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
                onClick={() => setSelectedMeeting(meeting)}
              >
                {/* Time column */}
                <div className="flex flex-col items-center justify-start shrink-0 min-w-[48px] pt-[2px]">
                  <div className="text-[14px] font-bold font-mono tracking-tight text-[#F0F0F0]">
                    {meeting.time ? meeting.time.slice(0, 5) : '--:--'}
                  </div>
                  <div className="text-[9px] text-white/45 mt-[3px] uppercase tracking-[0.06em] text-center">
                    {(meeting.duration || '').replace(' minutes', 'min').replace(' hours', 'hr').replace(' hour', 'hr')}
                  </div>
                </div>

                {/* Vertical rule */}
                <div className="w-px self-stretch bg-white/[0.07] shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-[6px]">
                    <h3 className="text-[13.5px] font-semibold truncate">{meeting.title}</h3>
                    <StatusBadge status={meeting.status} />
                  </div>
                  <div className="text-[11px] text-white/55 flex flex-wrap gap-[5px] items-center">
                    <span>{getMeetingCallerLabel(meeting, app.user)}</span>
                    <span className="text-white/15">·</span>
                    <span>{getMeetingModeLabel(meeting)}</span>
                    <span className="text-white/15">·</span>
                    <span>{getMeetingVenue(meeting) || 'TBD'}</span>
                  </div>
                  {meeting.purpose && (
                    <p className="m-0 mt-2 text-[11px] text-white/45 line-clamp-1 leading-[1.6]">
                      {meeting.purpose}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!app.todayMeetings.length && (
        <div className="py-14 px-4 border border-dashed border-white/[0.07] rounded-3xl text-white/40 text-[13px] text-center">
          <div className="text-[36px] mb-3 select-none opacity-40">?</div>
          No meetings scheduled for today.
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-white/50 shrink-0">Quick actions</p>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            className="p-4 rounded-2xl bg-[#AACC33]/[0.07] border border-[#AACC33]/15 text-left hover:bg-[#AACC33]/[0.11] active:scale-[0.97] transition-all cursor-pointer"
            onClick={() => navigate('/new-meeting')}
          >
            <div className="text-[#AACC33] text-[20px] mb-[10px] leading-none">＋</div>
            <div className="text-[#AACC33] text-[12.5px] font-bold mb-[3px]">New Meeting</div>
            <div className="text-[#AACC33]/50 text-[10.5px]">Schedule a meeting</div>
          </button>
          <button
            className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] text-left hover:bg-white/[0.04] active:scale-[0.97] transition-all cursor-pointer"
            onClick={() => navigate('/close-meeting')}
          >
            <div className="text-white/50 text-[20px] mb-[10px] leading-none">✓</div>
            <div className="text-white/80 text-[12.5px] font-bold mb-[3px]">Close Meeting</div>
            <div className="text-white/50 text-[10.5px]">Log notes & action points</div>
          </button>
          <button
            className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] text-left hover:bg-white/[0.04] active:scale-[0.97] transition-all cursor-pointer"
            onClick={() => navigate('/tracker')}
          >
            <div className="text-white/50 text-[20px] mb-[10px] leading-none">◎</div>
            <div className="text-white/80 text-[12.5px] font-bold mb-[3px]">View Tasks</div>
            <div className="text-white/50 text-[10.5px]">
              {app.openCount > 0 ? `${app.openCount} open action point${app.openCount !== 1 ? 's' : ''}` : 'All clear'}
            </div>
          </button>
        </div>
      </div>

      {/* ── Apps ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-white/50 shrink-0">Apps</p>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>
        <a
          href="/flashreport"
          className="p-4 rounded-2xl bg-teal-900/20 border border-teal-700/25 text-left hover:bg-teal-900/30 active:scale-[0.97] transition-all cursor-pointer block no-underline"
        >
          <div className="text-teal-400 text-[20px] mb-[10px] leading-none">⚡</div>
          <div className="text-teal-300 text-[12.5px] font-bold mb-[3px]">CP Flash Report</div>
          <div className="text-teal-400/50 text-[10.5px]">Daily hospitality dashboard</div>
        </a>
      </div>

      {/* ── Detail overlay ── */}
      <MeetingDetail meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />

    </section>
  )
}
