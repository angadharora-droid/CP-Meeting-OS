import { useEffect, useRef, useCallback } from "react";

const APPS = [
  {
    key: "meeting-os",
    short: "MO",
    label: "Meeting OS",
    desc: "Schedule meetings, record closure notes, track action points, and manage the full meeting lifecycle.",
    href: "https://meetingos.centrepointgroup.in",
    accent: "#AACC33",
    accentRgb: "170,204,51",
    tags: ["Meetings", "Tasks", "People"],
    status: "Live",
  },
  {
    key: "flash-report",
    short: "FR",
    label: "CP Flash Report",
    desc: "Daily hospitality pulse — occupancy, revenue, costs, and operational metrics across all hotels.",
    href: "https://flashreport.centrepointgroup.in",
    accent: "#2DD4BF",
    accentRgb: "45,212,191",
    tags: ["Daily", "Hotels", "Revenue"],
    status: "Live",
  },
];

function today() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CELL = 56;
const GLOW_R = 280;

export default function LandingPage() {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const targetRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;
    canvas.width = shell.offsetWidth;
    canvas.height = shell.offsetHeight;
  }, []);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cols = Math.ceil(W / CELL) + 2;
    const rows = Math.ceil(H / CELL) + 2;
    const { x: lx, y: ly } = mouseRef.current;

    ctx.clearRect(0, 0, W, H);

    // Draw dots at grid intersections
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        const dx = x - lx;
        const dy = y - ly;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const prox     = Math.max(0, 1 - dist / GLOW_R);
        const proxCore = Math.max(0, 1 - dist / (GLOW_R * 0.35));

        // Dot radius: tiny at rest, grows near cursor
        const r = 0.9 + prox * 3.4;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (proxCore > 0.1) {
          // Inner core — teal center, lime ring
          ctx.fillStyle = `rgba(45,212,191,${0.55 + proxCore * 0.35})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170,204,51,${proxCore * 0.9})`;
          ctx.fill();
        } else if (prox > 0.04) {
          // Outer glow zone — white shifting to lime
          ctx.fillStyle = `rgba(170,204,51,${0.08 + prox * 0.38})`;
          ctx.fill();
        } else {
          // Resting state — dim white dot
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          ctx.fill();
        }
      }
    }
  }, []);

  const animate = useCallback(() => {
    const t = targetRef.current;
    const m = mouseRef.current;
    mouseRef.current = {
      x: lerp(m.x, t.x, 0.12),
      y: lerp(m.y, t.y, 0.12),
    };
    drawGrid();
    rafRef.current = requestAnimationFrame(animate);
  }, [drawGrid]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resize, animate]);

  const handleMouseMove = useCallback((e) => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: -999, y: -999 };
  }, []);

  return (
    <div
      ref={shellRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={styles.shell}
    >
      <canvas ref={canvasRef} style={styles.canvas} />

      <div style={styles.content}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.inner}>
            <div style={styles.brand}>
              <div style={styles.badge}>CPG</div>
              <div>
                <div style={styles.brandName}>Centre Point Group</div>
                <div style={styles.brandSub}>Operations Portal</div>
              </div>
            </div>
            <div style={styles.headerRight}>
              <div style={styles.statusDot}>
                <span style={styles.dot} />
                All systems live
              </div>
              <div style={styles.dateTag}>{today()}</div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={styles.main}>
          <div style={styles.hero}>
            <div style={styles.eyebrow}>
              <span style={styles.eyebrowLine} />
              Command Desk
            </div>
            <h1 style={styles.headline}>
              Pick a system.
              <br />
              <span style={styles.accentText}>Start the work.</span>
            </h1>
            <p style={styles.sub}>
              Internal tools for meeting governance and daily hotel operations — unified.
            </p>
          </div>

          <div style={styles.sectionLabel}>Applications</div>

          <div style={styles.cards}>
            {APPS.map((app) => (
              <AppCard key={app.key} app={app} />
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.inner}>
            <span style={styles.footerText}>
              {new Date().getFullYear()} Centre Point Group
            </span>
            <div style={styles.footerSep} />
            <div style={styles.tickerWrap}>
              <span style={styles.tickerInner}>
                CENTRE POINT GROUP &nbsp;·&nbsp; INTERNAL USE ONLY &nbsp;·&nbsp;
                OPERATIONS PORTAL &nbsp;·&nbsp; CENTRE POINT GROUP &nbsp;·&nbsp;
                INTERNAL USE ONLY &nbsp;·&nbsp; OPERATIONS PORTAL &nbsp;·&nbsp;
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AppCard({ app }) {
  const { accent, accentRgb } = app;

  return (
    <a
      href={app.href}
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`;
        e.currentTarget.style.background = `rgba(${accentRgb},0.06)`;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 0 40px rgba(${accentRgb},0.08), inset 0 0 40px rgba(${accentRgb},0.04)`;
        e.currentTarget.querySelector(".arrow-btn").style.transform =
          "translate(2px,-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.querySelector(".arrow-btn").style.transform =
          "translate(0,0)";
      }}
    >
      {/* Glass top shimmer */}
      <div style={styles.cardShimmer} />

      {/* Top row */}
      <div style={styles.cardTop}>
        <div style={{ ...styles.iconWrap, background: accent }}>
          {app.short}
          <div style={styles.iconOverlay} />
        </div>
        <div
          style={{
            ...styles.liveBadge,
            color: accent,
            borderColor: `rgba(${accentRgb},0.3)`,
            background: `rgba(${accentRgb},0.08)`,
          }}
        >
          <span
            style={{ ...styles.liveDot, background: accent }}
          />
          {app.status}
        </div>
      </div>

      {/* Title + desc */}
      <div style={styles.cardTitle}>{app.label}</div>
      <div style={styles.cardDesc}>{app.desc}</div>

      {/* Bottom */}
      <div style={styles.cardBottom}>
        <div style={styles.tags}>
          {app.tags.map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
        <div style={styles.launchRow}>
          <span style={{ ...styles.launchLabel, color: accent }}>Launch</span>
          <div className="arrow-btn" style={styles.arrowBtn}>
            ↗
          </div>
        </div>
      </div>
    </a>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const FONTS = {
  syne: "'Syne', sans-serif",
  mono: "'Space Mono', monospace",
  body: "'Space Grotesk', sans-serif",
};

const C = {
  lime: "#AACC33",
  teal: "#2DD4BF",
  bg: "#060608",
  txt: "#ECEAF6",
  muted: "rgba(236,234,246,0.38)",
  faint: "rgba(236,234,246,0.13)",
  b1: "rgba(255,255,255,0.06)",
  b2: "rgba(255,255,255,0.12)",
};

const styles = {
  shell: {
    fontFamily: FONTS.body,
    background: C.bg,
    color: C.txt,
    minHeight: "100dvh",
    overflow: "hidden",
    position: "relative",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 2,
  },

  /* Centering wrapper used inside header, main, footer */
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  /* Header */
  header: {
    padding: "14px 24px",
    borderBottom: `0.5px solid ${C.b1}`,
    background: "rgba(6,6,8,0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: C.txt,
    color: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  brandName: {
    fontFamily: FONTS.syne,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    lineHeight: 1.3,
  },
  brandSub: {
    fontFamily: FONTS.body,
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: C.muted,
    lineHeight: 1.3,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  statusDot: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: "0.06em",
  },
  dot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: C.lime,
    animation: "blink 2s ease-in-out infinite",
    flexShrink: 0,
  },
  dateTag: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: "0.08em",
    padding: "5px 10px",
    border: `0.5px solid ${C.b1}`,
    borderRadius: 6,
    background: "rgba(255,255,255,0.02)",
  },

  /* Main */
  main: { padding: "48px 24px 36px", maxWidth: 1100, margin: "0 auto", width: "100%" },
  hero: { marginBottom: 32 },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: FONTS.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: C.lime,
    marginBottom: 14,
  },
  eyebrowLine: {
    display: "inline-block",
    width: 20,
    height: 1,
    background: C.lime,
    flexShrink: 0,
  },
  headline: {
    fontFamily: FONTS.syne,
    fontSize: "clamp(34px, 6.5vw, 56px)",
    fontWeight: 800,
    lineHeight: 0.94,
    letterSpacing: "-0.025em",
    marginBottom: 14,
  },
  accentText: {
    background: `linear-gradient(135deg, ${C.lime} 0%, ${C.teal} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  sub: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 1.7,
    maxWidth: 380,
    fontWeight: 400,
    margin: 0,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: C.faint,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  /* Cards */
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 10,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    minHeight: 230,
    borderRadius: 18,
    border: "0.5px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    padding: 22,
    overflow: "hidden",
    position: "relative",
    textDecoration: "none",
    color: C.txt,
    transition: "border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s",
    cursor: "pointer",
  },
  cardShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background:
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
    pointerEvents: "none",
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONTS.mono,
    fontSize: 11,
    fontWeight: 700,
    color: "#000",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
  },
  iconOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "4px 8px",
    borderRadius: 6,
    border: "0.5px solid",
    backdropFilter: "blur(8px)",
  },
  liveDot: {
    display: "inline-block",
    width: 5,
    height: 5,
    borderRadius: "50%",
    flexShrink: 0,
    animation: "blink 2s ease-in-out infinite",
  },
  cardTitle: {
    fontFamily: FONTS.syne,
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 1.7,
    fontWeight: 400,
  },
  cardBottom: { marginTop: "auto", paddingTop: 16 },
  tags: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 },
  tag: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.faint,
    border: `0.5px solid rgba(255,255,255,0.07)`,
    background: "rgba(255,255,255,0.03)",
    padding: "3px 8px",
    borderRadius: 5,
    backdropFilter: "blur(4px)",
  },
  launchRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: "0.5px solid rgba(255,255,255,0.06)",
    paddingTop: 12,
  },
  launchLabel: {
    fontFamily: FONTS.syne,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    border: "0.5px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    color: C.muted,
    transition: "transform 0.2s, background 0.2s",
    backdropFilter: "blur(8px)",
  },

  /* Footer */
  footer: {
    borderTop: `0.5px solid ${C.b1}`,
    padding: "10px 24px",
    background: "rgba(6,6,8,0.6)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  },
  footerText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  footerSep: { width: 1, height: 10, background: C.b2, flexShrink: 0 },
  tickerWrap: {
    overflow: "hidden",
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
    flex: 1,
  },
  tickerInner: {
    display: "inline-block",
    animation: "ticker 18s linear infinite",
  },
};