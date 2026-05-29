import { useState, useRef, useEffect, useMemo } from 'react'
import { DateField } from '../components/DateTimePickers'
import { buildForm, buildMom, buildNotice, getMeetingCallerLabel, getMeetingModeLabel, getMeetingVenue, toDateLabel } from '../lib/meetingOs'

/* ─── Design tokens ──────────────────────────────────────────── */
const P = {
  input:    'bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#E2E8F0] focus:border-[#334155]/45 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  select:   'bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-[#334155]/45 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23555\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9',
  label:    'flex flex-col gap-[6px] text-[11px] tracking-[0.15em] uppercase text-[#64748B]',
  dateText: 'bg-transparent text-[#0F172A] text-[13px] pl-[36px] pr-[36px] py-3 w-full outline-none min-h-[44px] appearance-none placeholder:text-[#E2E8F0] font-mono',
}

const STATUS_STYLES = {
  Closed:    { badge: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', note: 'bg-emerald-50 border-emerald-200', noteLbl: 'text-emerald-700' },
  Postponed: { badge: 'text-amber-700 bg-amber-50 border-amber-200',       bar: 'bg-amber-500',   note: 'bg-amber-50 border-amber-200',     noteLbl: 'text-amber-700' },
  Cancelled: { badge: 'text-red-700 bg-red-50 border-red-200',             bar: 'bg-red-500',     note: 'bg-red-50 border-red-200',         noteLbl: 'text-red-700' },
  Open:      { badge: 'text-slate-600 bg-slate-100 border-slate-200',      bar: 'bg-slate-300',   note: 'bg-slate-50 border-slate-200',     noteLbl: 'text-slate-500' },
}

const STATUS_NOTE_LABELS = {
  Closed:    ['closingNotes',       'Closing notes'],
  Postponed: ['postponeReason',     'Postponed — reason'],
  Cancelled: ['cancellationReason', 'Cancellation reason'],
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 4) return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

function isValidDMY(dmy) {
  if (!dmy || dmy.length !== 10) return false
  const [dd, mm, yyyy] = dmy.split('/').map(Number)
  if (!dd || !mm || !yyyy) return false
  const d = new Date(yyyy, mm - 1, dd)
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd
}

function parseDMY(dmy) {
  if (!isValidDMY(dmy)) return null
  const [dd, mm, yyyy] = dmy.split('/').map(Number)
  return { d: dd, m: mm, y: yyyy }
}

function formatDMY(d, m, y) {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function isoToDMY(iso) {
  if (!iso || iso.length !== 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function dmyToISO(dmy) {
  if (!isValidDMY(dmy)) return ''
  const [dd, mm, yyyy] = dmy.split('/')
  return `${yyyy}-${mm}-${dd}`
}

// ─── CalendarIcon ──────────────────────────────────────────────────────────────

function CalendarIcon({ active }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: active ? '#334155' : '#64748B', transition: 'color 150ms', display: 'block' }}
    >
      <rect x="1.5" y="2.5" width="13" height="12" rx="2"
        stroke="currentColor" strokeWidth="1.25" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <rect x="3.5" y="9"    width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7"   y="9"    width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="10.5" y="9"   width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="3.5" y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7"   y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
    </svg>
  )
}

// ─── CalendarPicker popup ──────────────────────────────────────────────────────

const DOW    = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function CalendarPicker({ value, onChange, onClose }) {
  const today  = new Date()
  const parsed = parseDMY(value)

  const [viewYear,  setViewYear]  = useState(parsed?.y  ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.m - 1 : today.getMonth())

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function selectDay(d) {
    onChange(formatDMY(d, viewMonth + 1, viewYear))
    onClose()
  }
  function goToday() {
    const d = today.getDate()
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
    onChange(formatDMY(d, today.getMonth() + 1, today.getFullYear()))
    onClose()
  }

  const isSelected = (d) =>
    parsed && parsed.d === d && parsed.m === viewMonth + 1 && parsed.y === viewYear
  const isToday_ = (d) =>
    today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        zIndex: 50,
        top: 'calc(100% + 6px)',
        left: 0,
        width: '276px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 16px 40px rgba(15,23,42,0.14)',
        overflow: 'hidden',
      }}
    >
      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #E2E8F0' }}>
        <button type="button" onClick={prevMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#64748B', fontSize:16, cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#0F172A' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748B' }}
        >‹</button>

        <span style={{ color:'#0F172A', fontSize:13, fontWeight:600, letterSpacing:'0.02em' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>

        <button type="button" onClick={nextMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#64748B', fontSize:16, cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#0F172A' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748B' }}
        >›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 12px 4px' }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', rowGap:2, padding:'0 12px 12px' }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />
          const sel    = isSelected(d)
          const today_ = isToday_(d)
          return (
            <button key={d} type="button" onClick={() => selectDay(d)}
              style={{
                height:32, width:'100%',
                border: sel ? 'none' : today_ ? '1px solid rgba(51,65,85,0.4)' : 'none',
                borderRadius:8,
                background: sel ? '#334155' : 'transparent',
                color: sel ? '#FFFFFF' : today_ ? '#334155' : '#475569',
                fontSize:12, fontFamily:'monospace', fontWeight: sel ? 700 : 400,
                cursor:'pointer', transition:'background 120ms, color 120ms',
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#0F172A' } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color = today_ ? '#334155' : '#475569' } }}
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Today shortcut */}
      <div style={{ borderTop:'1px solid #E2E8F0', padding:'6px 12px 8px' }}>
        <button type="button" onClick={goToday}
          style={{ width:'100%', background:'transparent', border:'none', color:'#94A3B8', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', cursor:'pointer', padding:'4px 0', transition:'color 150ms' }}
          onMouseEnter={e => e.currentTarget.style.color='#334155'}
          onMouseLeave={e => e.currentTarget.style.color='#94A3B8'}
        >
          Today
        </button>
      </div>
    </div>
  )
}

// ─── DateFilterField ───────────────────────────────────────────────────────────

function DateFilterField({ value, onChange }) {
  const [text, setText] = useState(value ? isoToDMY(value) : '')
  const [open, setOpen]  = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!value) setText('')
    else if (!text) setText(isoToDMY(value))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function handleTextChange(e) {
    const masked = maskDate(e.target.value)
    setText(masked)
    if (isValidDMY(masked)) onChange(dmyToISO(masked))
  }

  function handleKeyDown(e) {
    if (e.key === 'Backspace' && text.endsWith('/')) {
      e.preventDefault()
      setText(t => t.slice(0, -1))
    }
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Delete') { setText(''); onChange('') }
  }

  function handlePickerChange(dmy) {
    setText(dmy)
    onChange(dmyToISO(dmy))
    setOpen(false)
  }

  function clear(e) {
    e.stopPropagation()
    setText('')
    onChange('')
    setOpen(false)
  }

  const active = open || isValidDMY(text)

  return (
    <div ref={wrapRef} style={{ position:'relative', flex:1, minWidth:0, display:'flex', alignItems:'center' }}>
      <button
        type="button" tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
          background:'transparent', border:'none', padding:0, cursor:'pointer',
          display:'flex', alignItems:'center', zIndex:10,
        }}
        aria-label="Open calendar"
      >
        <CalendarIcon active={active} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        className={P.dateText}
        value={text}
        placeholder="dd/mm/yyyy"
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
      />

      {value ? (
        <button
          type="button"
          onClick={clear}
          style={{
            position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
            background:'transparent', border:'none', color:'#CBD5E1',
            fontSize:13, cursor:'pointer', padding:4, lineHeight:1,
            transition:'color 150ms', zIndex:10,
          }}
          onMouseEnter={e => e.currentTarget.style.color='#0F172A'}
          onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}
          aria-label="Clear date filter"
        >✕</button>
      ) : (
        <button
          type="button" tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          style={{
            position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            width:26, height:26,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: open ? 'rgba(51,65,85,0.10)' : 'transparent',
            border:'none', borderRadius:7,
            color: open ? '#334155' : '#94A3B8',
            cursor:'pointer', transition:'background 150ms, color 150ms', zIndex:10,
          }}
          onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#475569' } }}
          onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8' } }}
          aria-label="Toggle calendar"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d={open ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {open && (
        <CalendarPicker
          value={text}
          onChange={handlePickerChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

/* ─── Field wrapper ──────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <label className={P.label}>
      <span>{label}</span>
      {children}
    </label>
  )
}

/* ─── Attendee chip ──────────────────────────────────────────── */
function AttendeeChip({ name }) {
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-[6px] px-[9px] py-[5px] rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#94A3B8] transition-colors">
      <div className="w-5 h-5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[8px] font-black text-[#334155] shrink-0">
        {initials}
      </div>
      <span className="text-[#475569] text-[11px] leading-none">{name}</span>
    </div>
  )
}

/* ─── Detail row ─────────────────────────────────────────────── */
function DetailRow({ label, value, variant = 'default' }) {
  if (!value) return null
  const variants = {
    default: { wrap: 'bg-slate-50 border-slate-200',          lbl: 'text-slate-500' },
    accent:  { wrap: 'bg-emerald-50 border-emerald-200',      lbl: 'text-emerald-700' },
    amber:   { wrap: 'bg-amber-50 border-amber-200',          lbl: 'text-amber-700' },
    danger:  { wrap: 'bg-red-50 border-red-200',              lbl: 'text-red-700' },
  }
  const v = variants[variant]
  return (
    <div className={`p-[10px_12px] rounded-[10px] border ${v.wrap}`}>
      <div className={`text-[9px] uppercase tracking-[0.14em] mb-[5px] ${v.lbl}`}>{label}</div>
      <p className="m-0 text-[#475569] text-[12.5px] leading-[1.7] whitespace-pre-line">{value}</p>
    </div>
  )
}

/* ─── Section divider ────────────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] uppercase tracking-[0.16em] text-slate-500 shrink-0 font-semibold">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  )
}

/* ─── Meeting Card ───────────────────────────────────────────── */
function ActionPointList({ points }) {
  const validPoints = (points || []).filter((point) => point.task)
  if (!validPoints.length) return null

  return (
    <div className="grid gap-2">
      <SectionLabel label="Action points" />
      {validPoints.map((point, index) => (
        <div key={point.taskId || index} className="p-3 rounded-[10px] border border-[#334155]/12 bg-[#334155]/[0.035] grid gap-[6px]">
          <p className="m-0 text-[#475569] text-[12.5px] leading-[1.65] whitespace-pre-line">{point.task}</p>
          {(point.assignedTo || point.assignedToDesig || point.assignedToMobile || point.dueDate) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[#64748B]">
              {point.assignedTo && <span>Owner: <span className="text-[#475569]">{point.assignedTo}</span></span>}
              {point.assignedToDesig && <span>Designation: <span className="text-[#475569]">{point.assignedToDesig}</span></span>}
              {point.assignedToMobile && <span>Mobile: <span className="text-[#475569]">{point.assignedToMobile}</span></span>}
              {point.dueDate && <span>Due: <span className="text-[#475569]">{toDateLabel(point.dueDate)}</span></span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FollowupDetail({ meeting }) {
  if (!meeting.followupRequired) return null

  const schedule = [
    meeting.followupDate ? toDateLabel(meeting.followupDate) : '',
    meeting.followupTime || '',
  ].filter(Boolean).join(' - ')

  return (
    <div className="grid gap-2">
      <SectionLabel label="Follow-up" />
      <div className="p-3 rounded-[10px] border border-[#D97706]/12 bg-[#D97706]/[0.04] grid gap-2">
        {schedule && (
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#D97706]/55 font-semibold">{schedule}</div>
        )}
        {meeting.followupPurpose && (
          <p className="m-0 text-[#475569] text-[12.5px] leading-[1.65] whitespace-pre-line">{meeting.followupPurpose}</p>
        )}
        {meeting.followupNote && (
          <p className="m-0 text-[#475569] text-[11.5px] leading-[1.65] whitespace-pre-line">{meeting.followupNote}</p>
        )}
      </div>
    </div>
  )
}

function getNoticeAttendees(meeting) {
  if (meeting.attendeeDetails?.length) {
    return meeting.attendeeDetails
      .map((attendee) => ({
        name: attendee.name || '',
        desig: attendee.desig || attendee.designation || '',
        email: attendee.email || '',
      }))
      .filter((attendee) => attendee.name)
  }

  return String(meeting.attendees || '')
    .split(/,|;|\n/)
    .map((name) => ({ name: name.trim(), desig: '' }))
    .filter((attendee) => attendee.name)
}

function previewNotice(app, meeting) {
  app.setPreview({
    title: 'Meeting Notice',
    content: buildNotice(meeting, getNoticeAttendees(meeting)),
  })
}

function previewMom(app, meeting) {
  const taskPoints = (app.tasks || []).filter((task) => task.meetingId === meeting.meetingId)
  const actionPoints = meeting.actionPoints?.length ? meeting.actionPoints : taskPoints
  app.setPreview({
    title: 'Minutes of Meeting (MoM)',
    content: meeting.momText || buildMom(meeting, getNoticeAttendees(meeting), meeting.closingNotes, actionPoints),
  })
}

function previewForm(app, meeting) {
  app.setPreview({
    title: 'Agenda Form',
    content: buildForm(meeting, getNoticeAttendees(meeting)),
  })
}

function MeetingCard({ meeting, onPreview, onPreviewMom, onPreviewForm, onEdit, user }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_STYLES[meeting.status] || STATUS_STYLES.Open
  const canEdit = user?.role === 'admin' || meeting.calledById === user?.id || meeting.calledBy === user?.name
  const actionPoints = meeting.actionPoints?.length ? meeting.actionPoints : meeting.trackerActionPoints

  const attendees = meeting.attendeeDetails?.length
    ? meeting.attendeeDetails.map((a) => a.name)
    : (meeting.attendees || '').split(/,|;/).map((n) => n.trim()).filter(Boolean)

  const [noteKey, noteLbl] = STATUS_NOTE_LABELS[meeting.status] || []
  const statusNote = noteKey ? meeting[noteKey] : null

  return (
    <article className="border border-slate-200 bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-[border-color,box-shadow] duration-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <div className={`h-[2px] w-full ${s.bar} opacity-50`} />

      <div className="p-4 grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[#0F172A] font-semibold text-[14px] leading-snug tracking-tight truncate">
              {meeting.title}
            </h3>
            <p className="m-0 mt-[3px] text-[#475569] text-[11px] font-mono tracking-tight">
              {toDateLabel(meeting.date)}
              {meeting.time     ? ` · ${meeting.time}` : ''}
              {meeting.duration ? ` · ${meeting.duration}` : ''}
            </p>
          </div>
          <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.12em] font-bold rounded-full border ${s.badge}`}>
            {meeting.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-[4px] text-[11px] text-[#64748B]">
          <span>
            <span className="text-[#94A3B8] mr-[3px] text-[9px] uppercase tracking-[0.1em]">By</span>
            <span className="text-[#475569]">{getMeetingCallerLabel(meeting, user)}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <span className="text-[#94A3B8] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Mode</span>
            <span className="text-[#475569]">{getMeetingModeLabel(meeting)}</span>
          </span>
          {getMeetingVenue(meeting) && (
            <>
              <span className="text-slate-300">·</span>
              <span>
                <span className="text-[#94A3B8] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Venue</span>
                <span className="text-[#475569]">{getMeetingVenue(meeting)}</span>
              </span>
            </>
          )}
          {attendees.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>
                <span className="text-[#94A3B8] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Attendees</span>
                <span className="text-[#475569]">{attendees.length}</span>
              </span>
            </>
          )}
        </div>

        {(() => {
          const firstPurpose = meeting.topics?.[0]
          const preview = firstPurpose?.purpose || firstPurpose?.topic || meeting.purpose
          const purposeCount = meeting.topics?.filter((t) => t.purpose || t.topic).length || 0
          return preview ? (
            <div className="flex items-start gap-2">
              <p className={`m-0 text-[#475569] text-[12px] leading-[1.65] flex-1 ${expanded ? '' : 'line-clamp-2'}`}>
                {preview}
              </p>
              {purposeCount > 1 && (
                <span className="shrink-0 px-[8px] py-[3px] rounded-full bg-[#E2E8F0] border border-[#E2E8F0] text-[9px] text-[#94A3B8] uppercase tracking-[0.1em] mt-[2px]">
                  +{purposeCount - 1} more
                </span>
              )}
            </div>
          ) : null
        })()}

        {expanded && (
          <div className="grid gap-3 pt-3 border-t border-[#E2E8F0]">
            {attendees.length > 0 && (
              <div>
                <SectionLabel label="Attendees" />
                <div className="flex flex-wrap gap-[6px]">
                  {attendees.map((name, i) => <AttendeeChip key={i} name={name} />)}
                </div>
              </div>
            )}

            {meeting.topics?.filter((t) => t.purpose || t.topic).length > 0 ? (
              <div className="grid gap-2">
                <SectionLabel label="Purposes" />
                {meeting.topics.filter((t) => t.purpose || t.topic).map((t, i) => (
                  <div key={i} className="p-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] grid gap-2">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#334155]/50 font-semibold">
                      Purpose {i + 1}
                    </span>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500 mb-[3px]">Purpose</div>
                      <p className="m-0 text-[#475569] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.purpose || t.topic}</p>
                    </div>
                    {t.desiredOutcome && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500 mb-[3px]">Desired Outcome</div>
                        <p className="m-0 text-[#475569] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.desiredOutcome}</p>
                      </div>
                    )}
                    {t.documents && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500 mb-[3px]">Documents Required</div>
                        <p className="m-0 text-[#475569] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.documents}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <DetailRow label="Purpose"            value={meeting.purpose} />
                <DetailRow label="Desired outcome"    value={meeting.outcome || meeting.desiredOutcome} />
                <DetailRow label="Documents required" value={meeting.docs || meeting.documents} />
              </>
            )}

            <DetailRow label="Special note" value={meeting.note || meeting.specialNote} />
            {statusNote && meeting.status !== 'Closed' && (
              <DetailRow
                label={noteLbl}
                value={statusNote}
                variant={
                  meeting.status === 'Closed'    ? 'accent'
                  : meeting.status === 'Postponed' ? 'amber'
                  : meeting.status === 'Cancelled' ? 'danger'
                  : 'default'
                }
              />
            )}
            {meeting.status === 'Closed' && (
              <>
                <DetailRow
                  label="Closing notes"
                  value={meeting.closingNotes || 'No closing notes recorded.'}
                  variant="accent"
                />
                <ActionPointList points={actionPoints} />
                <FollowupDetail meeting={meeting} />
              </>
            )}
            {meeting.status === 'Postponed' && (meeting.postponedToDate || meeting.postponedToTime) && (
              <DetailRow
                label="Postponed to"
                value={[meeting.postponedToDate ? toDateLabel(meeting.postponedToDate) : '', meeting.postponedToTime].filter(Boolean).join(' - ')}
                variant="amber"
              />
            )}
            {(meeting.unit || meeting.refNo) && (
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#E2E8F0]">
                {meeting.unit  && <span className="text-[11px] text-[#64748B]">Dept: <span className="text-[#475569]">{meeting.unit}</span></span>}
                {meeting.refNo && <span className="text-[11px] text-[#64748B]">Ref: <code className="text-[#475569] font-mono text-[10.5px]">{meeting.refNo}</code></span>}
              </div>
            )}
            {(onPreview || onPreviewForm || (meeting.status === 'Closed' && onPreviewMom)) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2E8F0]">
                {canEdit && onEdit && (
                  <button
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-700 text-white border border-slate-700 text-[11px] tracking-[0.08em] uppercase cursor-pointer transition-colors hover:bg-slate-800 hover:border-slate-800 font-semibold"
                    onClick={() => onEdit(meeting)}
                  >
                    Edit meeting
                  </button>
                )}
                {meeting.status === 'Closed' && onPreviewMom && (
                  <button
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 text-white border border-emerald-600 text-[11px] tracking-[0.08em] uppercase cursor-pointer transition-all hover:bg-emerald-700 hover:border-emerald-700 active:scale-[0.98] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_rgba(15,23,42,0.10)]"
                    onClick={() => onPreviewMom(meeting)}
                  >
                    Preview MoM
                  </button>
                )}
                {onPreviewForm && (
                  <button
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-[#334155] border border-[#CBD5E1] text-[11px] tracking-[0.08em] uppercase cursor-pointer transition-colors hover:bg-[#F8FAFC] hover:border-[#94A3B8] font-semibold"
                    onClick={() => onPreviewForm(meeting)}
                  >
                    Preview form
                  </button>
                )}
                {onPreview && (
                  <button
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-[#334155] border border-[#CBD5E1] text-[11px] tracking-[0.08em] uppercase cursor-pointer transition-colors hover:bg-[#F8FAFC] hover:border-[#94A3B8] font-semibold"
                    onClick={() => onPreview(meeting)}
                  >
                    Preview notice
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          className="text-left text-[10px] uppercase tracking-[0.1em] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-[6px] font-semibold"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="text-[8px]">{expanded ? '▲' : '▼'}</span>
          {expanded ? 'Show less' : 'Show details'}
        </button>
      </div>
    </article>
  )
}

/* ─── Filter pill ────────────────────────────────────────────── */
function FilterPill({ label, count, active, color, onClick }) {
  const activeMap = {
    all:       'bg-slate-100 text-slate-800 border-slate-300',
    Closed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    Postponed: 'bg-amber-50 text-amber-700 border-amber-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
    Open:      'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <button
      className={`px-[14px] py-[7px] rounded-xl border text-[10.5px] font-semibold uppercase tracking-[0.1em] cursor-pointer transition-all duration-150 flex items-center gap-[5px] ${
        active
          ? activeMap[color || label] || activeMap.all
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
      }`}
      onClick={onClick}
    >
      {label}
      {count != null && <span className="opacity-60 text-[9px]">{count}</span>}
    </button>
  )
}

/* ─── Meeting Header Group ───────────────────────────────────── */
function MeetingHeaderGroup({ group, children, canManage, onRename, onDelete }) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  function handleRename() {
    const next = window.prompt('Rename meeting header', group.header)
    if (next === null) return
    setMenuOpen(false)
    onRename?.(group.header, next)
  }

  function handleDelete() {
    const ok = window.confirm(`Remove header "${group.header}" from ${group.meetings.length} meeting${group.meetings.length === 1 ? '' : 's'}? The meetings will not be deleted.`)
    if (!ok) return
    setMenuOpen(false)
    onDelete?.(group.header)
  }

  return (
    <div className="grid gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl px-1 py-[6px] hover:bg-slate-50 transition-colors">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left group cursor-pointer bg-transparent border-none p-0"
        >
          {/* Animated chevron */}
          <div className="w-6 h-6 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center shrink-0 group-hover:border-[#94A3B8] transition-colors">
            <svg
              width="10" height="10" viewBox="0 0 12 12" fill="none"
              style={{
                color: '#94A3B8',
                transition: 'transform 150ms ease, color 150ms',
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Header title */}
          <span className="text-[13.5px] font-semibold tracking-tight truncate text-[#475569] group-hover:text-[#475569] transition-colors">
            {group.header}
          </span>

          {/* Stretching divider */}
          <div className="flex-1 h-px bg-[#F8FAFC] group-hover:bg-[#E2E8F0] transition-colors" />

          {/* Meta */}
          <div className="flex items-center gap-[8px] shrink-0">
            <span className="text-[11px] text-[#64748B] font-mono tabular-nums">
              {group.meetings.length} {group.meetings.length === 1 ? 'meeting' : 'meetings'}
            </span>
            {group.openCount > 0 && (
              <span className="px-[9px] py-[3px] rounded-full bg-[#334155]/[0.07] border border-[#334155]/[0.15] text-[#334155]/60 text-[10px] uppercase tracking-[0.1em] font-semibold">
                {group.openCount} open
              </span>
            )}
          </div>
        </button>

        {canManage && (
          <div className="relative shrink-0">
            <button
              type="button"
              className="h-8 w-8 rounded-lg bg-white text-[#64748B] border border-[#CBD5E1] cursor-pointer transition-colors hover:bg-[#F8FAFC] hover:border-[#94A3B8] hover:text-[#334155] font-semibold leading-none"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Header actions"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 grid min-w-[132px] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  className="px-3 py-2 text-left text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                  onClick={handleRename}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-[11px] font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
        </div>

      {/* Indented cards */}
      {open && (
        <div className="grid gap-2 pl-3 sm:pl-[36px]">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Tab Bar ────────────────────────────────────────────────── */
function TabBar({ active, onChange, bankCount, headerCount }) {
  const tabs = [
    { id: 'bank',    label: 'Meeting Bank',     count: bankCount },
    { id: 'headers', label: 'Meeting Headers',  count: headerCount },
  ]
  return (
    <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 flex items-center justify-center gap-[6px] px-4 py-[9px] rounded-xl text-[11.5px] font-semibold tracking-tight transition-all duration-150 cursor-pointer ${
            active === t.id
              ? 'bg-slate-100 border border-slate-300 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
              : 'bg-transparent border border-transparent text-[#64748B] hover:text-[#475569]'
          }`}
        >
          {t.label}
          <span className={`text-[9px] font-mono tabular-nums transition-colors ${active === t.id ? 'text-slate-500' : 'text-slate-400'}`}>
            {t.count}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ─── CSV helpers ────────────────────────────────────────────── */
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

/* ─── Bank Tab content ───────────────────────────────────────── */
function BankTab({ app }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  const statusCounts = ['Open', 'Postponed', 'Cancelled', 'Closed'].reduce((acc, s) => {
    acc[s] = app.meetings.filter((m) => m.status === s).length
    return acc
  }, {})

  const meetings = (app.filteredMeetings || []).filter(m => {
    if (!fromDate && !toDate) return true
    const d = toISODate(m.date)
    if (!d) return true
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate)
  })

  const hasDateFilter = !!(fromDate || toDate)
  const hasFilters = app.bankQuery || app.bankFilter !== 'all' || app.callerFilter || app.bankDateFilter || hasDateFilter

  function exportMeetings() {
    const headers = ['Title', 'Ref No', 'Header', 'Date', 'Time', 'Status', 'Unit', 'Attendees', 'Topics', 'Action Points']
    const rows = meetings.map(m => {
      const attendees = m.attendeeDetails?.map(a => a.name).join('; ') || m.attendees || ''
      const topics = m.topics?.filter(t => t.topic || t.purpose).map(t => t.topic || t.purpose).join('; ') || m.purpose || ''
      const aps = m.actionPoints?.filter(p => p.task)
        .map(p => `${p.task} [${p.assignedTo || '?'}, Due: ${p.dueDate || '-'}, ${p.status || 'Open'}]`)
        .join(' | ') || ''
      return [m.title || '', m.refNo || '', m.meetingHeader || '', m.date || '', m.time || '',
        m.status || '', m.unit || '', attendees, topics, aps]
    })
    dlCSV(`meeting-bank-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows))
  }

  function clearAllFilters() {
    app.setBankQuery('')
    app.setBankFilter('all')
    app.setCallerFilter?.('')
    app.setBankDateFilter?.('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="grid gap-4">

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <FilterPill label="All" count={app.meetings.length} active={app.bankFilter === 'all'} color="all" onClick={() => app.setBankFilter('all')} />
        {['Open', 'Postponed', 'Cancelled', 'Closed'].map((s) => (
          <FilterPill key={s} label={s} count={statusCounts[s]} active={app.bankFilter === s} color={s} onClick={() => app.setBankFilter(s)} />
        ))}
      </div>

      {/* Search */}
      <Field label="Search meetings">
        <div className="relative">
          <input
            className={P.input + ' pl-[38px]'}
            value={app.bankQuery}
            onChange={(e) => app.setBankQuery(e.target.value)}
            placeholder="Title, caller, purpose, attendee, date…"
          />
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#94A3B8] text-[14px] pointer-events-none select-none">⌕</span>
          {app.bankQuery && (
            <button className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] text-[14px] cursor-pointer transition-colors" onClick={() => app.setBankQuery('')}>✕</button>
          )}
        </div>
      </Field>

      {/* Date range + export */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:flex-1 sm:min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-[0.12em] text-[#64748B] sm:w-auto">From</span>
            <div className="flex-1 sm:min-w-[150px]">
              <DateField value={fromDate} onChange={setFromDate} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-[0.12em] text-[#64748B] sm:w-auto sm:text-slate-400 sm:tracking-normal">
              <span className="sm:hidden">To</span>
              <span className="hidden sm:inline">→</span>
            </span>
            <div className="flex-1 sm:min-w-[150px]">
              <DateField value={toDate} onChange={setToDate} />
            </div>
          </div>
        </div>
        <button
          onClick={exportMeetings}
          disabled={!meetings.length}
          className="w-full sm:w-auto shrink-0 min-h-[40px] px-4 py-2 rounded-xl bg-transparent text-[#334155]/60 border border-[#334155]/20 text-[10px] tracking-[0.08em] uppercase cursor-pointer transition-all hover:bg-[#334155]/[0.06] hover:text-[#334155] hover:border-[#334155]/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      {/* Results meta */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="m-0 text-[11px] text-[#64748B]">
            <span className="text-[#475569]">{meetings.length}</span> result{meetings.length !== 1 ? 's' : ''}
          </p>
          <button className="text-[10px] uppercase tracking-[0.1em] text-[#64748B] hover:text-[#475569] transition-colors cursor-pointer"
            onClick={clearAllFilters}>
            Clear filters ✕
          </button>
        </div>
      )}

      {/* Flat meeting list */}
      {meetings.length > 0 ? (
        <div className="grid gap-2">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.meetingId} meeting={{
              ...meeting,
              trackerActionPoints: (app.tasks || []).filter((task) => task.meetingId === meeting.meetingId),
            }} user={app.user}
              onPreview={app.setPreview ? (m) => previewNotice(app, m) : null}
              onPreviewMom={app.setPreview ? (m) => previewMom(app, m) : null}
              onPreviewForm={app.setPreview ? (m) => previewForm(app, m) : null}
              onEdit={app.editMeeting}
            />
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-[#E2E8F0] rounded-2xl text-center">
          <div className="text-[32px] mb-3 opacity-20 select-none">◎</div>
          <p className="m-0 text-[#64748B] text-[12px] leading-[1.6]">No meetings match your current filters</p>
          {hasFilters && (
            <button className="mt-4 px-4 py-[7px] rounded-xl border border-[#E2E8F0] text-[10.5px] text-[#64748B] uppercase tracking-[0.1em] cursor-pointer hover:border-[#E2E8F0] hover:text-[#475569] transition-all"
              onClick={clearAllFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Headers Tab content ────────────────────────────────────── */
function HeadersTab({ app }) {
  const [query, setQuery]   = useState('')
  const [filter, setFilter] = useState('all')

  const statusCounts = ['Open', 'Postponed', 'Cancelled', 'Closed'].reduce((acc, s) => {
    acc[s] = app.meetings.filter((m) => m.status === s && (m.meetingHeader || '').trim()).length
    return acc
  }, {})

  const groups = useMemo(() => {
    let source = app.meetings.filter((m) => (m.meetingHeader || '').trim())
    if (filter !== 'all') source = source.filter((m) => m.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      source = source.filter((m) =>
        [m.title, m.meetingHeader, m.purpose, m.attendees, getMeetingCallerLabel(m, app.user)]
          .some((v) => (v || '').toLowerCase().includes(q))
      )
    }
    const map = new Map()
    source.forEach((m) => {
      const h = m.meetingHeader.trim()
      if (!map.has(h)) map.set(h, [])
      map.get(h).push(m)
    })
    return [...map.entries()].map(([header, meetings]) => ({
      header,
      meetings,
      openCount:  meetings.filter((m) => m.status === 'Open').length,
      latestDate: meetings.map((m) => m.date).filter(Boolean).sort().at(-1) || '',
    }))
  }, [app.meetings, filter, query, app.user])

  const totalHeadered = app.meetings.filter((m) => (m.meetingHeader || '').trim()).length
  const hasFilters    = query || filter !== 'all'
  const totalShown    = groups.reduce((n, g) => n + g.meetings.length, 0)

  return (
    <div className="grid gap-4">

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'All', totalHeadered], ['Open', 'Open', statusCounts.Open], ['Postponed', 'Postponed', statusCounts.Postponed], ['Cancelled', 'Cancelled', statusCounts.Cancelled], ['Closed', 'Closed', statusCounts.Closed]].map(([val, lbl, count]) => (
          <FilterPill key={val} label={lbl} count={count} active={filter === val} color={val} onClick={() => setFilter(val)} />
        ))}
      </div>

      {/* Search */}
      <Field label="Search headers">
        <div className="relative">
          <input
            className={P.input + ' pl-[38px]'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Header name, title, caller, purpose…"
          />
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#94A3B8] text-[14px] pointer-events-none select-none">⌕</span>
          {query && (
            <button className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] text-[14px] cursor-pointer transition-colors" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </Field>

      {/* Results meta */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="m-0 text-[11px] text-[#64748B]">
            <span className="text-[#475569]">{totalShown}</span> result{totalShown !== 1 ? 's' : ''}
          </p>
          <button className="text-[10px] uppercase tracking-[0.1em] text-[#64748B] hover:text-[#475569] transition-colors cursor-pointer"
            onClick={() => { setQuery(''); setFilter('all') }}>
            Clear filters ✕
          </button>
        </div>
      )}

      {/* Grouped list */}
      {groups.length > 0 ? (
        <div className="grid gap-4">
          {groups.map((group) => (
            <MeetingHeaderGroup
              key={group.header}
              group={group}
              canManage={app.isAdmin}
              onRename={app.renameMeetingHeader}
              onDelete={app.deleteMeetingHeader}
            >
              {group.meetings.map((meeting) => (
                <MeetingCard key={meeting.meetingId} meeting={{
                  ...meeting,
                  trackerActionPoints: (app.tasks || []).filter((task) => task.meetingId === meeting.meetingId),
                }} user={app.user}
                  onPreview={app.setPreview ? (m) => previewNotice(app, m) : null}
                  onPreviewMom={app.setPreview ? (m) => previewMom(app, m) : null}
                  onPreviewForm={app.setPreview ? (m) => previewForm(app, m) : null}
                  onEdit={app.editMeeting}
                />
              ))}
            </MeetingHeaderGroup>
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-[#E2E8F0] rounded-2xl text-center">
          <div className="text-[32px] mb-3 opacity-20 select-none">◎</div>
          <p className="m-0 text-[#64748B] text-[12px] leading-[1.6]">
            {hasFilters ? 'No meetings match your filters' : 'No meetings have been assigned to a header yet'}
          </p>
          {hasFilters && (
            <button className="mt-4 px-4 py-[7px] rounded-xl border border-[#E2E8F0] text-[10.5px] text-[#64748B] uppercase tracking-[0.1em] cursor-pointer hover:border-[#E2E8F0] hover:text-[#475569] transition-all"
              onClick={() => { setQuery(''); setFilter('all') }}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Bank Page (tabbed) ─────────────────────────────────────── */
export default function BankPage({ app }) {
  const [activeTab, setActiveTab] = useState('bank')

  const totalHeadered = app.meetings.filter((m) => (m.meetingHeader || '').trim()).length

  return (
    <section className="grid gap-4">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden p-5 border border-slate-200 bg-white rounded-2xl flex items-start justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(51,65,85,0.08)_0%,transparent_70%)]" />
        <div>
          <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-slate-500 font-semibold">
            {app.orgName || 'Organisation'}
          </p>
          <h1 className="m-0 font-bold text-[22px] text-slate-900 leading-tight tracking-tight">
            {activeTab === 'bank' ? 'Meeting Bank' : 'Meeting Headers'}
          </h1>
        </div>
        <div className="shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full text-slate-500 bg-slate-50 border border-slate-200 font-mono">
          {activeTab === 'bank' ? app.meetings.length : totalHeadered} total
        </div>
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        bankCount={app.meetings.length}
        headerCount={totalHeadered}
      />

      {/* ── Tab content ── */}
      {activeTab === 'bank'
        ? <BankTab app={app} />
        : <HeadersTab app={app} />
      }

    </section>
  )
}
