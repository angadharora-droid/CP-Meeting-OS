const P = {
  primary: 'min-h-[44px] px-5 py-3 rounded-xl bg-slate-700 text-white font-semibold text-[12px] tracking-[0.08em] uppercase cursor-pointer border-none transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.10)]',
  ghost:   'min-h-[44px] px-5 py-3 rounded-xl bg-white text-slate-700 border border-slate-200 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 font-medium',
  danger:  'min-h-[44px] px-5 py-3 rounded-xl bg-white text-red-700 border border-red-200 text-[12px] tracking-[0.06em] cursor-pointer transition-colors hover:border-red-300 hover:bg-red-50 font-medium',
  input:   'bg-white border border-slate-200 rounded-xl text-slate-900 text-[13px] px-[13px] py-3 w-full outline-none min-h-[44px] appearance-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-500 focus:[box-shadow:0_0_0_3px_rgba(51,65,85,0.10)]',
  card:    'p-4 grid gap-4 border border-slate-200 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  secHead: 'text-[10px] uppercase tracking-[0.18em] text-slate-700 font-semibold',
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
    <div className={`${dim} rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0`}>
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
      <div className="p-5 border border-slate-200 bg-white rounded-2xl flex items-start justify-between gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <p className="m-0 mb-[5px] uppercase tracking-[0.2em] text-[10px] text-slate-500 font-semibold">Team access</p>
          <h1 className="tracking-tight">Managers &amp; Settings</h1>
          <p className="m-0 mt-[6px] text-slate-600 text-[12px] leading-[1.6]">
            Manage managers and PIN access.
          </p>
        </div>
        <div className="shrink-0 px-3 py-[6px] text-[10px] uppercase tracking-[0.12em] rounded-full text-slate-500 bg-slate-50 border border-slate-200 font-semibold">
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
                className="text-slate-500 text-[11px] uppercase tracking-[0.1em] cursor-pointer hover:text-slate-700 transition-colors font-semibold"
                onClick={() => app.setManagerForm({ id: '', name: '', desig: '', email: '', pin: '' })}
              >
                ✕ Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
              Full name *
              <input className={P.input} value={app.managerForm.name}
                onChange={(e) => app.setManagerForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Manager name" />
            </label>
            <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
              Designation *
              <input className={P.input} value={app.managerForm.desig}
                onChange={(e) => app.setManagerForm((c) => ({ ...c, desig: e.target.value }))}
                placeholder="Operations Manager" />
            </label>
          </div>

          <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
            Gmail *
            <input className={P.input} value={app.managerForm.email}
              onChange={(e) => app.setManagerForm((c) => ({ ...c, email: e.target.value }))}
              placeholder="manager@gmail.com" />
          </label>

          <label className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
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
            <label key={key} className="grid gap-[6px] text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
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
            <span className={`px-3 py-[5px] text-[10px] uppercase tracking-[0.1em] rounded-full border font-semibold ${
              pendingPinRequests.length > 0
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-slate-500 bg-slate-50 border-slate-200'
            }`}>
              {pendingPinRequests.length} pending
            </span>
          </div>

          {app.pinResetRequests.length ? (
            <div className="grid gap-3">
              {app.pinResetRequests.map((req) => (
                <div key={req.requestId} className="p-4 border border-slate-200 bg-slate-50 rounded-xl grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={req.name} />
                      <div className="min-w-0">
                        <div className="text-slate-900 text-[14px] font-semibold truncate">{req.name}</div>
                        <div className="text-slate-500 text-[11px] truncate">{req.email}</div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.1em] font-bold rounded-full border ${
                      req.status === 'issued'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-white border-slate-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-500 text-[11px]">
                      {req.tempPin
                        ? <span>Temp PIN: <code className="text-slate-700 font-mono">{req.tempPin}</code></span>
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
            <div className="py-8 border border-dashed border-slate-300 rounded-xl text-slate-500 text-[12px] text-center">
              No PIN reset requests
            </div>
          )}
        </div>
      )}

      {/* ── Manager list ── */}
      {app.managers.length > 0 ? (
        <div>
          <p className="m-0 mb-3 uppercase tracking-[0.16em] text-[10px] text-slate-500 font-semibold">All managers</p>
          <div className="grid gap-3">
            {app.managers.map((manager) => (
              <article key={manager.id} className="p-4 border border-slate-200 bg-white rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={manager.name} size="lg" />
                    <div className="min-w-0">
                      <h3 className="m-0 text-[14px] font-semibold leading-snug truncate">{manager.name}</h3>
                      <p className="m-0 mt-[3px] text-slate-500 text-[11px] truncate">{manager.desig || 'No designation'}</p>
                      <p className="m-0 mt-[2px] text-slate-500 text-[11px] break-all sm:truncate">{manager.email}</p>
                    </div>
                  </div>
                  {app.isAdmin && (
                    <div className="flex gap-2 shrink-0 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
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
        <div className="py-10 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-[12px] text-center">
          No managers yet. {app.isAdmin ? 'Create one above.' : ''}
        </div>
      )}

    </section>
  )
}
