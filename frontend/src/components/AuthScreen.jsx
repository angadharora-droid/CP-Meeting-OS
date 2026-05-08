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
    <main className="min-h-screen grid place-items-center p-4 bg-[#060606] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#C8F55A]/[0.04] blur-[100px]" />
      </div>

      <section className="w-full max-w-[380px] grid gap-0 text-center relative z-10">

        {/* Logo & brand */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-[60px] h-[60px] grid place-items-center rounded-2xl bg-[#AACC33] text-black font-black text-[14px] tracking-wide shadow-[0_0_24px_rgba(170,204,51,0.22)]">
            MO
          </div>
          <div>
            <p className="m-0 text-[10px] uppercase tracking-[0.28em] text-white/25 font-medium mb-[6px]">
              Centre Point Hospitality
            </p>
            <h1 className="text-[1.75rem] font-black text-white leading-tight mb-2" style={{ fontSize: '1.75rem' }}>
              Meeting OS
            </h1>
            <p className="text-[0.78rem] text-white/30 m-0">
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
                  ? 'w-[14px] h-[14px] bg-[#AACC33] shadow-[0_0_8px_rgba(170,204,51,0.6)]'
                  : i === pin.length
                  ? 'w-3 h-3 border-[2px] border-white/35 bg-transparent'
                  : 'w-3 h-3 border-[1.5px] border-white/12 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-[10px] mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              className="h-[62px] bg-[#131313] hover:bg-[#1a1a1a] active:bg-[#222] active:scale-[0.95] text-white/80 text-xl font-light rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all duration-100 select-none"
              onClick={() => onDigit(d)}
            >
              {d}
            </button>
          ))}

          <button
            className="h-[62px] bg-[#131313] hover:bg-[#1a1a1a] active:bg-[#222] active:scale-[0.95] text-white/35 text-[11px] uppercase tracking-[0.12em] font-medium rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all duration-100 select-none"
            onClick={() => setShowReset((v) => !v)}
          >
            {showReset ? '← Back' : 'Help'}
          </button>
          <button
            className="h-[62px] bg-[#131313] hover:bg-[#1a1a1a] active:bg-[#222] active:scale-[0.95] text-white/80 text-xl font-light rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all duration-100 select-none"
            onClick={() => onDigit('0')}
          >
            0
          </button>
          <button
            className="h-[62px] bg-[#131313] hover:bg-[#1a1a1a] active:bg-[#222] active:scale-[0.95] text-white/40 text-2xl rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all duration-100 select-none"
            onClick={onBack}
          >
            ⌫
          </button>
        </div>

        {/* PIN reset section — collapsed by default */}
        {showReset && (
          <div className="grid gap-3 p-4 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl text-left animate-slide-up">
            <div>
              <p className="m-0 text-[10px] uppercase tracking-[0.2em] text-[#C8F55A] font-semibold mb-[6px]">
                Forgot PIN?
              </p>
              <p className="m-0 text-[0.75rem] text-white/30 leading-[1.6]">
                Submit a request and your admin will issue a temporary PIN.
              </p>
            </div>

            <label className="grid gap-[6px] text-[0.66rem] uppercase tracking-[0.14em] text-white/30">
              Your name
              <input
                className="h-11 rounded-xl bg-[#131313] border border-white/[0.07] px-3 text-white text-[13px] outline-none placeholder:text-white/15 focus:border-[rgba(200,245,90,0.35)] transition-colors"
                value={pinResetForm.name}
                onChange={(e) => onPinResetFormChange((c) => ({ ...c, name: e.target.value }))}
                placeholder="Full name"
              />
            </label>
            <label className="grid gap-[6px] text-[0.66rem] uppercase tracking-[0.14em] text-white/30">
              Gmail address
              <input
                className="h-11 rounded-xl bg-[#131313] border border-white/[0.07] px-3 text-white text-[13px] outline-none placeholder:text-white/15 focus:border-[rgba(200,245,90,0.35)] transition-colors"
                value={pinResetForm.email}
                onChange={(e) => onPinResetFormChange((c) => ({ ...c, email: e.target.value }))}
                placeholder="name@gmail.com"
              />
            </label>
            <button
              className="h-12 rounded-xl bg-[#AACC33] text-black font-bold text-[13px] uppercase tracking-[0.1em] border-none cursor-pointer hover:bg-[#BADA44] active:scale-[0.98] transition-all"
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
