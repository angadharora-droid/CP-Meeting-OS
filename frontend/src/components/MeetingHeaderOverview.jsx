const STATUS_BADGES = {
  Closed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Postponed: 'text-amber-700 bg-amber-50 border-amber-200',
  Cancelled: 'text-red-700 bg-red-50 border-red-200',
  Open: 'text-slate-600 bg-slate-100 border-slate-200',
}

export default function MeetingHeaderOverview({ groups }) {
  if (!groups.length) return null

  return (
    <section className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-slate-500 font-semibold">Meeting headers</p>
          <h2 className="m-0 mt-[4px] text-slate-900 text-[15px] font-semibold">Header-wise sub meetings</h2>
        </div>
        <span className="shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.1em] rounded-full border border-slate-200 bg-slate-50 text-slate-500 font-semibold">
          {groups.length}
        </span>
      </div>

      <div className="divide-y divide-slate-200">
        {groups.map((group) => (
          <details key={group.header} className="group" open>
            <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[9px] text-slate-400 group-open:rotate-90 transition-transform">&gt;</span>
                <h3 className="m-0 text-slate-900 text-[13px] font-semibold truncate">{group.header}</h3>
              </div>
              <span className="shrink-0 text-[10px] text-slate-500 font-mono">
                {group.meetings.length} sub
              </span>
            </summary>
            <div className="px-4 pb-3 pl-[34px] grid gap-2">
              {group.meetings.map((meeting, index) => {
                const badge = STATUS_BADGES[meeting.status] || STATUS_BADGES.Open
                return (
                  <div key={meeting.meetingId} className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-[12px] text-slate-600 truncate">{meeting.title || 'Untitled meeting'}</span>
                    </div>
                    <span className={`shrink-0 px-[8px] py-[3px] text-[8px] uppercase tracking-[0.1em] font-bold rounded-full border ${badge}`}>
                      {meeting.status || 'Open'}
                    </span>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
