import { buildForm, buildNotice, toDateLabel, parseUserDateInput } from '../lib/meetingOs'
import { useEffect, useMemo, useRef, useState } from 'react'

const P = {
  primary:  'w-full min-h-[48px] px-5 py-[13px] rounded-xl bg-[#AACC33] text-black font-bold text-[13px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-[#BADA44] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100',
  ghost:    'w-full min-h-[44px] px-4 py-3 rounded-xl bg-transparent text-[#F0F0F0] border border-[#252525] text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#3a3a3a] hover:bg-white/[0.02]',
  ghostSm:  'min-h-[38px] px-4 py-2 rounded-xl bg-transparent text-[#F0F0F0] border border-[#252525] text-[11px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#3a3a3a]',
  input:    'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#2e2e2e] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  select:   'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none cursor-pointer transition-[border-color] duration-150 focus:border-[#AACC33]/45 [background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23555\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-no-repeat [background-position:right_13px_center] pr-9 [color-scheme:dark]',
  textarea: 'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] px-[13px] py-3 w-full outline-none appearance-none resize-y min-h-[80px] leading-[1.6] transition-[border-color,box-shadow] duration-150 placeholder:text-[#2e2e2e] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  card:     'p-4 grid gap-4 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl',
  label:    'flex flex-col gap-[6px] text-[11px] tracking-[0.15em] uppercase text-[#555]',
  secHead:  'flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#AACC33] font-semibold',
  // pr-[44px] leaves room for the right-side picker toggle button
  dateTime: 'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[14px] pl-[42px] pr-[44px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 [color-scheme:dark] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)] placeholder:text-[#2e2e2e] font-mono',
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
      style={{ color: active ? '#AACC33' : '#555', transition: 'color 150ms', display: 'block' }}
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
      style={{ color: active ? '#AACC33' : '#555', transition: 'color 150ms', display: 'block' }}
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
        <button
          type="button" onClick={prevMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#555', fontSize:16, cursor:'pointer', transition:'color 150ms,background 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#F0F0F0' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#555' }}
        >‹</button>

        <span style={{ color:'#F0F0F0', fontSize:13, fontWeight:600, letterSpacing:'0.02em' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>

        <button
          type="button" onClick={nextMonth}
          style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:8, color:'#555', fontSize:16, cursor:'pointer', transition:'color 150ms,background 150ms' }}
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
            <button
              key={d}
              type="button"
              onClick={() => selectDay(d)}
              style={{
                height: 32,
                width: '100%',
                border: sel ? 'none' : today_ ? '1px solid rgba(170,204,51,0.4)' : 'none',
                borderRadius: 8,
                background: sel ? '#AACC33' : 'transparent',
                color: sel ? '#000' : today_ ? '#AACC33' : '#777',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: sel ? 700 : 400,
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
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
        <button
          type="button" onClick={goToday}
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
          background: open ? 'rgba(170,204,51,0.12)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          color: open ? '#AACC33' : '#444',
          cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
          zIndex: 10,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#888' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#444' } }}
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

const ITEM_H = 38 // px — must match h-[38px] on buttons

function TimeColumn({ options, value, onChange, className = '', textAlign = 'center', btnPaddingClass = '' }) {
  const scrollRef = useRef(null)
  const mountedRef = useRef(false)
  const valueRef = useRef(value) // tracks current value without closure stale-ness

  // Keep valueRef in sync so the snap listener always sees the latest value
  useEffect(() => { valueRef.current = value }, [value])

  // Scroll to the correct item whenever value changes externally (e.g. click)
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const idx = options.findIndex(o => o.value === value)
    if (idx < 0) return
    if (mountedRef.current) {
      container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    } else {
      container.scrollTop = idx * ITEM_H
      mountedRef.current = true
    }
  }, [value, options])

  // Auto-snap to nearest item when the user stops scrolling
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    function snap() {
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(container.scrollTop / ITEM_H)))
      container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      const next = options[idx].value
      if (next !== valueRef.current) {
        valueRef.current = next
        onChange(next)
      }
    }

    // Use scrollend where available; fall back to debounced scroll
    if ('onscrollend' in container) {
      container.addEventListener('scrollend', snap)
      return () => container.removeEventListener('scrollend', snap)
    }
    let timer
    function onScroll() { clearTimeout(timer); timer = setTimeout(snap, 150) }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [options, onChange])

  return (
    <div
      ref={scrollRef}
      className={`h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {/* py-[79px] centres item 0 at scrollTop=0 for a 196px container: (196-38)/2 = 79 */}
      <div className="grid py-[79px]">
        {options.map((option) => {
          const sel = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{ textAlign }}
              className={`h-[38px] w-full font-mono transition-all duration-150 ${btnPaddingClass} ${
                sel
                  ? 'text-[#E8E8E8] text-[20px] font-bold'
                  : 'text-[#353535] text-[15px] hover:text-[#555]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimePicker({ value, onChange, onClose }) {
  const selected = splitTime(value)
  const hourOptions   = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => ({
    value: m, label: String(m).padStart(2, '0'),
  }))
  const periodOptions = [
    { value: 'AM', label: 'am' },
    { value: 'PM', label: 'pm' },
  ]

  function update(part) { onChange(composeTime({ ...selected, ...part })) }

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'absolute', zIndex: 50, top: 'calc(100% + 6px)', left: 0,
        width: '280px', background: '#111', border: '1px solid #242424',
        borderRadius: '16px', boxShadow: '0 12px 48px rgba(0,0,0,0.72)', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #1a1a1a' }}>
        <span style={{ color:'#444', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' }}>Select time</span>
        <button
          type="button"
          onClick={() => { onChange(roundToNextQuarter()); onClose() }}
          style={{
            background: 'rgba(170,204,51,0.08)', border: '1px solid rgba(170,204,51,0.22)',
            color: '#AACC33', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', cursor: 'pointer', padding: '4px 10px',
            borderRadius: 6, transition: 'background 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(170,204,51,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(170,204,51,0.08)' }}
        >
          Now
        </button>
      </div>

      {/* Wheel */}
      <div className="relative" style={{ height: 196 }}>
        {/* Shared selection pill spanning all columns */}
        <div className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 h-[42px] rounded-2xl bg-white/[0.05]" />
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[64px] z-10" style={{ background: 'linear-gradient(to bottom, #111 10%, transparent 100%)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[64px] z-10" style={{ background: 'linear-gradient(to top, #111 10%, transparent 100%)' }} />
        {/* Columns */}
        <div className="flex h-full items-stretch">
          <TimeColumn
            options={hourOptions} value={selected.hour}
            onChange={(hour) => update({ hour })}
            className="flex-1" textAlign="right" btnPaddingClass="pr-2"
          />
          <div className="flex items-center justify-center w-5 shrink-0 text-[#444] text-[16px] font-bold pointer-events-none z-20 pb-px">:</div>
          <TimeColumn
            options={minuteOptions} value={selected.minute}
            onChange={(minute) => update({ minute })}
            className="flex-1" textAlign="left" btnPaddingClass="pl-1"
          />
          <TimeColumn
            options={periodOptions} value={selected.period}
            onChange={(period) => update({ period })}
            className="w-[68px] shrink-0" textAlign="left" btnPaddingClass="pl-3"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#1a1a1a] px-4 py-3 gap-3">
        <span className="font-mono text-[16px] font-bold text-[#AACC33] tracking-wider">
          {toReadableTime(value) || '--:-- --'}
        </span>
        <button
          type="button" onClick={onClose}
          style={{
            padding: '7px 18px', borderRadius: 8, background: '#AACC33', border: 'none',
            color: '#000', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', cursor: 'pointer', transition: 'background 150ms, transform 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#BADA44' }}
          onMouseLeave={e => { e.currentTarget.style.background='#AACC33' }}
          onMouseDown={e => { e.currentTarget.style.transform='scale(0.96)' }}
          onMouseUp={e => { e.currentTarget.style.transform='scale(1)' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

function TimeField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const active = open || Boolean(value)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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
        value={toReadableTime(value)}
        placeholder="--:-- --"
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Backspace' || e.key === 'Delete') onChange('')
        }}
        readOnly
        style={{ cursor: 'pointer' }}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(170,204,51,0.12)' : 'transparent',
          border: 'none',
          borderRadius: 8,
          color: open ? '#AACC33' : '#444',
          cursor: 'pointer',
          transition: 'background 150ms, color 150ms',
          zIndex: 10,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#888' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#444' } }}
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

function CharCount({ value, max }) {
  const len = (value || '').length
  return (
    <span className={`text-right text-[10px] tabular-nums ${len > max * 0.8 ? 'text-[#AACC33]/60' : 'text-[#555]'}`}>
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

      {/* Hero */}
      <div className={P.card} style={{ gap: '20px' }}>
        <div>
          <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#555]">
            {app.orgName || 'Organisation'}
          </p>
          <h1 className="m-0 font-black text-[22px] text-[#F0F0F0] leading-tight tracking-tight">New Meeting</h1>
          <p className="m-0 mt-[6px] text-[#666] text-[13px] leading-[1.6]">
            Fill the details below. A notice and agenda form are generated automatically.
          </p>
        </div>

      </div>

      {/* 01 Identity */}
      <div className={P.card}>
        <SecHead n="01">Identity</SecHead>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Meeting header">
            <div ref={headerWrapRef} className="relative">
              <input
                className={`${P.input} pr-11 ${headerOpen ? 'border-[#AACC33]/55 [box-shadow:0_0_0_3px_rgba(170,204,51,0.08)]' : ''}`}
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
                  headerOpen ? 'text-[#AACC33] bg-[#AACC33]/10' : 'text-[#555] hover:text-[#888] hover:bg-white/[0.04]'
                }`}
                onClick={() => setHeaderOpen((open) => !open)}
                aria-label="Toggle meeting header suggestions"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${headerOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {headerOpen && filteredMeetingHeaders.length > 0 && (
                <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[#262626] bg-[#101010] shadow-[0_16px_45px_rgba(0,0,0,0.55)]">
                  <div className="max-h-52 overflow-y-auto p-1">
                    {filteredMeetingHeaders.map((header) => (
                      <button
                        key={header}
                        type="button"
                        className="w-full text-left px-3 py-3 rounded-lg text-[#d8d8d8] text-[13px] font-semibold hover:bg-[#AACC33]/10 hover:text-[#F0F0F0] focus:bg-[#AACC33]/10 focus:text-[#F0F0F0] outline-none transition-colors"
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

        <div className="h-px bg-[#1a1a1a]" />
        <SecHead>Attendees</SecHead>

        {/* Add attendee */}
        <div className="grid gap-4 p-4 rounded-xl border border-[#1e1e1e] bg-[#080808]">
          <div>
            <span className="uppercase tracking-[0.15em] text-[10px] text-[#AACC33]/70 font-semibold block">Add attendee</span>
            <span className="text-[#666] text-[11px]">Select a saved person or add an external attendee</span>
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
            <p className="m-0 text-[#555] text-[11px]">All saved people already added.</p>
          )}

          <div className="h-px bg-[#1a1a1a]" />

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
        <div className="grid gap-3 p-4 rounded-xl border border-[#1e1e1e] bg-[#080808]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#AACC33]/70 font-semibold block">Selected attendees</span>
              <span className="text-[#666] text-[11px]">Caller is included automatically</span>
            </div>
            <span className="px-[10px] py-[4px] rounded-full bg-[#141414] border border-[#222] text-[10px] uppercase tracking-[0.1em] text-[#444]">
              {selectedAttendees.length}
            </span>
          </div>
          {selectedAttendees.length > 0 ? (
            <div className="grid gap-[6px]">
              {selectedAttendees.map((attendee) => (
                <div key={attendee.id}
                  className="flex items-start justify-between gap-3 px-3 py-[9px] rounded-lg border border-[#1a1a1a] bg-[#0d0d0d]">
                  <div className="flex items-start gap-[10px] min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[9px] font-bold text-[#AACC33] shrink-0 mt-[1px]">
                      {attendee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[#F0F0F0] text-[12px] truncate">{attendee.name}</div>
                      <div className="text-[#555] text-[10px] flex flex-wrap items-center gap-1 mt-[2px]">
                        <span>{attendee.id === callerPerson?.id ? 'Caller' : attendee.desig || 'Attendee'}</span>
                        {attendee.source === 'manual' && <span>- external</span>}
                        {attendee.mobile && <span>- {attendee.mobile}</span>}
                      </div>
                    </div>
                  </div>
                  {attendee.source === 'manual' ? (
                    <button className="text-[#FF5A5A]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#FF5A5A] transition-colors shrink-0"
                      onClick={() => app.removeManualAttendee(attendee.id)}>Remove</button>
                  ) : attendee.id !== callerPerson?.id ? (
                    <button className="text-[#FF5A5A]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#FF5A5A] transition-colors shrink-0"
                      onClick={() => app.setMeetingAttendeeIds((cur) => cur.filter((id) => id !== attendee.id))}>Remove</button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 border border-dashed border-[#1e1e1e] rounded-lg text-[#555] text-[11px] text-center">
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
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#AACC33]/[0.05] border border-[#AACC33]/15">
            <span className="text-[#AACC33] text-[13px] shrink-0">✓</span>
            <p className="m-0 text-[12px] text-[#AACC33]/70 leading-snug">
              {dateLabel && timeLabel
                ? <>{dateLabel} <span className="text-[#AACC33]/35 mx-1">·</span> {timeLabel}</>
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

        <p className="m-0 text-[#666] text-[11px] leading-[1.5]">
          Add one or more purposes for this meeting. Each purpose can have its own desired outcome and documents.
        </p>

        <label className="flex items-start gap-3 p-3 rounded-xl border border-[#1e1e1e] bg-[#080808] cursor-pointer">
          <input
            type="checkbox"
            checked={app.meetingForm.includeAdditionalPoints !== false}
            onChange={(e) => app.setMeetingForm((c) => ({ ...c, includeAdditionalPoints: e.target.checked }))}
            className="mt-[2px] h-4 w-4 min-h-0 accent-[#AACC33] cursor-pointer"
          />
          <span className="grid gap-[3px] normal-case tracking-normal">
            <span className="text-[#F0F0F0] text-[12px] font-semibold">Add additional points section</span>
            <span className="text-[#666] text-[11px] leading-[1.45]">
              Include the blank Other Discussions area in the agenda form preview and print.
            </span>
          </span>
        </label>

        {purposes.map((purpose, index) => (
          <div key={index} className="grid gap-3 p-4 rounded-xl border border-[#1e1e1e] bg-[#080808]">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[#AACC33]/70 font-semibold">
                Purpose {index + 1}
              </span>
              {purposes.length > 1 && (
                <button
                  className="text-[#FF5A5A]/60 text-[10px] uppercase tracking-[0.08em] hover:text-[#FF5A5A] transition-colors"
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

        <div className="h-px bg-[#1a1a1a]" />
        <button className={P.primary} onClick={app.generateMeeting} disabled={!canGenerate}>
          Generate &amp; Save Meeting →
        </button>
        {!canGenerate && (
          <p className="text-[11px] text-[#555] text-center m-0">
            Name, date (dd/mm/yyyy), time, caller, and at least one purpose required
          </p>
        )}
      </div>

    </section>
  )
}
