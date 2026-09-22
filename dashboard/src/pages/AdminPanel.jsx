import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../lib/auth";

const PIN_RE = /^\d{6}$/;
const ID_RE = /^[a-z0-9][a-z0-9._-]{1,39}$/;

function secretProblem(type, value) {
  if (type === "pin" && !PIN_RE.test(value)) return "PIN must be exactly six digits";
  if (type === "password" && value.length < 8) return "Password must be at least eight characters";
  return "";
}

function slugFromName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
}

// Accepts "id,name,email" lines; a header row is skipped.
function parseCsv(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id = "", name = "", email = ""] = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
      return { id, name, email: email.toLowerCase(), secret: "" };
    })
    .filter((row) => row.id && !/^id$/i.test(row.id));
}

function makeAdminStyles(C, F, m) {
  return {
    top: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" },
    eyebrow: { fontFamily: F.mono, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.pink, marginBottom: 8 },
    title: { fontFamily: F.display, fontSize: m ? 26 : 32, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: C.txt },
    tabs: { display: "flex", gap: 8, marginBottom: 18 },
    tab: {
      height: 36, padding: "0 14px", borderRadius: 100, border: `0.5px solid ${C.border}`,
      background: C.surface, color: C.muted, fontFamily: F.body, fontSize: 12, fontWeight: 600, cursor: "pointer",
    },
    tabActive: { border: "0.5px solid rgba(194,0,110,0.45)", background: "rgba(194,0,110,0.1)", color: C.pink },
    notice: { fontFamily: F.body, fontSize: 12, color: C.pink, margin: "0 0 12px" },
    card: {
      border: `0.5px solid ${C.border}`, background: C.cardBg, borderRadius: 14,
      padding: m ? 14 : 18, marginBottom: 16, boxShadow: C.cardShadow,
    },
    cardTitle: { fontFamily: F.display, fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: C.txt },
    grid: { display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 },
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" },
    smallBtn: {
      height: 34, padding: "0 12px", borderRadius: 8, border: `0.5px solid ${C.border}`,
      background: C.surface, color: C.txt, fontFamily: F.body, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    },
    smallBtnAccent: { border: "0.5px solid rgba(194,0,110,0.45)", background: "rgba(194,0,110,0.1)", color: C.pink },
    smallBtnDanger: { border: "0.5px solid rgba(229,72,77,0.4)", background: "rgba(229,72,77,0.08)", color: "#E5484D" },
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", fontFamily: F.body, fontSize: 13, color: C.txt },
    th: { textAlign: "left", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint, padding: "8px 10px", borderBottom: `0.5px solid ${C.border}`, whiteSpace: "nowrap" },
    td: { padding: "10px 10px", borderBottom: `0.5px solid ${C.border}`, verticalAlign: "middle" },
    mono: { fontFamily: F.mono, fontSize: 12 },
    muted: { color: C.faint },
    pill: { display: "inline-block", padding: "2px 8px", borderRadius: 100, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: `0.5px solid ${C.border}`, color: C.muted },
    pillOn: { border: "0.5px solid rgba(194,0,110,0.35)", color: C.pink, background: "rgba(194,0,110,0.08)" },
    select: {
      height: 42, padding: "0 10px", borderRadius: 10, border: `0.5px solid ${C.borderMid}`,
      background: C.surface, color: C.txt, fontFamily: F.body, fontSize: 14,
    },
    textarea: {
      minHeight: 110, padding: 12, borderRadius: 10, border: `0.5px solid ${C.borderMid}`,
      background: C.surface, color: C.txt, fontFamily: F.mono, fontSize: 12, resize: "vertical", width: "100%", boxSizing: "border-box",
    },
    inputSm: {
      height: 34, padding: "0 10px", borderRadius: 8, border: `0.5px solid ${C.borderMid}`,
      background: C.surface, color: C.txt, fontFamily: F.body, fontSize: 13, minWidth: 120,
    },
  };
}

