export default function LandingPage() {
  return (
    <div className="min-h-dvh text-slate-900 flex flex-col">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-5 py-4">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(15,23,42,0.14)]">
            CPG
          </div>
          <div className="grid leading-tight">
            <span className="text-[12px] font-semibold tracking-[0.06em] text-slate-900">Centre Point Group</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Internal portal</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-[560px] text-center">
          <p className="m-0 mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700">
            Operations workspace
          </p>
          <h1 className="mx-auto max-w-[620px] text-[clamp(34px,7vw,58px)] font-bold leading-[1.02] tracking-tight text-slate-900">
            Run meetings with less drift.
          </h1>
          <p className="mx-auto mt-5 max-w-[420px] text-[14px] leading-[1.7] text-slate-600">
            Schedule meetings, close them with action points, and keep follow-ups visible for the team.
          </p>

          <div className="mx-auto mt-10 grid w-full max-w-[390px] gap-3">
            <AppCard
              icon="MO"
              name="Meeting OS"
              desc="Meetings, action tracker, people, and bank"
              href="/meetingos/dashboard"
            />
            <AppCard
              icon="FR"
              name="CP Flash Report"
              desc="Daily hospitality dashboard"
              href="/flashreport"
              gradient="from-teal-500 to-teal-600"
              shadow="rgba(20,184,166,0.22)"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 px-5 py-4 text-center text-[10px] uppercase tracking-[0.12em] text-slate-400 font-semibold">
        {new Date().getFullYear()} Centre Point Group - Internal use only
      </footer>
    </div>
  )
}

function AppCard({ icon, name, desc, href, gradient = 'from-slate-700 to-slate-800', shadow = 'rgba(15,23,42,0.14)' }) {
  return (
    <a
      href={href}
      className="surface-panel group flex items-center gap-4 rounded-2xl p-4 text-left text-inherit no-underline transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[11px] font-bold text-white bg-gradient-to-br ${gradient}`}
        style={{ boxShadow: `0 4px 14px ${shadow}` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-slate-900">{name}</div>
        <div className="mt-1 truncate text-[11px] text-slate-500">{desc}</div>
      </div>
      <span className="text-[18px] text-slate-400 transition-colors group-hover:text-slate-700">→</span>
    </a>
  )
}
