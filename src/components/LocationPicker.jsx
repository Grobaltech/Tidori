import { useMemo } from 'react'
import uganda from '../data/uganda-administrative-units.json'
import SearchableSelect from './SearchableSelect.jsx'

export default function LocationPicker({ value = {}, onChange }) {
  const districtNode = useMemo(
    () => uganda.districts.find(([name]) => name === value.district),
    [value.district],
  )
  const countyNodes = districtNode?.[1] || []
  const directSubcountyNodes = districtNode?.[2] || []
  const countyNode = countyNodes.find(([name]) => name === value.county)
  const subcountyNodes = countyNode ? countyNode[1] : countyNodes.length === 0 ? directSubcountyNodes : []
  const subcountyNode = subcountyNodes.find(([name]) => name === value.subcounty)
  const parishNodes = subcountyNode?.[1] || []
  const parishNode = parishNodes.find(([name]) => name === value.parish)
  const villageNames = parishNode?.[1] || []

  const update = (patch, clear = []) => {
    const next = { ...value, ...patch }
    clear.forEach(key => { next[key] = '' })
    onChange(next)
  }
  const districts = uganda.districts.map(([name]) => ({ value: name, label: name }))
  const counties = countyNodes.map(([name]) => ({ value: name, label: name }))
  const subcounties = subcountyNodes.map(([name]) => ({ value: name, label: name }))
  const parishes = parishNodes.map(([name]) => ({ value: name, label: name }))
  const villages = villageNames.map(name => ({ value: name, label: name }))

  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-semibold text-navy">Country
      <input className="field mt-2" value="Uganda" readOnly />
    </label>
    <label className="block text-sm font-semibold text-navy">District / City *
      <SearchableSelect value={value.district || ''} placeholder="Search districts…" options={districts}
        onChange={next => {
          const selectedDistrict = uganda.districts.find(([name]) => name === next)
          const hasCountyTier = Boolean(selectedDistrict?.[1]?.length)
          update({ region: 'Uganda', district: next, county: hasCountyTier ? '' : 'Not applicable', subcounty: '', parish: '', village: '' })
        }} />
    </label>
    <label className="block text-sm font-semibold text-navy">County / Municipality
      {countyNodes.length ? <SearchableSelect value={value.county || ''} disabled={!value.district}
        placeholder="Search counties…" options={counties}
        onChange={next => update({ county: next }, ['subcounty', 'parish', 'village'])} />
        : <input className="field mt-2" value={value.county || (value.district ? 'Not applicable' : '')} readOnly placeholder="Select district first" />}
    </label>
    <label className="block text-sm font-semibold text-navy">Sub-county / Town Council / Division *
      {subcounties.length ? <SearchableSelect value={value.subcounty || ''} disabled={!value.district || (countyNodes.length > 0 && !value.county)}
        placeholder="Search sub-counties…" options={subcounties}
        onChange={next => update({ subcounty: next }, ['parish', 'village'])} />
        : <input className="field mt-2" value={value.subcounty || ''} disabled={!value.district || (countyNodes.length > 0 && !value.county)}
          placeholder="Enter sub-county" onChange={e => update({ subcounty: e.target.value }, ['parish', 'village'])} />}
    </label>
    <label className="block text-sm font-semibold text-navy">Parish / Ward *
      {parishes.length ? <SearchableSelect value={value.parish || ''} disabled={!value.subcounty}
        placeholder="Search parishes…" options={parishes}
        onChange={next => update({ parish: next }, ['village'])} />
        : <input className="field mt-2" value={value.parish || ''} disabled={!value.subcounty}
          placeholder="Enter parish" onChange={e => update({ parish: e.target.value }, ['village'])} />}
    </label>
    <label className="block text-sm font-semibold text-navy">Village / Cell *
      {villages.length ? <SearchableSelect value={value.village || ''} disabled={!value.parish}
        placeholder="Search villages…" options={villages} onChange={next => update({ village: next })} />
        : <input className="field mt-2" value={value.village || ''} disabled={!value.parish}
          placeholder="Enter village" onChange={e => update({ village: e.target.value })} />}
    </label>
    <p className="sm:col-span-2 text-xs text-gray-500">{uganda.note} Source: {uganda.attribution}</p>
  </div>
}
