import { useEffect, useRef, useState } from 'react'

const dateTimeClass = 'bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] pl-[42px] pr-[44px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)] placeholder:text-slate-400 font-mono'

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

function isoToDMY(value) {
  if (!value) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const [yyyy, mm, dd] = value.split('-')
  return `${dd}/${mm}/${yyyy}`
}

function dmyToISO(value) {
  if (!isValidDMY(value)) return ''
  const [dd, mm, yyyy] = value.split('/')
  return `${yyyy}-${mm}-${dd}`
}

function parseDMY(dmy) {
  if (!isValidDMY(dmy)) return null
  const [dd, mm, yyyy] = dmy.split('/').map(Number)
  return { d: dd, m: mm, y: yyyy }
}

function formatDMY(d, m, y) {
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
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
  const h24 = period === 'PM' ? (hour % 12) + 12 : hour === 12 ? 0 : hour
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function CalendarIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: active ? '#334155' : '#94A3B8', transition: 'color 150ms', display: 'block' }}>
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <rect x="3.5" y="9" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7" y="9" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="10.5" y="9" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="3.5" y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="7" y="11.5" width="2" height="2" rx="0.4" fill="currentColor" />
    </svg>
  )
}

function ClockIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: active ? '#334155' : '#94A3B8', transition: 'color 150ms', display: 'block' }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 4.5V8l2.4 1.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function CalendarPicker({ value, onChange, onClose }) {
  const today = new Date()
  const parsed = parseDMY(value)
  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.m - 1 : today.getMonth())
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 top-[calc(100%+6px)] z-50 w-[276px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
        <button type="button" className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => viewMonth === 0 ? (setViewMonth(11), setViewYear((y) => y - 1)) : setViewMonth((m) => m - 1)}>‹</button>
        <span className="text-[13px] font-semibold text-slate-900">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => viewMonth === 11 ? (setViewMonth(0), setViewYear((y) => y + 1)) : setViewMonth((m) => m + 1)}>›</button>
      </div>
      <div className="grid grid-cols-7 px-3 pb-1 pt-2.5">
        {DOW.map((d) => <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />
          const sel = parsed && parsed.d === d && parsed.m === viewMonth + 1 && parsed.y === viewYear
          const isToday = today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear
          return (
            <button key={d} type="button" className={`h-8 rounded-lg text-[12px] font-mono ${sel ? 'bg-slate-700 font-bold text-white' : isToday ? 'border border-slate-400 text-slate-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`} onClick={() => { onChange(formatDMY(d, viewMonth + 1, viewYear)); onClose() }}>
              {d}
            </button>
          )
        })}
      </div>
      <div className="border-t border-slate-200 px-3 py-2">
        <button type="button" className="w-full text-[10px] uppercase tracking-[0.1em] text-slate-500 hover:text-slate-700 font-semibold" onClick={() => { onChange(formatDMY(today.getDate(), today.getMonth() + 1, today.getFullYear())); onClose() }}>Today</button>
      </div>
    </div>
  )
}

