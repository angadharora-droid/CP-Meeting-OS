import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthScreen from './components/AuthScreen'
import SearchOverlay from './components/SearchOverlay'
import { useMeetingOs } from './hooks/useMeetingOs'
import BankPage from './pages/BankPage'
import CloseMeetingPage from './pages/CloseMeetingPage'
import DashboardPage from './pages/DashboardPage'
import NewMeetingPage from './pages/NewMeetingPage'
import PeoplePage from './pages/PeoplePage'
import TrackerPage from './pages/TrackerPage'
import centrePointHeader from './assets/centre-point-header.png'

function parseAgendaForm(content) {
  const lines = String(content || '').split('\n')
  const meta = { header: '', title: '', date: '', time: '' }
  const topics = []
  let current = null
  let field = null

  const readValue = (label, line) => line.replace(new RegExp(`^${label}\\s*:\\s*`), '').trim()

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line || /^[-=]{3,}$/.test(line)) return

    if (line.startsWith('Meeting Header')) {
      meta.header = readValue('Meeting Header', line)
      return
    }
    if (line.startsWith('Meeting Title')) {
      meta.title = readValue('Meeting Title', line)
      return
    }
    if (line.startsWith('Date')) {
      meta.date = readValue('Date', line)
      return
    }
    if (line.startsWith('Time')) {
      meta.time = readValue('Time', line)
      return
    }

    const topicMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (topicMatch) {
      current = {
        number: topicMatch[1],
        title: topicMatch[2],
        topic: [],
        purpose: [],
        outcome: [],
        documents: [],
        notes: [],
      }
      topics.push(current)
      field = null
      return
    }

    if (!current) return

    const labelMap = {
      'Topic:': 'topic',
      'Purpose:': 'purpose',
      'Desired Outcome:': 'outcome',
      'Documents Required:': 'documents',
      'Concluding Points & Actionable Notes:': 'notes',
    }

    if (labelMap[line]) {
      field = labelMap[line]
      return
    }

    if (!field) return

    if (/^_{6,}$/.test(line)) {
      current[field].push({ blank: true })
      return
    }

    current[field].push({ text: line.replace(/^-\s*/, '') })
  })

  return { meta, topics }
}

