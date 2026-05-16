const APPS = [
  {
    key: 'meeting-os',
    short: 'MO',
    label: 'Meeting OS',
    desc: 'Schedule meetings, record closure notes, track action points, and manage the full meeting lifecycle.',
    href: 'https://meetingos.centrepointgroup.in',
    accent: '#AACC33',
    tags: ['Meetings', 'Tasks', 'People'],
    status: 'Live',
  },
  {
    key: 'flash-report',
    short: 'FR',
    label: 'CP Flash Report',
    desc: 'Daily hospitality pulse — occupancy, revenue, costs, and operational metrics across all hotels.',
    href: 'https://flashreport.centrepointgroup.in',
    accent: '#2DD4BF',
    tags: ['Daily', 'Hotels', 'Revenue'],
    status: 'Live',
  },
]

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
}

export default function LandingPage() {
  return (
    <div className="portal-shell min-h-dvh flex flex-col text-[#F4F4F1]">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090909]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#F4F4F1] grid place-items-center text-[10px] font-black text-black shrink-0">
              CPG
            </div>
            <div className="leading-tight">
              <div className="text-[12px] font-black uppercase tracking-[0.14em]">Centre Point Group</div>
              <div className="text-[10px] text-white/35 uppercase tracking-[0.12em] font-bold">Operations Portal</div>
            </div>
          </div>

          <div className="text-[11px] text-white/35 font-medium hidden sm:block">
            {today()}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-[1100px] px-5 sm:px-8 py-10 sm:py-14 grid gap-10">

        {/* Hero */}
        <div className="grid gap-3">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.22em] text-[#AACC33]">
            Command desk
          </p>
          <h1 className="text-[clamp(32px,6vw,68px)] font-black leading-[0.95] tracking-tight">
            Pick a system.<br />Start the work.
          </h1>
          <p className="m-0 text-[14px] text-white/45 max-w-[480px] leading-relaxed mt-1">
            Internal tools for meeting governance and daily hotel operations — in one place.
          </p>
        </div>

        {/* App cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {APPS.map((app) => (
            <AppCard key={app.key} app={app} />
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 sm:px-8 py-4">
        <div className="mx-auto max-w-[1100px] flex items-center justify-between gap-4">
          <span className="text-[10px] text-white/25 font-bold uppercase tracking-[0.12em]">
            {new Date().getFullYear()} Centre Point Group
          </span>
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.12em]">
            Internal use only
          </span>
        </div>
      </footer>

    </div>
  )
}

function AppCard({ app }) {
  return (
    <a
      href={app.href}
      className="group relative flex flex-col justify-between min-h-[240px] rounded-2xl border border-white/[0.08] bg-[#111] p-6 no-underline text-inherit overflow-hidden transition-all duration-200 hover:border-white/[0.16] hover:bg-[#161616] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
    >
      {/* Subtle accent glow on hover */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${app.accent}18 0%, transparent 65%)` }}
      />

      <div className="relative">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div
            className="h-12 w-12 rounded-xl grid place-items-center text-[12px] font-black text-black shrink-0"
            style={{ backgroundColor: app.accent }}
          >
            {app.short}
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-lg border"
            style={{ color: app.accent, borderColor: `${app.accent}40`, backgroundColor: `${app.accent}14` }}
          >
            {app.status}
          </span>
        </div>

        {/* Title + desc */}
        <h2 className="m-0 text-[22px] font-black leading-tight tracking-tight mb-2">{app.label}</h2>
        <p className="m-0 text-[13px] text-white/45 leading-[1.7]">{app.desc}</p>
      </div>

      <div className="relative mt-6">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
          {app.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-bold text-white/35 border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 rounded-lg">
              {tag}
            </span>
          ))}
        </div>

        {/* Launch row */}
        <div className="flex items-center justify-between border-t border-white/[0.07] pt-4">
          <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: app.accent }}>
            Launch
          </span>
          <div
            className="h-8 w-8 rounded-lg border border-white/[0.09] bg-white/[0.04] grid place-items-center text-white/40 text-[14px] font-black transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </div>
        </div>
      </div>
    </a>
  )
}
