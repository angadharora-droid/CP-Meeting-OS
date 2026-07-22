import { useEffect, useRef, useCallback, useState, useMemo } from "react";
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
  {
    key: "mickys-crm",
    short: "MC",
    label: "Micky's CRM",
    desc: "Manage customer relationships, track leads and deals, and oversee the full sales pipeline.",
    href: "https://mickys-crm.centrepointgroup.in/",
    accent: "#B5179E",
    accentRgb: "181,23,158",
    tags: ["CRM", "Sales", "Clients"],
    status: "Live",
    index: "03",
  },
  {
    key: "assets",
    short: "AS",
    label: "Assets",
    desc: "Central library for brand assets, media, and shared files across all Centre Point Group apps.",
    href: "https://assets.centrepointgroup.in/",
    accent: "#9D0CB5",
    accentRgb: "157,12,181",
    tags: ["Media", "Brand", "Files"],
    status: "Live",
    index: "04",
  },
  {
    key: "handover",
    short: "HO",
    label: "Handover",
    desc: "Capture and track shift handovers — pending tasks, open issues, and key updates between teams.",
    href: "https://handover.centrepointgroup.in/",
    accent: "#7209B7",
    accentRgb: "114,9,183",
    tags: ["Shifts", "Handoff", "Teams"],
    status: "Live",
    index: "05",
  },
  {
    key: "purosoul",
    short: "PS",
    label: "Purosoul",
    desc: "Purosoul spa and wellness — manage services, appointments, and guest experiences in one place.",
    href: "https://purosoul.centrepointgroup.in/",
    accent: "#560BAD",
    accentRgb: "86,11,173",
    tags: ["Spa", "Wellness", "Guests"],
    status: "Live",
    index: "06",
  },
  {
    key: "cp-leads",
    short: "CL",
    label: "CP Leads",
    desc: "Capture, qualify, and track incoming leads — follow-ups, conversions, and pipeline visibility in one place.",
    href: "https://cp-leads.centrepointgroup.in/",
    accent: "#480CA8",
    accentRgb: "72,12,168",
    tags: ["Leads", "Sales", "Pipeline"],
    status: "Live",
    index: "07",
  },
  {
    key: "purosoul-cash",
    short: "PC",
    label: "Purosoul Cash",
    desc: "Track Purosoul cash operations — daily collections, expenses, and settlements with full visibility.",
    href: "https://purosoulcash.centrepointgroup.in/",
    accent: "#3A0CA3",
    accentRgb: "58,12,163",
    tags: ["Cash", "Daily", "Finance"],
    status: "Live",
    index: "08",
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
const THEME_KEY = "cpg-theme";

const lerp = (a, b, t) => a + (b - a) * t;

const FONTS = {
  display: "'Syne', sans-serif",
  mono: "'Space Mono', monospace",
  body: "'DM Sans', 'Space Grotesk', sans-serif",
};

const DARK = {
  pink: "#C2006E",
  hotpink: "#E040A0",
  bg: "#07070A",
  headerBg: "rgba(7,7,10,0.82)",
  surface: "rgba(255,255,255,0.025)",
  txt: "#F0EEF8",
  muted: "rgba(240,238,248,0.82)",
  faint: "rgba(240,238,248,0.65)",
  vfaint: "rgba(240,238,248,0.5)",
  border: "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.1)",
  dot: "rgba(255,255,255,0.06)",
  cardBg: "rgba(255,255,255,0.02)",
  cardShadow: "none",
  cardEdge: "rgba(255,255,255,0.18)",
  badgeBg: "rgba(255,255,255,0.03)",
  tagBg: "rgba(255,255,255,0.025)",
  launchBg: "rgba(255,255,255,0.03)",
  footerLogoBg: "rgba(255,255,255,0.05)",
  accentEnd: "rgba(240,238,248,0.85)",
  gradientText: true,
  blob1: "rgba(194,0,110,0.13)",
  blob2: "rgba(224,64,160,0.09)",
  logoBgOpacity: 0.28,
};

const LIGHT = {
  pink: "#C2006E",
  hotpink: "#E040A0",
  bg: "#F8F5FC",
  headerBg: "rgba(255,255,255,0.95)",
  surface: "rgba(194,0,110,0.04)",
  txt: "#0D0A14",
  muted: "rgba(13,10,20,0.72)",
  faint: "rgba(13,10,20,0.56)",
  vfaint: "rgba(13,10,20,0.42)",
  border: "rgba(0,0,0,0.09)",
  borderMid: "rgba(194,0,110,0.15)",
  dot: "rgba(0,0,0,0.065)",
  cardBg: "#FFFFFF",
  cardShadow: "0 2px 8px rgba(0,0,0,0.05), 0 8px 28px rgba(194,0,110,0.06)",
  cardEdge: "rgba(194,0,110,0.12)",
  badgeBg: "rgba(194,0,110,0.06)",
  tagBg: "rgba(194,0,110,0.05)",
  launchBg: "rgba(194,0,110,0.05)",
  footerLogoBg: "rgba(0,0,0,0.06)",
  accentEnd: "#8B0050",
  gradientText: false,
  blob1: "rgba(194,0,110,0.08)",
  blob2: "rgba(224,64,160,0.06)",
  logoBgOpacity: 0.18,
};

function makeStyles(C, m = false) {
  return {
    shell: {
      fontFamily: FONTS.body,
      background: C.bg,
      color: C.txt,
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
      transition: "background 0.3s ease, color 0.3s ease",
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
    blobWrap: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" },
    blob: { position: "absolute", borderRadius: "50%", filter: "blur(100px)" },
    blob1: {
      width: 600, height: 600, top: "-15%", left: "-10%",
      background: `radial-gradient(circle, ${C.blob1} 0%, transparent 70%)`,
      animation: "blobDrift1 22s ease-in-out infinite",
    },
    blob2: {
      width: 500, height: 500, bottom: "-10%", right: "-5%",
      background: `radial-gradient(circle, ${C.blob2} 0%, transparent 70%)`,
      animation: "blobDrift2 28s ease-in-out infinite",
    },
    canvas: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 },
    heroBg: {
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: 2,
    },
    heroBgLogo: {
      width: m ? 320 : 520, height: m ? 320 : 520,
      background: "radial-gradient(circle at 40% 40%, rgba(224,64,160,0.9) 0%, rgba(194,0,110,0.75) 45%, rgba(120,0,70,0.5) 75%, transparent 100%)",
      WebkitMaskSize: "contain", maskSize: "contain",
      WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
      WebkitMaskPosition: "center", maskPosition: "center",
      opacity: C.logoBgOpacity,
    },
    content: {
      position: "relative", zIndex: 3,
      height: "100%", display: "flex", flexDirection: "column",
    },
    header: {
      padding: m ? "0 16px" : "0 28px", height: m ? 56 : 60,
      display: "flex", alignItems: "center",
      borderBottom: `0.5px solid ${C.border}`,
      background: C.headerBg,
      backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      flexShrink: 0,
      transition: "background 0.3s ease, border-color 0.3s ease",
    },
    inner: {
      maxWidth: 1120, margin: "0 auto", width: "100%",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    },
    brand: { display: "flex", alignItems: "center", gap: 11 },
    badge: {
      width: 34, height: 34, borderRadius: 9, background: C.pink,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden", padding: 5,
      boxShadow: `0 0 0 1px rgba(194,0,110,0.3), 0 4px 16px rgba(194,0,110,0.2)`,
    },
    brandText: { display: "flex", flexDirection: "column", gap: 2 },
    brandName: {
      fontFamily: FONTS.display, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: C.txt, lineHeight: 1,
    },
    brandSub: {
      fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.16em",
      textTransform: "uppercase", color: C.muted, lineHeight: 1,
    },
    nav: { display: "flex", alignItems: "center", gap: m ? 10 : 14 },
    statusPill: {
      display: "flex", alignItems: "center", gap: 7,
      padding: "6px 12px", borderRadius: 100,
      border: `0.5px solid rgba(194,0,110,0.25)`,
      background: "rgba(194,0,110,0.07)",
    },
    statusDot: {
      width: 5, height: 5, borderRadius: "50%", background: C.pink,
      flexShrink: 0, boxShadow: `0 0 6px ${C.pink}`,
      animation: "blink 2.5s ease-in-out infinite",
    },
    statusLabel: {
      fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.1em",
      textTransform: "uppercase", color: C.pink,
    },
    navDivider: { width: 1, height: 16, background: C.border },
    dateTag: { fontFamily: FONTS.mono, fontSize: 10, color: C.faint, letterSpacing: "0.08em" },
    themeBtn: {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 38, height: 38, borderRadius: 10,
      border: `0.5px solid ${C.border}`,
      background: C.surface,
      color: C.txt,
      cursor: "pointer",
      transition: "background 0.2s, border-color 0.2s, color 0.2s",
      flexShrink: 0,
      padding: 0,
    },
    main: {
      flex: 1, minHeight: 0, padding: m ? "20px 16px 28px" : "28px 28px 28px",
      maxWidth: 1120, margin: "0 auto",
      width: "100%", boxSizing: "border-box",
      overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column",
      justifyContent: "flex-start",
      scrollbarWidth: "thin", scrollbarColor: "rgba(194,0,110,0.4) transparent",
    },
    hero: { display: "flex", alignItems: "center", marginBottom: m ? 16 : 22 },
    heroLeft: { maxWidth: 580 },
    eyebrowRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: m ? 12 : 14 },
    eyebrowChip: {
      fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.22em", textTransform: "uppercase",
      color: C.pink, padding: "5px 10px",
      border: `0.5px solid rgba(194,0,110,0.3)`,
      borderRadius: 4, background: "rgba(194,0,110,0.07)", flexShrink: 0,
    },
    headline: {
      fontFamily: FONTS.display,
      fontSize: m ? "clamp(30px, 9vw, 42px)" : "clamp(34px, 4.6vw, 54px)",
      fontWeight: 800, lineHeight: 1.07,
      letterSpacing: "-0.03em", marginBottom: m ? 12 : 18,
    },
    headlineWhite: { color: C.txt },
    headlineAccent: C.gradientText ? {
      display: "inline-block",
      background: `linear-gradient(125deg, ${C.pink} 0%, ${C.hotpink} 55%, ${C.accentEnd} 100%)`,
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    } : {
      color: C.pink,
    },
    sub: {
      fontSize: 14.5, color: C.muted, lineHeight: 1.65,
      maxWidth: 470, fontWeight: 400, marginBottom: m ? 0 : 14,
    },
    sectionRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: m ? 10 : 14 },
    sectionLabel: {
      fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.22em",
      textTransform: "uppercase", color: C.faint, flexShrink: 0,
    },
    sectionLine: { flex: 1, height: "0.5px", background: C.border },
    sectionCount: {
      fontFamily: FONTS.mono, fontSize: 9, letterSpacing: "0.12em",
      textTransform: "uppercase", color: C.faint, flexShrink: 0,
    },
    searchWrap: {
      display: "flex", alignItems: "center", gap: 8,
      padding: "0 10px", height: m ? 40 : 34,
      borderRadius: 8, border: `0.5px solid ${C.border}`,
      background: C.surface, color: C.faint,
      width: m ? "100%" : 240, flexShrink: 0, boxSizing: "border-box",
      marginBottom: m ? 12 : 0,
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    searchInput: {
      flex: 1, minWidth: 0,
      background: "transparent", border: "none", outline: "none",
      fontFamily: FONTS.body, fontSize: m ? 16 : 12.5,
      color: C.txt, padding: 0,
    },
    searchClear: {
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 22, height: 22, padding: 0, borderRadius: 4,
      border: "none", background: "transparent",
      color: C.faint, cursor: "pointer", flexShrink: 0,
    },
    kbdHint: {
      fontFamily: FONTS.mono, fontSize: 9, color: C.vfaint,
      border: `0.5px solid ${C.border}`, borderRadius: 4,
      padding: "2px 6px", lineHeight: 1, flexShrink: 0,
    },
    cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 },
    card: {
      display: "flex", flexDirection: "column",
      borderRadius: 14, border: `0.5px solid ${C.borderMid}`,
      background: C.cardBg,
      boxShadow: C.cardShadow,
      backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
      padding: m ? "12px 14px 10px" : "14px 16px 12px", position: "relative",
      textDecoration: "none", color: C.txt,
      transition: "border-color 0.35s, transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s",
      cursor: "pointer", transformStyle: "preserve-3d",
      willChange: "transform", overflow: "hidden",
      animation: "cardReveal 0.6s cubic-bezier(0.23,1,0.32,1) both",
    },
    cardGlow: { position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.4s", pointerEvents: "none", borderRadius: "inherit" },
    cardEdge: {
      position: "absolute", top: 0, left: "15%", right: "15%", height: "0.5px",
      background: `linear-gradient(90deg, transparent, ${C.cardEdge}, transparent)`,
      pointerEvents: "none",
    },
    cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: m ? 8 : 10 },
    indexBadge: {
      fontFamily: FONTS.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      padding: "2px 6px", borderRadius: 5, border: "0.5px solid", background: C.badgeBg,
    },
    livePill: {
      display: "flex", alignItems: "center", gap: 4,
      fontFamily: FONTS.mono, fontSize: 8, fontWeight: 700,
      letterSpacing: "0.14em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 100, border: "0.5px solid",
    },
    liveDot: { width: 4, height: 4, borderRadius: "50%", flexShrink: 0, animation: "blink 2s ease-in-out infinite" },
    cardBody: { display: "flex", alignItems: "flex-start", gap: 10, flex: 1, marginBottom: m ? 8 : 10 },
    iconBox: { width: 34, height: 34, borderRadius: 8, border: "0.5px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    iconText: { fontFamily: FONTS.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em" },
    cardContent: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 },
    cardTitle: { fontFamily: FONTS.display, fontSize: 15.5, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: C.txt, margin: 0 },
    cardDesc: { fontSize: 12.5, color: C.muted, lineHeight: 1.55, fontWeight: 400 },
    cardFoot: { paddingTop: m ? 8 : 10, borderTop: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
    tags: { display: "flex", flexWrap: "wrap", gap: 4 },
    tag: {
      fontFamily: FONTS.mono, fontSize: 8, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
      color: C.faint, border: `0.5px solid ${C.border}`,
      background: C.tagBg, padding: "2px 6px", borderRadius: 4,
    },
    launchBtn: {
      display: "flex", alignItems: "center", gap: 4,
      fontFamily: FONTS.mono, fontSize: 8.5, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      padding: "5px 10px", borderRadius: 7,
      border: "0.5px solid", background: C.launchBg, flexShrink: 0,
    },
    launchArrow: { fontSize: 11 },
    emptyState: {
      padding: "44px 24px", textAlign: "center",
      border: `1px dashed ${C.borderMid}`, borderRadius: 16,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    },
    emptyTitle: { fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: C.txt, margin: 0 },
    emptyDesc: { fontSize: 13, color: C.muted, margin: 0 },
    emptyClear: {
      marginTop: 12,
      fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: C.pink, background: "rgba(194,0,110,0.08)",
      border: "0.5px solid rgba(194,0,110,0.35)",
      borderRadius: 100, padding: "9px 18px", cursor: "pointer",
    },
    footer: {
      borderTop: `0.5px solid ${C.border}`,
      padding: m ? "10px 16px" : "12px 28px",
      background: C.headerBg,
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      flexShrink: 0,
      transition: "background 0.3s ease",
    },
    footerInner: { maxWidth: 1120, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: m ? "space-between" : "flex-start", gap: 16 },
    footerLeft: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    footerLogo: { width: 22, height: 22, borderRadius: 5, background: C.footerLogoBg, display: "flex", alignItems: "center", justifyContent: "center" },
    footerCopy: { fontFamily: FONTS.mono, fontSize: 9, color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" },
    tickerWrap: { overflow: "hidden", fontFamily: FONTS.mono, fontSize: 9, color: C.vfaint, letterSpacing: "0.08em", whiteSpace: "nowrap", flex: 1 },
    tickerInner: { display: "inline-block", animation: "ticker 20s linear infinite" },
    footerRight: { flexShrink: 0 },
    footerVersion: { fontFamily: FONTS.mono, fontSize: 9, color: C.faint, letterSpacing: "0.1em", padding: "3px 8px", border: `0.5px solid ${C.border}`, borderRadius: 4 },
  };
}

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/* ─── Landing Page ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const canvasRef  = useRef(null);
  const shellRef   = useRef(null);
  const searchRef  = useRef(null);
  const mouseRef   = useRef({ x: -999, y: -999 });
  const targetRef  = useRef({ x: -999, y: -999 });
  const rafRef     = useRef(null);
  const runningRef = useRef(false);
  const fancyRef   = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [query, setQuery]     = useState("");
  const [isDark, setIsDark]   = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light") return false;
      if (stored === "dark") return true;
    } catch { /* private mode */ }
    return !window.matchMedia("(prefers-color-scheme: light)").matches;
  });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  const [reducedMotion, setReducedMotion] = useState(
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  const [hoverFine, setHoverFine] = useState(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false
  );

  const themeRef = useRef(isDark);
  const fancy    = hoverFine && !reducedMotion;

  const C      = isDark ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(C, isMobile), [isDark, isMobile]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (!q ? APPS : APPS.filter((a) => [a.label, a.desc, ...a.tags].join(" ").toLowerCase().includes(q))),
    [q]
  );

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* private mode */ }
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const watch = (queryStr, setter) => {
      const mq = window.matchMedia(queryStr);
      const onChange = (e) => setter(e.matches);
      setter(mq.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    };
    const cleanups = [
      watch("(max-width: 639px)", setIsMobile),
      watch("(prefers-reduced-motion: reduce)", setReducedMotion),
      watch("(hover: hover) and (pointer: fine)", setHoverFine),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);

  // "/" focuses search, from anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    const ctx  = canvas.getContext("2d");
    const dpr  = window.devicePixelRatio || 1;
    const W    = canvas.width / dpr;
    const H    = canvas.height / dpr;
    const cols = Math.ceil(W / CELL) + 2;
    const rows = Math.ceil(H / CELL) + 2;
    const { x: lx, y: ly } = mouseRef.current;
    const dark = themeRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const x  = col * CELL;
        const y  = row * CELL;
        const dx = x - lx;
        const dy = y - ly;
        const dist     = Math.sqrt(dx * dx + dy * dy);
        const prox     = Math.max(0, 1 - dist / GLOW_R);
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
          ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
          ctx.fill();
        }
      }
    }
  }, []);

  const animate = useCallback(() => {
    const t = targetRef.current;
    const m = mouseRef.current;
    const nx = lerp(m.x, t.x, 0.1);
    const ny = lerp(m.y, t.y, 0.1);
    mouseRef.current = { x: nx, y: ny };
    drawGrid();
    // Glow has settled on the cursor — stop the loop until the mouse moves again
    if (Math.abs(t.x - nx) < 0.4 && Math.abs(t.y - ny) < 0.4) {
      mouseRef.current = { x: t.x, y: t.y };
      runningRef.current = false;
      return;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, [drawGrid]);

  const wake = useCallback(() => {
    if (!fancyRef.current || runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const shell  = shellRef.current;
    if (!canvas || !shell) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = shell.offsetWidth * dpr;
    canvas.height = shell.offsetHeight * dpr;
    drawGrid();
  }, [drawGrid]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [resize]);

  useEffect(() => {
    fancyRef.current = fancy;
    if (!fancy) {
      targetRef.current = { x: -999, y: -999 };
      mouseRef.current  = { x: -999, y: -999 };
      drawGrid();
    }
  }, [fancy, drawGrid]);

  useEffect(() => {
    themeRef.current = isDark;
    drawGrid();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#07070A" : "#F8F5FC");
  }, [isDark, drawGrid]);

  const handleMouseMove = useCallback((e) => {
    const rect = shellRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    wake();
  }, [wake]);

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: -999, y: -999 };
    wake();
  }, [wake]);

  return (
    <div ref={shellRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={styles.shell}>
      <div style={styles.grain} />

      <div style={styles.blobWrap}>
        <div style={{ ...styles.blob, ...styles.blob1 }} />
        <div style={{ ...styles.blob, ...styles.blob2 }} />
      </div>

      <canvas ref={canvasRef} style={styles.canvas} aria-hidden="true" />

      <div style={styles.heroBg}>
        <div style={{ ...styles.heroBgLogo, WebkitMaskImage: `url(${cpgLogo})`, maskImage: `url(${cpgLogo})` }} />
      </div>

      <div style={{ ...styles.content, opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease" }}>

        {/* Header */}
        <header style={styles.header}>
          <div style={styles.inner}>
            <div style={styles.brand}>
              <div style={styles.badge}>
                <img src={cpgLogo} alt="Centre Point Group logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} draggable={false} />
              </div>
              <div style={styles.brandText}>
                <div style={styles.brandName}>Centre Point Group</div>
                <div style={styles.brandSub}>Operations Portal</div>
              </div>
            </div>

            <nav style={styles.nav} aria-label="Portal status">
              <div style={styles.statusPill} role="status" aria-label="All systems live" title="All systems live">
                <span style={styles.statusDot} />
                {!isMobile && <span style={styles.statusLabel}>All systems live</span>}
              </div>
              {!isMobile && (
                <>
                  <div style={styles.navDivider} />
                  <div style={styles.dateTag}>{today()}</div>
                </>
              )}
              <div style={styles.navDivider} />
              <button
                onClick={toggleTheme}
                className="theme-btn"
                style={styles.themeBtn}
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main style={styles.main}>
          <div style={styles.hero}>
            <div style={styles.heroLeft}>
              <div style={styles.eyebrowRow}>
                <span style={styles.eyebrowChip}>Command Desk</span>
              </div>
              <h1 style={styles.headline}>
                <span style={styles.headlineWhite}>One desk.</span>
                <br />
                <span style={styles.headlineAccent}>All systems.</span>
              </h1>
              <p style={styles.sub}>
                Internal tools for meeting governance and daily hotel operations — unified under one portal.
              </p>
            </div>
          </div>

          <div id="apps" style={styles.sectionRow}>
            <span style={styles.sectionLabel}>Applications</span>
            <div style={styles.sectionLine} />
            {!isMobile && (
              <SearchBox
                inputRef={searchRef}
                query={query}
                setQuery={setQuery}
                styles={styles}
                showHint
              />
            )}
            <span style={styles.sectionCount} aria-live="polite">
              {q ? `${filtered.length} of ${APPS.length}` : `${APPS.length} active`}
            </span>
          </div>

          {isMobile && (
            <SearchBox inputRef={searchRef} query={query} setQuery={setQuery} styles={styles} />
          )}

          {filtered.length > 0 ? (
            <div style={styles.cards}>
              {filtered.map((app, i) => (
                <AppCard key={app.key} app={app} delay={i * 60} styles={styles} tilt={fancy} />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No applications match “{query}”</p>
              <p style={styles.emptyDesc}>Try a different name or tag — for example “sales” or “daily”.</p>
              <button style={styles.emptyClear} onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <div style={styles.footerLeft}>
              <div style={styles.footerLogo}>
                <img src={cpgLogo} alt="" aria-hidden="true" style={{ width: 18, height: 18, objectFit: "contain", filter: isDark ? "brightness(0) invert(1)" : "none", opacity: 0.55 }} draggable={false} />
              </div>
              <span style={styles.footerCopy}>© {new Date().getFullYear()} Centre Point Group</span>
            </div>
            {!isMobile && (
              <div style={styles.tickerWrap} aria-hidden="true">
                <span style={styles.tickerInner}>
                  CENTRE POINT GROUP &nbsp;·&nbsp; INTERNAL USE ONLY &nbsp;·&nbsp; OPERATIONS PORTAL &nbsp;·&nbsp; CENTRE POINT GROUP &nbsp;·&nbsp; INTERNAL USE ONLY &nbsp;·&nbsp; OPERATIONS PORTAL &nbsp;·&nbsp;
                </span>
              </div>
            )}
            <div style={styles.footerRight}>
              <span style={styles.footerVersion}>v2.1</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ─── SearchBox ──────────────────────────────────────────────────────────────── */
function SearchBox({ inputRef, query, setQuery, styles, showHint = false }) {
  return (
    <div className="portal-search" style={styles.searchWrap} role="search">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search apps…"
        aria-label="Search applications"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        style={styles.searchInput}
      />
      {query ? (
        <button style={styles.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
          <ClearIcon />
        </button>
      ) : (
        showHint && <kbd style={styles.kbdHint}>/</kbd>
      )}
    </div>
  );
}

/* ─── AppCard ────────────────────────────────────────────────────────────────── */
function AppCard({ app, delay, styles, tilt }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const { accent, accentRgb } = app;

  const handleMouseMove = (e) => {
    if (!tilt) return;
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const rx = ((e.clientY - cy) / rect.height) * -10;
    const ry = ((e.clientX - cx) / rect.width)  * 12;
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    const px = ((e.clientX - rect.left) / rect.width)  * 100;
    const py = ((e.clientY - rect.top)  / rect.height) * 100;
    glow.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(${accentRgb},0.14) 0%, transparent 65%)`;
    glow.style.opacity = "1";
  };

  const handleMouseLeave = () => {
    if (!tilt) return;
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    glow.style.opacity = "0";
  };

  return (
    <a
      ref={cardRef}
      href={app.href}
      className="app-card"
      style={{ ...styles.card, animationDelay: `${delay}ms` }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={`Open ${app.label} — ${app.desc}`}
    >
      <div ref={glowRef} style={styles.cardGlow} />
      <div style={styles.cardEdge} />

      <div style={styles.cardHead}>
        <div style={{ ...styles.indexBadge, color: accent, borderColor: `rgba(${accentRgb},0.2)` }}>{app.index}</div>
        <div style={{ ...styles.livePill, color: accent, background: `rgba(${accentRgb},0.1)`, borderColor: `rgba(${accentRgb},0.25)` }}>
          <span style={{ ...styles.liveDot, background: accent }} />{app.status}
        </div>
      </div>

      <div style={styles.cardBody}>
        <div style={{ ...styles.iconBox, background: `rgba(${accentRgb},0.1)`, borderColor: `rgba(${accentRgb},0.2)` }}>
          <span style={{ ...styles.iconText, color: accent }}>{app.short}</span>
        </div>
        <div style={styles.cardContent}>
          <h2 style={styles.cardTitle}>{app.label}</h2>
          <div style={styles.cardDesc}>{app.desc}</div>
        </div>
      </div>

      <div style={styles.cardFoot}>
        <div style={styles.tags}>
          {app.tags.map((tag) => <span key={tag} style={styles.tag}>{tag}</span>)}
        </div>
        <div style={{ ...styles.launchBtn, borderColor: `rgba(${accentRgb},0.3)`, color: accent }}>
          <span>Open</span><span className="launch-arrow" style={styles.launchArrow}>→</span>
        </div>
      </div>
    </a>
  );
}