function SecretTypeToggle({ value, onChange, styles }) {
  return (
    <div style={styles.radioRow} role="radiogroup" aria-label="Secret type">
      {[["pin", "PIN (6 digits)"], ["password", "Password"]].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          style={{ ...styles.radioBtn, ...(value === key ? styles.radioBtnActive : {}) }}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Users tab ─────────────────────────────────────────────────────────────── */
function AddUserForm({ styles, s, apps, onCreated, onError }) {
  const [form, setForm] = useState({ centralId: "", name: "", email: "", role: "user", secretType: "pin", secret: "" });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const centralId = form.centralId.trim().toLowerCase();
    if (!ID_RE.test(centralId)) return onError("Central ID must be 2-40 characters: letters, digits, dot, dash or underscore");
    if (!form.name.trim()) return onError("Name is required");
    const problem = secretProblem(form.secretType, form.secret);
    if (problem) return onError(problem);
    setBusy(true);
    try {
      await authApi.admin.createUser({ ...form, centralId, name: form.name.trim(), email: form.email.trim() });
      setForm({ centralId: "", name: "", email: "", role: "user", secretType: "pin", secret: "" });
      onCreated(centralId);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form style={s.card} onSubmit={submit}>
      <h2 style={s.cardTitle}>Add a person</h2>
      <div style={s.grid}>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Central ID</span>
          <input style={styles.input} value={form.centralId} onChange={set("centralId")} autoCapitalize="none" spellCheck={false} placeholder="e.g. rahul" />
        </label>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Name</span>
          <input style={styles.input} value={form.name} onChange={set("name")} />
        </label>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Email (optional, used for matching)</span>
          <input style={styles.input} value={form.email} onChange={set("email")} type="email" />
        </label>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>Role</span>
          <select style={s.select} value={form.role} onChange={set("role")}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Signs in with</span>
          <SecretTypeToggle styles={styles} value={form.secretType} onChange={(v) => setForm((f) => ({ ...f, secretType: v, secret: "" }))} />
        </div>
        <label style={styles.field}>
          <span style={styles.fieldLabel}>{form.secretType === "pin" ? "PIN" : "Password"}</span>
          <input style={styles.input} value={form.secret} onChange={set("secret")} type={form.secretType === "pin" ? "text" : "password"} inputMode={form.secretType === "pin" ? "numeric" : undefined} autoComplete="off" />
        </label>
      </div>
      <div style={{ ...s.row, marginTop: 14 }}>
        <button type="submit" style={{ ...styles.primaryBtn, padding: "0 18px", opacity: busy ? 0.7 : 1 }} disabled={busy}>{busy ? "Saving…" : "Create"}</button>
        <span style={styles.inlineNote}>Apps are linked afterwards from the Manage panel, or from the Match tab. {apps.length} apps available.</span>
      </div>
    </form>
  );
}

function ManageUser({ user, apps, styles, s, onChanged, onError, onClose }) {
  const [form, setForm] = useState({ name: user.name, email: user.email || "", role: user.role, active: user.active });
  const [reset, setReset] = useState({ secretType: user.secretType, secret: "" });
  const [links, setLinks] = useState(() => Object.fromEntries(apps.map((a) => {
    const existing = user.links.find((l) => l.app === a.key);
    return [a.key, { localUserId: existing?.localUserId || "", localLabel: existing?.localLabel || "" }];
  })));
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setForm({ name: user.name, email: user.email || "", role: user.role, active: user.active });
    setLinks(Object.fromEntries(apps.map((a) => {
      const existing = user.links.find((l) => l.app === a.key);
      return [a.key, { localUserId: existing?.localUserId || "", localLabel: existing?.localLabel || "" }];
    })));
  }, [user, apps]);

  const run = async (key, fn, done) => {
    setBusy(key);
    try {
      await fn();
      onChanged(done);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy("");
    }
  };

  const saveProfile = () => run("profile", () => authApi.admin.updateUser(user.centralId, form), "Details saved");
  const resetSecret = () => {
    const problem = secretProblem(reset.secretType, reset.secret);
    if (problem) return onError(problem);
    return run("secret", () => authApi.admin.updateUser(user.centralId, reset), `${reset.secretType === "pin" ? "PIN" : "Password"} reset; they are signed out everywhere`).then(() => setReset((r) => ({ ...r, secret: "" })));
  };
  const unlock = () => run("unlock", () => authApi.admin.updateUser(user.centralId, { unlock: true }), "Unlocked");
  const saveLink = (app) => {
    const link = links[app];
    if (!link.localUserId.trim()) return onError("Enter the ID this person has inside that app");
    return run(`link:${app}`, () => authApi.admin.setLink(user.centralId, { app, localUserId: link.localUserId.trim(), localLabel: link.localLabel.trim() }), "Link saved");
  };
  const removeLink = (app) => run(`unlink:${app}`, () => authApi.admin.removeLink(user.centralId, app), "Link removed");
  const remove = () => {
    if (!window.confirm(`Delete ${user.centralId}? Their app accounts are untouched; only the central login and its links go.`)) return;
    run("delete", () => authApi.admin.deleteUser(user.centralId), "User deleted").then(onClose);
  };

  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();

  return (
    <div style={s.card}>
      <div style={{ ...s.top, marginBottom: 12 }}>
        <h2 style={s.cardTitle}>Manage <span style={s.mono}>{user.centralId}</span></h2>
        <button type="button" style={s.smallBtn} onClick={onClose}>Close</button>
      </div>

      <div style={s.grid}>
        <label style={styles.field}><span style={styles.fieldLabel}>Name</span><input style={styles.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
        <label style={styles.field}><span style={styles.fieldLabel}>Email</span><input style={styles.input} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
        <label style={styles.field}><span style={styles.fieldLabel}>Role</span>
          <select style={s.select} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="user">User</option><option value="admin">Admin</option>
          </select>
        </label>
        <label style={styles.field}><span style={styles.fieldLabel}>Status</span>
          <select style={s.select} value={form.active ? "active" : "inactive"} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "active" }))}>
            <option value="active">Active</option><option value="inactive">Deactivated</option>
          </select>
        </label>
      </div>
      <div style={{ ...s.row, marginTop: 12 }}>
        <button type="button" style={{ ...s.smallBtn, ...s.smallBtnAccent }} onClick={saveProfile} disabled={busy === "profile"}>Save details</button>
        {locked && <button type="button" style={s.smallBtn} onClick={unlock}>Unlock (locked after wrong attempts)</button>}
        <button type="button" style={{ ...s.smallBtn, ...s.smallBtnDanger, marginLeft: "auto" }} onClick={remove}>Delete user</button>
      </div>

      <h3 style={{ ...s.cardTitle, marginTop: 22 }}>Reset PIN / password</h3>
      <div style={s.grid}>
        <div style={styles.field}><span style={styles.fieldLabel}>Signs in with</span><SecretTypeToggle styles={styles} value={reset.secretType} onChange={(v) => setReset({ secretType: v, secret: "" })} /></div>
        <label style={styles.field}><span style={styles.fieldLabel}>New {reset.secretType === "pin" ? "PIN" : "password"}</span>
          <input style={styles.input} value={reset.secret} onChange={(e) => setReset((r) => ({ ...r, secret: e.target.value }))} type={reset.secretType === "pin" ? "text" : "password"} inputMode={reset.secretType === "pin" ? "numeric" : undefined} autoComplete="off" />
        </label>
      </div>
      <div style={{ ...s.row, marginTop: 12 }}>
        <button type="button" style={{ ...s.smallBtn, ...s.smallBtnAccent }} onClick={resetSecret} disabled={busy === "secret"}>Reset</button>
      </div>

      <h3 style={{ ...s.cardTitle, marginTop: 22 }}>App links</h3>
      <p style={styles.inlineNote}>For each app, enter the ID this person already has inside that app. The app's own records are not changed.</p>
      <div style={{ ...s.tableWrap, marginTop: 10 }}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>App</th><th style={s.th}>ID inside the app</th><th style={s.th}>Label (optional)</th><th style={s.th}></th></tr></thead>
          <tbody>
            {apps.map((a) => {
              const linked = user.links.some((l) => l.app === a.key);
              const link = links[a.key] || { localUserId: "", localLabel: "" };
              return (
                <tr key={a.key}>
                  <td style={s.td}>{a.label}{linked && <span style={{ ...s.pill, ...s.pillOn, marginLeft: 8 }}>linked</span>}</td>
                  <td style={s.td}><input style={s.inputSm} value={link.localUserId} onChange={(e) => setLinks((l) => ({ ...l, [a.key]: { ...l[a.key], localUserId: e.target.value } }))} /></td>
                  <td style={s.td}><input style={s.inputSm} value={link.localLabel} onChange={(e) => setLinks((l) => ({ ...l, [a.key]: { ...l[a.key], localLabel: e.target.value } }))} placeholder="name or email in app" /></td>
                  <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                    <button type="button" style={{ ...s.smallBtn, ...s.smallBtnAccent }} onClick={() => saveLink(a.key)} disabled={busy === `link:${a.key}`}>Save</button>
                    {linked && <button type="button" style={{ ...s.smallBtn, marginLeft: 6 }} onClick={() => removeLink(a.key)} disabled={busy === `unlink:${a.key}`}>Remove</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ users, apps, styles, s, refresh, flash, onError }) {
  const [selected, setSelected] = useState("");
  const current = users.find((u) => u.centralId === selected);
  const appLabel = (key) => apps.find((a) => a.key === key)?.label || key;

  return (
    <>
      <AddUserForm styles={styles} s={s} apps={apps} onError={onError} onCreated={async (id) => { await refresh(); flash(`Created ${id}`); setSelected(id); }} />
      {current && (
        <ManageUser user={current} apps={apps} styles={styles} s={s} onError={onError} onClose={() => setSelected("")}
          onChanged={async (msg) => { await refresh(); flash(msg); }} />
      )}
      <div style={s.card}>
        <h2 style={s.cardTitle}>People ({users.length})</h2>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Central ID</th><th style={s.th}>Name</th><th style={s.th}>Role</th><th style={s.th}>Signs in with</th><th style={s.th}>Status</th><th style={s.th}>Linked apps</th><th style={s.th}></th></tr></thead>
            <tbody>
              {users.map((u) => {
                const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                return (
                  <tr key={u.centralId}>
                    <td style={{ ...s.td, ...s.mono }}>{u.centralId}</td>
                    <td style={s.td}>{u.name}{u.email ? <div style={{ ...s.muted, fontSize: 11 }}>{u.email}</div> : null}</td>
                    <td style={s.td}><span style={{ ...s.pill, ...(u.role === "admin" ? s.pillOn : {}) }}>{u.role}</span></td>
                    <td style={s.td}>{u.secretType === "pin" ? "PIN" : "Password"}</td>
                    <td style={s.td}>{!u.active ? <span style={s.pill}>deactivated</span> : locked ? <span style={s.pill}>locked</span> : <span style={{ ...s.pill, ...s.pillOn }}>active</span>}</td>
                    <td style={{ ...s.td, ...s.muted, fontSize: 12 }}>{u.links.length ? u.links.map((l) => appLabel(l.app)).join(", ") : "none yet"}</td>
                    <td style={{ ...s.td, whiteSpace: "nowrap" }}><button type="button" style={s.smallBtn} onClick={() => setSelected(u.centralId)}>Manage</button></td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td style={{ ...s.td, ...s.muted }} colSpan={7}>No people yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Match tab ─────────────────────────────────────────────────────────────── */
function MatchTab({ users, apps, appMeta, styles, s, refresh, flash, onError }) {
  const [app, setApp] = useState(apps[0]?.key || "");
  const [rows, setRows] = useState([]);
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState({});   // localUserId -> { centralId, secret }
  const [busy, setBusy] = useState("");

  const hasDirectory = appMeta.find((a) => a.key === app)?.directory;
  const byEmail = useMemo(() => Object.fromEntries(users.filter((u) => u.email).map((u) => [u.email, u])), [users]);
  const byName = useMemo(() => Object.fromEntries(users.map((u) => [u.name.trim().toLowerCase(), u])), [users]);
  const linkedOwner = useCallback((localUserId) => users.find((u) => u.links.some((l) => l.app === app && l.localUserId === localUserId)), [users, app]);

  const suggestion = (row) => (row.email && byEmail[row.email]) || byName[row.name.trim().toLowerCase()] || null;

  const setRowsWithDrafts = (list) => {
    setRows(list);
    setDrafts(Object.fromEntries(list.map((row) => {
      const match = suggestion(row);
      return [row.id, { centralId: match ? match.centralId : slugFromName(row.name), secret: row.secret || "" }];
    })));
  };

  const loadFromApp = async () => {
    setLoading(true);
    try {
      const data = await authApi.admin.appUsers(app);
      setRowsWithDrafts(data.users || []);
      flash(`Loaded ${data.users?.length || 0} users from ${apps.find((a) => a.key === app)?.label}`);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const usePasted = () => {
    const list = parseCsv(csv);
    if (!list.length) return onError("Paste lines like: id,name,email");
    setRowsWithDrafts(list);
    return flash(`${list.length} rows ready`);
  };

  const act = async (row) => {
    const draft = drafts[row.id] || { centralId: "", secret: "" };
    const centralId = draft.centralId.trim().toLowerCase();
    if (!ID_RE.test(centralId)) return onError("Central ID must be 2-40 characters: letters, digits, dot, dash or underscore");
    const existing = users.find((u) => u.centralId === centralId);
    setBusy(row.id);
    try {
      if (existing) {
        await authApi.admin.setLink(centralId, { app, localUserId: row.id, localLabel: row.name || row.email });
        flash(`Linked ${row.name || row.id} to ${centralId}`);
      } else {
        const secret = String(draft.secret || "");
        const secretType = PIN_RE.test(secret) ? "pin" : "password";
        const problem = secretProblem(secretType, secret);
        if (problem) { onError(`${problem} (a six-digit PIN or an eight-plus character password)`); return; }
        await authApi.admin.createUser({
          centralId, name: row.name || row.id, email: row.email, role: "user", secretType, secret,
          links: [{ app, localUserId: row.id, localLabel: row.name || row.email }],
        });
        flash(`Created ${centralId} and linked ${row.name || row.id}`);
      }
      await refresh();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div style={s.card}>
        <h2 style={s.cardTitle}>Bring in an app's users</h2>
        <div style={s.row}>
          <label style={styles.field}><span style={styles.fieldLabel}>App</span>
            <select style={s.select} value={app} onChange={(e) => { setApp(e.target.value); setRows([]); setDrafts({}); }}>
              {apps.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </label>
          <button type="button" style={{ ...styles.primaryBtn, padding: "0 18px", opacity: hasDirectory ? 1 : 0.5 }} onClick={loadFromApp} disabled={!hasDirectory || loading} title={hasDirectory ? "" : "This app has no directory endpoint configured; paste its user list instead"}>
            {loading ? "Loading…" : "Load from app"}
          </button>
        </div>
        <p style={styles.inlineNote}>Or paste the app's user list, one per line as <span style={s.mono}>id,name,email</span>:</p>
        <textarea style={{ ...s.textarea, marginTop: 8 }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"rahul.s,Rahul Sharma,rahul@example.com\nEMP014,Priya Mehta,"} />
        <div style={{ ...s.row, marginTop: 10 }}>
          <button type="button" style={s.smallBtn} onClick={usePasted}>Use pasted list</button>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Match ({rows.length})</h2>
          <p style={styles.inlineNote}>Type the central ID for each person. If it already exists the app account is linked to it; otherwise a new central login is created with the PIN or password you enter.</p>
          <div style={{ ...s.tableWrap, marginTop: 10 }}>
            <table style={s.table}>
              <thead><tr><th style={s.th}>In app</th><th style={s.th}>Status</th><th style={s.th}>Central ID</th><th style={s.th}>PIN / password (new only)</th><th style={s.th}></th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const owner = linkedOwner(row.id);
                  const draft = drafts[row.id] || { centralId: "", secret: "" };
                  const existing = users.find((u) => u.centralId === draft.centralId.trim().toLowerCase());
                  const match = suggestion(row);
                  return (
                    <tr key={row.id}>
                      <td style={s.td}>
                        <div>{row.name || <span style={s.muted}>(no name)</span>}</div>
                        <div style={{ ...s.mono, ...s.muted, fontSize: 11 }}>{row.id}{row.email ? ` · ${row.email}` : ""}</div>
                      </td>
                      <td style={s.td}>
                        {owner ? <span style={{ ...s.pill, ...s.pillOn }}>linked to {owner.centralId}</span>
                          : match ? <span style={s.pill}>looks like {match.centralId}</span>
                          : <span style={s.pill}>new</span>}
                      </td>
                      <td style={s.td}>
                        {!owner && <input style={s.inputSm} value={draft.centralId} onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], centralId: e.target.value } }))} autoCapitalize="none" spellCheck={false} />}
                      </td>
                      <td style={s.td}>
                        {!owner && !existing && (
                          <input style={s.inputSm} value={draft.secret} onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...d[row.id], secret: e.target.value } }))} placeholder={row.secret ? "carried over" : "set one"} autoComplete="off" />
                        )}
                      </td>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                        {!owner && (
                          <button type="button" style={{ ...s.smallBtn, ...s.smallBtnAccent }} onClick={() => act(row)} disabled={busy === row.id}>
                            {busy === row.id ? "Working…" : existing ? "Link" : "Create & link"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Panel ─────────────────────────────────────────────────────────────────── */
export default function AdminPanel({ C, fonts, styles, apps, isMobile, onClose }) {
  const s = useMemo(() => makeAdminStyles(C, fonts, isMobile), [C, fonts, isMobile]);
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [appMeta, setAppMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([authApi.admin.users(), authApi.admin.apps()]);
      setUsers(u.users || []);
      setAppMeta(a.apps || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const flash = useCallback((msg) => {
    setError("");
    setNotice(msg);
    window.clearTimeout(flash._timer);
    flash._timer = window.setTimeout(() => setNotice(""), 3000);
  }, []);

  const onError = useCallback((msg) => { setNotice(""); setError(msg); }, []);

  return (
    <main style={styles.main}>
      <div style={s.top}>
        <div>
          <div style={s.eyebrow}>Central sign-on</div>
          <h1 style={s.title}>People & app links</h1>
        </div>
        <button type="button" style={{ ...styles.ghostBtn, padding: "0 16px" }} onClick={onClose}>Back to portal</button>
      </div>
      <div style={s.tabs} role="tablist">
        {[["users", "People"], ["match", "Match app users"]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {error && <p style={{ ...styles.formError, marginBottom: 12 }} role="alert">{error}</p>}
      {notice && <p style={s.notice} role="status">{notice}</p>}
      {loading ? (
        <p style={styles.inlineNote}>Loading…</p>
      ) : tab === "users" ? (
        <UsersTab users={users} apps={apps} styles={styles} s={s} refresh={refresh} flash={flash} onError={onError} />
      ) : (
        <MatchTab users={users} apps={apps} appMeta={appMeta} styles={styles} s={s} refresh={refresh} flash={flash} onError={onError} />
      )}
    </main>
  );
}
