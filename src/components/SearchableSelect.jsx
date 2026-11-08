import { useEffect, useMemo, useState } from 'react'

export default function SearchableSelect({ value = '', onChange, options = [], placeholder = 'Search or select…', disabled = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(option => String(option.value) === String(value) && String(option.value) !== '')
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return options.filter(option => !term || option.label.toLocaleLowerCase().includes(term))
  }, [options, query])
  useEffect(() => { if (!open) setQuery(selected?.label || '') }, [value, selected?.label, open])
  const choose = option => { onChange(option.value); setQuery(option.label); setOpen(false) }

  return <div className="relative">
    <input className="field mt-2" value={open ? query : (selected?.label || '')}
      placeholder={placeholder} disabled={disabled} autoComplete="off"
      role="combobox" aria-expanded={open} aria-autocomplete="list"
      onFocus={() => { setQuery(selected?.label || ''); setOpen(true) }}
      onChange={event => { setQuery(event.target.value); setOpen(true) }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false)
        if (event.key === 'Enter' && open && filtered.length) { event.preventDefault(); choose(filtered[0]) }
      }}
      onBlur={() => window.setTimeout(() => { setOpen(false); setQuery(selected?.label || '') }, 120)} />
    {open && !disabled && <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg" role="listbox">
      {filtered.length ? filtered.slice(0, 100).map(option => <button type="button" key={String(option.value)}
        className={'block w-full px-3 py-2 text-left text-sm hover:bg-mist' + (String(option.value) === String(value) ? ' bg-mist font-semibold' : '')}
        role="option" aria-selected={String(option.value) === String(value)}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>{option.label}</button>)
        : <div className="px-3 py-2 text-sm text-gray-500">No matching options</div>}
      {filtered.length > 100 && <div className="px-3 py-2 text-xs text-gray-500">Type more to narrow the results.</div>}
    </div>}
  </div>
}
