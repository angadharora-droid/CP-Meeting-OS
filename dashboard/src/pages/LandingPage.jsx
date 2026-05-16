import { useEffect, useRef, useCallback, useState } from "react";
import cpgLogo from "../assets/cpg-logo.png";

const APPS = [
  {
    key: "meeting-os",
    short: "MO",
    label: "Meeting OS",
    desc: "Schedule meetings, record closure notes, track action points, and manage the full meeting lifecycle.",
    href: "https://meetingos.centrepointgroup.in",
    accent: "#C2006E",
    accentRgb: "194,0,110",
    tags: ["Meetings", "Tasks", "People"],
    status: "Live",
    index: "01",
  },
  {
    key: "flash-report",
    short: "FR",
    label: "CP Flash Report",
    desc: "Daily hospitality pulse — occupancy, revenue, costs, and operational metrics across all hotels.",
    href: "https://flashreport.centrepointgroup.in",
    accent: "#E040A0",
    accentRgb: "224,64,160",
    tags: ["Daily", "Hotels", "Revenue"],
    status: "Live",
    index: "02",
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

const CELL = 36;
const GLOW_R = 260;

export default function LandingPage() {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const targetRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

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

    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const x = col * CELL;
        const y = row * CELL;
        const dx = x - lx;
        const dy = y - ly;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const prox = Math.max(0, 1 - dist / GLOW_R);
        const proxCore = Math.max(0, 1 - dist / (GLOW_R * 0.35));

        const r = 0.7 + prox * 3.2;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (proxCore > 0.1) {
          ctx.fillStyle = `rgba(194,0,110,${0.55 + proxCore * 0.35})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224,64,160,${proxCore * 0.9})`;
          ctx.fill();
        } else if (prox > 0.04) {
          ctx.fillStyle = `rgba(194,0,110,${0.06 + prox * 0.32})`;
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fill();
        }
      }
    }
  }, []);

  const animate = useCallback(() => {
    const t = targetRef.current;
    const m = mouseRef.current;
    mouseRef.current = {
      x: lerp(m.x, t.x, 0.1),
      y: lerp(m.y, t.y, 0.1),
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
      {/* Noise grain overlay */}
      <div style={styles.grain} />

      {/* Ambient glow blobs */}
      <div style={styles.blobWrap}>
        <div style={{ ...styles.blob, ...styles.blob1 }} />
        <div style={{ ...styles.blob, ...styles.blob2 }} />
      </div>

      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Hero logo + glow — absolute, right side */}
      <div style={styles.heroRight}>
        <div style={styles.heroGlow} />
        <img src={cpgLogo} alt="" style={styles.heroLogoImg} draggable={false} />
      </div>

      <div
        style={{
          ...styles.content,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.inner}>
            <div style={styles.brand}>
              <div style={styles.badge}>
                <img
                  src={cpgLogo}
                  alt="CPG"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                  }}
                  draggable={false}
                />
              </div>
              <div style={styles.brandText}>
                <div style={styles.brandName}>Centre Point Group</div>
                <div style={styles.brandSub}>Operations Portal</div>
              </div>
            </div>

            <nav style={styles.nav}>
              <div style={styles.statusPill}>
                <span style={styles.statusDot} />
                <span style={styles.statusLabel}>All systems live</span>
              </div>
              <div style={styles.navDivider} />
              <div style={styles.dateTag}>{today()}</div>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main style={styles.main}>
          {/* Hero — two column */}
          <div style={styles.hero}>
            {/* Left */}
            <div style={styles.heroLeft}>
              <div style={styles.eyebrowRow}>
                <span style={styles.eyebrowChip}>Command Desk</span>
              </div>

              <h1 style={styles.headline}>
                <span style={styles.headlineWhite}>Pick a system.</span>
                <br />
                <span style={styles.headlineAccent}>Start the work.</span>
              </h1>

              <p style={styles.sub}>
                Internal tools for meeting governance and daily hotel operations —
                unified under one portal.
              </p>

            </div>

          </div>

          {/* Section header */}
          <div id="apps" style={styles.sectionRow}>
            <span style={styles.sectionLabel}>Applications</span>
            <div style={styles.sectionLine} />
            <span style={styles.sectionCount}>{APPS.length} active</span>
          </div>

          {/* Cards */}
          <div style={styles.cards}>
            {APPS.map((app, i) => (
              <AppCard key={app.key} app={app} delay={i * 90} />
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <div style={styles.footerLeft}>
              <div style={styles.footerLogo}>
                <img
                  src={cpgLogo}
                  alt="CPG"
                  style={{
                    width: 18,
                    height: 18,
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                    opacity: 0.5,
                  }}
                  draggable={false}
                />
              </div>
              <span style={styles.footerCopy}>
                © {new Date().getFullYear()} Centre Point Group
              </span>
            </div>

            <div style={styles.tickerWrap}>
              <span style={styles.tickerInner}>
                CENTRE POINT GROUP &nbsp;·&nbsp; INTERNAL USE ONLY &nbsp;·&nbsp;
                OPERATIONS PORTAL &nbsp;·&nbsp; CENTRE POINT GROUP &nbsp;·&nbsp;
                INTERNAL USE ONLY &nbsp;·&nbsp; OPERATIONS PORTAL &nbsp;·&nbsp;
              </span>
            </div>

            <div style={styles.footerRight}>
              <span style={styles.footerVersion}>v2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ─── AppCard ─────────────────────────────────────────────────────────────── */

function AppCard({ app, delay }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const { accent, accentRgb } = app;

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((e.clientY - cy) / rect.height) * -10;
    const ry = ((e.clientX - cx) / rect.width) * 12;
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    glow.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(${accentRgb},0.14) 0%, transparent 65%)`;
    glow.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    card.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    glow.style.opacity = "0";
  };

  return (
    <a
      ref={cardRef}
      href={app.href}
      style={{ ...styles.card, animationDelay: `${delay}ms` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={glowRef} style={styles.cardGlow} />
      <div style={styles.cardEdge} />

      {/* Top row: index + live */}
      <div style={styles.cardHead}>
        <div style={{ ...styles.indexBadge, color: accent, borderColor: `rgba(${accentRgb},0.2)` }}>
          {app.index}
        </div>
        <div style={{ ...styles.livePill, color: accent, background: `rgba(${accentRgb},0.1)`, borderColor: `rgba(${accentRgb},0.25)` }}>
          <span style={{ ...styles.liveDot, background: accent }} />
          {app.status}
        </div>
      </div>

      {/* Body: icon left, text right */}
      <div style={styles.cardBody}>
        <div style={{ ...styles.iconBox, background: `rgba(${accentRgb},0.1)`, borderColor: `rgba(${accentRgb},0.2)` }}>
          <span style={{ ...styles.iconText, color: accent }}>{app.short}</span>
        </div>
        <div style={styles.cardContent}>
          <div style={styles.cardTitle}>{app.label}</div>
          <div style={styles.cardDesc}>{app.desc}</div>
        </div>
      </div>

      {/* Foot */}
      <div style={styles.cardFoot}>
        <div style={styles.tags}>
          {app.tags.map((tag) => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
        <div style={{ ...styles.launchBtn, borderColor: `rgba(${accentRgb},0.3)`, color: accent }}>
          <span>Open</span>
          <span style={styles.launchArrow}>→</span>
        </div>
      </div>
    </a>
  );
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const FONTS = {
  display: "'Syne', sans-serif",
  mono: "'Space Mono', monospace",
  body: "'DM Sans', 'Space Grotesk', sans-serif",
};

const C = {
  pink: "#C2006E",
  hotpink: "#E040A0",
  bg: "#07070A",
  surface: "rgba(255,255,255,0.03)",
  txt: "#F0EEF8",
  muted: "rgba(240,238,248,0.82)",
  faint: "rgba(240,238,248,0.65)",
  vfaint: "rgba(240,238,248,0.45)",
  border: "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.1)",
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = {
  shell: {
    fontFamily: FONTS.body,
    background: C.bg,
    color: C.txt,
    height: "100dvh",
    overflow: "hidden",
    position: "relative",
  },

  grain: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    opacity: 0.028,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat",
    backgroundSize: "200px 200px",
    pointerEvents: "none",
  },

  blobWrap: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(100px)",
  },
  blob1: {
    width: 600,
    height: 600,
    top: "-15%",
    left: "-10%",
    background:
      "radial-gradient(circle, rgba(194,0,110,0.13) 0%, transparent 70%)",
    animation: "blobDrift1 22s ease-in-out infinite",
  },
  blob2: {
    width: 500,
    height: 500,
    bottom: "-10%",
    right: "-5%",
    background:
      "radial-gradient(circle, rgba(224,64,160,0.09) 0%, transparent 70%)",
    animation: "blobDrift2 28s ease-in-out infinite",
  },

  logoBg: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 0,
    overflow: "hidden",
  },
  logoImg: {
    width: "min(65vw, 580px)",
    height: "min(65vw, 580px)",
    objectFit: "contain",
    opacity: 0.04,
    filter: "brightness(0) invert(1)",
    animation: "logoBreathe 90s linear infinite",
    userSelect: "none",
    pointerEvents: "none",
  },

  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 1,
  },

  content: {
    position: "relative",
    zIndex: 3,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },

  /* Header */
  header: {
    padding: "0 28px",
    height: 58,
    display: "flex",
    alignItems: "center",
    borderBottom: `0.5px solid ${C.border}`,
    background: "rgba(7,7,10,0.72)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    flexShrink: 0,
  },
  inner: {
    maxWidth: 1120,
    margin: "0 auto",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 11 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: C.pink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    padding: 5,
    boxShadow: `0 0 0 1px rgba(194,0,110,0.3), 0 4px 16px rgba(194,0,110,0.2)`,
  },
  brandText: { display: "flex", flexDirection: "column", gap: 2 },
  brandName: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.txt,
    lineHeight: 1,
  },
  brandSub: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: C.muted,
    lineHeight: 1,
  },
  nav: { display: "flex", alignItems: "center", gap: 14 },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "5px 12px",
    borderRadius: 100,
    border: `0.5px solid rgba(194,0,110,0.25)`,
    background: "rgba(194,0,110,0.07)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: C.pink,
    flexShrink: 0,
    boxShadow: `0 0 6px ${C.pink}`,
    animation: "blink 2.5s ease-in-out infinite",
  },
  statusLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.pink,
  },
  navDivider: {
    width: 1,
    height: 16,
    background: C.border,
  },
  dateTag: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: C.faint,
    letterSpacing: "0.08em",
  },

  /* Main */
  main: {
    flex: 1,
    padding: "40px 28px 32px",
    maxWidth: 1120,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  /* Hero two-column */
  hero: {
    display: "flex",
    alignItems: "center",
    marginBottom: 28,
  },
  heroLeft: {
    maxWidth: 520,
  },
  heroRight: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: "45%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 2,
  },
  heroGlow: {
    position: "absolute",
    inset: "-10%",
    background: "radial-gradient(ellipse at center, rgba(194,0,110,0.4) 0%, rgba(224,64,160,0.18) 40%, transparent 70%)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },
  heroLogoImg: {
    position: "relative",
    width: 260,
    height: 260,
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
    opacity: 0.15,
    userSelect: "none",
    pointerEvents: "none",
    zIndex: 1,
  },

  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  eyebrowChip: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: C.pink,
    padding: "5px 10px",
    border: `0.5px solid rgba(194,0,110,0.3)`,
    borderRadius: 4,
    background: "rgba(194,0,110,0.07)",
    flexShrink: 0,
  },
  headline: {
    fontFamily: FONTS.display,
    fontSize: "clamp(36px, 6vw, 68px)",
    fontWeight: 800,
    lineHeight: 0.95,
    letterSpacing: "-0.03em",
    marginBottom: 18,
  },
  headlineWhite: {
    color: C.txt,
  },
  headlineAccent: {
    background: `linear-gradient(125deg, ${C.pink} 0%, ${C.hotpink} 55%, rgba(240,238,248,0.9) 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  sub: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 1.7,
    maxWidth: 400,
    fontWeight: 400,
    marginBottom: 24,
  },

  /* CTA buttons */
  ctaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    borderRadius: 8,
    background: C.pink,
    color: "#fff",
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s",
    boxShadow: `0 0 20px rgba(194,0,110,0.35)`,
  },
  ctaGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 16px",
    borderRadius: 8,
    background: "transparent",
    color: C.faint,
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.02em",
    textDecoration: "none",
    border: `0.5px solid ${C.border}`,
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
  },

  sectionRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: C.faint,
    flexShrink: 0,
  },
  sectionLine: {
    flex: 1,
    height: "0.5px",
    background: C.border,
  },
  sectionCount: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: C.faint,
    flexShrink: 0,
  },

  /* Cards */
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 12,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    borderRadius: 16,
    border: `0.5px solid ${C.borderMid}`,
    background: "rgba(255,255,255,0.02)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    padding: "18px 20px 16px",
    position: "relative",
    textDecoration: "none",
    color: C.txt,
    transition: "border-color 0.35s, transform 0.4s cubic-bezier(0.23,1,0.32,1)",
    cursor: "pointer",
    transformStyle: "preserve-3d",
    willChange: "transform",
    overflow: "hidden",
    animation: "cardReveal 0.6s cubic-bezier(0.23,1,0.32,1) both",
  },
  cardGlow: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    transition: "opacity 0.4s",
    pointerEvents: "none",
    borderRadius: "inherit",
  },
  cardEdge: {
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: "0.5px",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
    pointerEvents: "none",
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  indexBadge: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "3px 8px",
    borderRadius: 5,
    border: "0.5px solid",
    background: "rgba(255,255,255,0.03)",
  },
  livePill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: FONTS.mono,
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "4px 9px",
    borderRadius: 100,
    border: "0.5px solid",
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    flexShrink: 0,
    animation: "blink 2s ease-in-out infinite",
  },
  /* Horizontal body: icon left, text right */
  cardBody: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    flex: 1,
    marginBottom: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "0.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    color: C.txt,
  },
  cardDesc: {
    fontSize: 11.5,
    color: C.muted,
    lineHeight: 1.65,
    fontWeight: 400,
  },
  cardFoot: {
    paddingTop: 12,
    borderTop: `0.5px solid ${C.vfaint}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tags: { display: "flex", flexWrap: "wrap", gap: 5 },
  tag: {
    fontFamily: FONTS.mono,
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.faint,
    border: `0.5px solid ${C.vfaint}`,
    background: "rgba(255,255,255,0.025)",
    padding: "3px 7px",
    borderRadius: 4,
  },
  launchBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: FONTS.mono,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "6px 12px",
    borderRadius: 8,
    border: "0.5px solid",
    background: "rgba(255,255,255,0.03)",
    flexShrink: 0,
  },
  launchArrow: { fontSize: 11 },

  /* Footer */
  footer: {
    borderTop: `0.5px solid ${C.border}`,
    padding: "12px 28px",
    background: "rgba(7,7,10,0.72)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    flexShrink: 0,
  },
  footerInner: {
    maxWidth: 1120,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  footerLogo: {
    width: 22,
    height: 22,
    borderRadius: 5,
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  footerCopy: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: C.faint,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  tickerWrap: {
    overflow: "hidden",
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: C.vfaint,
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
    flex: 1,
  },
  tickerInner: {
    display: "inline-block",
    animation: "ticker 20s linear infinite",
  },
  footerRight: { flexShrink: 0 },
  footerVersion: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: C.vfaint,
    letterSpacing: "0.1em",
    padding: "3px 8px",
    border: `0.5px solid ${C.vfaint}`,
    borderRadius: 4,
  },
};