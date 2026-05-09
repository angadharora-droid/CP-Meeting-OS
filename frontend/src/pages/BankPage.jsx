import { useState, useRef, useEffect, useMemo } from 'react'
import { DateField } from '../components/DateTimePickers'
import { buildNotice, getMeetingCallerLabel, getMeetingModeLabel, getMeetingVenue, toDateLabel } from '../lib/meetingOs'

/* ─── Design tokens ──────────────────────────────────────────── */
const P = {
  input:    'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#2a2a2a] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  select:   'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-[#AACC33]/45 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23555\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9',
  label:    'flex flex-col gap-[6px] text-[11px] tracking-[0.15em] uppercase text-[#555]',
  dateText: 'bg-transparent text-[#F0F0F0] text-[13px] pl-[36px] pr-[36px] py-3 w-full outline-none min-h-[44px] appearance-none placeholder:text-[#2a2a2a] font-mono',
}

const STATUS_STYLES = {
  Closed:    { badge: 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/20', bar: 'bg-[#AACC33]',  note: 'bg-[#AACC33]/[0.05] border-[#AACC33]/15', noteLbl: 'text-[#AACC33]/50' },
  Postponed: { badge: 'text-[#a3c752] bg-[#8fb339]/10 border-[#8fb339]/20', bar: 'bg-[#8fb339]',  note: 'bg-[#8fb339]/[0.05] border-[#8fb339]/15',  noteLbl: 'text-[#8fb339]/50' },
  Cancelled: { badge: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/20', bar: 'bg-[#FF5A5A]', note: 'bg-[#FF5A5A]/[0.05] border-[#FF5A5A]/15',  noteLbl: 'text-[#FF5A5A]/50' },
  Open:      { badge: 'text-white/35 bg-white/[0.04] border-white/[0.08]',   bar: 'bg-[#2a2a2a]', note: 'bg-white/[0.025] border-white/[0.07]',     noteLbl: 'text-white/25' },
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
      style={{ color: active ? '#AACC33' : '#555', transition: 'color 150ms', display: 'block' }}
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
        background: '#111',
        border: '1px solid #262626',
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
        overflow: 'hidden',
      }}
    >
      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #1e1e1e' }}>
        <button type="button" onClick={prevMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#555', fontSize:16, cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#F0F0F0' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#555' }}
        >‹</button>

        <span style={{ color:'#F0F0F0', fontSize:13, fontWeight:600, letterSpacing:'0.02em' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>

        <button type="button" onClick={nextMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#555', fontSize:16, cursor:'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#F0F0F0' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#555' }}
        >›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 12px 4px' }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>
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
                border: sel ? 'none' : today_ ? '1px solid rgba(170,204,51,0.4)' : 'none',
                borderRadius:8,
                background: sel ? '#AACC33' : 'transparent',
                color: sel ? '#000' : today_ ? '#AACC33' : '#777',
                fontSize:12, fontFamily:'monospace', fontWeight: sel ? 700 : 400,
                cursor:'pointer', transition:'background 120ms, color 120ms',
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#F0F0F0' } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color = today_ ? '#AACC33' : '#777' } }}
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Today shortcut */}
      <div style={{ borderTop:'1px solid #1e1e1e', padding:'6px 12px 8px' }}>
        <button type="button" onClick={goToday}
          style={{ width:'100%', background:'transparent', border:'none', color:'#444', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', cursor:'pointer', padding:'4px 0', transition:'color 150ms' }}
          onMouseEnter={e => e.currentTarget.style.color='#AACC33'}
          onMouseLeave={e => e.currentTarget.style.color='#444'}
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
            background:'transparent', border:'none', color:'#3a3a3a',
            fontSize:13, cursor:'pointer', padding:4, lineHeight:1,
            transition:'color 150ms', zIndex:10,
          }}
          onMouseEnter={e => e.currentTarget.style.color='#F0F0F0'}
          onMouseLeave={e => e.currentTarget.style.color='#3a3a3a'}
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
            background: open ? 'rgba(170,204,51,0.12)' : 'transparent',
            border:'none', borderRadius:7,
            color: open ? '#AACC33' : '#444',
            cursor:'pointer', transition:'background 150ms, color 150ms', zIndex:10,
          }}
          onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#888' } }}
          onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#444' } }}
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
    <div className="flex items-center gap-[6px] px-[9px] py-[5px] rounded-lg bg-[#141414] border border-[#222] hover:border-[#2e2e2e] transition-colors">
      <div className="w-5 h-5 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-[8px] font-black text-[#AACC33] shrink-0">
        {initials}
      </div>
      <span className="text-[#aaa] text-[11px] leading-none">{name}</span>
    </div>
  )
}

/* ─── Detail row ─────────────────────────────────────────────── */
function DetailRow({ label, value, variant = 'default' }) {
  if (!value) return null
  const variants = {
    default: { wrap: 'bg-[#0a0a0a] border-[#1a1a1a]',           lbl: 'text-white/40' },
    accent:  { wrap: 'bg-[#AACC33]/[0.04] border-[#AACC33]/12', lbl: 'text-[#AACC33]/50' },
    amber:   { wrap: 'bg-[#8fb339]/[0.04] border-[#8fb339]/12', lbl: 'text-[#8fb339]/50' },
    danger:  { wrap: 'bg-[#FF5A5A]/[0.04] border-[#FF5A5A]/12', lbl: 'text-[#FF5A5A]/50' },
  }
  const v = variants[variant]
  return (
    <div className={`p-[10px_12px] rounded-[10px] border ${v.wrap}`}>
      <div className={`text-[9px] uppercase tracking-[0.14em] mb-[5px] ${v.lbl}`}>{label}</div>
      <p className="m-0 text-[#999] text-[12.5px] leading-[1.7] whitespace-pre-line">{value}</p>
    </div>
  )
}

/* ─── Section divider ────────────────────────────────────────── */
function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] uppercase tracking-[0.16em] text-white/40 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
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
        <div key={point.taskId || index} className="p-3 rounded-[10px] border border-[#AACC33]/12 bg-[#AACC33]/[0.035] grid gap-[6px]">
          <p className="m-0 text-[#aaa] text-[12.5px] leading-[1.65] whitespace-pre-line">{point.task}</p>
          {(point.assignedTo || point.assignedToDesig || point.assignedToMobile || point.dueDate) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[#555]">
              {point.assignedTo && <span>Owner: <span className="text-[#777]">{point.assignedTo}</span></span>}
              {point.assignedToDesig && <span>Designation: <span className="text-[#777]">{point.assignedToDesig}</span></span>}
              {point.assignedToMobile && <span>Mobile: <span className="text-[#777]">{point.assignedToMobile}</span></span>}
              {point.dueDate && <span>Due: <span className="text-[#777]">{toDateLabel(point.dueDate)}</span></span>}
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
      <div className="p-3 rounded-[10px] border border-[#8fb339]/12 bg-[#8fb339]/[0.04] grid gap-2">
        {schedule && (
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#8fb339]/55 font-semibold">{schedule}</div>
        )}
        {meeting.followupPurpose && (
          <p className="m-0 text-[#aaa] text-[12.5px] leading-[1.65] whitespace-pre-line">{meeting.followupPurpose}</p>
        )}
        {meeting.followupNote && (
          <p className="m-0 text-[#777] text-[11.5px] leading-[1.65] whitespace-pre-line">{meeting.followupNote}</p>
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

function MeetingCard({ meeting, onPreview, user }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_STYLES[meeting.status] || STATUS_STYLES.Open

  const attendees = meeting.attendeeDetails?.length
    ? meeting.attendeeDetails.map((a) => a.name)
    : (meeting.attendees || '').split(/,|;/).map((n) => n.trim()).filter(Boolean)

  const [noteKey, noteLbl] = STATUS_NOTE_LABELS[meeting.status] || []
  const statusNote = noteKey ? meeting[noteKey] : null

  return (
    <article className="border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl overflow-hidden hover:border-[#2a2a2a] transition-[border-color] duration-200">
      <div className={`h-[2px] w-full ${s.bar} opacity-50`} />

      <div className="p-4 grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-[#F0F0F0] font-semibold text-[14px] leading-snug tracking-tight truncate">
              {meeting.title}
            </h3>
            <p className="m-0 mt-[3px] text-[#666] text-[11px] font-mono tracking-tight">
              {toDateLabel(meeting.date)}
              {meeting.time     ? ` · ${meeting.time}` : ''}
              {meeting.duration ? ` · ${meeting.duration}` : ''}
            </p>
          </div>
          <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.12em] font-bold rounded-full border ${s.badge}`}>
            {meeting.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-[4px] text-[11px] text-[#555]">
          <span>
            <span className="text-[#444] mr-[3px] text-[9px] uppercase tracking-[0.1em]">By</span>
            <span className="text-[#777]">{getMeetingCallerLabel(meeting, user)}</span>
          </span>
          <span className="text-white/15">·</span>
          <span>
            <span className="text-[#444] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Mode</span>
            <span className="text-[#777]">{getMeetingModeLabel(meeting)}</span>
          </span>
          {getMeetingVenue(meeting) && (
            <>
              <span className="text-white/15">·</span>
              <span>
                <span className="text-[#444] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Venue</span>
                <span className="text-[#777]">{getMeetingVenue(meeting)}</span>
              </span>
            </>
          )}
          {attendees.length > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span>
                <span className="text-[#444] mr-[3px] text-[9px] uppercase tracking-[0.1em]">Attendees</span>
                <span className="text-[#777]">{attendees.length}</span>
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
              <p className={`m-0 text-[#666] text-[12px] leading-[1.65] flex-1 ${expanded ? '' : 'line-clamp-2'}`}>
                {preview}
              </p>
              {purposeCount > 1 && (
                <span className="shrink-0 px-[8px] py-[3px] rounded-full bg-[#1a1a1a] border border-[#252525] text-[9px] text-[#444] uppercase tracking-[0.1em] mt-[2px]">
                  +{purposeCount - 1} more
                </span>
              )}
            </div>
          ) : null
        })()}

        {expanded && (
          <div className="grid gap-3 pt-3 border-t border-[#181818]">
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
                  <div key={i} className="p-3 rounded-[10px] border border-[#1a1a1a] bg-[#0a0a0a] grid gap-2">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#AACC33]/50 font-semibold">
                      Purpose {i + 1}
                    </span>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-[3px]">Purpose</div>
                      <p className="m-0 text-[#888] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.purpose || t.topic}</p>
                    </div>
                    {t.desiredOutcome && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-[3px]">Desired Outcome</div>
                        <p className="m-0 text-[#888] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.desiredOutcome}</p>
                      </div>
                    )}
                    {t.documents && (
                      <div>
                        <div className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-[3px]">Documents Required</div>
                        <p className="m-0 text-[#888] text-[11.5px] leading-[1.65] whitespace-pre-line">{t.documents}</p>
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
            {statusNote && (
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
                <ActionPointList points={meeting.actionPoints} />
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
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#181818]">
                {meeting.unit  && <span className="text-[11px] text-[#555]">Dept: <span className="text-[#777]">{meeting.unit}</span></span>}
                {meeting.refNo && <span className="text-[11px] text-[#555]">Ref: <code className="text-[#777] font-mono text-[10.5px]">{meeting.refNo}</code></span>}
              </div>
            )}
            {onPreview && (
              <button
                className="text-left text-[10px] uppercase tracking-[0.1em] text-[#AACC33]/40 hover:text-[#AACC33]/70 transition-colors cursor-pointer mt-[-2px]"
                onClick={() => onPreview(meeting)}
              >
                Preview notice ↗
              </button>
            )}
          </div>
        )}

        <button
          className="text-left text-[10px] uppercase tracking-[0.1em] text-[#2a2a2a] hover:text-[#555] transition-colors cursor-pointer flex items-center gap-[6px]"
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
    all:       'bg-[#AACC33]/10 text-[#AACC33] border-[#AACC33]/25',
    Closed:    'bg-[#AACC33]/10 text-[#AACC33] border-[#AACC33]/25',
    Postponed: 'bg-[#8fb339]/10 text-[#a3c752] border-[#8fb339]/25',
    Cancelled: 'bg-[#FF5A5A]/10 text-[#FF5A5A] border-[#FF5A5A]/25',
    Open:      'bg-white/[0.04] text-white/50 border-white/[0.08]',
  }
  return (
    <button
      className={`px-[14px] py-[7px] rounded-xl border text-[10.5px] font-semibold uppercase tracking-[0.1em] cursor-pointer transition-all duration-150 flex items-center gap-[5px] ${
        active
          ? activeMap[color || label] || activeMap.all
          : 'bg-transparent text-[#555] border-[#1e1e1e] hover:border-[#2a2a2a] hover:text-[#888]'
      }`}
      onClick={onClick}
    >
      {label}
      {count != null && <span className="opacity-50 text-[9px]">{count}</span>}
    </button>
  )
}

/* ─── Meeting Header Group ───────────────────────────────────── */
function MeetingHeaderGroup({ group, children }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="grid gap-3">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 text-left w-full group px-1 py-[6px] rounded-xl hover:bg-white/[0.02] transition-colors"
      >
        {/* Animated chevron */}
        <div className="w-6 h-6 rounded-lg bg-[#141414] border border-[#222] flex items-center justify-center shrink-0 group-hover:border-[#2e2e2e] transition-colors">
          <svg
            width="10" height="10" viewBox="0 0 12 12" fill="none"
            style={{
              color: '#444',
              transition: 'transform 150ms ease, color 150ms',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Header title */}
        <span className="text-[13.5px] font-semibold tracking-tight truncate text-[#888] group-hover:text-[#aaa] transition-colors">
          {group.header}
        </span>

        {/* Stretching divider */}
        <div className="flex-1 h-px bg-[#1c1c1c] group-hover:bg-[#252525] transition-colors" />

        {/* Meta */}
        <div className="flex items-center gap-[8px] shrink-0">
          <span className="text-[11px] text-[#555] font-mono tabular-nums">
            {group.meetings.length} {group.meetings.length === 1 ? 'meeting' : 'meetings'}
          </span>
          {group.openCount > 0 && (
            <span className="px-[9px] py-[3px] rounded-full bg-[#AACC33]/[0.07] border border-[#AACC33]/[0.15] text-[#AACC33]/60 text-[10px] uppercase tracking-[0.1em] font-semibold">
              {group.openCount} open
            </span>
          )}
        </div>
      </button>

      {/* Indented cards */}
      {open && (
        <div className="grid gap-2 pl-[36px]">
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
    <div className="flex items-center gap-1 p-1 bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 flex items-center justify-center gap-[6px] px-4 py-[9px] rounded-xl text-[11.5px] font-semibold tracking-tight transition-all duration-150 cursor-pointer ${
            active === t.id
              ? 'bg-[#161616] border border-[#2a2a2a] text-[#F0F0F0] shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
              : 'bg-transparent border border-transparent text-[#555] hover:text-[#888]'
          }`}
        >
          {t.label}
          <span className={`text-[9px] font-mono tabular-nums transition-colors ${active === t.id ? 'text-[#444]' : 'text-[#2a2a2a]'}`}>
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
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#333] text-[14px] pointer-events-none select-none">⌕</span>
          {app.bankQuery && (
            <button className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#444] hover:text-[#777] text-[14px] cursor-pointer transition-colors" onClick={() => app.setBankQuery('')}>✕</button>
          )}
        </div>
      </Field>

      {/* Date range + export */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#555] shrink-0">From</span>
          <div className="flex-1 min-w-[180px]">
            <DateField value={fromDate} onChange={setFromDate} />
          </div>
          <span className="text-[#252525] shrink-0">→</span>
          <div className="flex-1 min-w-[180px]">
            <DateField value={toDate} onChange={setToDate} />
          </div>
        </div>
        <button
          onClick={exportMeetings}
          disabled={!meetings.length}
          className="shrink-0 min-h-[38px] px-4 py-2 rounded-xl bg-transparent text-[#AACC33]/60 border border-[#AACC33]/20 text-[10px] tracking-[0.08em] uppercase cursor-pointer transition-all hover:bg-[#AACC33]/[0.06] hover:text-[#AACC33] hover:border-[#AACC33]/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>

      {/* Results meta */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="m-0 text-[11px] text-[#555]">
            <span className="text-[#888]">{meetings.length}</span> result{meetings.length !== 1 ? 's' : ''}
          </p>
          <button className="text-[10px] uppercase tracking-[0.1em] text-[#555] hover:text-[#888] transition-colors cursor-pointer"
            onClick={clearAllFilters}>
            Clear filters ✕
          </button>
        </div>
      )}

      {/* Flat meeting list */}
      {meetings.length > 0 ? (
        <div className="grid gap-2">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.meetingId} meeting={meeting} user={app.user}
              onPreview={app.setPreview ? (m) => previewNotice(app, m) : null}
            />
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-[#1e1e1e] rounded-2xl text-center">
          <div className="text-[32px] mb-3 opacity-20 select-none">◎</div>
          <p className="m-0 text-[#555] text-[12px] leading-[1.6]">No meetings match your current filters</p>
          {hasFilters && (
            <button className="mt-4 px-4 py-[7px] rounded-xl border border-[#1e1e1e] text-[10.5px] text-[#555] uppercase tracking-[0.1em] cursor-pointer hover:border-[#2a2a2a] hover:text-[#888] transition-all"
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
          <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#333] text-[14px] pointer-events-none select-none">⌕</span>
          {query && (
            <button className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#444] hover:text-[#777] text-[14px] cursor-pointer transition-colors" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      </Field>

      {/* Results meta */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="m-0 text-[11px] text-[#555]">
            <span className="text-[#888]">{totalShown}</span> result{totalShown !== 1 ? 's' : ''}
          </p>
          <button className="text-[10px] uppercase tracking-[0.1em] text-[#555] hover:text-[#888] transition-colors cursor-pointer"
            onClick={() => { setQuery(''); setFilter('all') }}>
            Clear filters ✕
          </button>
        </div>
      )}

      {/* Grouped list */}
      {groups.length > 0 ? (
        <div className="grid gap-4">
          {groups.map((group) => (
            <MeetingHeaderGroup key={group.header} group={group}>
              {group.meetings.map((meeting) => (
                <MeetingCard key={meeting.meetingId} meeting={meeting} user={app.user}
                  onPreview={app.setPreview ? (m) => previewNotice(app, m) : null}
                />
              ))}
            </MeetingHeaderGroup>
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 border border-dashed border-[#1e1e1e] rounded-2xl text-center">
          <div className="text-[32px] mb-3 opacity-20 select-none">◎</div>
          <p className="m-0 text-[#555] text-[12px] leading-[1.6]">
            {hasFilters ? 'No meetings match your filters' : 'No meetings have been assigned to a header yet'}
          </p>
          {hasFilters && (
            <button className="mt-4 px-4 py-[7px] rounded-xl border border-[#1e1e1e] text-[10.5px] text-[#555] uppercase tracking-[0.1em] cursor-pointer hover:border-[#2a2a2a] hover:text-[#888] transition-all"
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
      <div className="relative overflow-hidden p-5 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl flex items-start justify-between gap-4">
        <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(170,204,51,0.05)_0%,transparent_70%)]" />
        <div>
          <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#555]">
            {app.orgName || 'Organisation'}
          </p>
          <h1 className="m-0 font-black text-[22px] text-[#F0F0F0] leading-tight tracking-tight">
            {activeTab === 'bank' ? 'Meeting Bank' : 'Meeting Headers'}
          </h1>
          <p className="m-0 mt-[6px] text-[#666] text-[13px] leading-[1.6]">
            {activeTab === 'bank'
              ? 'Browse, search, and filter all meetings across your organisation.'
              : 'Meetings organised under a named header.'}
          </p>
        </div>
        <div className="shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full text-[#444] bg-white/[0.02] border border-[#1e1e1e] font-mono">
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
