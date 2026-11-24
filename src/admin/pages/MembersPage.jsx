export default function MembersPage({ records, filteredRecords, search, setSearch, loadingData, onSelectRecord, tableConfig, formatValue }) {
  const cfg = tableConfig.members;
  return <section className="admin-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><h2 className="admin-section-title">Member records</h2><p className="admin-muted mt-1">Showing up to 100 most recent member profiles.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members…" className="rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#009cff]" /></div>
    <div className="overflow-x-auto"><table className="admin-table w-full"><thead><tr>{cfg.columns.map(([field,label])=><th key={field}>{label}</th>)}</tr></thead><tbody>{filteredRecords.map((row,i)=><tr key={row.id || row.email || i} onClick={()=>onSelectRecord(row)} className="cursor-pointer"><td className="sr-only">{row.id}</td>{cfg.columns.map(([field])=><td key={field}>{formatValue(row[field])}</td>)}</tr>)}</tbody></table>{!filteredRecords.length && <div className="admin-empty">{loadingData ? 'Loading records…' : 'No matching member records were found.'}</div>}</div>
  </section>;
}
