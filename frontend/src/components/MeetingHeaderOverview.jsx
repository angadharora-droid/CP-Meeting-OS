const STATUS_BADGES = {
  Closed: 'text-[#AACC33] bg-[#AACC33]/10 border-[#AACC33]/20',
  Postponed: 'text-[#a3c752] bg-[#8fb339]/10 border-[#8fb339]/20',
  Cancelled: 'text-[#FF5A5A] bg-[#FF5A5A]/10 border-[#FF5A5A]/20',
  Open: 'text-white/35 bg-white/[0.04] border-white/[0.08]',
}

export default function MeetingHeaderOverview({ groups }) {
  if (!groups.length) return null

  return (
    <section className="border border-[#1e1e1e] bg-[#0b0b0b] rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-[#181818] flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-[#333]">Meeting headers</p>
          <h2 className="m-0 mt-[4px] text-[#F0F0F0] text-[15px] font-semibold">Header-wise sub meetings</h2>
        </div>
        <span className="shrink-0 px-[10px] py-[4px] text-[9px] uppercase tracking-[0.1em] rounded-full border border-[#222] bg-[#111] text-[#444]">
          {groups.length}
        </span>
      </div>

      <div className="divide-y divide-[#181818]">
        {groups.map((group) => (
          <details key={group.header} className="group" open>
            <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[9px] text-[#333] group-open:rotate-90 transition-transform">&gt;</span>
                <h3 className="m-0 text-[#F0F0F0] text-[13px] font-semibold truncate">{group.header}</h3>
              </div>
              <span className="shrink-0 text-[10px] text-[#444] font-mono">
                {group.meetings.length} sub
              </span>
            </summary>
            <div className="px-4 pb-3 pl-[34px] grid gap-2">
              {group.meetings.map((meeting, index) => {
                const badge = STATUS_BADGES[meeting.status] || STATUS_BADGES.Open
                return (
                  <div key={meeting.meetingId} className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[10px] text-[#2e2e2e] font-mono shrink-0">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-[12px] text-[#777] truncate">{meeting.title || 'Untitled meeting'}</span>
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
