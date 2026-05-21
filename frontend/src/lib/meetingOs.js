const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || ''

export const API = `${API_BASE_URL}/api`

export const blankTopic = { topic: '', purpose: '', desiredOutcome: '', documents: '' }

export const blankMeeting = {
  meetingHeader: '',
  title: '',
  unit: '',
  calledBy: '',
  calledById: '',
  date: '',
  time: '',
  duration: '1 hour',
  mode: 'inperson',
  venue: '',
  vcLink: '',
  topics: [{ topic: '', purpose: '', desiredOutcome: '', documents: '' }],
  includeAdditionalPoints: true,
  note: '',
}

export const blankPerson = { name: '', desig: '', email: '' }
export const blankManager = { id: '', name: '', desig: '', email: '', pin: '' }
export const blankManualAttendee = { id: '', name: '', desig: '', email: '', mobile: '' }
export const blankPinChange = { currentPin: '', newPin: '', confirmPin: '' }
export const blankPinResetRequest = { name: '', email: '' }

export function makeAttendee(person, source = 'database') {
  return {
    id: String(person?.id || '').trim(),
    name: String(person?.name || '').trim(),
    desig: String(person?.desig || '').trim(),
    email: String(person?.email || '').trim().toLowerCase(),
    mobile: String(person?.mobile || '').trim(),
    source,
    invite: source !== 'manual',
  }
}

export function uid() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
}

export function generateRefNo() {
  return `MO/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`
}

export function durationMinutes(duration) {
  return {
    '30 minutes': 30,
    '45 minutes': 45,
    '1 hour': 60,
    '1.5 hours': 90,
    '2 hours': 120,
    '3 hours': 180,
  }[duration] || 60
}

export function getMeetingMode(meeting) {
  return meeting?.mode || meeting?.type || ''
}

export function getMeetingModeLabel(meeting) {
  return {
    inperson: 'In Person',
    physical: 'Physical',
    vc: 'Video Conference',
    virtual: 'Virtual',
    hybrid: 'Hybrid',
  }[getMeetingMode(meeting)] || getMeetingMode(meeting) || 'TBD'
}

export function getMeetingVenue(meeting) {
  return meeting?.venue || meeting?.location || meeting?.vcLink || ''
}

export function getMeetingCallerLabel(meeting, user) {
  return meeting?.calledBy || meeting?.calledByName || (user?.role === 'admin' ? user?.name || 'Rohit' : 'Unassigned')
}

export function toDateLabel(dateString) {
  if (!dateString) return ''
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString
  const date = new Date(`${dateString}T00:00:00`)
  if (isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function parseUserDateInput(input) {
  if (!input || !input.trim()) return null
  const parts = input.trim().split('/')
  if (parts.length !== 3) return null
  
  const [day, month, year] = parts.map(p => parseInt(p, 10))
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  if (year < 1900 || year > 2100) return null
  
  const date = new Date(year, month - 1, day)
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isValidDate(dateString) {
  if (!dateString) return false
  const date = new Date(`${dateString}T00:00:00`)
  return !isNaN(date.getTime())
}

export function normalizeListText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•*\d.]+\s*/, ''))
}

const NOTICE_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toNoticeDateLabel(dateString) {
  if (!dateString) return '(To be confirmed)'

  if (dateString.includes('/')) {
    const [dd, mm, yyyy] = dateString.split('/')
    const month = NOTICE_MONTHS[Number(mm) - 1]
    return month ? `${Number(dd)} ${month} ${yyyy}` : dateString
  }

  const [yyyy, mm, dd] = dateString.split('-')
  const month = NOTICE_MONTHS[Number(mm) - 1]
  return yyyy && month && dd ? `${Number(dd)} ${month} ${yyyy}` : dateString
}

function toNoticeTimeLabel(timeString) {
  if (!timeString) return ''
  const [rawHours, rawMinutes] = timeString.split(':').map(Number)
  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return timeString

  const period = rawHours >= 12 ? 'PM' : 'AM'
  const hours = rawHours % 12 || 12
  return `${String(hours).padStart(2, '0')}:${String(rawMinutes).padStart(2, '0')} ${period}`
}

function toNoticeTimeRange(meeting) {
  if (!meeting.time) return '(To be confirmed)'

  const [hours, minutes] = meeting.time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return meeting.time

  const endMinutes = hours * 60 + minutes + durationMinutes(meeting.duration)
  const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
  return `${toNoticeTimeLabel(meeting.time)} - ${toNoticeTimeLabel(endTime)}`
}

