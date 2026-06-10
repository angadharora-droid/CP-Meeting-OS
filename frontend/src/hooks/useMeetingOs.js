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
  buildMom,
  buildNotice,
  generateRefNo,
  getMeetingMode,
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
  const [editingMeetingId, setEditingMeetingId] = useState('')
  const [meetingAttendeeIds, setMeetingAttendeeIds] = useState([])
  const [manualAttendees, setManualAttendees] = useState([])
  const [manualAttendeeForm, setManualAttendeeForm] = useState(blankManualAttendee)
  const blankActionPoint = () => ({
    taskId: uid(),
    task: '',
    assignedTo: '',
    assignedToDesig: '',
    assignedToMobile: '',
    assignedToSource: 'database',
    dueDate: '',
  })
  const [actionPoints, setActionPoints] = useState([blankActionPoint()])
  const [closureNotes, setClosureNotes] = useState('')
  const [closeMeetingId, setCloseMeetingId] = useState('')
  const [followup, setFollowup] = useState(false)
  const [followupForm, setFollowupForm] = useState({ date: '', time: '', purpose: '', note: '' })
  const [followupDraft, setFollowupDraft] = useState(null)
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
  const assignedTaskMeetingIds = useMemo(() => {
    if (!user?.name) return new Set()
    return new Set(
      tasks
        .filter((task) => task.assignedTo === user.name && task.meetingId)
        .map((task) => task.meetingId),
    )
  }, [tasks, user?.name])
  const isUsersMeeting = useCallback((meeting) => {
    if (!user || user.role === 'admin') return true
    const attendeeLines = String(meeting.attendees || '').toLowerCase()
    const name = String(user.name || '').toLowerCase()
    const attendeeDetails = Array.isArray(meeting.attendeeDetails) ? meeting.attendeeDetails : []
    return (
      meeting.calledById === user.id ||
      meeting.calledBy === user.name ||
      attendeeLines.includes(name) ||
      attendeeDetails.some((attendee) => attendee.id === user.id || attendee.name === user.name) ||
      assignedTaskMeetingIds.has(meeting.meetingId)
    )
  }, [assignedTaskMeetingIds, user])

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

    const STATUS_ORDER = { Open: 0, Postponed: 1, Closed: 2, Cancelled: 3 }

    function toSortableDate(d) {
      if (!d) return ''
      if (/^\d{2}\/\d{2}\/\d{4}/.test(d)) { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}` }
      return d.slice(0, 10)
    }

    list.sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4)
      if (statusDiff !== 0) return statusDiff
      return toSortableDate(b.date).localeCompare(toSortableDate(a.date))
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
    showToast('External attendee removed')
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
    setActionPoints((current) => [...current, blankActionPoint()])
    showToast('Action point added')
  }

  function updateActionPoint(taskId, key, value) {
    setActionPoints((current) => current.map((row) => (row.taskId === taskId ? { ...row, [key]: value } : row)))
  }

  function removeActionPoint(taskId) {
    setActionPoints((current) => current.filter((row) => row.taskId !== taskId))
    showToast('Action point removed')
  }

  async function generateMeeting() {
    const existingMeeting = editingMeetingId
      ? meetings.find((meeting) => meeting.meetingId === editingMeetingId)
      : null
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
      meetingId: existingMeeting?.meetingId || uid(),
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
      includeAdditionalPoints: meetingForm.includeAdditionalPoints === true,
      followupOfMeetingId: meetingForm.followupOfMeetingId || existingMeeting?.followupOfMeetingId || '',
      purpose: topicsClean.map((t) => [t.topic, t.purpose].filter(Boolean).join(': ')).filter(Boolean).join('\n'),
      outcome: topicsClean.map((t) => t.desiredOutcome).filter(Boolean).join('\n'),
      docs: topicsClean.map((t) => t.documents).filter(Boolean).join('\n'),
      note: meetingForm.note.trim(),
      status: existingMeeting?.status || 'Open',
      refNo: existingMeeting?.refNo || generateRefNo(),
    }

    const noticeText = buildNotice(meeting, uniqueAttendees)
    const formText = buildForm(meeting, uniqueAttendees)

    const result = await apiPost({ action: 'log_meeting', ...meeting, noticeText, formText })
    if (!result?.ok) {
      showToast(result?.error || 'Could not save meeting')
      return
    }

    if (existingMeeting) {
      setMeetings((current) => current.map((item) => (
        item.meetingId === existingMeeting.meetingId
          ? { ...item, ...meeting, noticeText, formText }
          : item
      )))
    } else {
      setMeetings((current) => [{ ...meeting, noticeText, formText }, ...current])
    }
    setCloseMeetingId(meeting.meetingId)
    setMeetingForm(blankMeeting)
    setEditingMeetingId('')
    setMeetingAttendeeIds([])
    setManualAttendees([])
    setManualAttendeeForm(blankManualAttendee)
    navigate('/bank')
    showToast(existingMeeting ? 'Meeting updated' : 'Meeting saved')
  }

  function editMeeting(meeting) {
    if (!meeting?.meetingId) return
    const attendeeDetails = meeting.attendeeDetails || []
    const callerId = meeting.calledById || contactPeople.find((person) => person.name === meeting.calledBy)?.id || ''
    const internalIds = attendeeDetails
      .filter((attendee) => attendee.source !== 'manual' && attendee.id && attendee.id !== callerId)
      .map((attendee) => attendee.id)
    const manual = attendeeDetails
      .filter((attendee) => attendee.source === 'manual' || !attendee.id)
      .map((attendee) => makeAttendee(attendee, 'manual'))

    setEditingMeetingId(meeting.meetingId)
    setMeetingForm({
      meetingHeader: meeting.meetingHeader || '',
      title: meeting.title || '',
      unit: meeting.unit || '',
      calledBy: callerId,
      calledById: callerId,
      date: toDateLabel(meeting.date) || meeting.date || '',
      time: meeting.time || '',
      duration: meeting.duration || '1 hour',
      mode: getMeetingMode(meeting) || 'inperson',
      venue: meeting.venue || '',
      vcLink: meeting.vcLink || '',
      topics: meeting.topics?.length
        ? meeting.topics
        : [{ topic: '', purpose: meeting.purpose || '', desiredOutcome: meeting.outcome || meeting.desiredOutcome || '', documents: meeting.docs || meeting.documents || '' }],
      includeAdditionalPoints: meeting.includeAdditionalPoints === true,
      followupOfMeetingId: meeting.followupOfMeetingId || '',
      note: meeting.note || meeting.specialNote || '',
    })
    setMeetingAttendeeIds(internalIds)
    setManualAttendees(manual)
    setManualAttendeeForm(blankManualAttendee)
    navigate('/new-meeting')
    showToast('Editing meeting')
  }

  function cancelEditMeeting() {
    setEditingMeetingId('')
    setMeetingForm(blankMeeting)
    setMeetingAttendeeIds([])
    setManualAttendees([])
    setManualAttendeeForm(blankManualAttendee)
    showToast('Edit cancelled')
  }

  function startFollowupDraft(sourceMeeting = activeMeeting) {
    if (!sourceMeeting?.meetingId) {
      showToast('Select a meeting first')
      return
    }

    const attendeeDetails = sourceMeeting.attendeeDetails || []
    const callerId = sourceMeeting.calledById || contactPeople.find((person) => person.name === sourceMeeting.calledBy)?.id || ''
    const internalIds = attendeeDetails
      .filter((attendee) => attendee.source !== 'manual' && attendee.id && attendee.id !== callerId)
      .map((attendee) => attendee.id)
    const manual = attendeeDetails
      .filter((attendee) => attendee.source === 'manual' || !attendee.id)
      .map((attendee) => makeAttendee(attendee, 'manual'))

    setFollowupDraft({
      meetingHeader: sourceMeeting.meetingHeader || '',
      title: `Follow-up: ${sourceMeeting.title}`,
      unit: sourceMeeting.unit || '',
      calledBy: callerId,
      calledById: callerId,
      callerName: sourceMeeting.calledBy || '',
      date: '',
      time: sourceMeeting.time || '',
      duration: sourceMeeting.duration || '1 hour',
      mode: getMeetingMode(sourceMeeting) || 'inperson',
      venue: sourceMeeting.venue || '',
      vcLink: sourceMeeting.vcLink || '',
      topics: [{ topic: '', purpose: `Follow-up on: ${sourceMeeting.title}`, desiredOutcome: '', documents: '' }],
      includeAdditionalPoints: false,
      followupOfMeetingId: sourceMeeting.meetingId,
      note: `Follow-up to meeting held on ${toDateLabel(sourceMeeting.date)}`,
      attendeeDetails,
    })
    setFollowup(false)
    setFollowupForm({ date: '', time: '', purpose: '', note: '' })
    setMeetingAttendeeIds(internalIds)
    setManualAttendees(manual)
    setManualAttendeeForm(blankManualAttendee)
    showToast('Follow-up draft opened')
  }

  function closeFollowupDraft() {
    setFollowupDraft(null)
  }

  async function saveFollowupDraftAndClose() {
    if (!followupDraft?.date || !followupDraft?.time || !followupDraft?.title) {
      showToast('Follow-up date, time and title are required')
      return
    }
    await closeMeeting({ followupDraft })
  }

  async function closeMeeting(options = {}) {
    const draft = options.followupDraft || null
    if (!closeMeetingId) {
      showToast('Select a meeting first')
      return
    }

    const points = actionPoints
      .map((row) => ({
        taskId: row.taskId,
        task: row.task.trim(),
        assignedTo: row.assignedTo.trim(),
        assignedToDesig: (row.assignedToDesig || '').trim(),
        assignedToMobile: (row.assignedToMobile || '').trim(),
        assignedToSource: row.assignedToSource === 'manual' ? 'manual' : 'database',
        dueDate: row.dueDate,
      }))
      .filter((row) => row.task)

    const updateMeeting = meetings.find((meeting) => meeting.meetingId === closeMeetingId)
    if (!updateMeeting) return
    const draftPurpose = draft?.topics?.[0]?.purpose || ''
    const hasFollowup = Boolean(draft) || followup

    const momText = buildMom(
      {
        ...updateMeeting,
        closingNotes: closureNotes.trim(),
        actionPoints: points,
        followupRequired: hasFollowup,
        followupDate: draft ? draft.date : followup ? followupForm.date : '',
        followupTime: draft ? draft.time : followup ? followupForm.time : '',
        followupPurpose: draft ? draftPurpose : followup ? followupForm.purpose.trim() : '',
        followupNote: draft ? draft.note : followup ? followupForm.note.trim() : '',
      },
      updateMeeting.attendeeDetails || [],
      closureNotes.trim(),
      points,
    )

    const payload = {
      action: 'close_meeting',
      meetingId: closeMeetingId,
      notes: closureNotes.trim(),
      actionPoints: points,
      momText,
      followup: {
        required: hasFollowup,
        date: draft ? draft.date : followup ? followupForm.date : '',
        time: draft ? draft.time : followup ? followupForm.time : '',
        purpose: draft ? draftPurpose : followup ? followupForm.purpose.trim() : '',
        note: draft ? draft.note : followup ? followupForm.note.trim() : '',
      },
      closedOn: new Date().toISOString(),
    }

    const closeResult = await apiPost(payload)
    if (!closeResult?.ok) {
      showToast(closeResult?.error || 'Could not close meeting')
      return
    }

    if (points.length) {
      const meetingPurpose = updateMeeting.purpose || (updateMeeting.topics || [])
        .map((topic) => topic?.purpose || topic?.topic)
        .filter(Boolean)
        .join('; ')

      const taskResult = await apiPost({
        action: 'save_action_points',
        meetingId: closeMeetingId,
        meetingTitle: updateMeeting.title,
        meetingPurpose,
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
      meetingPurpose: updateMeeting.purpose || (updateMeeting.topics || []).map((topic) => topic?.purpose || topic?.topic).filter(Boolean).join('; '),
      meetingDate: updateMeeting.date,
      status: 'Open',
    }))

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === closeMeetingId
          ? {
              ...meeting,
              status: 'Closed',
              closingNotes: closureNotes,
              actionPoints: points,
              momText,
              followupRequired: hasFollowup,
              followupDate: draft ? draft.date : followup ? followupForm.date : '',
              followupTime: draft ? draft.time : followup ? followupForm.time : '',
              followupPurpose: draft ? draftPurpose : followup ? followupForm.purpose : '',
              followupNote: draft ? draft.note : followup ? followupForm.note : '',
            }
          : meeting,
      ),
    )
    setTasks((current) => [...normalizedPoints, ...current])
    setActionPoints([blankActionPoint()])
    setClosureNotes('')
    setFollowup(false)
    setFollowupForm({ date: '', time: '', purpose: '', note: '' })

    if (draft) {
      const caller = contactPeople.find((person) => person.id === draft.calledById)
      const attendeeDetails = [
        caller ? makeAttendee(caller, 'database') : null,
        ...contactPeople
          .filter((person) => meetingAttendeeIds.includes(person.id))
          .map((person) => makeAttendee(person, 'database')),
        ...manualAttendees,
      ].filter(Boolean)
      const uniqueAttendees = []
      const seenKeys = new Set()
      attendeeDetails.forEach((attendee) => {
        const key = attendee.id || attendee.email || attendee.name
        if (seenKeys.has(key)) return
        seenKeys.add(key)
        uniqueAttendees.push(attendee)
      })
      const followupMeeting = {
        meetingId: uid(),
        meetingHeader: draft.meetingHeader || '',
        title: draft.title || `Follow-up: ${updateMeeting.title}`,
        date: draft.date,
        time: draft.time,
        duration: draft.duration || '1 hour',
        mode: draft.mode || getMeetingMode(updateMeeting) || 'inperson',
        venue: draft.venue || '',
        vcLink: draft.vcLink || '',
        unit: draft.unit || '',
        calledById: draft.calledById || '',
        calledBy: caller?.name || draft.callerName || updateMeeting.calledBy || '',
        calledByName: caller?.name || draft.callerName || updateMeeting.calledBy || 'Organizer',
        attendees: uniqueAttendees.map((person) => person.name).join('\n'),
        attendeeDetails: uniqueAttendees,
        topics: draft.topics || [{ topic: '', purpose: draftPurpose || `Follow-up on: ${updateMeeting.title}`, desiredOutcome: '', documents: '' }],
        includeAdditionalPoints: draft.includeAdditionalPoints === true,
        purpose: (draft.topics || []).map((topic) => [topic.topic, topic.purpose].filter(Boolean).join(': ')).filter(Boolean).join('\n'),
        outcome: (draft.topics || []).map((topic) => topic.desiredOutcome).filter(Boolean).join('\n'),
        docs: (draft.topics || []).map((topic) => topic.documents).filter(Boolean).join('\n'),
        note: draft.note || '',
        status: 'Open',
        refNo: generateRefNo(),
        followupOfMeetingId: updateMeeting.meetingId,
      }
      const noticeText = buildNotice(followupMeeting, uniqueAttendees)
      const formText = buildForm(followupMeeting, uniqueAttendees)
      const followupResult = await apiPost({ action: 'log_meeting', ...followupMeeting, noticeText, formText })
      if (!followupResult?.ok) {
        showToast(followupResult?.error || 'Could not save follow-up meeting')
        return
      }
      setMeetings((current) => [{ ...followupMeeting, noticeText, formText }, ...current])
      setFollowupDraft(null)
      setMeetingAttendeeIds([])
      setManualAttendees([])
      setManualAttendeeForm(blankManualAttendee)
      showToast('Meeting closed and follow-up saved')
      navigate('/bank')
      return
    }

    if (followup && followupForm.date) {
      const followupPurpose = followupForm.purpose || `Follow-up on: ${updateMeeting.title}`
      const attendeeDetails = updateMeeting.attendeeDetails || []
      const callerId = updateMeeting.calledById || contactPeople.find((person) => person.name === updateMeeting.calledBy)?.id || ''
      const internalIds = attendeeDetails
        .filter((attendee) => attendee.source !== 'manual' && attendee.id && attendee.id !== callerId)
        .map((attendee) => attendee.id)
      const manual = attendeeDetails
        .filter((attendee) => attendee.source === 'manual' || !attendee.id)
        .map((attendee) => makeAttendee(attendee, 'manual'))

      setEditingMeetingId('')
      setMeetingForm({
        meetingHeader: updateMeeting.meetingHeader || '',
        title: `Follow-up: ${updateMeeting.title}`,
        unit: updateMeeting.unit || '',
        calledBy: callerId,
        calledById: callerId,
        date: toDateLabel(followupForm.date) || followupForm.date,
        time: followupForm.time || updateMeeting.time || '',
        duration: updateMeeting.duration || '1 hour',
        mode: getMeetingMode(updateMeeting) || 'inperson',
        venue: updateMeeting.venue || '',
        vcLink: updateMeeting.vcLink || '',
        topics: [{ topic: '', purpose: followupPurpose, desiredOutcome: '', documents: '' }],
        includeAdditionalPoints: false,
        followupOfMeetingId: updateMeeting.meetingId,
        note: followupForm.note || `Follow-up to meeting held on ${toDateLabel(updateMeeting.date)}`,
      })
      setMeetingAttendeeIds(internalIds)
      setManualAttendees(manual)
      setManualAttendeeForm(blankManualAttendee)
      setPreview(null)
      navigate('/new-meeting')
      showToast('Meeting closed. Follow-up draft ready')
      return
    }

    setPreview({ title: 'Minutes of Meeting (MoM)', content: momText })
    showToast('Meeting closed')
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

  async function deleteMeeting(meetingId) {
    if (!meetingId) return

    const result = await apiPost({ action: 'delete_meeting', meetingId })
    if (!result?.ok) {
      showToast(result?.error || 'Could not delete meeting')
      return
    }

    setMeetings((current) => current.filter((meeting) => meeting.meetingId !== meetingId))
    showToast('Meeting deleted')
  }

  async function renameMeetingHeader(oldHeader, newHeader) {
    const cleanOld = String(oldHeader || '').trim()
    const cleanNew = String(newHeader || '').trim()
    if (!cleanOld || !cleanNew) {
      showToast('Header name is required')
      return false
    }
    if (cleanOld === cleanNew) return true

    const result = await apiPost({
      action: 'rename_meeting_header',
      oldHeader: cleanOld,
      newHeader: cleanNew,
    })

    if (!result?.ok) {
      showToast(result?.error || 'Could not rename header')
      return false
    }

    setMeetings((current) => current.map((meeting) => (
      (meeting.meetingHeader || '').trim() === cleanOld
        ? { ...meeting, meetingHeader: cleanNew }
        : meeting
    )))
    showToast('Header renamed')
    return true
  }

  async function deleteMeetingHeader(header) {
    const cleanHeader = String(header || '').trim()
    if (!cleanHeader) return false

    const result = await apiPost({
      action: 'delete_meeting_header',
      header: cleanHeader,
    })

    if (!result?.ok) {
      showToast(result?.error || 'Could not delete header')
      return false
    }

    setMeetings((current) => current.map((meeting) => (
      (meeting.meetingHeader || '').trim() === cleanHeader
        ? { ...meeting, meetingHeader: '' }
        : meeting
    )))
    showToast('Header deleted')
    return true
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

  async function copyText(text, html = '') {
    try {
      if (html && navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ])
      } else {
        await navigator.clipboard?.writeText(text)
      }
      showToast('Copied to clipboard')
    } catch {
      await navigator.clipboard?.writeText(text)
      showToast('Copied to clipboard')
    }
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
    editingMeetingId,
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
    followupDraft,
    setFollowupDraft,
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
    editMeeting,
    cancelEditMeeting,
    startFollowupDraft,
    closeFollowupDraft,
    saveFollowupDraftAndClose,
    closeMeeting,
    postponeMeeting,
    cancelMeeting,
    deleteMeeting,
    renameMeetingHeader,
    deleteMeetingHeader,
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
