import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

const GEOCODER = import.meta.env.VITE_GEOCODER_URL || 'https://photon.komoot.io/api/';
const ROUTER = import.meta.env.VITE_ROUTING_URL || 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
const pin = (color) => L.divIcon({ className: 'route-pin-wrap', html: `<span class="route-pin ${color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
const originPin = pin('origin-pin');
const destinationPin = pin('destination-pin');

function FitRoute({ coords, origin, destination }) {
  const map = useMap();
  useEffect(() => {
    const points = coords?.length ? coords : [origin, destination].filter(Boolean);
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
    else if (points.length === 1) map.setView(points[0], 15);
  }, [map, coords, origin, destination]);
  return null;
}

function RecenterControl({ coords, origin, onLocate }) {
  const map = useMap();
  return <button className="recenter-map" type="button" aria-label="Recenter map" title="Recenter map" onClick={() => {
    if (coords.length > 1) map.fitBounds(coords, { padding: [32, 32], maxZoom: 16 });
    else if (origin) map.setView(origin, 15);
    else onLocate();
  }}><span className="material-symbols-outlined">my_location</span></button>;
}

function LocationSearch({ label, value, onChange, onSelect, onCurrent, currentLoading }) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const selected = useRef(false);

  useEffect(() => {
    if (selected.current) { selected.current = false; return undefined; }
    if (value.trim().length < 3) { setSuggestions([]); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true); setError('');
      try {
        const url = new URL(GEOCODER);
        url.searchParams.set('q', value.trim()); url.searchParams.set('limit', '5');
        const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error(response.status === 429 ? 'Search is busy. Please wait a moment and try again.' : 'Place search is temporarily unavailable.');
        const data = await response.json();
        setSuggestions((data.features || []).map((feature, index) => {
          const p = feature.properties || {};
          const title = p.name || p.street || p.city || 'Place';
          const detail = [p.street && p.street !== title ? p.street : null, p.city, p.state, p.country].filter(Boolean).join(', ');
          return { id: feature.properties?.osm_id || `${title}-${index}`, name: title, display_name: detail || title, lat: feature.geometry.coordinates[1], lon: feature.geometry.coordinates[0] };
        }));
      } catch (err) {
        if (err.name !== 'AbortError') { setSuggestions([]); setError(err.message); }
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value]);

  return <div className="route-search-field">
    <label>{label}</label>
    <input value={value} onChange={(event) => { onChange(event.target.value); onSelect(null); }} placeholder={`Search ${label.toLowerCase()}...`} aria-label={label} autoComplete="off" />
    {label === 'Starting point' && <button className="use-location" type="button" onClick={onCurrent} disabled={currentLoading}>{currentLoading ? 'Finding location…' : '◎ Use my location'}</button>}
    {searching && <small className="search-note">Searching OpenStreetMap…</small>}
    {error && <small className="map-error">{error}</small>}
    {suggestions.length > 0 && <div className="search-suggestions" role="listbox">{suggestions.map((item) => <button type="button" role="option" key={item.id} onClick={() => { selected.current = true; onChange(item.display_name); onSelect({ label: item.display_name, coords: [Number(item.lat), Number(item.lon)] }); setSuggestions([]); }}><span>{item.name || item.display_name.split(',')[0]}</span><small>{item.display_name}</small></button>)}</div>}
  </div>;
}

const formatDistance = (metres) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
const formatDuration = (seconds) => { const mins = Math.max(1, Math.round(seconds / 60)); return mins < 60 ? `${mins} min walk` : `${Math.floor(mins / 60)} hr ${mins % 60} min walk`; };

export default function RouteMap() {
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState('Choose a starting point and destination to find a walking route.');
  const selectedRoute = routes[selected];
  const lineCoords = useMemo(() => selectedRoute?.geometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [], [selectedRoute]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { setMessage('Location is not available in this browser. Enter a starting point manually.'); return; }
    setLocationLoading(true); setMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const position = [coords.latitude, coords.longitude];
      setOrigin({ label: 'My current location', coords: position }); setOriginText('My current location');
      setMessage('Current location found. Add a destination to calculate a walking route.'); setLocationLoading(false);
    }, (error) => {
      setMessage(error.code === 1 ? 'Location permission was denied. Enter a starting point manually.' : 'Could not determine your location. Check GPS or enter a starting point manually.');
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }, []);

  useEffect(() => {
    if (!origin || !destination) { setRoutes([]); return undefined; }
    const controller = new AbortController();
    const fetchRoute = async () => {
      setRouteLoading(true); setMessage('Calculating walking routes…'); setRoutes([]);
      try {
        const [olat, olon] = origin.coords; const [dlat, dlon] = destination.coords;
        const url = `${ROUTER}/${olon},${olat};${dlon},${dlat}?overview=full&geometries=geojson&alternatives=3&steps=false`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 429 ? 'Routing service is busy. Please try again shortly.' : 'Walking routes are temporarily unavailable.');
        const data = await response.json();
        if (!data.routes?.length) throw new Error('No walking route was found between these locations. Try a nearby destination.');
        setRoutes(data.routes); setSelected(0); setMessage(`${data.routes.length} walking route${data.routes.length === 1 ? '' : 's'} found.`);
      } catch (error) { if (error.name !== 'AbortError') { setRoutes([]); setMessage(error.message || 'Could not calculate a route. Check your connection and try again.'); } }
      finally { if (!controller.signal.aborted) setRouteLoading(false); }
    };
    fetchRoute(); return () => controller.abort();
  }, [origin, destination]);

  const swap = () => { setOriginText(destinationText); setDestinationText(originText); setOrigin(destination); setDestination(origin); };

  return <section className="route-map-card">
    <div className="route-map-heading"><div><span className="material-symbols-outlined">explore</span><div><strong>OpenStreetMap walking routes</strong><small>Live map data · pedestrian directions</small></div></div><span className="map-live-pill">OSM</span></div>
    <div className="route-searches">
      <LocationSearch label="Starting point" value={originText} onChange={setOriginText} onSelect={setOrigin} onCurrent={useCurrentLocation} currentLoading={locationLoading} />
      <button type="button" className="swap-locations" aria-label="Swap starting point and destination" onClick={swap}>⇅</button>
      <LocationSearch label="Destination" value={destinationText} onChange={setDestinationText} onSelect={setDestination} />
    </div>
    <div className="route-map-viewport">
      <MapContainer center={[26.9124, 75.7873]} zoom={12} scrollWheelZoom={false} zoomControl className="route-leaflet-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap">Report a map issue</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {origin && <Marker position={origin.coords} icon={originPin} />}
        {destination && <Marker position={destination.coords} icon={destinationPin} />}
        {routes.map((route, index) => <Polyline key={`${index}-${selected}`} positions={route.geometry.coordinates.map(([lon, lat]) => [lat, lon])} pathOptions={{ color: index === selected ? '#2dd4bf' : '#bdc2ff', weight: index === selected ? 7 : 4, opacity: index === selected ? 0.95 : 0.55 }} eventHandlers={{ click: () => setSelected(index) }} />)}
        <FitRoute coords={lineCoords} origin={origin?.coords} destination={destination?.coords} />
      </MapContainer>
      <RecenterControl coords={lineCoords} origin={origin?.coords} onLocate={useCurrentLocation} />
      {routeLoading && <div className="map-loading">Finding walking routes…</div>}
    </div>
    <div className="route-map-results">
      {routes.length > 0 ? <><div className="route-alternatives">{routes.map((route, index) => <button type="button" key={index} className={`route-option ${selected === index ? 'active' : ''}`} onClick={() => setSelected(index)}><span>Route {index + 1}</span><strong>{formatDistance(route.distance)}</strong><small>{formatDuration(route.duration)}</small></button>)}</div><p className="route-map-status">{message} Route safety scores are calculated separately by WAYSAFE.</p></> : <p className={message.startsWith('No walking') || message.includes('unavailable') || message.includes('denied') ? 'route-map-status map-error' : 'route-map-status'}>{message}</p>}
    </div>
  </section>;
}
