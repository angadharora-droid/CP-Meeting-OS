const P = {
  primary: 'min-h-[44px] px-5 py-3 rounded-xl bg-[#AACC33] text-black font-bold text-[12px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-[#BADA44] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_14px_rgba(170,204,51,0.14)]',
  ghost:   'min-h-[44px] px-5 py-3 rounded-xl bg-transparent text-[#F0F0F0] border border-[#222] text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#3a3a3a] hover:bg-white/[0.02]',
  danger:  'min-h-[44px] px-5 py-3 rounded-xl bg-transparent text-[#FF5A5A] border border-[#FF5A5A]/20 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-[#FF5A5A]/40',
  input:   'bg-[#141414] border border-[#262626] rounded-xl text-[#F0F0F0] text-[13px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#2e2e2e] focus:border-[#AACC33]/45 focus:[box-shadow:0_0_0_3px_rgba(170,204,51,0.06)]',
  card:    'p-4 grid gap-4 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl',
  secHead: 'text-[10px] uppercase tracking-[0.18em] text-[#AACC33] font-semibold',
}

function Avatar({ name, size = 'md' }) {
  const letters = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const dim = size === 'lg' ? 'w-11 h-11 text-[13px]' : 'w-9 h-9 text-[11px]'
  return (
    <div className={`${dim} rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center font-bold text-[#AACC33] shrink-0`}>
      {letters}
    </div>
  )
}

