import { useMemo } from 'react'
import uganda from '../data/uganda-administrative-units.json'
import SearchableSelect from './SearchableSelect.jsx'

// ISO 3166-1 alpha-2 country/territory codes; labels are localized by the browser.
const countryCodes = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM
JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO
MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT
PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK
TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\\s+/)

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = countryCodes
  .map(code => ({ value: code, label: countryNames.of(code) || code }))
  .sort((a, b) => a.label.localeCompare(b.label))
  .map(country => ({ ...country, value: country.label }))

export default function LocationPicker({ value = {}, onChange }) {
  const country = value.country || 'Uganda'
  const isUganda = country === 'Uganda'
  const districtNode = useMemo(
    () => isUganda ? uganda.districts.find(([name]) => name === value.district) : null,
    [isUganda, value.district],
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
    <label className="block text-sm font-semibold text-navy">Country *
      <select className="field mt-2" value={country} onChange={e => update({ country: e.target.value, region: '', district: '', county: '', subcounty: '', parish: '', village: '' })}>
        {countries.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
    {isUganda ? <>
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
    </> : <>
      <p className="sm:col-span-2 text-sm text-gray-600">Enter the local administrative areas used in {country}. The field names are flexible because countries use different address systems.</p>
      <label className="block text-sm font-semibold text-navy">State / Province / Region
        <input className="field mt-2" value={value.region || ''} maxLength={120} placeholder="Enter state, province or region" onChange={e => update({ region: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">District / County
        <input className="field mt-2" value={value.district || ''} maxLength={120} placeholder="Enter district or county" onChange={e => update({ district: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">City / Town / Municipality *
        <input className="field mt-2" value={value.subcounty || ''} maxLength={120} placeholder="Enter city or town" onChange={e => update({ subcounty: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">Local area / Ward / Suburb
        <input className="field mt-2" value={value.parish || ''} maxLength={120} placeholder="Enter ward, suburb or local area" onChange={e => update({ parish: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">Street / Village / Postal locality
        <input className="field mt-2" value={value.village || ''} maxLength={160} placeholder="Enter street, village or locality" onChange={e => update({ village: e.target.value })} />
      </label>
    </>}
  </div>
}
