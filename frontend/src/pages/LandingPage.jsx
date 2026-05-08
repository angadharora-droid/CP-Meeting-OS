export default function LandingPage() {
  return (
    <div style={{ background: '#0A0A0A', color: '#F0F0F0', minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <header style={{ padding: '20px 32px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: '#AACC33', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#000', letterSpacing: '0.02em', flexShrink: 0, boxShadow: '0 0 16px rgba(170,204,51,0.18)' }}>
          CPG
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Centre Point Group
        </span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>

        <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#AACC33', fontWeight: 600, marginBottom: 16 }}>
          Internal Portal
        </p>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em', maxWidth: 640, marginBottom: 20 }}>
          Tools that keep<br />the team <span style={{ color: '#AACC33' }}>moving</span>
        </h1>

        <p style={{ fontSize: 15, color: '#444', maxWidth: 400, lineHeight: 1.65, marginBottom: 44 }}>
          Access your internal applications below. Log in with your assigned PIN.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 360 }}>
          <AppCard
            icon="MO"
            name="Meeting OS"
            desc="Meetings · Tasks · People"
            href="/meetingos/dashboard"
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '20px 32px', borderTop: '1px solid #111', textAlign: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#222' }}>
        &copy; {new Date().getFullYear()} Centre Point Group &nbsp;·&nbsp; Internal use only
      </footer>

    </div>
  )
}

function AppCard({ icon, name, desc, href }) {
  return (
    <a
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', border: '1px solid #1e1e1e', borderRadius: 16, background: '#0e0e0e', textDecoration: 'none', color: 'inherit', textAlign: 'left', transition: 'border-color 180ms, background 180ms' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(170,204,51,0.35)'; e.currentTarget.style.background = '#111' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.background = '#0e0e0e' }}
    >
      <div style={{ width: 42, height: 42, background: '#AACC33', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#000', flexShrink: 0, boxShadow: '0 0 14px rgba(170,204,51,0.2)' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: '#444' }}>{desc}</div>
      </div>
      <span style={{ color: '#2a2a2a', fontSize: 18 }}>›</span>
    </a>
  )
}
