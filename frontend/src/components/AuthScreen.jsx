import { useEffect, useState } from 'react'

export default function AuthScreen({ pin, onDigit, onBack, pinResetForm, onPinResetFormChange, onRequestPinReset }) {
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showReset) return
      if (e.key >= '0' && e.key <= '9') onDigit(e.key)
      else if (e.key === 'Backspace') onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDigit, onBack, showReset])

  return (
    <main className="min-h-screen grid place-items-center p-4 relative overflow-hidden">
      <section className="surface-panel w-full max-w-[410px] grid gap-0 text-center relative z-10 rounded-3xl p-5 sm:p-6">

        {/* Logo & brand */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-[58px] h-[58px] grid place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-white font-bold text-[14px] tracking-wide shadow-[0_8px_24px_rgba(15,23,42,0.28)]">
            MO
          </div>
          <div>
            <p className="m-0 text-[10px] uppercase tracking-[0.28em] text-slate-500 font-semibold mb-[6px]">
              Centre Point Hospitality
            </p>
            <h1 className="text-[1.75rem] font-bold text-slate-900 leading-tight mb-2 tracking-tight" style={{ fontSize: '1.75rem' }}>
              Meeting OS
            </h1>
            <p className="text-[0.78rem] text-slate-500 m-0">
              Enter your 6-digit PIN to continue
            </p>
          </div>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-[14px] mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              style={{ transitionDelay: `${i * 20}ms` }}
              className={`rounded-full transition-all duration-200 ${
                i < pin.length
                  ? 'w-[14px] h-[14px] bg-slate-700 shadow-[0_0_0_4px_rgba(15,23,42,0.12)]'
                  : i === pin.length
                  ? 'w-3 h-3 border-[2px] border-slate-400 bg-transparent'
                  : 'w-3 h-3 border-[1.5px] border-slate-200 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-[10px] mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              className="h-[62px] bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.95] text-slate-900 text-xl font-medium rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-100 select-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              onClick={() => onDigit(d)}
            >
              {d}
            </button>
          ))}

          <button
            className="h-[62px] bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.95] text-slate-500 text-[11px] uppercase tracking-[0.12em] font-semibold rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-100 select-none"
            onClick={() => setShowReset((v) => !v)}
          >
            {showReset ? 'Back' : 'Help'}
          </button>
          <button
            className="h-[62px] bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.95] text-slate-900 text-xl font-medium rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-100 select-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            onClick={() => onDigit('0')}
          >
            0
          </button>
          <button
            className="h-[62px] bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.95] text-slate-500 text-2xl rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-100 select-none"
            onClick={onBack}
          >
            Del
          </button>
        </div>

        {/* PIN reset section */}
        {showReset && (
          <div className="grid gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left animate-slide-up">
            <div>
              <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-slate-700 font-semibold mb-[6px]">
                Forgot PIN?
              </p>
              <p className="m-0 text-[0.75rem] text-slate-500 leading-[1.6]">
                Submit a request and your admin will issue a temporary PIN.
              </p>
            </div>

            <label className="grid gap-[6px] text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
              Your name
              <input
                className="h-11 rounded-xl bg-white border border-slate-200 px-3 text-slate-900 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/15 transition-colors"
                value={pinResetForm.name}
                onChange={(e) => onPinResetFormChange((c) => ({ ...c, name: e.target.value }))}
                placeholder="Full name"
              />
            </label>
            <label className="grid gap-[6px] text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
              Gmail address
              <input
                className="h-11 rounded-xl bg-white border border-slate-200 px-3 text-slate-900 text-[13px] outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/15 transition-colors"
                value={pinResetForm.email}
                onChange={(e) => onPinResetFormChange((c) => ({ ...c, email: e.target.value }))}
                placeholder="name@gmail.com"
              />
            </label>
            <button
              className="h-12 rounded-xl bg-slate-700 text-white font-semibold text-[13px] uppercase tracking-[0.1em] border-none cursor-pointer hover:bg-slate-800 active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(15,23,42,0.22)]"
              onClick={onRequestPinReset}
            >
              Send reset request
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
