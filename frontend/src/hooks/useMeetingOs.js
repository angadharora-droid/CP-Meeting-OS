import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  API,
  blankManager,
  blankMeeting,
  blankPerson,
  blankManualAttendee,
  blankPinChange,
  blankPinResetRequest,
  buildForm,
  buildNotice,
  generateRefNo,
  getMeetingVenue,
  makeAttendee,
  makeCalendarUrl,
  toDateLabel,
  uid,
} from '../lib/meetingOs'

export function useMeetingOs(navigate, page) {
  const initialUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('mo_user') || 'null')
    } catch {
      return null
    }
  })()
  const [user, setUser] = useState(initialUser)
  const [authed, setAuthed] = useState(Boolean(initialUser))
  const [pin, setPin] = useState('')
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const [people, setPeople] = useState([])
  const [managers, setManagers] = useState([])
  const [meetings, setMeetings] = useState([])
  const [tasks, setTasks] = useState([])
  const [pinResetRequests, setPinResetRequests] = useState([])

  const [personForm, setPersonForm] = useState(blankPerson)
  const [managerForm, setManagerForm] = useState(blankManager)
  const [meetingForm, setMeetingForm] = useState(blankMeeting)
  const [meetingAttendeeIds, setMeetingAttendeeIds] = useState([])
  const [manualAttendees, setManualAttendees] = useState([])
  const [manualAttendeeForm, setManualAttendeeForm] = useState(blankManualAttendee)
  const [actionPoints, setActionPoints] = useState([{ taskId: uid(), task: '', assignedTo: '', dueDate: '' }])
  const [closureNotes, setClosureNotes] = useState('')
  const [closeMeetingId, setCloseMeetingId] = useState('')
  const [followup, setFollowup] = useState(false)
  const [followupForm, setFollowupForm] = useState({ date: '', time: '', purpose: '', note: '' })
  const [pinChangeForm, setPinChangeForm] = useState(blankPinChange)
  const [pinResetForm, setPinResetForm] = useState(blankPinResetRequest)
  const [bankFilter, setBankFilter] = useState('all')
  const [bankSort, setBankSort] = useState('date-desc')
  const [callerFilter, setCallerFilter] = useState('')
  const [bankDateFilter, setBankDateFilter] = useState('')
  const [bankQuery, setBankQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [preview, setPreview] = useState(null)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const validPages = useMemo(() => ['dashboard', 'new-meeting', 'close-meeting', 'tracker', 'bank', 'people'], [])
  const isUsersMeeting = useCallback((meeting) => {
    if (!user || user.role === 'admin') return true
    const attendeeLines = String(meeting.attendees || '').toLowerCase()
    const name = String(user.name || '').toLowerCase()
    return meeting.calledById === user.id || meeting.calledBy === user.name || attendeeLines.includes(name)
  }, [user])

  useEffect(() => {
    if (!authed) return

    let mounted = true

    async function load() {
      const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : ''
      const [peopleRes, meetingsRes, tasksRes, usersRes, pinResetRes] = await Promise.all([
        fetch(`${API}?action=get_people`).then((res) => res.json()).catch(() => []),
        fetch(`${API}?action=get_meetings${userParam}`).then((res) => res.json()).catch(() => []),
        fetch(`${API}?action=get_action_points${userParam}`).then((res) => res.json()).catch(() => []),
        isAdmin ? fetch(`${API}?action=get_users${userParam}`).then((res) => res.json()).catch(() => []) : Promise.resolve([]),
        isAdmin ? fetch(`${API}?action=get_pin_reset_requests${userParam}`).then((res) => res.json()).catch(() => []) : Promise.resolve([]),
      ])

      if (!mounted) return

      setPeople(Array.isArray(peopleRes) ? peopleRes : [])
      setManagers(Array.isArray(usersRes) ? usersRes.filter((item) => item.role === 'manager') : [])
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : [])
      setTasks(Array.isArray(tasksRes) ? tasksRes : [])
      setPinResetRequests(Array.isArray(pinResetRes) ? pinResetRes : [])
    }

    load()
    return () => {
      mounted = false
    }
  }, [authed, isAdmin, user?.id])

  const tasksWithOverdue = useMemo(() => {
    const overdueDate = new Date().toISOString().slice(0, 10)
    return tasks.map((task) =>
      task.status === 'Open' && task.dueDate && task.dueDate < overdueDate
        ? { ...task, status: 'Overdue' }
        : task,
    )
  }, [tasks])

  useEffect(() => {
    if (authed && !validPages.includes(page)) {
      navigate('/dashboard', { replace: true })
    }
  }, [authed, navigate, page, validPages])

  const filteredMeetings = useMemo(() => {
    let list = [...meetings]
    if (isManager) {
      list = list.filter((meeting) => isUsersMeeting(meeting))
    }
    if (bankFilter !== 'all') list = list.filter((meeting) => meeting.status === bankFilter)
    if (callerFilter) list = list.filter((meeting) => meeting.calledBy === callerFilter)
    if (bankDateFilter) list = list.filter((meeting) => meeting.date === bankDateFilter)
    if (bankQuery.trim()) {
      const q = bankQuery.trim().toLowerCase()
      list = list.filter(
        (meeting) =>
          (meeting.title || '').toLowerCase().includes(q) ||
          (meeting.meetingHeader || '').toLowerCase().includes(q) ||
          (meeting.calledBy || '').toLowerCase().includes(q) ||
          (meeting.purpose || '').toLowerCase().includes(q) ||
          (meeting.attendees || '').toLowerCase().includes(q) ||
          getMeetingVenue(meeting).toLowerCase().includes(q) ||
          (meeting.date || '').includes(q),
      )
    }

    list.sort((a, b) => {
      if (bankSort === 'date-desc') return (b.date || '').localeCompare(a.date || '')
      if (bankSort === 'date-asc') return (a.date || '').localeCompare(b.date || '')
      if (bankSort === 'title-asc') return (a.title || '').localeCompare(b.title || '')
      if (bankSort === 'caller') return (a.calledBy || '').localeCompare(b.calledBy || '')
      return 0
    })

    return list
  }, [bankDateFilter, bankFilter, bankQuery, bankSort, callerFilter, isManager, isUsersMeeting, meetings])

  const visibleTasks = useMemo(() => {
    const userTasks = isManager ? tasksWithOverdue.filter((task) => task.assignedTo === user?.name) : tasksWithOverdue
    const filtered = taskFilter === 'all' ? userTasks : userTasks.filter((task) => task.status === taskFilter)
    return [...filtered].sort((a, b) => {
      const order = { Overdue: 0, Open: 1, Done: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return (a.dueDate || '').localeCompare(b.dueDate || '')
    })
  }, [isManager, taskFilter, tasksWithOverdue, user?.name])

  const countedTasks = isManager ? tasksWithOverdue.filter((task) => task.assignedTo === user?.name) : tasksWithOverdue
  const openCount = countedTasks.filter((task) => task.status === 'Open' || task.status === 'Overdue').length
  const overdueCount = countedTasks.filter((task) => task.status === 'Overdue').length
  const userMeetings = isManager ? meetings.filter((meeting) => isUsersMeeting(meeting)) : meetings
  const today = new Date().toISOString().slice(0, 10)
  const todayMeetings = userMeetings
    .filter((meeting) => meeting.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const openMeetings = userMeetings.filter((meeting) => meeting.status !== 'Closed' && meeting.status !== 'Cancelled')
  const callers = [...new Set(userMeetings.map((meeting) => meeting.calledBy).filter(Boolean))].sort()
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { meetings: [], tasks: [], people: [] }

    return {
      meetings: userMeetings.filter(
        (meeting) =>
          (meeting.title || '').toLowerCase().includes(q) ||
          (meeting.meetingHeader || '').toLowerCase().includes(q) ||
          (meeting.calledBy || '').toLowerCase().includes(q) ||
          (meeting.purpose || '').toLowerCase().includes(q) ||
          (meeting.attendees || '').toLowerCase().includes(q) ||
          getMeetingVenue(meeting).toLowerCase().includes(q) ||
          (meeting.date || '').includes(q),
      ),
      tasks: visibleTasks.filter(
        (task) =>
          (task.task || '').toLowerCase().includes(q) ||
          (task.assignedTo || '').toLowerCase().includes(q) ||
          (task.meetingTitle || '').toLowerCase().includes(q),
      ),
      people: [...people, ...managers].filter(
        (person) =>
          (person.name || '').toLowerCase().includes(q) ||
          (person.desig || '').toLowerCase().includes(q) ||
          (person.email || '').toLowerCase().includes(q),
      ),
    }
  }, [managers, people, query, userMeetings, visibleTasks])

  const contactPeople = useMemo(() => {
    const byId = new Map()
    ;[...people, ...managers].forEach((person) => {
      const key = person.id || person.email || `${person.name}:${person.desig}`
      if (!byId.has(key)) byId.set(key, person)
    })
    return [...byId.values()]
  }, [managers, people])

  const activeMeeting = meetings.find((meeting) => meeting.meetingId === closeMeetingId)

  function showToast(message) {
    setToast(message)
    window.clearTimeout(showToast._timer)
    showToast._timer = window.setTimeout(() => setToast(''), 2500)
  }

  async function apiPost(payload) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, ...payload }),
    })
    return response.json()
  }

  async function loginWithPin(pinValue) {
    const result = await apiPost({ action: 'login', pin: pinValue })
    if (!result?.ok || !result.user) {
      showToast(result?.error || 'Incorrect PIN')
      setPin('')
      return
    }

    sessionStorage.setItem('mo_user', JSON.stringify(result.user))
    setUser(result.user)
    setAuthed(true)
    setPin('')
  }

  function unlock() {
    loginWithPin(pin)
  }

  function setPinDigit(digit) {
    if (pin.length >= 6) return
    const next = `${pin}${digit}`
    setPin(next)
    if (next.length === 6) {
      window.setTimeout(() => loginWithPin(next), 100)
    }
  }

  function pinBack() {
    setPin((current) => current.slice(0, -1))
  }

  async function addPerson() {
    if (!personForm.name.trim() || !personForm.email.trim()) {
      showToast('Name and Gmail are required')
      return
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(personForm.email.trim())) {
      showToast('Use a Gmail address')
      return
    }

    const person = {
      id: uid(),
      name: personForm.name.trim(),
      desig: personForm.desig.trim(),
      email: personForm.email.trim().toLowerCase(),
    }

    const result = await apiPost({ action: 'add_person', ...person })
    if (!result?.ok) {
      showToast(result?.error || 'Could not save person')
      return
    }

    setPeople((current) => [...current, person])
    setPersonForm(blankPerson)
    showToast('Person saved')
  }

  async function addManager() {
    if (!isAdmin) {
      showToast('Only admin can add managers')
      return
    }
    if (!managerForm.name.trim() || !managerForm.desig.trim() || !managerForm.email.trim() || !managerForm.pin.trim()) {
      showToast('Name, designation, Gmail and PIN are required')
      return
    }
    if (!/^[^\s@]+@gmail\.com$/i.test(managerForm.email.trim())) {
      showToast('Use a Gmail address')
      return
    }
    if (!/^\d{6}$/.test(managerForm.pin.trim())) {
      showToast('PIN must be six digits')
      return
    }

    const result = await apiPost({
      action: 'add_manager',
      name: managerForm.name.trim(),
      desig: managerForm.desig.trim(),
      email: managerForm.email.trim().toLowerCase(),
      pin: managerForm.pin.trim(),
    })
    if (!result?.ok) {
      showToast(result?.error || 'Could not save manager')
      return
    }

    setManagers((current) => [...current, result.user])
    setPeople((current) => {
      if (current.some((person) => person.email === result.user.email)) return current
      return [...current, { id: result.user.id, name: result.user.name, desig: result.user.desig, email: result.user.email }]
    })
    setManagerForm(blankManager)
    showToast('Manager saved')
  }

  function editManager(manager) {
    setManagerForm({ id: manager.id, name: manager.name || '', desig: manager.desig || '', email: manager.email || '', pin: '' })
  }

  async function saveManager() {
    if (!managerForm.id) {
      await addManager()
      return
    }
    if (!isAdmin) {
      showToast('Only admin can edit managers')
      return
    }
    if (!managerForm.name.trim() || !managerForm.desig.trim() || !managerForm.email.trim()) {
      showToast('Name, designation and Gmail are required')
      return
    }
    if (!/^[^\s@]+@gmail\.com$/i.test(managerForm.email.trim())) {
      showToast('Use a Gmail address')
      return
    }
    if (managerForm.pin.trim() && !/^\d{6}$/.test(managerForm.pin.trim())) {
      showToast('PIN must be six digits')
      return
    }

    const result = await apiPost({
      action: 'update_manager',
      id: managerForm.id,
      name: managerForm.name.trim(),
      desig: managerForm.desig.trim(),
      email: managerForm.email.trim().toLowerCase(),
      pin: managerForm.pin.trim(),
    })
    if (!result?.ok) {
      showToast(result?.error || 'Could not update manager')
      return
    }

    setManagers((current) => current.map((manager) => (manager.id === result.user.id ? result.user : manager)))
    setPeople((current) => current.map((person) => (person.id === result.user.id ? { ...person, name: result.user.name, desig: result.user.desig, email: result.user.email } : person)))
    setManagerForm(blankManager)
    showToast('Manager updated')
  }

  async function deleteManager(id) {
    if (!isAdmin) {
      showToast('Only admin can delete managers')
      return
    }

    const result = await apiPost({ action: 'delete_manager', id })
    if (!result?.ok) {
      showToast(result?.error || 'Could not delete manager')
      return
    }

    setManagers((current) => current.filter((manager) => manager.id !== id))
    setPeople((current) => current.filter((person) => person.id !== id))
    if (managerForm.id === id) setManagerForm(blankManager)
    showToast('Manager removed')
  }

  async function deletePerson(id) {
    const result = await apiPost({ action: 'delete_person', id })
    if (!result?.ok) {
      showToast(result?.error || 'Could not delete person')
      return
    }

    setPeople((current) => current.filter((person) => person.id !== id))
    showToast('Person removed')
  }

  function addManualAttendee() {
    if (!manualAttendeeForm.name.trim()) {
      showToast('Attendee name is required')
      return
    }

    setManualAttendees((current) => [
      ...current,
      makeAttendee({
        id: uid(),
        name: manualAttendeeForm.name.trim(),
        desig: manualAttendeeForm.desig.trim(),
        email: manualAttendeeForm.email.trim().toLowerCase(),
        mobile: manualAttendeeForm.mobile.trim(),
      }, 'manual'),
    ])
    setManualAttendeeForm(blankManualAttendee)
    showToast('External attendee added')
  }

  function removeManualAttendee(id) {
    setManualAttendees((current) => current.filter((attendee) => attendee.id !== id))
  }

  async function requestPinReset() {
    if (!pinResetForm.email.trim()) {
      showToast('Email is required')
      return
    }

    const result = await apiPost({
      action: 'request_pin_reset',
      name: pinResetForm.name.trim(),
      email: pinResetForm.email.trim().toLowerCase(),
    })

    if (!result?.ok) {
      showToast(result?.error || 'Could not send request')
      return
    }

    setPinResetForm(blankPinResetRequest)
    showToast('Request sent to admin')
  }

  async function issueTempPin(requestId) {
    if (!isAdmin) {
      showToast('Only admin can issue temp PINs')
      return
    }

    const result = await apiPost({ action: 'issue_temp_pin', requestId })
    if (!result?.ok) {
      showToast(result?.error || 'Could not issue temp PIN')
      return
    }

    setPinResetRequests((current) =>
      current.map((request) =>
        request.requestId === requestId
          ? { ...request, status: 'issued', tempPin: result.tempPin, resolvedAt: new Date().toISOString(), issuedBy: user?.name || 'Admin' }
          : request,
      ),
    )
    showToast(`Temp PIN: ${result.tempPin}`)
  }

  async function changePin() {
    if (!pinChangeForm.currentPin.trim() || !pinChangeForm.newPin.trim()) {
      showToast('Current and new PIN are required')
      return
    }
    if (!/^\d{6}$/.test(pinChangeForm.newPin.trim())) {
      showToast('New PIN must be six digits')
      return
    }
    if (pinChangeForm.newPin.trim() !== pinChangeForm.confirmPin.trim()) {
      showToast('PIN confirmation does not match')
      return
    }

    const result = await apiPost({
      action: 'change_pin',
      currentPin: pinChangeForm.currentPin.trim(),
      newPin: pinChangeForm.newPin.trim(),
    })

    if (!result?.ok) {
      showToast(result?.error || 'Could not change PIN')
      return
    }

    setPinChangeForm(blankPinChange)
    showToast('PIN updated')
  }

  function addActionPoint() {
    setActionPoints((current) => [...current, { taskId: uid(), task: '', assignedTo: '', dueDate: '' }])
  }

  function updateActionPoint(taskId, key, value) {
    setActionPoints((current) => current.map((row) => (row.taskId === taskId ? { ...row, [key]: value } : row)))
  }

  function removeActionPoint(taskId) {
    setActionPoints((current) => current.filter((row) => row.taskId !== taskId))
  }

  async function generateMeeting() {
    const managerCaller = isManager ? contactPeople.find((person) => person.email === user?.email || person.name === user?.name) : null
    const adminCaller = isAdmin && user?.id
      ? { id: user.id, name: user.name || 'Admin', desig: user.desig || '', email: user.email || '' }
      : null
    const caller = contactPeople.find((person) => person.id === meetingForm.calledBy) || managerCaller || adminCaller
    const internalAttendees = contactPeople.filter((person) => meetingAttendeeIds.includes(person.id))
    const attendees = [
      caller ? makeAttendee(caller, 'database') : null,
      ...internalAttendees.map((person) => makeAttendee(person, 'database')),
      ...manualAttendees,
    ].filter(Boolean)
    const uniqueAttendees = []
    const seenKeys = new Set()
    attendees.forEach((attendee) => {
      const key = attendee.id || attendee.email || attendee.name
      if (seenKeys.has(key)) return
      seenKeys.add(key)
      uniqueAttendees.push(attendee)
    })
    const topicsClean = (meetingForm.topics || []).filter(
      (t) => t.topic || t.purpose || t.desiredOutcome || t.documents,
    )
    const meeting = {
      meetingId: uid(),
      meetingHeader: meetingForm.meetingHeader.trim(),
      title: meetingForm.title.trim(),
      date: meetingForm.date,
      time: meetingForm.time,
      duration: meetingForm.duration,
      mode: meetingForm.mode,
      venue: meetingForm.venue.trim(),
      vcLink: meetingForm.vcLink.trim(),
      unit: meetingForm.unit.trim(),
      calledById: caller?.id || '',
      calledBy: caller?.name || '',
      calledByName: caller?.name || 'Organizer',
      attendees: uniqueAttendees.map((person) => person.name).join('\n'),
      attendeeDetails: uniqueAttendees,
      topics: topicsClean,
      includeAdditionalPoints: meetingForm.includeAdditionalPoints !== false,
      purpose: topicsClean.map((t) => [t.topic, t.purpose].filter(Boolean).join(': ')).filter(Boolean).join('\n'),
      outcome: topicsClean.map((t) => t.desiredOutcome).filter(Boolean).join('\n'),
      docs: topicsClean.map((t) => t.documents).filter(Boolean).join('\n'),
      note: meetingForm.note.trim(),
      status: 'Open',
      refNo: generateRefNo(),
    }

    const noticeText = buildNotice(meeting, uniqueAttendees)
    const formText = buildForm(meeting, uniqueAttendees)

    const result = await apiPost({ action: 'log_meeting', ...meeting, noticeText, formText })
    if (!result?.ok) {
      showToast(result?.error || 'Could not save meeting')
      return
    }

    setMeetings((current) => [{ ...meeting, noticeText, formText }, ...current])
    setCloseMeetingId(meeting.meetingId)
    setMeetingForm(blankMeeting)
    setMeetingAttendeeIds([])
    setManualAttendees([])
    setManualAttendeeForm(blankManualAttendee)
    navigate('/bank')
    showToast('Meeting saved')
  }

  async function closeMeeting() {
    if (!closeMeetingId) {
      showToast('Select a meeting first')
      return
    }

    const points = actionPoints
      .map((row) => ({
        taskId: row.taskId,
        task: row.task.trim(),
        assignedTo: row.assignedTo.trim(),
        dueDate: row.dueDate,
      }))
      .filter((row) => row.task)

    const payload = {
      action: 'close_meeting',
      meetingId: closeMeetingId,
      notes: closureNotes.trim(),
      closedOn: new Date().toISOString(),
    }

    const updateMeeting = meetings.find((meeting) => meeting.meetingId === closeMeetingId)
    if (!updateMeeting) return

    const closeResult = await apiPost(payload)
    if (!closeResult?.ok) {
      showToast(closeResult?.error || 'Could not close meeting')
      return
    }

    if (points.length) {
      const taskResult = await apiPost({
        action: 'save_action_points',
        meetingId: closeMeetingId,
        meetingTitle: updateMeeting.title,
        meetingDate: updateMeeting.date,
        points,
      })

      if (!taskResult?.ok) {
        showToast(taskResult?.error || 'Action points failed to save')
        return
      }
    }

    const normalizedPoints = points.map((point) => ({
      ...point,
      meetingId: closeMeetingId,
      meetingTitle: updateMeeting.title,
      meetingDate: updateMeeting.date,
      status: 'Open',
    }))

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === closeMeetingId ? { ...meeting, status: 'Closed', closingNotes: closureNotes, actionPoints: points } : meeting,
      ),
    )
    setTasks((current) => [...normalizedPoints, ...current])
    setActionPoints([{ taskId: uid(), task: '', assignedTo: '', dueDate: '' }])
    setClosureNotes('')
    setFollowup(false)
    setFollowupForm({ date: '', time: '', purpose: '', note: '' })
    showToast('Meeting closed')

    if (followup && followupForm.date) {
      setMeetingForm((current) => ({
        ...current,
        meetingHeader: updateMeeting.meetingHeader || current.meetingHeader,
        title: `Follow-up: ${updateMeeting.title}`,
        date: followupForm.date,
        time: followupForm.time || current.time,
        topics: [{ topic: '', purpose: followupForm.purpose || `Follow-up on: ${updateMeeting.title}`, desiredOutcome: '', documents: '' }],
        note: followupForm.note || `Follow-up to meeting held on ${toDateLabel(updateMeeting.date)}`,
        unit: updateMeeting.unit || '',
        calledBy: people.find((person) => person.name === updateMeeting.calledBy)?.id || current.calledBy,
      }))
      navigate('/new-meeting')
    }
  }

  async function postponeMeeting({ meetingId, postponedToDate, postponedToTime, reason }) {
    if (!meetingId || !postponedToDate || !postponedToTime || !reason) {
      showToast('Date, time and reason are required')
      return
    }

    const result = await apiPost({
      action: 'postpone_meeting',
      meetingId,
      postponedToDate,
      postponedToTime,
      reason,
    })

    if (!result?.ok) {
      showToast(result?.error || 'Could not postpone meeting')
      return
    }

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === meetingId
          ? {
              ...meeting,
              status: 'Postponed',
              date: postponedToDate,
              time: postponedToTime,
              postponedToDate,
              postponedToTime,
              postponeReason: reason,
            }
          : meeting,
      ),
    )
    navigate('/bank')
    showToast('Meeting postponed')
  }

  async function cancelMeeting({ meetingId, reason }) {
    if (!meetingId || !reason) {
      showToast('Reason is required')
      return
    }

    const result = await apiPost({ action: 'cancel_meeting', meetingId, reason })
    if (!result?.ok) {
      showToast(result?.error || 'Could not cancel meeting')
      return
    }

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === meetingId
          ? {
              ...meeting,
              status: 'Cancelled',
              cancellationReason: reason,
            }
          : meeting,
      ),
    )
    navigate('/bank')
    showToast('Meeting cancelled')
  }

  async function markTask(taskId, status) {
    const result = await apiPost({ action: 'update_task', taskId, status })
    if (!result?.ok) {
      showToast(result?.error || 'Could not update task')
      return
    }

    setTasks((current) => current.map((task) => (task.taskId === taskId ? { ...task, status } : task)))
    showToast(`Marked ${status}`)
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard'))
  }

  function openCalendarLinks() {
    const selected = contactPeople.filter((person) => meetingAttendeeIds.includes(person.id) && person.email)
    if (!selected.length) {
      showToast('No attendees available')
      return
    }

    selected.slice(0, 5).forEach((person, index) => {
      window.setTimeout(() => window.open(makeCalendarUrl({ ...meetingForm, calledByName: people.find((person) => person.id === meetingForm.calledBy)?.name || '' }, person), '_blank'), index * 450)
    })
    showToast('Calendar links opened')
  }

  function logout() {
    sessionStorage.removeItem('mo_user')
    setUser(null)
    setAuthed(false)
    setPin('')
    navigate('/new-meeting', { replace: true })
  }

  function goToCloseMeeting() {
    navigate('/close-meeting')
  }

  return {
    authed,
    setAuthed,
    user,
    isAdmin,
    isManager,
    pin,
    setPinDigit,
    pinBack,
    unlock,
    toast,
    showToast,
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    people,
    managers,
    meetings,
    tasks,
    personForm,
    setPersonForm,
    managerForm,
    setManagerForm,
    meetingForm,
    setMeetingForm,
    meetingAttendeeIds,
    setMeetingAttendeeIds,
    actionPoints,
    closureNotes,
    setClosureNotes,
    closeMeetingId,
    setCloseMeetingId,
    followup,
    setFollowup,
    followupForm,
    setFollowupForm,
    bankFilter,
    setBankFilter,
    bankSort,
    setBankSort,
    bankDateFilter,
    setBankDateFilter,
    callerFilter,
    setCallerFilter,
    bankQuery,
    setBankQuery,
    taskFilter,
    setTaskFilter,
    filteredMeetings,
    visibleTasks,
    openCount,
    overdueCount,
    todayMeetings,
    openMeetings,
    callers,
    searchResults,
    activeMeeting,
    addPerson,
    addManager,
    saveManager,
    editManager,
    deleteManager,
    deletePerson,
    addActionPoint,
    updateActionPoint,
    removeActionPoint,
    generateMeeting,
    closeMeeting,
    postponeMeeting,
    cancelMeeting,
    markTask,
    copyText,
    openCalendarLinks,
    contactPeople,
    manualAttendees,
    setManualAttendeeForm,
    manualAttendeeForm,
    addManualAttendee,
    removeManualAttendee,
    pinResetRequests,
    pinResetForm,
    setPinResetForm,
    requestPinReset,
    pinChangeForm,
    setPinChangeForm,
    changePin,
    issueTempPin,
    logout,
    goToCloseMeeting,
    preview,
    setPreview,
    setPin,
    API,
    buildNotice,
    buildForm,
    page,
  }
}
