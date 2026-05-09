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
    <div className="app-root bg-[#0A0A0A] min-h-dvh text-[#F0F0F0] text-sm">

      {/* HEADER */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6 py-3 min-h-[64px] flex items-center justify-between gap-3 sticky top-0 bg-[#080808]/95 backdrop-blur-xl z-50">
        <button
          className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-[34px] h-[34px] bg-[#AACC33] rounded-xl flex items-center justify-center text-black font-black text-[12px] shrink-0 shadow-[0_0_14px_rgba(170,204,51,0.2)]">
            MO
          </div>
          <span className="text-[13px] tracking-[0.1em] uppercase font-semibold hidden sm:block">Meeting OS</span>
        </button>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => app.setSearchOpen(true)}
            className="flex items-center gap-2 bg-[#111] border border-[#222] text-[#777] rounded-lg px-3 py-[7px] text-[11px] cursor-pointer hover:border-[#333] hover:text-[#aaa] transition-all"
          >
            <span className="text-base leading-none">⌕</span>
            <span className="hidden sm:block">Search</span>
            <kbd className="hidden sm:flex items-center px-[6px] py-[2px] rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[9px] text-[#666] font-mono tracking-wider">⌘K</kbd>
          </button>

          <div className="hidden sm:grid text-right leading-tight">
            <span className="text-[11px] text-[#F0F0F0] font-medium">{app.user?.name}</span>
            <span className="text-[10px] text-[#666] uppercase tracking-[0.12em]">{app.user?.role}</span>
          </div>

          <button
            onClick={() => navigate('/new-meeting')}
            className="bg-[#AACC33] text-black rounded-lg px-3 py-[7px] text-[11px] cursor-pointer font-bold whitespace-nowrap hover:bg-[#BADA44] active:scale-[0.97] transition-all border-none"
          >
            + Meeting
          </button>
          <button
            onClick={app.logout}
            title="Logout"
            className="bg-transparent border border-[#1e1e1e] text-[#444] rounded-lg px-3 py-[7px] text-[13px] cursor-pointer hover:border-[#333] hover:text-[#888] transition-colors"
          >
            ⇤
          </button>
        </div>
      </div>

      {/* NAV */}
      <div className="flex border-b border-[#1a1a1a] overflow-x-auto bg-[#080808]/95 backdrop-blur-xl sticky top-[64px] z-40 scrollbar-none px-2">
        {navItems.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => navigate(`/${key}`)}
            className={`relative px-4 py-[13px] text-[11px] tracking-[0.08em] uppercase cursor-pointer border-none bg-transparent whitespace-nowrap shrink-0 transition-colors ${
              page === key ? 'text-[#AACC33]' : 'text-[#666] hover:text-[#999]'
            }`}
          >
            {label}
            {badge ? (
              <span className="ml-1.5 inline-flex items-center justify-center px-[5px] py-[1px] rounded-full bg-[#AACC33]/15 text-[#AACC33] text-[9px] font-bold min-w-[16px]">
                {badge}
              </span>
            ) : null}
            {page === key && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#AACC33]" />
            )}
          </button>
        ))}
      </div>

      {/* OVERDUE BANNER */}
      {app.overdueCount > 0 && (
        <button
          className="w-full px-6 py-[9px] bg-[#ff4444]/7 border-b border-[#ff4444]/12 text-[#ff6666] text-[11px] text-center hover:bg-[#ff4444]/10 transition-colors cursor-pointer tracking-[0.03em]"
          onClick={() => { app.setTaskFilter?.('Overdue'); navigate('/tracker') }}
        >
          ⚠ {app.overdueCount} overdue action point{app.overdueCount > 1 ? 's' : ''} — tap to review
        </button>
      )}

      {/* TOAST */}
      {app.toast && (
        <div className={`fixed bottom-6 left-1/2 animate-toast rounded-xl px-5 py-[10px] text-[12px] z-[999] max-w-[92vw] text-center shadow-2xl flex items-center gap-2 ${
          isError
            ? 'bg-[#190808] border border-[#ff4444]/25 text-[#ff8888]'
            : isSuccess
            ? 'bg-[#0e1408] border border-[#AACC33]/25 text-[#AACC33]'
            : 'bg-[#131313] border border-[#252525] text-[#F0F0F0]'
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
        <section className="document-preview fixed inset-0 z-[1000] bg-black/90 p-4 grid place-items-center animate-fade-in backdrop-blur-sm">
          <div className="document-preview-shell w-full max-w-[780px] max-h-[88dvh] grid grid-rows-[auto_1fr_auto] gap-3 border border-[#252525] bg-[#0d0d0d] rounded-2xl p-5 shadow-2xl">
            <div className="document-preview-header flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-[#777] mb-[3px]">Document preview</p>
                <h2 className="m-0 text-[16px] leading-tight">{app.preview.title}</h2>
              </div>
              <button
                className="flex items-center gap-1 bg-transparent border border-[#252525] text-[#555] rounded-lg px-3 py-[7px] text-[11px] cursor-pointer hover:border-[#3a3a3a] hover:text-[#aaa] transition-colors"
                onClick={() => app.setPreview(null)}
              >
                ✕ Close
              </button>
            </div>
            {app.preview.title === 'Agenda Form' ? (
              <AgendaFormPreview content={app.preview.content} orgName={app.orgName} />
            ) : (
              <>
                <textarea
                  className="document-preview-page document-preview-edit m-0 p-4 rounded-xl bg-[#070707] border border-[#181818] overflow-auto whitespace-pre-wrap text-[12px] leading-[1.9] text-[#bbb] font-mono resize-none outline-none"
                  value={app.preview.content}
                  onChange={(e) => app.setPreview((current) => (
                    current ? { ...current, content: e.target.value } : current
                  ))}
                />
                <pre className="document-preview-page document-preview-print-page m-0 p-4 rounded-xl bg-[#070707] border border-[#181818] overflow-auto whitespace-pre-wrap text-[12px] leading-[1.9] text-[#bbb] font-mono">
                  {app.preview.content}
                </pre>
              </>
            )}
            <div className="document-preview-actions flex gap-2">
              <button
                className="flex-1 bg-[#AACC33] border-none text-black rounded-xl px-4 py-[11px] text-[12px] cursor-pointer font-bold hover:bg-[#BADA44] active:scale-[0.98] transition-all"
                onClick={() => app.copyText(app.preview.content)}
              >
                Copy to clipboard
              </button>
              <button
                className="bg-transparent border border-[#252525] text-[#555] rounded-xl px-4 py-[11px] text-[12px] cursor-pointer hover:border-[#3a3a3a] hover:text-[#aaa] transition-colors"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button
                className="bg-transparent border border-[#252525] text-[#555] rounded-xl px-4 py-[11px] text-[12px] cursor-pointer hover:border-[#3a3a3a] hover:text-[#aaa] transition-colors"
                onClick={() => app.setPreview(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PAGE CONTENT */}
      <main className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 animate-fade-in">
        {pageMap[page] || pageMap['new-meeting']}
      </main>

    </div>
  )
}

export default App
