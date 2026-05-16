const apps = [
  {
    key: 'meeting-os',
    label: 'Meeting OS',
    shortLabel: 'MO',
    href: 'https://meetingos.centrepointgroup.in',
    summary: 'Meeting scheduling, closure notes, action tracking, and meeting bank.',
    accent: '#AACC33',
    status: 'Live',
    metrics: ['Meetings', 'Tasks', 'People'],
  },
  {
    key: 'flash-report',
    label: 'CP Flash Report',
    shortLabel: 'FR',
    href: 'https://flashreport.centrepointgroup.in',
    summary: 'Daily hospitality pulse for occupancy, revenue, cost, and operations.',
    accent: '#2DD4BF',
    status: 'Live',
    metrics: ['Daily', 'Hotels', 'Costs'],
  },
]

const quickSignals = [
  { label: 'Workspace', value: 'Internal', tone: 'text-sky-200 bg-sky-300/10 border-sky-300/20' },
  { label: 'Access', value: 'Team', tone: 'text-[#E4FF70] bg-[#AACC33]/10 border-[#AACC33]/20' },
  { label: 'Mode', value: 'Secure', tone: 'text-amber-100 bg-amber-300/10 border-amber-300/20' },
]

export default function LandingPage() {
  const year = new Date().getFullYear()

  return (
    <div className="portal-shell min-h-dvh text-[#F4F4F1]">
      <header className="border-b border-white/10 bg-[#090909]/86 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 text-inherit no-underline">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F4F4F1] text-[11px] font-black text-black">
              CPG
            </div>
            <div className="grid leading-tight">
              <span className="text-[12px] font-black uppercase tracking-[0.14em]">Centre Point Group</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Operations portal</span>
            </div>
          </a>

          <div className="hidden items-center gap-2 sm:flex">
            {quickSignals.map((signal) => (
              <span key={signal.label} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${signal.tone}`}>
                {signal.label}: {signal.value}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-8">
        <section className="grid min-h-[calc(100dvh-132px)] content-between rounded-lg border border-white/10 bg-[#111111] p-5 sm:p-7">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {quickSignals.map((signal) => (
                <span key={signal.label} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] sm:hidden ${signal.tone}`}>
                  {signal.label}: {signal.value}
                </span>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
              <div>
                <p className="m-0 text-[11px] font-black uppercase tracking-[0.22em] text-[#AACC33]">Command desk</p>
                <h1 className="mt-4 max-w-[720px] text-[clamp(42px,7vw,88px)] font-black leading-[0.95] tracking-normal">
                  Pick the system. Start the work.
                </h1>
              </div>

              <div className="grid gap-3">
                <p className="m-0 max-w-[460px] text-[15px] leading-8 text-white/58">
                  A single launch point for daily hotel operations, meeting governance, and follow-up visibility across the team.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat value="2" label="Apps" />
                  <MiniStat value="24/7" label="Portal" />
                  <MiniStat value="CPG" label="Team" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            {apps.map((app) => (
              <AppLaunchCard key={app.key} app={app} />
            ))}
          </div>
        </section>

        <aside className="grid gap-5 lg:grid-rows-[auto_1fr_auto]">
          <section className="rounded-lg border border-white/10 bg-[#171717] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Today</div>
            <div className="mt-4 text-[28px] font-black leading-none">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
            <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.14em] text-white/42">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#171717] p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="m-0 text-[16px] font-black tracking-tight">Portal Map</h2>
              <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                Online
              </span>
            </div>

            <div className="portal-map" aria-hidden="true">
              <div className="portal-map-node node-core">CPG</div>
              <div className="portal-map-node node-meeting">MO</div>
              <div className="portal-map-node node-flash">FR</div>
              <div className="portal-map-line line-a" />
              <div className="portal-map-line line-b" />
            </div>

            <div className="mt-5 grid gap-2">
              {apps.map((app) => (
                <a key={app.key} href={app.href} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-inherit no-underline transition-colors hover:bg-white/[0.07]">
                  <span className="text-[12px] font-bold">{app.label}</span>
                  <span className="text-[11px] font-black" style={{ color: app.accent }}>Open</span>
                </a>
              ))}
            </div>
          </section>

          <footer className="rounded-lg border border-white/10 bg-[#111111] p-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
            {year} Centre Point Group. Internal use only.
          </footer>
        </aside>
      </main>
    </div>
  )
}

function MiniStat({ value, label }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="text-[18px] font-black leading-none">{value}</div>
      <div className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-white/38">{label}</div>
    </div>
  )
}

function AppLaunchCard({ app }) {
  return (
    <a
      href={app.href}
      className="group grid min-h-[230px] content-between rounded-lg border border-white/10 bg-[#181818] p-5 text-inherit no-underline transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#202020]"
      style={{ '--app-accent': app.accent }}
    >
      <div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg text-[12px] font-black text-black" style={{ backgroundColor: app.accent }}>
            {app.shortLabel}
          </div>
          <span className="rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ borderColor: `${app.accent}55`, backgroundColor: `${app.accent}18`, color: app.accent }}>
            {app.status}
          </span>
        </div>
        <h2 className="m-0 text-[24px] font-black leading-tight tracking-tight">{app.label}</h2>
        <p className="m-0 mt-3 text-[13px] leading-7 text-white/52">{app.summary}</p>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {app.metrics.map((metric) => (
            <span key={metric} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/45">
              {metric}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: app.accent }}>Launch</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[17px] font-black text-white/50 transition-transform group-hover:translate-x-0.5">
            -&gt;
          </span>
        </div>
      </div>
    </a>
  )
}