function AgendaField({ label, items, blankCount = 0 }) {
  const hasContent = items?.some((item) => item.text || item.blank)
  const displayItems = hasContent ? items : Array.from({ length: blankCount }, () => ({ blank: true }))

  return (
    <div className="agenda-field">
      <div className="agenda-field-label">{label}:</div>
      {displayItems?.some((item) => item.text) ? (
        <div className="agenda-bullets">
          {displayItems.filter((item) => item.text).map((item, index) => (
            <div className="agenda-bullet-item" key={index}>
              <span aria-hidden="true">•</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="agenda-lines">
          {displayItems.map((_, index) => <div key={index} />)}
        </div>
      )}
    </div>
  )
}

function AgendaPrintHeader() {
  return (
    <header className="agenda-print-header">
      <img className="agenda-print-brand" src={centrePointHeader} alt="Centre Point Hospitality" />
    </header>
  )
}

function AgendaPrintFooter() {
  return (
    <footer className="agenda-print-footer">
      <div className="print-page-rule" />
    </footer>
  )
}

function AgendaTopic({ topic }) {
  return (
    <section className="agenda-topic">
      <h3>{topic.number}. {topic.title}</h3>
      {topic.topic.length > 0 && <AgendaField label="Topic" items={topic.topic} blankCount={2} />}
      <AgendaField label="Purpose" items={topic.purpose} blankCount={3} />
      <AgendaField label="Desired Outcome" items={topic.outcome} blankCount={3} />
      <AgendaField label="Documents Required" items={topic.documents} blankCount={2} />
      <div className="agenda-notes-label">
        <strong>Concluding Points &amp; Actionable Notes:</strong>
      </div>
      <div className="agenda-lines agenda-note-lines">
        {(topic.notes.length ? topic.notes : Array.from({ length: 7 }, () => ({ blank: true }))).map((_, index) => (
          <div key={index} />
        ))}
      </div>
    </section>
  )
}

function AgendaPrintPage({ children }) {
  return (
    <div className="agenda-print-table">
      <AgendaPrintHeader />
      <main className="agenda-print-body">{children}</main>
      <AgendaPrintFooter />
    </div>
  )
}

function AgendaMeta({ meta }) {
  return (
    <section className="agenda-meta">
      {meta.header && <div><strong>Meeting Header:</strong> {meta.header}</div>}
      <div><strong>Meeting Title:</strong> {meta.title}</div>
      <div><strong>Date:</strong> {meta.date}</div>
      <div><strong>Time:</strong> {meta.time}</div>
    </section>
  )
}

function AgendaFormPreview({ content, orgName }) {
  const { meta, topics } = parseAgendaForm(content)

  return (
    <>
      <article className="document-preview-page agenda-form-page agenda-screen-page">
        <AgendaMeta meta={meta} />
        {topics.map((topic) => <AgendaTopic key={`${topic.number}-${topic.title}`} topic={topic} />)}
      </article>

      <div className="agenda-print-pages">
        <AgendaPrintPage orgName={orgName}>
          <AgendaMeta meta={meta} />
          {topics.map((topic) => (
            <AgendaTopic key={`print-${topic.number}-${topic.title}`} topic={topic} />
          ))}
        </AgendaPrintPage>
      </div>
    </>
  )
}

function MomPreview({ content }) {
  const sections = new Set(['Attendees', 'Agenda', 'Key Discussion Points', 'Action Item', 'Action Items', 'Follow-up Meeting'])

  return (
    <article className="document-preview-page mom-preview-page">
      {String(content || '').split('\n').map((rawLine, index) => {
        const line = rawLine.trimEnd()

        if (!line) return <div key={index} className="mom-preview-spacer" />

        if (index === 0) {
          return <h1 key={index}>{line}</h1>
        }

        if (sections.has(line)) {
          return <h2 key={index}>{line}</h2>
        }

        if (line.includes('\t')) {
          const cells = line.split('\t')
          const isHeader = cells.join('|') === 'Action|Owner|Due Date'
          return (
            <div key={index} className={`mom-preview-row ${isHeader ? 'mom-preview-row-head' : ''}`}>
              {cells.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}
            </div>
          )
        }

        const labelMatch = line.match(/^([^:]+):\s*(.*)$/)
        if (labelMatch) {
          return (
            <p key={index}>
              <strong>{labelMatch[1]}:</strong>{labelMatch[2] ? ` ${labelMatch[2]}` : ''}
            </p>
          )
        }

        return <p key={index}>{line}</p>
      })}
    </article>
  )
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function momToHtml(content) {
  const sections = new Set(['Attendees', 'Agenda', 'Key Discussion Points', 'Action Item', 'Action Items', 'Follow-up Meeting'])
  const rows = String(content || '').split('\n').map((rawLine, index) => {
    const line = rawLine.trimEnd()
    if (!line) return '<br>'
    if (index === 0) return `<p><strong>${escapeHtml(line)}</strong></p>`
    if (sections.has(line)) return `<p><strong>${escapeHtml(line)}</strong></p>`

    if (line.includes('\t')) {
      const cells = line.split('\t')
      const isHeader = cells.join('|') === 'Action|Owner|Due Date'
      return `<p>${cells.map((cell) => (
        isHeader ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)
      )).join(' &nbsp; ')}</p>`
    }

    const labelMatch = line.match(/^([^:]+):\s*(.*)$/)
    if (labelMatch) {
      return `<p><strong>${escapeHtml(labelMatch[1])}:</strong>${labelMatch[2] ? ` ${escapeHtml(labelMatch[2])}` : ''}</p>`
    }

    return `<p>${escapeHtml(line)}</p>`
  })

  return `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b;">${rows.join('')}</div>`
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard'
  const app = useMeetingOs(navigate, page)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        app.setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  if (!app.authed) {
    return (
      <AuthScreen
        pin={app.pin}
        onDigit={app.setPinDigit}
        onBack={app.pinBack}
        pinResetForm={app.pinResetForm}
        onPinResetFormChange={app.setPinResetForm}
        onRequestPinReset={app.requestPinReset}
      />
    )
  }

  const pageMap = {
    dashboard:     <DashboardPage app={app} />,
    'new-meeting': <NewMeetingPage app={app} />,
    'close-meeting': <CloseMeetingPage app={app} />,
    tracker:       <TrackerPage app={app} />,
    bank:          <BankPage app={app} />,
    people:        <PeoplePage app={app} />,
  }

  const navItems = [
    { key: 'dashboard',     label: 'Dashboard' },
    { key: 'new-meeting',   label: 'New Meeting' },
    { key: 'close-meeting', label: 'Close Meeting', badge: app.openMeetings?.length || null },
    { key: 'tracker',       label: 'Tracker',       badge: app.openCount || null },
    { key: 'bank',          label: 'Meeting Bank' },
    { key: 'people',        label: 'People' },
  ]

  const isError   = app.toast && /error|fail|invalid|not found/i.test(app.toast)
  const isSuccess = app.toast && /saved|updated|created|done|success|connect|disconnect|sent|issued|removed|closed|postponed|cancelled/i.test(app.toast)

  return (
    <div className="app-root min-h-dvh text-[#0F172A] text-sm">

      {/* HEADER */}
      <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex min-h-[54px] w-full max-w-[1280px] items-center justify-between gap-3">
        <button
          className="flex items-center gap-3 rounded-xl px-1.5 py-1 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-white font-bold text-[12px] tracking-wider shrink-0 shadow-[0_4px_12px_rgba(15,23,42,0.14)]">
            MO
          </div>
          <span className="hidden sm:grid leading-tight text-left">
            <span className="text-[12px] tracking-[0.06em] font-semibold text-slate-900">Meeting OS</span>
            <span className="text-[10px] text-slate-500 tracking-[0.12em] uppercase">Centre Point</span>
          </span>
        </button>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => app.setSearchOpen(true)}
            className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-500 cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            <span>Search</span>
            <kbd className="hidden sm:flex items-center px-[6px] py-[2px] rounded-md bg-slate-100 border border-slate-200 text-[9px] text-slate-500 font-mono tracking-wider">Ctrl K</kbd>
          </button>

          <div className="hidden sm:grid text-right leading-tight">
            <span className="text-[11px] text-slate-900 font-semibold">{app.user?.name}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.12em]">{app.user?.role}</span>
          </div>

          <button
            onClick={() => navigate('/new-meeting')}
            className="min-h-[38px] bg-slate-700 text-white rounded-xl px-3 text-[11px] cursor-pointer font-semibold whitespace-nowrap hover:bg-slate-800 active:scale-[0.97] transition-all border-none shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_rgba(15,23,42,0.10)]"
          >
            + Meeting
          </button>
          <button
            onClick={app.logout}
            title="Logout"
            className="min-h-[38px] bg-white border border-slate-200 text-slate-500 rounded-xl px-3 text-[11px] cursor-pointer hover:border-slate-300 hover:text-slate-700 transition-colors"
          >
            Exit
          </button>
        </div>
        </div>
      </div>

      {/* NAV */}
      <div className="sticky top-[75px] z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1280px] overflow-x-auto scrollbar-none px-2 sm:px-4">
        {navItems.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => navigate(`/${key}`)}
            className={`relative px-4 py-[12px] text-[10.5px] tracking-[0.11em] uppercase cursor-pointer border-none bg-transparent whitespace-nowrap shrink-0 transition-colors font-semibold ${
              page === key ? 'text-slate-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
            {badge ? (
              <span className="ml-1.5 inline-flex items-center justify-center px-[5px] py-[1px] rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold min-w-[16px]">
                {badge}
              </span>
            ) : null}
            {page === key && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-slate-700" />
            )}
          </button>
        ))}
        </div>
      </div>

      {/* OVERDUE BANNER */}
      {app.overdueCount > 0 && (
        <button
          className="w-full px-6 py-[9px] bg-red-50 border-b border-red-100 text-red-700 text-[11px] text-center hover:bg-red-100 transition-colors cursor-pointer tracking-[0.03em] font-medium"
          onClick={() => { app.setTaskFilter?.('Overdue'); navigate('/tracker') }}
        >
          ⚠ {app.overdueCount} overdue action point{app.overdueCount > 1 ? 's' : ''} — tap to review
        </button>
      )}

      {/* TOAST */}
      {app.toast && (
        <div className={`fixed bottom-6 left-1/2 animate-toast rounded-xl px-5 py-[10px] text-[12px] z-[999] max-w-[92vw] text-center shadow-[0_10px_30px_rgba(15,23,42,0.12)] flex items-center gap-2 font-medium ${
          isError
            ? 'bg-red-50 border border-red-200 text-red-700'
            : isSuccess
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-white border border-slate-200 text-slate-900'
        }`}>
          {isError ? '✕ ' : isSuccess ? '✓ ' : ''}{app.toast}
        </div>
      )}

      <SearchOverlay
        open={app.searchOpen}
        query={app.query}
        onQueryChange={app.setQuery}
        onClose={() => app.setSearchOpen(false)}
        meetings={app.searchResults.meetings}
        tasks={app.searchResults.tasks}
        people={app.searchResults.people}
        navigate={navigate}
      />

      {/* DOCUMENT PREVIEW MODAL */}
      {app.preview && (
        <section className="document-preview fixed inset-0 z-[1000] bg-slate-900/40 p-4 grid place-items-center animate-fade-in backdrop-blur-sm">
          <div className="document-preview-shell w-full max-w-[780px] max-h-[88dvh] grid grid-rows-[auto_1fr_auto] gap-3 border border-slate-200 bg-white rounded-2xl p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="document-preview-header flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-[3px] font-semibold">Document preview</p>
                <h2 className="m-0 text-[16px] leading-tight text-slate-900 font-semibold">{app.preview.title}</h2>
              </div>
              <button
                className="flex items-center gap-1 bg-white border border-slate-200 text-slate-500 rounded-lg px-3 py-[7px] text-[11px] cursor-pointer hover:border-slate-300 hover:text-slate-700 transition-colors"
                onClick={() => app.setPreview(null)}
              >
                ✕ Close
              </button>
            </div>
            {app.preview.title === 'Agenda Form' ? (
              <AgendaFormPreview content={app.preview.content} orgName={app.orgName} />
            ) : app.preview.title === 'Minutes of Meeting (MoM)' ? (
              <MomPreview content={app.preview.content} />
            ) : (
              <>
                <textarea
                  className="document-preview-page document-preview-edit m-0 p-4 rounded-xl bg-slate-50 border border-slate-200 overflow-auto whitespace-pre-wrap text-[12px] leading-[1.9] text-slate-700 font-mono resize-none outline-none"
                  value={app.preview.content}
                  onChange={(e) => app.setPreview((current) => (
                    current ? { ...current, content: e.target.value } : current
                  ))}
                />
                <pre className="document-preview-page document-preview-print-page m-0 p-4 rounded-xl bg-slate-50 border border-slate-200 overflow-auto whitespace-pre-wrap text-[12px] leading-[1.9] text-slate-700 font-mono">
                  {app.preview.content}
                </pre>
              </>
            )}
            <div className="document-preview-actions flex gap-2">
              <button
                className="flex-1 bg-slate-700 border-none text-white rounded-xl px-4 py-[11px] text-[12px] cursor-pointer font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_rgba(15,23,42,0.10)]"
                onClick={() => app.copyText(
                  app.preview.content,
                  app.preview.title === 'Minutes of Meeting (MoM)' ? momToHtml(app.preview.content) : '',
                )}
              >
                Copy to clipboard
              </button>
              <button
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-[11px] text-[12px] cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors font-medium"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button
                className="bg-white border border-slate-200 text-slate-500 rounded-xl px-4 py-[11px] text-[12px] cursor-pointer hover:border-slate-300 hover:text-slate-700 transition-colors font-medium"
                onClick={() => app.setPreview(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PAGE CONTENT */}
      <main className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 animate-fade-in">
        {pageMap[page] || pageMap['new-meeting']}
      </main>

    </div>
  )
}

export default App
