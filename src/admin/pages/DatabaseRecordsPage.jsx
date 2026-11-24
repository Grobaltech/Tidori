export default function DatabaseRecordsPage({ pageKey, records, filteredRecords, search, setSearch, loadingData, onSelectRecord, tableConfig, formatValue }) {
  if (pageKey === 'ministries') {
    const rows = [...new Map((records.members || []).filter(row => row.ministry).map(row => [row.ministry, { ministry: row.ministry, people: (records.members || []).filter(person => person.ministry === row.ministry).length }])).values()];
    return <section className="admin-card">
      <div className="border-b border-gray-100 px-5 py-4"><h2 className="admin-section-title">Ministry assignments</h2><p className="admin-muted mt-1">Ministry assignments aggregated from member profiles.</p></div>
      <div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr><th>Ministry</th><th>People recorded</th></tr></thead><tbody>{rows.map(row=><tr key={row.ministry}><td>{row.ministry}</td><td>{row.people}</td></tr>)}</tbody></table>{!rows.length && <div className="admin-empty">No ministry assignments have been recorded in member profiles yet.</div>}</div>
    </section>;
  }
  const config = tableConfig[pageKey];
  if (!config) return <section className="admin-card p-5"><p className="text-sm text-gray-500">This administration section does not have a database table configured yet.</p></section>;
  return <section className="admin-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">{config.title}</h2><p className="admin-muted mt-1">Showing up to 100 most recent database records.</p></div><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search records…" className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#009cff]" /></div>
    <div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr>{config.columns.map(([field,label])=><th key={field}>{label}</th>)}</tr></thead><tbody>{filteredRecords.map((row,index)=><tr key={row.id || row.email || index} onClick={()=>onSelectRecord(row)} className="cursor-pointer"><td className="sr-only">{row.id}</td>{config.columns.map(([field])=><td key={field}>{field === 'message' ? (String(row[field] || '').length > 110 ? String(row[field]).slice(0,110) + '…' : formatValue(row[field])) : formatValue(row[field])}</td>)}</tr>)}</tbody></table>{!filteredRecords.length && <div className="admin-empty">{loadingData ? 'Loading records…' : 'No matching records were found.'}</div>}</div>
  </section>;
}