export default function PeoplePage({ app }) {
  const editing = Boolean(app.managerForm.id)
  const pendingPinRequests = app.pinResetRequests.filter((r) => r.status === 'pending')

  return (
    <section className="grid gap-4">

      {/* ── Hero ── */}
      <div className="p-5 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl flex items-start justify-between gap-4">
        <div>
          <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-[#333]">Team access</p>
          <h1>Managers &amp; Settings</h1>
          <p className="m-0 mt-[6px] text-[#3a3a3a] text-[12px] leading-[1.6]">
            Manage managers and PIN access.
          </p>
        </div>
        <div className="shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full text-[#3a3a3a] bg-white/[0.02] border border-[#1e1e1e]">
          {app.managers.length} manager{app.managers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Create / Edit Manager (admin only) ── */}
      {app.isAdmin && (
        <div className={P.card}>
          <div className="flex items-center justify-between gap-3">
            <div className={P.secHead}>{editing ? 'Edit manager' : 'Create manager'}</div>
            {editing && (
              <button
                className="text-[#444] text-[11px] uppercase tracking-[0.1em] cursor-pointer hover:text-[#888] transition-colors"
                onClick={() => app.setManagerForm({ id: '', name: '', desig: '', email: '', pin: '' })}
              >
                ✕ Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#444]">
              Full name *
              <input className={P.input} value={app.managerForm.name}
                onChange={(e) => app.setManagerForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Manager name" />
            </label>
            <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#444]">
              Designation *
              <input className={P.input} value={app.managerForm.desig}
                onChange={(e) => app.setManagerForm((c) => ({ ...c, desig: e.target.value }))}
                placeholder="Operations Manager" />
            </label>
          </div>

          <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#444]">
            Gmail *
            <input className={P.input} value={app.managerForm.email}
              onChange={(e) => app.setManagerForm((c) => ({ ...c, email: e.target.value }))}
              placeholder="manager@gmail.com" />
          </label>

          <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#444]">
            6-digit PIN {editing ? '(leave blank to keep current)' : '*'}
            <input className={P.input} value={app.managerForm.pin}
              onChange={(e) => app.setManagerForm((c) => ({ ...c, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="123456" inputMode="numeric" maxLength={6} />
          </label>

          <button className={P.primary} onClick={app.saveManager}>
            {editing ? 'Update manager' : 'Create manager'}
          </button>
        </div>
      )}

      {/* ── Change my PIN ── */}
      <div className={P.card}>
        <div className={P.secHead}>Change my PIN</div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'currentPin', label: 'Current PIN', placeholder: '••••••' },
            { key: 'newPin',     label: 'New PIN',     placeholder: '••••••' },
            { key: 'confirmPin', label: 'Confirm new', placeholder: '••••••' },
          ].map(({ key, label, placeholder }) => (
            <label key={key} className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-[#444]">
              {label}
              <input className={P.input}
                value={app.pinChangeForm[key]}
                onChange={(e) => app.setPinChangeForm((c) => ({ ...c, [key]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder={placeholder}
                inputMode="numeric"
                maxLength={6}
              />
            </label>
          ))}
        </div>

        <button className={P.primary} onClick={app.changePin}>Update PIN</button>
      </div>

      {/* ── PIN reset requests (admin only) ── */}
      {app.isAdmin && (
        <div className={P.card}>
          <div className="flex items-center justify-between gap-3">
            <div className={P.secHead}>PIN reset requests</div>
            <span className={`px-3 py-[5px] text-[10px] uppercase tracking-[0.1em] rounded-full border ${
              pendingPinRequests.length > 0
                ? 'text-[#f5a623] bg-[#f5a623]/8 border-[#f5a623]/20'
                : 'text-[#2e2e2e] bg-white/[0.02] border-[#1e1e1e]'
            }`}>
              {pendingPinRequests.length} pending
            </span>
          </div>

          {app.pinResetRequests.length ? (
            <div className="grid gap-3">
              {app.pinResetRequests.map((req) => (
                <div key={req.requestId} className="p-4 border border-[#1e1e1e] bg-[#080808] rounded-xl grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={req.name} />
                      <div className="min-w-0">
                        <div className="text-[#F0F0F0] text-[14px] font-semibold truncate">{req.name}</div>
                        <div className="text-[#3a3a3a] text-[11px] truncate">{req.email}</div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.1em] font-semibold rounded-full border ${
                      req.status === 'issued'
                        ? 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/20'
                        : 'text-[#444] bg-white/[0.03] border-[#1e1e1e]'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#141414]">
                    <span className="text-[#3a3a3a] text-[11px]">
                      {req.tempPin
                        ? <span>Temp PIN: <code className="text-[#AACC33] font-mono">{req.tempPin}</code></span>
                        : 'Awaiting admin action'}
                    </span>
                    <button
                      className={P.ghost}
                      style={{ width: 'auto', minHeight: '36px', padding: '6px 14px', fontSize: '11px' }}
                      onClick={() => app.issueTempPin(req.requestId)}
                      disabled={req.status === 'issued'}
                    >
                      {req.status === 'issued' ? '✓ Issued' : 'Issue temp PIN'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 border border-dashed border-[#1a1a1a] rounded-xl text-[#2e2e2e] text-[12px] text-center">
              No PIN reset requests
            </div>
          )}
        </div>
      )}

      {/* ── Manager list ── */}
      {app.managers.length > 0 ? (
        <div>
          <p className="m-0 mb-3 uppercase tracking-[0.16em] text-[10px] text-[#2e2e2e]">All managers</p>
          <div className="grid gap-3">
            {app.managers.map((manager) => (
              <article key={manager.id} className="p-4 border border-[#1e1e1e] bg-[#0e0e0e] rounded-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={manager.name} size="lg" />
                    <div className="min-w-0">
                      <h3 className="m-0 text-[14px] font-semibold leading-snug truncate">{manager.name}</h3>
                      <p className="m-0 mt-[3px] text-[#3a3a3a] text-[11px] truncate">{manager.desig || 'No designation'}</p>
                      <p className="m-0 mt-[2px] text-[#2e2e2e] text-[11px] truncate">{manager.email}</p>
                    </div>
                  </div>
                  {app.isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button className={P.ghost}
                        style={{ width: 'auto', minHeight: '36px', padding: '6px 14px', fontSize: '11px' }}
                        onClick={() => app.editManager(manager)}>
                        Edit
                      </button>
                      <button className={P.danger}
                        style={{ width: 'auto', minHeight: '36px', padding: '6px 14px', fontSize: '11px' }}
                        onClick={() => app.deleteManager(manager.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-10 border border-dashed border-[#1a1a1a] rounded-2xl text-[#2e2e2e] text-[12px] text-center">
          No managers yet. {app.isAdmin ? 'Create one above.' : ''}
        </div>
      )}

    </section>
  )
}
