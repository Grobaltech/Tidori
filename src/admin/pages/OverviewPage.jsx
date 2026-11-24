import { FaUserShield, FaUsers, FaPrayingHands, FaCalendarAlt, FaChartLine, FaHandsHelping } from 'react-icons/fa';

export default function OverviewPage({ records, counts, loadingData, changeSection, formatValue }) {
  return <>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Users',counts.users,FaUserShield,'users'],
        ['Members',counts.members,FaUsers,'members'],
        ['Ministries',new Set((records.members||[]).map(r=>r.ministry).filter(Boolean)).size,FaPrayingHands,'ministries'],
        ['Upcoming events',(records.events||[]).filter(r=>r.published && new Date(r.starts_at)>=new Date()).length,FaCalendarAlt,'events'],
        ['Pastor appointments',counts.appointments,FaCalendarAlt,'appointments'],
        ['Financial management','Open',FaChartLine,'finance'],
        ['Outreach projects',counts.outreach,FaHandsHelping,'outreach'],
      ].map(([label,value,StatIcon,target]) => <button type="button" onClick={()=>changeSection(target)} className="admin-card admin-stat text-left" key={label}><div><p className="admin-stat-label">{label}</p><p className="admin-stat-value">{value ?? (loadingData?'…':'0')}</p><p className="admin-muted">Live database count · open records</p></div><span className="admin-stat-icon"><StatIcon /></span></button>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="admin-card"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Recent contact messages</h2><button className="text-xs font-semibold text-[#009cff]" onClick={()=>changeSection('messages')}>View all</button></div>{(records.messages||[]).slice(0,5).map(row=><button key={row.id} onClick={()=>{changeSection('messages',row);}} className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-5 py-3 text-left hover:bg-gray-50"><span><strong className="block text-sm text-[#191c24]">{row.name}</strong><span className="text-xs text-gray-500">{row.subject || row.message}</span></span><span className="shrink-0 text-xs text-gray-400">{formatValue(row.created_at)}</span></button>)}{!records.messages?.length && <div className="admin-empty">No contact messages found.</div>}</section>
      <section className="admin-card"><div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Live database summary</h2></div><div className="p-5 space-y-3">{[['Website posts',counts.content],['Volunteer submissions',counts.volunteers],['Church team',counts.team],['Newsletter subscribers',counts.newsletter],['Donation pledges',counts.pledges]].map(([label,count])=><div className="flex justify-between gap-3 text-sm" key={label}><span className="text-gray-500">{label}</span><strong className="text-[#191c24]">{count ?? '…'}</strong></div>)}</div></section>
    </div>
  </>;
}