export function DateField({ value, onChange, output = 'iso' }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(output === 'iso' ? isoToDMY(value) : value)
  const wrapRef = useRef(null)
  const active = open || isValidDMY(draft)

  useEffect(() => {
    setDraft(output === 'iso' ? isoToDMY(value) : value)
  }, [output, value])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function commit(nextDisplay) {
    setDraft(nextDisplay)
    onChange(output === 'iso' ? dmyToISO(nextDisplay) : nextDisplay)
  }

  function handleChange(e) {
    const next = maskDate(e.target.value)
    setDraft(next)
    if (!next || isValidDMY(next)) {
      onChange(output === 'iso' ? dmyToISO(next) : next)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" tabIndex={-1} onClick={() => setOpen((o) => !o)} className="absolute left-[13px] top-1/2 z-10 -translate-y-1/2">
        <CalendarIcon active={active} />
      </button>
      <input type="text" inputMode="numeric" maxLength={10} className={dateTimeClass} value={draft} placeholder="dd/mm/yyyy" onChange={handleChange} onFocus={() => setOpen(true)} />
      <PickerToggle open={open} onClick={() => setOpen((o) => !o)} label="Toggle calendar" />
      {open && <CalendarPicker value={draft} onChange={commit} onClose={() => setOpen(false)} />}
    </div>
  )
}

function PickerToggle({ open, onClick, label }) {
  return (
    <button type="button" tabIndex={-1} onClick={onClick} aria-label={label} className={`absolute right-2.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d={open ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

const ITEM_H = 38

function TimeColumn({ options, value, onChange, className = '', textAlign = 'center', btnPaddingClass = '' }) {
  const scrollRef = useRef(null)
  const mountedRef = useRef(false)
  const valueRef = useRef(value)

  useEffect(() => { valueRef.current = value }, [value])
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const idx = options.findIndex((o) => o.value === value)
    if (idx < 0) return
    if (mountedRef.current) container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    else {
      container.scrollTop = idx * ITEM_H
      mountedRef.current = true
    }
  }, [value, options])

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
    let timer
    function onScroll() { clearTimeout(timer); timer = setTimeout(snap, 150) }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => { container.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [options, onChange])

  return (
    <div ref={scrollRef} className={`h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      <div className="grid py-[79px]">
        {options.map((option) => {
          const sel = option.value === value
          return (
            <button key={option.value} type="button" onClick={() => onChange(option.value)} style={{ textAlign }} className={`h-[38px] w-full font-mono transition-all duration-150 ${btnPaddingClass} ${sel ? 'text-[20px] font-bold text-slate-900' : 'text-[15px] text-slate-400 hover:text-slate-600'}`}>
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
  const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => ({ value: m, label: String(m).padStart(2, '0') }))
  const periodOptions = [{ value: 'AM', label: 'am' }, { value: 'PM', label: 'pm' }]
  const update = (part) => onChange(composeTime({ ...selected, ...part }))

  return (
    <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 top-[calc(100%+6px)] z-50 w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Select time</span>
        <button type="button" onClick={() => { onChange(roundToNextQuarter()); onClose() }} className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-200">Now</button>
      </div>
      <div className="relative h-[196px]">
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-[42px] -translate-y-1/2 rounded-2xl bg-slate-100" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent" />
        <div className="flex h-full items-stretch">
          <TimeColumn options={hourOptions} value={selected.hour} onChange={(hour) => update({ hour })} className="flex-1" textAlign="right" btnPaddingClass="pr-2" />
          <div className="pointer-events-none z-20 flex w-5 shrink-0 items-center justify-center pb-px text-[16px] font-bold text-slate-400">:</div>
          <TimeColumn options={minuteOptions} value={selected.minute} onChange={(minute) => update({ minute })} className="flex-1" textAlign="left" btnPaddingClass="pl-1" />
          <TimeColumn options={periodOptions} value={selected.period} onChange={(period) => update({ period })} className="w-[68px] shrink-0" textAlign="left" btnPaddingClass="pl-3" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
        <span className="font-mono text-[16px] font-bold tracking-wider text-slate-700">{toReadableTime(value) || '--:-- --'}</span>
        <button type="button" onClick={onClose} className="rounded-lg bg-slate-700 px-[18px] py-[7px] text-[10px] font-bold uppercase tracking-[0.1em] text-white hover:bg-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.14)]">Done</button>
      </div>
    </div>
  )
}

export function TimeField({ value, onChange }) {
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
    <div ref={wrapRef} className="relative">
      <button type="button" tabIndex={-1} onClick={() => setOpen((o) => !o)} className="absolute left-[13px] top-1/2 z-10 -translate-y-1/2">
        <ClockIcon active={active} />
      </button>
      <input type="text" className={dateTimeClass} value={toReadableTime(value)} placeholder="--:-- --" onFocus={() => setOpen(true)} readOnly />
      <PickerToggle open={open} onClick={() => setOpen((o) => !o)} label="Toggle time picker" />
      {open && <TimePicker value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  )
}
