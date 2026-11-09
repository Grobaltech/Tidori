import { useEffect, useMemo, useState } from 'react'
import uganda from '../data/uganda-administrative-units.json'
import SearchableSelect from './SearchableSelect.jsx'

// ISO country and territory codes; Intl.DisplayNames supplies the current English labels.
const countryCodes = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM
JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO
MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT
PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK
TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/)

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = countryCodes
  .map(code => ({ code, label: countryNames.of(code) || code }))
  .sort((a, b) => a.label.localeCompare(b.label))

const asCoordinate = value => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default function LocationPicker({ value = {}, onChange, allowInternational = false }) {
  const country = allowInternational ? (value.country || 'Uganda') : 'Uganda'
  const isUganda = country === 'Uganda'
  const countryCode = value.country_code || countries.find(item => item.label === country)?.code || ''
  const [geo, setGeo] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [geoRequested, setGeoRequested] = useState(false)
  const [cityQuery, setCityQuery] = useState('')

  useEffect(() => {
    let active = true
    if (geo || (!allowInternational && !geoRequested) || (isUganda && !geoRequested)) return undefined
    import('@tansuasici/country-state-city')
      .then(module => { if (active) { setGeo(module.CountryStateCity); setGeoError('') } })
      .catch(() => { if (active) setGeoError('Global location data could not be loaded. You can still enter your address manually.') })
    return () => { active = false }
  }, [allowInternational, isUganda, geo, geoRequested])

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

  const selectedCountry = useMemo(
    () => geo && countryCode ? geo.getCountryByIso2(countryCode) : null,
    [geo, countryCode],
  )
  const globalStates = useMemo(
    () => geo && countryCode ? geo.getStatesByCountryCode(countryCode).slice().sort((a, b) => a.name.localeCompare(b.name)) : [],
    [geo, countryCode],
  )
  const selectedState = useMemo(
    () => globalStates.find(item => String(item.id) === String(value.region_id) || item.name === value.region),
    [globalStates, value.region_id, value.region],
  )
  const globalCities = useMemo(() => {
    if (!geo || !selectedCountry || cityQuery.trim().length < 2) return []
    return geo.searchCities(cityQuery.trim(), selectedState?.id, selectedCountry.id)
      .slice(0, 40)
      .map(city => ({
        value: String(city.id),
        label: selectedState ? city.name : `${city.name}, ${city.stateName}`,
        record: city,
      }))
  }, [geo, selectedCountry, selectedState, cityQuery])

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

  const chooseCountry = code => {
    const item = countries.find(countryItem => countryItem.code === code)
    const record = geo?.getCountryByIso2(code)
    update({
      country: item?.label || code,
      country_code: code,
      country_latitude: asCoordinate(record?.latitude),
      country_longitude: asCoordinate(record?.longitude),
      region: '', region_id: '', region_code: '', district: '', county: '',
      subcounty: '', parish: '', village: '', city: '', city_id: '',
      latitude: null, longitude: null, geodata_source: 'CountryStateCity',
    }, ['region', 'region_id', 'region_code', 'district', 'county', 'subcounty', 'parish', 'village', 'city', 'city_id'])
    setCityQuery('')
  }

  return <div className="grid gap-4 sm:grid-cols-2">
    {allowInternational && <label className="block text-sm font-semibold text-navy">Country *
      <select className="field mt-2" value={countryCode || countries.find(item => item.label === country)?.code || 'UG'}
        onChange={e => chooseCountry(e.target.value)}>
        {countries.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
    </label>}
    {!allowInternational && <div className="text-sm font-semibold text-navy">Country <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 font-normal">Uganda</p></div>}
    {isUganda ? <>
      <label className="block text-sm font-semibold text-navy">District / City *
        <SearchableSelect value={value.district || ''} placeholder="Search districts…" options={districts}
          onChange={next => {
            const selectedDistrict = uganda.districts.find(([name]) => name === next)
            const hasCountyTier = Boolean(selectedDistrict?.[1]?.length)
            update({ country: 'Uganda', country_code: 'UG', region: 'Uganda', district: next, county: hasCountyTier ? '' : 'Not applicable', subcounty: '', parish: '', village: '' },
              ['subcounty', 'parish', 'village', 'latitude', 'longitude', 'city', 'city_id'])
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
      <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm font-semibold text-navy">Map coordinates (optional)</p>
        <p className="mt-1 text-xs text-gray-600">Keep Uganda’s detailed district-to-village selection, and optionally match a nearby populated place to store its geographic coordinates.</p>
        {!geo && <button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={() => setGeoRequested(true)}>Load Uganda coordinate lookup</button>}
        {geo && <>
          <input className="field mt-3" value={cityQuery} maxLength={100} placeholder="Search town or populated place" onChange={e => setCityQuery(e.target.value)} />
          {cityQuery.trim().length >= 2 && <SearchableSelect value={value.geodata_id || ''} placeholder="Choose a matching place…" options={globalCities.map(item => ({ value: 'csc:city:' + item.record.id, label: item.label }))}
            onChange={id => {
              const match = globalCities.find(item => 'csc:city:' + item.record.id === id)?.record
              if (match) update({ latitude: asCoordinate(match.latitude), longitude: asCoordinate(match.longitude), geodata_id: id, geodata_source: 'CountryStateCity', geodata_version: '3.0.3' })
            }} />}
        </>}
        {value.latitude != null && value.longitude != null && <p className="mt-2 text-xs text-gray-500">Coordinates saved: {value.latitude}, {value.longitude}</p>}
        {geoError && <p className="mt-2 text-xs text-amber-700">{geoError}</p>}
      </div>
    </> : <>
      <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        Global location records include administrative areas and populated places with coordinates where published. The available levels vary by country; missing local areas can be entered manually.
      </div>
      {geoError && <p className="sm:col-span-2 text-sm text-amber-700">{geoError}</p>}
      {!geo && !geoError && <p className="sm:col-span-2 text-sm text-gray-500">Loading global geographic data…</p>}
      {globalStates.length > 0 ? <label className="block text-sm font-semibold text-navy">
        {globalStates.find(item => item.name === value.region)?.type || 'State / Province / Region'}
        <select className="field mt-2" value={selectedState?.id || ''} onChange={e => {
          const state = globalStates.find(item => String(item.id) === e.target.value)
          update({
            region: state?.name || '', region_id: state?.id || '', region_code: state?.stateCode || '',
            region_latitude: asCoordinate(state?.latitude), region_longitude: asCoordinate(state?.longitude),
            latitude: null, longitude: null, city: '', city_id: '',
          }, ['district', 'county', 'subcounty', 'parish', 'village', 'city', 'city_id'])
          setCityQuery('')
        }}>
          <option value="">Select region</option>
          {globalStates.map(item => <option key={item.id} value={item.id}>{item.name}{item.type ? ` — ${item.type}` : ''}</option>)}
        </select>
      </label> : <label className="block text-sm font-semibold text-navy">State / Province / Region
        <input className="field mt-2" value={value.region || ''} maxLength={120} placeholder="Enter state, province or region"
          onChange={e => update({ region: e.target.value, region_id: '', region_code: '' }, ['city', 'city_id', 'latitude', 'longitude'])} />
      </label>}
      <label className="block text-sm font-semibold text-navy">City / Town / Populated place
        <input className="field mt-2" value={cityQuery} maxLength={100} placeholder="Search populated places" onChange={e => setCityQuery(e.target.value)} />
        <SearchableSelect value={value.city_id || ''} placeholder={geo ? 'Choose a matching place…' : 'Global data loading…'}
          disabled={!geo || (globalStates.length > 0 && !selectedState && !cityQuery)}
          options={globalCities}
          onChange={id => {
            const city = globalCities.find(item => item.value === id)?.record
            if (!city) return
            update({
              city: city.name, city_id: String(city.id), subcounty: city.name,
              latitude: asCoordinate(city.latitude), longitude: asCoordinate(city.longitude),
              geodata_source: 'CountryStateCity', geodata_id: `csc:city:${city.id}`,
              geodata_version: '3.0.3',
            }, ['parish', 'village'])
          }} />
        {cityQuery.trim().length >= 2 && geo && !globalCities.length && <>
          <span className="mt-1 block text-xs font-normal text-gray-500">No matching record. You can enter the locality manually.</span>
          <input className="field mt-2" value={value.city || ''} maxLength={120} placeholder="Enter city or town manually"
            onChange={e => update({ city: e.target.value, subcounty: e.target.value, city_id: '', latitude: null, longitude: null, geodata_id: '' })} />
        </>}
      </label>
      <label className="block text-sm font-semibold text-navy">District / County / Municipality (optional)
        <input className="field mt-2" value={value.district || ''} maxLength={120} placeholder="Enter district, county or municipality"
          onChange={e => update({ district: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">Local area / Ward / Suburb (optional)
        <input className="field mt-2" value={value.parish || ''} maxLength={120} placeholder="Enter ward, suburb or local area"
          onChange={e => update({ parish: e.target.value })} />
      </label>
      <label className="block text-sm font-semibold text-navy">Street / Village / Postal locality (optional)
        <input className="field mt-2" value={value.village || ''} maxLength={160} placeholder="Enter street, village or locality"
          onChange={e => update({ village: e.target.value })} />
      </label>
      {value.latitude != null && value.longitude != null && <p className="sm:col-span-2 text-xs text-gray-500">Coordinates saved: {value.latitude}, {value.longitude}</p>}
      <p className="sm:col-span-2 text-xs text-gray-500">Global dataset: Country State City, version 3.0.3. Geographic coverage varies by country and locality; coordinates are stored only when the dataset supplies them. Data licence: ODbL-1.0.</p>
    </>}
  </div>
}
