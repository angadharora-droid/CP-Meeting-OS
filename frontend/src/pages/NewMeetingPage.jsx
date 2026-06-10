import { buildForm, buildNotice, toDateLabel, parseUserDateInput } from '../lib/meetingOs'
import { useEffect, useMemo, useRef, useState } from 'react'

const P = {
  primary:  'w-full min-h-[48px] px-5 py-[13px] rounded-xl bg-slate-700 text-white font-semibold text-[13px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.10)]',
  ghost:    'w-full min-h-[44px] px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-200 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 font-medium',
  ghostSm:  'min-h-[38px] px-4 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 font-medium',
  input:    'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  select:   'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-slate-500 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%2394A3B8\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9',
  textarea: 'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] px-[13px] py-3 w-full outline-none appearance-none resize-y min-h-[80px] leading-[1.6] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  card:     'p-4 grid gap-4 border border-slate-200 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  label:    'flex flex-col gap-[6px] text-[11px] tracking-[0.15em] uppercase text-slate-500 font-semibold',
  secHead:  'flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-700 font-semibold',
  // pr-[44px] leaves room for the right-side picker toggle button
  dateTime: 'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] pl-[42px] pr-[44px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)] placeholder:text-slate-400 font-mono',
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

function toReadableDate(dmy) {
  return isValidDMY(dmy) ? dmy : ''
}

function toReadableTime(timeString) {
  if (!timeString) return ''
  const [h, m] = timeString.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function roundToNextQuarter(date = new Date()) {
  const minutes = Math.ceil(date.getMinutes() / 15) * 15
  const rounded = new Date(date)
  rounded.setMinutes(minutes, 0, 0)
  return `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`
}

function splitTime(value) {
  if (!value) return { hour: 10, minute: 0, period: 'AM' }
  const [rawHour, rawMinute] = value.split(':').map(Number)
  return {
    hour: rawHour % 12 || 12,
    minute: rawMinute || 0,
    period: rawHour >= 12 ? 'PM' : 'AM',
  }
}

function composeTime({ hour, minute, period }) {
  const h24 = period === 'PM'
    ? (hour % 12) + 12
    : hour === 12 ? 0 : hour
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Parse free-typed time like "9", "930", "9:30", "9:30 pm", "1430" → "HH:MM" (24h) or null
function parseTimeInput(raw) {
  if (!raw) return null
  const s = String(raw).toLowerCase()
  const pm = /p/.test(s)
  const am = /a/.test(s)
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return null
  let h, m
  if (digits.length <= 2) { h = parseInt(digits, 10); m = 0 }
  else if (digits.length === 3) { h = parseInt(digits.slice(0, 1), 10); m = parseInt(digits.slice(1), 10) }
  else { h = parseInt(digits.slice(0, 2), 10); m = parseInt(digits.slice(2, 4), 10) }
  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null
  if (am || pm) {
    if (h < 1 || h > 12) return null
    if (pm && h < 12) h += 12
    if (am && h === 12) h = 0
  } else if (h > 23) {
    return null
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseDMY(dmy) {
  if (!isValidDMY(dmy)) return null
  const [dd, mm, yyyy] = dmy.split('/').map(Number)
  return { d: dd, m: mm, y: yyyy }
}

function formatDMY(d, m, y) {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

// ─── CalendarIcon (inline SVG, no emoji) ──────────────────────────────────────

function CalendarIcon({ active }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: active ? '#334155' : '#64748B', transition: 'color 150ms', display: 'block' }}
    >
      <rect x="1.5" y="2.5" width="13" height="12" rx="2"
        stroke="currentColor" strokeWidth="1.25" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <rect x="3.5" y="9"   width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7"   y="9"   width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="10.5" y="9"  width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="3.5" y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7"   y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
    </svg>
  )
}

// ─── Calendar popup ────────────────────────────────────────────────────────────

function ClockIcon({ active }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: active ? '#334155' : '#64748B', transition: 'color 150ms', display: 'block' }}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 4.5V8l2.4 1.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
        width: 'min(276px, calc(100vw - 2rem))',
        maxWidth: '92vw',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 16px 40px rgba(15,23,42,0.16)',
        overflow: 'hidden',
      }}
    >
      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #E2E8F0' }}>
        <button
          type="button" onClick={prevMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#64748B', fontSize:16, cursor:'pointer', transition:'color 150ms,background 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#0F172A' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#64748B' }}
        >‹</button>

        <span style={{ color:'#0F172A', fontSize:13, fontWeight:600, letterSpacing:'0.02em' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>

        <button
          type="button" onClick={nextMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#64748B', fontSize:16, cursor:'pointer', transition:'color 150ms,background 150ms' }}
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
            <button
              key={d}
              type="button"
              onClick={() => selectDay(d)}
              style={{
                height: 32,
                width: '100%',
                border: sel ? 'none' : today_ ? '1px solid rgba(51,65,85,0.4)' : 'none',
                borderRadius: 8,
                background: sel ? '#334155' : 'transparent',
                color: sel ? '#FFFFFF' : today_ ? '#334155' : '#475569',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: sel ? 700 : 400,
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
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
        <button
          type="button" onClick={goToday}
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

// ─── DateField — masked text input + left calendar icon + right toggle + popup ─

function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function handleChange(e) {
    onChange(maskDate(e.target.value))
  }
  function handleKeyDown(e) {
    if (e.key === 'Backspace' && value.endsWith('/')) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const active = open || isValidDMY(value)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>

      {/* Left icon — clicking it also opens the picker */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, lineHeight: 1,
        }}
        aria-label="Open calendar picker"
      >
        <CalendarIcon active={active} />
      </button>

      {/* Masked text input */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        className={P.dateTime}
        value={value}
        placeholder="dd/mm/yyyy"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        style={{ cursor: 'text' }}
      />

      {/* Right chevron toggle button */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(51,65,85,0.08)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          color: open ? '#334155' : '#94A3B8',
          cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
          zIndex: 10,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#475569' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8' } }}
        aria-label="Toggle calendar"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d={open ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <CalendarPicker
          value={value}
          onChange={(dmy) => { onChange(dmy); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Shared small components ───────────────────────────────────────────────────

function StepArrow({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d={dir === 'up' ? 'M3.5 10l4.5-4.5 4.5 4.5' : 'M3.5 6l4.5 4.5 4.5-4.5'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TimeStepper({ display, onStep }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button type="button" aria-label="Increase" onClick={() => onStep(1)} className="grid h-8 w-14 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <StepArrow dir="up" />
      </button>
      <div className="grid h-[58px] w-14 place-items-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-[26px] font-bold tabular-nums text-slate-900">
        {display}
      </div>
      <button type="button" aria-label="Decrease" onClick={() => onStep(-1)} className="grid h-8 w-14 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <StepArrow dir="down" />
      </button>
    </div>
  )
}

function TimePicker({ value, onChange, onClose }) {
  const selected = splitTime(value)
  const update = (part) => onChange(composeTime({ ...selected, ...part }))

  const stepHour = (d) => update({ hour: ((selected.hour - 1 + d + 12) % 12) + 1 })
  const stepMinute = (d) => {
    const snapped = Math.round(selected.minute / 5) * 5
    update({ minute: (snapped + d * 5 + 60) % 60 })
  }

  const periodBtn = (p) => `flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
    selected.period === p ? 'bg-slate-700 text-white shadow-[0_2px_8px_rgba(15,23,42,0.14)]' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
  }`

  return (
    <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(300px,calc(100vw-2rem))] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Select time</span>
        <button type="button" onClick={() => { onChange(roundToNextQuarter()); onClose() }} className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-200">Now</button>
      </div>

      <div className="flex items-center justify-center gap-2.5 px-4 py-5">
        <TimeStepper display={selected.hour} onStep={stepHour} />
        <span className="pb-1 font-mono text-[26px] font-bold text-slate-300">:</span>
        <TimeStepper display={String(selected.minute).padStart(2, '0')} onStep={stepMinute} />
        <div className="ml-1 flex w-[58px] flex-col gap-1.5 self-stretch py-[1px]">
          <button type="button" onClick={() => update({ period: 'AM' })} className={periodBtn('AM')}>AM</button>
          <button type="button" onClick={() => update({ period: 'PM' })} className={periodBtn('PM')}>PM</button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
        <span className="font-mono text-[16px] font-bold tracking-wider text-slate-700">{toReadableTime(value) || '--:-- --'}</span>
        <button type="button" onClick={onClose} className="rounded-lg bg-slate-700 px-[18px] py-[7px] text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.14)]">Done</button>
      </div>
    </div>
  )
}

function TimeField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(toReadableTime(value))
  const wrapRef = useRef(null)
  const active = open || Boolean(value)

  // Reflect external/picker changes in the editable text (skipped while typing,
  // since typing doesn't commit until blur, so `value` stays put mid-edit)
  useEffect(() => { setDraft(toReadableTime(value)) }, [value])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function commitDraft() {
    const parsed = parseTimeInput(draft)
    if (parsed) { onChange(parsed); setDraft(toReadableTime(parsed)) }
    else setDraft(toReadableTime(value))
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, lineHeight: 1,
        }}
        aria-label="Open time picker"
      >
        <ClockIcon active={active} />
      </button>

      <input
        type="text"
        className={P.dateTime}
        value={draft}
        placeholder="--:-- --"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(toReadableTime(value)); setOpen(false); e.currentTarget.blur() }
          if (e.key === 'Enter') { e.preventDefault(); commitDraft(); setOpen(false); e.currentTarget.blur() }
        }}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(51,65,85,0.08)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          color: open ? '#334155' : '#94A3B8',
          cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
          zIndex: 10,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#E2E8F0'; e.currentTarget.style.color='#475569' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8' } }}
        aria-label="Toggle time picker"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d={open ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <TimePicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function SecHead({ n, children }) {
  return (
    <div className={P.secHead}>
      {n && <span className="text-[#334155]/35 font-mono">{n}</span>}
      {n && <span className="text-[#E2E8F0]">/</span>}
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

function CharCount({ value, max }) {
  const len = (value || '').length
  return (
    <span className={`text-right text-[10px] tabular-nums ${len > max * 0.8 ? 'text-[#334155]/60' : 'text-[#64748B]'}`}>
      {len}/{max}
    </span>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function NewMeetingPage({ app }) {
  const [headerOpen, setHeaderOpen] = useState(false)
  const headerWrapRef = useRef(null)

  const callerOptions = app.isManager
    ? app.contactPeople.filter((p) => p.email === app.user?.email || p.name === app.user?.name)
    : app.contactPeople

  const adminCallerOptions = app.isAdmin && app.user
    ? [
        { id: app.user.id, name: app.user.name, desig: app.user.desig, email: app.user.email },
        ...app.contactPeople.filter(p => p.id !== app.user.id)
      ]
    : callerOptions

  const displayCallerOptions = app.isAdmin ? adminCallerOptions : callerOptions
  const callerPerson = displayCallerOptions.find((p) => p.id === app.meetingForm.calledBy)
  const callerName = callerPerson?.name ?? app.user?.name ?? 'Organizer'
  const meetingHeaders = useMemo(
    () => [...new Set(app.meetings.map((meeting) => meeting.meetingHeader).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [app.meetings],
  )
  const filteredMeetingHeaders = useMemo(() => {
    const q = app.meetingForm.meetingHeader.trim().toLowerCase()
    if (!q) return meetingHeaders
    return meetingHeaders.filter((header) => header.toLowerCase().includes(q))
  }, [app.meetingForm.meetingHeader, meetingHeaders])

  useEffect(() => {
    if (app.meetingForm.calledBy) return
    if (app.isAdmin && app.user?.id) {
      app.setMeetingForm((c) => ({ ...c, calledBy: app.user.id, calledById: app.user.id }))
      return
    }
    const match = callerOptions.find(
      (p) => p.email === app.user?.email || p.name === app.user?.name,
    )
    if (match) app.setMeetingForm((c) => ({ ...c, calledBy: match.id }))
  }, [app.isAdmin, app.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!headerOpen) return
    function onDown(e) {
      if (headerWrapRef.current && !headerWrapRef.current.contains(e.target)) setHeaderOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [headerOpen])

  const selectedInternalAttendees = app.contactPeople.filter((p) => p.id !== callerPerson?.id && app.meetingAttendeeIds.includes(p.id))
  const selectedAttendees = [callerPerson, ...selectedInternalAttendees, ...app.manualAttendees].filter(Boolean)

  const availableAttendees = useMemo(
    () => app.contactPeople.filter((person) => person.id !== callerPerson?.id && !app.meetingAttendeeIds.includes(person.id)),
    [app.contactPeople, app.meetingAttendeeIds, callerPerson?.id],
  )

  const notice = buildNotice(
    { ...app.meetingForm, refNo: 'PREVIEW', calledByName: callerName },
    selectedAttendees,
  )
  const form = buildForm(
    { ...app.meetingForm, refNo: 'PREVIEW', calledByName: callerName },
    selectedAttendees,
  )

  const purposes = app.meetingForm.topics || [{ topic: '', purpose: '', desiredOutcome: '', documents: '' }]

  function addPurpose() {
    app.setMeetingForm((c) => ({
      ...c,
      topics: [...(c.topics || []), { topic: '', purpose: '', desiredOutcome: '', documents: '' }],
    }))
  }

  function removePurpose(index) {
    app.setMeetingForm((c) => ({
      ...c,
      topics: (c.topics || []).filter((_, i) => i !== index),
    }))
  }

  function updatePurpose(index, key, value) {
    app.setMeetingForm((c) => ({
      ...c,
      topics: (c.topics || []).map((t, i) => (i === index ? { ...t, [key]: value } : t)),
    }))
  }

  const hasPurposes = purposes.some((t) => t.purpose)

  const canGenerate =
    app.meetingForm.title &&
    isValidDMY(app.meetingForm.date) &&
    app.meetingForm.time &&
    (app.meetingForm.calledBy || (app.isManager && callerOptions.length) || app.isAdmin) &&
    hasPurposes

  const dateLabel = toReadableDate(app.meetingForm.date)
  const timeLabel = app.meetingForm.time ? toReadableTime(app.meetingForm.time) : null

  return (
    <section className="grid gap-4">

      {/* Hero — hidden in followup modal (parent provides its own header) */}
      {!app.followupMode && (
        <div className={P.card} style={{ gap: '20px' }}>
          <div>
            <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#64748B]">
              {app.orgName || 'Organisation'}
            </p>
            <h1 className="m-0 font-black text-[22px] text-[#0F172A] leading-tight tracking-tight">
              {app.editingMeetingId ? 'Edit Meeting' : 'New Meeting'}
            </h1>
          </div>
        </div>
      )}

      {/* 01 Identity */}
      <div className={P.card}>
        <SecHead n="01">Identity</SecHead>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Meeting header">
            <div ref={headerWrapRef} className="relative">
              <input
                className={`${P.input} pr-11 ${headerOpen ? 'border-slate-500 [box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]' : ''}`}
                value={app.meetingForm.meetingHeader}
                placeholder="e.g. Project A"
                onFocus={() => setHeaderOpen(true)}
                onChange={(e) => {
                  app.setMeetingForm((c) => ({ ...c, meetingHeader: e.target.value }))
                  setHeaderOpen(true)
                }}
              />
              <button
                type="button"
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] transition-colors ${
                  headerOpen ? 'text-slate-700 bg-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setHeaderOpen((open) => !open)}
                aria-label="Toggle meeting header suggestions"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${headerOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {headerOpen && filteredMeetingHeaders.length > 0 && (
                <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                  <div className="max-h-52 overflow-y-auto p-1">
                    {filteredMeetingHeaders.map((header) => (
                      <button
                        key={header}
                        type="button"
                        className="w-full text-left px-3 py-3 rounded-lg text-slate-700 text-[13px] font-semibold hover:bg-slate-100 hover:text-slate-800 focus:bg-slate-100 focus:text-slate-800 outline-none transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          app.setMeetingForm((c) => ({ ...c, meetingHeader: header }))
                          setHeaderOpen(false)
                        }}
                      >
                        {header}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Field>
          <Field label="Meeting name *">
            <input className={P.input} value={app.meetingForm.title} placeholder="e.g. Q2 Sales Review"
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, title: e.target.value }))} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Unit / Department">
            <input className={P.input} value={app.meetingForm.unit} placeholder="Sales, Operations…"
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, unit: e.target.value }))} />
          </Field>
        </div>

        <Field label="Called by *">
          <select className={P.select}
            value={app.meetingForm.calledBy}
            onChange={(e) => app.setMeetingForm((c) => ({ ...c, calledBy: e.target.value }))}>
            <option value="">— Select person —</option>
            {displayCallerOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.desig ? ` · ${p.desig}` : ''}</option>
            ))}
          </select>
        </Field>

        <div className="h-px bg-[#E2E8F0]" />
        <SecHead>Attendees</SecHead>

        {/* Add attendee */}
        <div className="grid gap-4 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
          <div>
            <span className="uppercase tracking-[0.15em] text-[10px] text-[#334155]/70 font-semibold block">Add attendee</span>
            <span className="text-[#475569] text-[11px]">Select a saved person or add an external attendee</span>
          </div>

          <Field label="Saved person">
            <select className={P.select}
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                app.setMeetingAttendeeIds((cur) =>
                  cur.includes(e.target.value) ? cur : [...cur, e.target.value]
                )
              }}>
              <option value="">Select attendee to add...</option>
              {availableAttendees.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.desig ? ` - ${m.desig}` : ''}</option>
              ))}
            </select>
          </Field>
          {availableAttendees.length === 0 && (
            <p className="m-0 text-[#64748B] text-[11px]">All saved people already added.</p>
          )}

          <div className="h-px bg-[#E2E8F0]" />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="External name">
              <input className={P.input} value={app.manualAttendeeForm.name} placeholder="Guest name"
                onChange={(e) => app.setManualAttendeeForm((c) => ({ ...c, name: e.target.value }))} />
            </Field>
            <Field label="Designation">
              <input className={P.input} value={app.manualAttendeeForm.desig} placeholder="Guest role"
                onChange={(e) => app.setManualAttendeeForm((c) => ({ ...c, desig: e.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email (optional)">
              <input className={P.input} value={app.manualAttendeeForm.email} placeholder="guest@example.com"
                onChange={(e) => app.setManualAttendeeForm((c) => ({ ...c, email: e.target.value }))} />
            </Field>
            <Field label="Mobile (optional)">
              <input className={P.input} value={app.manualAttendeeForm.mobile} placeholder="+1 (555) 123-4567"
                onChange={(e) => app.setManualAttendeeForm((c) => ({ ...c, mobile: e.target.value }))} />
            </Field>
          </div>
          <button className={P.ghost} onClick={app.addManualAttendee}>+ Add external attendee</button>
        </div>
        {/* Selected attendees */}
        <div className="grid gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#334155]/70 font-semibold block">Selected attendees</span>
              <span className="text-[#475569] text-[11px]">Caller is included automatically</span>
            </div>
            <span className="px-[10px] py-[4px] rounded-full bg-[#FFFFFF] border border-[#E2E8F0] text-[10px] uppercase tracking-[0.1em] text-[#94A3B8]">
              {selectedAttendees.length}
            </span>
          </div>
          {selectedAttendees.length > 0 ? (
            <div className="grid gap-[6px]">
              {selectedAttendees.map((attendee) => (
                <div key={attendee.id}
                  className="flex items-start justify-between gap-3 px-3 py-[9px] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="flex items-start gap-[10px] min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[9px] font-bold text-[#334155] shrink-0 mt-[1px]">
                      {attendee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[#0F172A] text-[12px] truncate">{attendee.name}</div>
                      <div className="text-[#64748B] text-[10px] flex flex-wrap items-center gap-1 mt-[2px]">
                        <span>{attendee.id === callerPerson?.id ? 'Caller' : attendee.desig || 'Attendee'}</span>
                        {attendee.source === 'manual' && <span>- external</span>}
                        {attendee.mobile && <span>- {attendee.mobile}</span>}
                      </div>
                    </div>
                  </div>
                  {attendee.source === 'manual' ? (
                    <button className="text-[#DC2626]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#DC2626] transition-colors shrink-0"
                      onClick={() => app.removeManualAttendee(attendee.id)}>Remove</button>
                  ) : attendee.id !== callerPerson?.id ? (
                    <button className="text-[#DC2626]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#DC2626] transition-colors shrink-0"
                      onClick={() => app.setMeetingAttendeeIds((cur) => cur.filter((id) => id !== attendee.id))}>Remove</button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 border border-dashed border-[#E2E8F0] rounded-lg text-[#64748B] text-[11px] text-center">
              No attendees selected yet
            </div>
          )}
        </div>
      </div>

      {/* ── 02 Schedule ─────────────────────────────────────────── */}
      <div className={P.card}>
        <SecHead n="02">Schedule</SecHead>

        <div className="grid gap-3 sm:grid-cols-2">

          {/* Date — masked input + calendar picker */}
          <Field label="Date *">
            <DateField
              value={app.meetingForm.date}
              onChange={(dmy) => app.setMeetingForm((c) => ({ ...c, date: dmy }))}
            />
          </Field>

          {/* Time - custom picker */}
          <Field label="Time *">
            <TimeField
              value={app.meetingForm.time}
              onChange={(time) => app.setMeetingForm((c) => ({ ...c, time }))}
            />
          </Field>
        </div>

        {/* Confirmation strip */}
        {(dateLabel || timeLabel) && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#334155]/[0.05] border border-[#334155]/15">
            <span className="text-[#334155] text-[13px] shrink-0">✓</span>
            <p className="m-0 text-[12px] text-[#334155]/70 leading-snug">
              {dateLabel && timeLabel
                ? <>{dateLabel} <span className="text-[#334155]/35 mx-1">·</span> {timeLabel}</>
                : dateLabel || timeLabel}
            </p>
          </div>
        )}

        {/* Duration + Mode */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duration">
            <select className={P.select} value={app.meetingForm.duration}
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, duration: e.target.value }))}>
              {['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours', '3 hours'].map(
                (d) => <option key={d}>{d}</option>
              )}
            </select>
          </Field>
          <Field label="Meeting type">
            <select className={P.select} value={app.meetingForm.mode}
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, mode: e.target.value }))}>
              <option value="inperson">In Person</option>
              <option value="vc">Video Conference</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
        </div>

        {(app.meetingForm.mode === 'inperson' || app.meetingForm.mode === 'hybrid') && (
          <Field label="Venue">
            <input className={P.input} value={app.meetingForm.venue} placeholder="Board Room, 3rd Floor"
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, venue: e.target.value }))} />
          </Field>
        )}
        {(app.meetingForm.mode === 'vc' || app.meetingForm.mode === 'hybrid') && (
          <Field label="Video conference link">
            <input className={P.input} value={app.meetingForm.vcLink} placeholder="https://zoom.us/j/…"
              onChange={(e) => app.setMeetingForm((c) => ({ ...c, vcLink: e.target.value }))} />
          </Field>
        )}
      </div>

      {/* 03 Purposes */}
      <div className={P.card}>
        <div className="flex items-center justify-between gap-3">
          <SecHead n="03">Purposes</SecHead>
          <button
            className={P.ghostSm}
            style={{ width: 'auto' }}
            onClick={addPurpose}
          >
            + Add purpose
          </button>
        </div>

        <p className="m-0 text-[#475569] text-[11px] leading-[1.5]">
          Add one or more purposes for this meeting. Each purpose can have its own desired outcome and documents.
        </p>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
          <input
            type="checkbox"
            checked={app.meetingForm.includeAdditionalPoints === true}
            onChange={(e) => app.setMeetingForm((c) => ({ ...c, includeAdditionalPoints: e.target.checked }))}
            className="mt-[2px] h-4 w-4 min-h-0 accent-[#334155] cursor-pointer"
          />
          <span className="grid gap-[3px] normal-case tracking-normal">
            <span className="text-[#0F172A] text-[12px] font-semibold">Add additional points section</span>
            <span className="text-[#475569] text-[11px] leading-[1.45]">
              Include the blank Other Discussions area in the agenda form preview and print.
            </span>
          </span>
        </label>

        {purposes.map((purpose, index) => (
          <div key={index} className="grid gap-3 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#334155]/70 font-semibold">
                Purpose {index + 1}
              </span>
              {purposes.length > 1 && (
                <button
                  className="text-[#DC2626]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#DC2626] transition-colors"
                  onClick={() => removePurpose(index)}
                >
                  Remove
                </button>
              )}
            </div>

            <Field label="Purpose *">
              <div>
                <textarea
                  className={P.textarea} style={{ minHeight: '80px' }}
                  value={purpose.purpose}
                  placeholder="What is the purpose of this meeting item?"
                  onChange={(e) => updatePurpose(index, 'purpose', e.target.value)}
                />
                <CharCount value={purpose.purpose} max={500} />
              </div>
            </Field>

            <Field label="Desired outcome">
              <textarea
                className={P.textarea} style={{ minHeight: '70px' }}
                value={purpose.desiredOutcome}
                placeholder="What should be resolved or decided?"
                onChange={(e) => updatePurpose(index, 'desiredOutcome', e.target.value)}
              />
            </Field>

            <Field label="Documents required">
              <textarea
                className={P.textarea} style={{ minHeight: '60px' }}
                value={purpose.documents}
                placeholder={"- Report\n- Budget sheet"}
                onChange={(e) => updatePurpose(index, 'documents', e.target.value)}
              />
            </Field>
          </div>
        ))}

        <Field label="Special note (meeting-level)">
          <textarea className={P.textarea} style={{ minHeight: '60px' }}
            value={app.meetingForm.note} placeholder="Any special instructions…"
            onChange={(e) => app.setMeetingForm((c) => ({ ...c, note: e.target.value }))} />
        </Field>

        {canGenerate && (
          <div className="flex gap-2 flex-wrap">
            <button className={P.ghostSm} style={{ flex: '1', minWidth: '140px' }}
              onClick={() => app.setPreview({ title: 'Meeting Notice', content: notice })}>
              Preview Notice ↗
            </button>
            <button className={P.ghostSm} style={{ flex: '1', minWidth: '140px' }}
              onClick={() => app.setPreview({ title: 'Agenda Form', content: form })}>
              Preview Form ↗
            </button>
          </div>
        )}

        <div className="h-px bg-[#E2E8F0]" />
        <button className={P.primary} onClick={app.generateMeeting} disabled={!canGenerate}>
          {app.followupMode ? 'Save Follow-up & Close Meeting' : app.editingMeetingId ? 'Update Meeting →' : 'Generate & Save Meeting →'}
        </button>
        {app.editingMeetingId && (
          <button className={P.ghost} onClick={app.cancelEditMeeting}>
            {app.followupMode ? 'Cancel follow-up' : 'Cancel edit'}
          </button>
        )}
        {!canGenerate && (
          <p className="text-[11px] text-[#64748B] text-center m-0">
            Name, date (dd/mm/yyyy), time, caller, and at least one purpose required
          </p>
        )}
      </div>

    </section>
  )
}