function toNoticeAttendeeList(attendees) {
  const names = attendees
    .map((person) => `${person.name || ''}${person.desig ? ` (${person.desig})` : ''}`.trim())
    .filter(Boolean)

  if (!names.length) return 'Concerned Team Members'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
}

function uniqueLines(lines) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))]
}

export function buildNotice(meeting, attendees) {
  const topics = (meeting.topics || []).filter((t) => t.topic || t.purpose)
  const purposeLines = uniqueLines(
    topics.length
      ? topics.flatMap((topic) => normalizeListText(topic.purpose || topic.topic))
      : normalizeListText(meeting.purpose),
  )
  const outcomeLines = uniqueLines(
    topics.length
      ? topics.flatMap((topic) => normalizeListText(topic.desiredOutcome))
      : normalizeListText(meeting.outcome || meeting.desiredOutcome),
  )
  const documentLines = uniqueLines(
    topics.length
      ? topics.flatMap((topic) => normalizeListText(topic.documents))
      : normalizeListText(meeting.docs || meeting.documents),
  )
  const venue = getMeetingVenue(meeting) || '(To be confirmed)'
  const note = meeting.note || 'All attendees are requested to come prepared with relevant ideas and data inputs to enable effective planning and closure.'

  return [
    '*MEETING NOTICE*',
    '',
    '*Attendees:*',
    toNoticeAttendeeList(attendees),
    '',
    `*Date:* ${toNoticeDateLabel(meeting.date)}`,
    `*Time:* ${toNoticeTimeRange(meeting)}`,
    `*Venue:* ${venue}`,
    '',
    `*Subject:* ${meeting.title || 'Meeting'}`,
    '',
    '*Purpose:*',
    ...(purposeLines.length ? purposeLines : ['To be discussed']).map((line) => `* ${line}`),
    '',
    '*Desired Outcome:*',
    ...(outcomeLines.length ? outcomeLines : ['To be discussed']).map((line) => `* ${line}`),
    '',
    '*Documents Required:*',
    ...(documentLines.length ? documentLines : ['To be shared, if any']).map((line) => `* ${line}`),
    '',
    '*Note:*',
    note,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
}

export function buildMom(meeting, attendees = [], closingNotes = '', actionPoints = []) {
  const attendeeLines = attendees.length
    ? attendees
        .map((person) => `${person.name || ''}${person.desig ? ` - ${person.desig}` : ''}`.trim())
        .filter(Boolean)
    : normalizeListText(meeting.attendees)

  const topics = (meeting.topics || []).filter((t) => t.topic || t.purpose || t.desiredOutcome)
  const agendaLines = topics.length
    ? uniqueLines(topics.flatMap((topic) => normalizeListText(topic.purpose || topic.topic)))
    : normalizeListText(meeting.purpose)
  const discussionLines = normalizeListText(closingNotes || meeting.closingNotes)

  const pointLines = actionPoints.length
    ? [
        'Action\tOwner\tDue Date',
        ...actionPoints.map((point) => [
          point.task || 'Action item',
          point.assignedTo || '-',
          point.dueDate ? toDateLabel(point.dueDate) : '-',
        ].join('\t')),
      ]
    : ['No action item recorded.']

  const followupRequired = meeting.followupRequired || meeting.followup?.required
  const followupDate = meeting.followupDate || meeting.followup?.date || ''
  const followupTime = meeting.followupTime || meeting.followup?.time || ''
  const followupPurpose = meeting.followupPurpose || meeting.followup?.purpose || ''
  const followupLines = followupRequired
    ? [
        followupDate ? `Date: ${toNoticeDateLabel(followupDate)}` : '',
        followupTime ? `Time: ${toNoticeTimeLabel(followupTime)}` : '',
        followupPurpose ? `Purpose: ${followupPurpose}` : '',
      ].filter(Boolean)
    : ['No follow-up meeting required.']

  return [
    'MINUTES OF MEETING (MoM)',
    '',
    `Subject: ${meeting.title || 'Meeting'}`,
    `Date: ${toNoticeDateLabel(meeting.date)}`,
    `Time: ${toNoticeTimeRange(meeting)}`,
    `Venue: ${getMeetingVenue(meeting) || '(Not recorded)'}`,
    '',
    'Attendees',
    ...(attendeeLines.length ? attendeeLines : ['Concerned Team Members']),
    '',
    'Agenda',
    ...(agendaLines.length ? agendaLines : ['General discussion']),
    '',
    'Key Discussion Points',
    ...(discussionLines.length ? discussionLines : ['As discussed in the meeting.']),
    '',
    actionPoints.length === 1 ? 'Action Item' : 'Action Items',
    ...pointLines,
    '',
    'Follow-up Meeting',
    ...followupLines,
  ]
    .filter((line) => line !== null && line !== undefined && line !== '')
    .join('\n')
}

const FORM_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toFormDateLabel(dateString) {
  if (!dateString) return ''
  if (dateString.includes('/')) {
    const [dd, mm, yyyy] = dateString.split('/')
    const month = FORM_MONTHS[Number(mm) - 1] || mm
    return `${Number(dd)} ${month} ${yyyy}`
  }

  const [yyyy, mm, dd] = dateString.split('-')
  if (yyyy && mm && dd) {
    const month = FORM_MONTHS[Number(mm) - 1] || mm
    return `${Number(dd)} ${month} ${yyyy}`
  }

  return dateString
}

function toFormTimeLabel(timeString) {
  if (!timeString) return ''
  const [rawHours, rawMinutes] = timeString.split(':').map(Number)
  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return timeString
  const period = rawHours >= 12 ? 'PM' : 'AM'
  const hours = rawHours % 12 || 12
  return `${hours}:${String(rawMinutes).padStart(2, '0')} ${period}`
}

export function buildForm(meeting, attendees) {
  const [hours, minutes] = (meeting.time || '00:00').split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes(meeting.duration)
  const endTime = `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
  const writeLines = (count = 3) => Array.from({ length: count }, () => '____________________________________________________________')

  const topics = (meeting.topics || []).filter((t) => t.topic || t.purpose)
  const agendaItems = topics.length > 0
    ? topics
    : normalizeListText(meeting.purpose).map((p) => ({ topic: p, purpose: p, desiredOutcome: meeting.outcome || meeting.desiredOutcome || '', documents: meeting.docs || meeting.documents || '' }))

  const sections = [
    meeting.meetingHeader ? `Meeting Header: ${meeting.meetingHeader}` : '',
    `Meeting Title : ${meeting.title}`,
    `Date          : ${toFormDateLabel(meeting.date)}`,
    `Time          : ${toFormTimeLabel(meeting.time)} - ${toFormTimeLabel(endTime)}`,
    '',
    '================================================================',
    '',
  ]

  agendaItems.forEach((item, index) => {
    const label = item.purpose || item.topic || `Purpose ${index + 1}`
    sections.push(
      `${index + 1}. ${label}`,
      '',
      'Purpose:',
      `- ${label}`,
      '',
      'Desired Outcome:',
      `- ${item.desiredOutcome || 'As discussed'}`,
      '',
      'Documents Required:',
      `- ${item.documents || 'None'}`,
    )
    sections.push('', 'Concluding Points & Actionable Notes:', ...writeLines(7), '', '----------------------------------------------------------------', '')
  })

  if (meeting.includeAdditionalPoints !== false) {
    sections.push(
      `${agendaItems.length + 1}. Other Discussions`,
      '',
      'Purpose:',
      ...writeLines(3),
      '',
      'Desired Outcome:',
      ...writeLines(3),
      '',
      'Documents Required:',
      ...writeLines(2),
      '',
      'Concluding Points & Actionable Notes:',
      ...writeLines(8),
      '',
    )
  }

  sections.push('Note: All concerned members are requested to come prepared with relevant documents.')

  return sections.join('\n')
}

export function makeCalendarUrl(meeting, person) {
  if (!person?.email) return ''

  const dateStr = meeting.date.replace(/-/g, '')
  const [h, m] = meeting.time.split(':').map(Number)
  const start = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
  const endMinutes = h * 60 + m + durationMinutes(meeting.duration)
  const end = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}${String(endMinutes % 60).padStart(2, '0')}00`
  const details = encodeURIComponent(
    `Purpose: ${meeting.purpose}\n\nOrganized by: ${meeting.calledByName || ''}\n\nVenue: ${getMeetingVenue(meeting) || ''}`,
  )
  const location = encodeURIComponent(getMeetingVenue(meeting) || '')

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${dateStr}T${start}/${dateStr}T${end}&details=${details}&location=${location}&add=${encodeURIComponent(person.email)}`
}
