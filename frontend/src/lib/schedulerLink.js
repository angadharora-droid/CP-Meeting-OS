// Executive Scheduler opens New Meeting with one of its Meeting tasks in the address:
//   /new-meeting?title=…&date=yyyy-mm-dd&time=HH:MM&minutes=…&unit=…
// and adds embed=scheduler&parent=<its origin> when it shows this page inside its own dialog.
// The address is read once, when the app loads, because it is cleaned up afterwards.
import { durationMinutes, toDateLabel } from './meetingOs'

const params = new URLSearchParams(window.location.search)

// Inside the Scheduler's dialog: the page shows without Meeting OS's own header and menus,
// and tells the Scheduler when the meeting is saved.
export const EMBEDDED = params.get('embed') === 'scheduler' && window.parent !== window

const parentOrigin = (() => {
  try {
    return new URL(params.get('parent') || '').origin
  } catch {
    return ''
  }
})()

const DURATIONS = ['30 minutes', '45 minutes', '1 hour', '1.5 hours', '2 hours', '3 hours']

// The task's length rounded to the nearest duration the form offers (a tie takes the longer).
function nearestDuration(minutes) {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m <= 0) return ''
  return DURATIONS.reduce((best, d) =>
    Math.abs(durationMinutes(d) - m) <= Math.abs(durationMinutes(best) - m) ? d : best)
}

// The form fields the Scheduler filled in, or null when it did not send any.
export function schedulerPrefill() {
  const title = String(params.get('title') || '').trim()
  if (!title) return null
  const date = String(params.get('date') || '')
  const time = String(params.get('time') || '')
  const prefill = { title }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) prefill.date = toDateLabel(date)
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) prefill.time = time
  const duration = nearestDuration(params.get('minutes'))
  if (duration) prefill.duration = duration
  const unit = String(params.get('unit') || '').trim()
  if (unit) prefill.unit = unit
  return prefill
}

function dmyToIso(value) {
  const m = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

// Tells the Scheduler the meeting is saved, so it can close its dialog and move its task to
// the meeting's date and time. Only the page that opened this one hears it.
export function notifySchedulerSaved(meeting) {
  if (!EMBEDDED || !parentOrigin) return
  window.parent.postMessage({
    type: 'meeting-os:saved',
    meetingId: meeting.meetingId,
    title: meeting.title,
    date: dmyToIso(meeting.date),
    time: meeting.time || '',
    minutes: durationMinutes(meeting.duration),
  }, parentOrigin)
}
