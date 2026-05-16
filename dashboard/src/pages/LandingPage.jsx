export default function LandingPage() {
  return (
    <div className="min-h-dvh text-[#F0F0F0] flex flex-col">
      <header className="border-b border-white/[0.07] px-5 py-4">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#AACC33] text-[11px] font-black text-black shadow-[0_0_18px_rgba(170,204,51,0.18)]">
            CPG
          </div>
          <div className="grid leading-tight">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em]">Centre Point Group</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">Internal portal</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-[560px] text-center">
          <p className="m-0 mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#AACC33]">
            Operations workspace
          </p>
          <h1 className="mx-auto max-w-[620px] text-[clamp(34px,7vw,58px)] font-black leading-[1.02] tracking-normal">
            Run meetings with less drift.
          </h1>
          <p className="mx-auto mt-5 max-w-[420px] text-[14px] leading-[1.7] text-white/52">
            Schedule meetings, close them with action points, and keep follow-ups visible for the team.
          </p>

          <div className="mx-auto mt-10 grid w-full max-w-[390px] gap-3">
            <AppCard
              icon="MO"
              name="Meeting OS"
              desc="Meetings, action tracker, people, and bank"
              href="https://meetingos.centrepointgroup.in"
            />
            <AppCard
              icon="FR"
              name="CP Flash Report"
              desc="Daily hospitality dashboard"
              href="https://flashreport.centrepointgroup.in"
              color="#2dd4bf"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] px-5 py-4 text-center text-[10px] uppercase tracking-[0.12em] text-white/22">
        {new Date().getFullYear()} Centre Point Group - Internal use only
      </footer>
    </div>
  )
}

function AppCard({ icon, name, desc, href, color = '#AACC33' }) {
  return (
    <a
      href={href}
      className="surface-panel group flex items-center gap-4 rounded-2xl p-4 text-left text-inherit no-underline transition-all duration-200 hover:-translate-y-[1px] hover:bg-white/[0.045]"
      style={{ '--card-color': color }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[11px] font-black text-black"
        style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}29` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold">{name}</div>
        <div className="mt-1 truncate text-[11px] text-white/42">{desc}</div>
      </div>
      <span className="text-[18px] text-white/25 transition-colors" style={{ color: 'inherit' }}>-&gt;</span>
    </a>
  )
}
