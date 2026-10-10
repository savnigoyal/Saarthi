import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SafeRouteMap.css';

const ORIGIN = {
  latitude: 26.843656,
  longitude: 75.566387,
  label: 'Manipal University Jaipur (demo start)',
};

const DEMO_DESTINATIONS = [
  { id: 'muj-gate', label: 'MUJ Main Gate (demo)', latitude: 26.8409, longitude: 75.5676 },
  { id: 'dehmi', label: 'Dehmi Kalan (demo point)', latitude: 26.8355, longitude: 75.5677 },
  { id: 'mahapura', label: 'Mahapura Road (demo point)', latitude: 26.8505, longitude: 75.5740 },
  { id: 'junction', label: 'Nearby road junction (demo)', latitude: 26.8493, longitude: 75.5608 },
];

const ROUTE_COLORS = ['#57f1db', '#a78bfa', '#ffb86b'];
const DEMO_SCORES = [82, 76, 69];
const FOOT_ROUTER = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min walk`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min walk`;
}

function haversineMeters(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function buildIllustrativeRoutes(destination) {
  const directDistance = haversineMeters(ORIGIN, destination);
  const deltaLat = destination.latitude - ORIGIN.latitude;
  const deltaLon = (destination.longitude - ORIGIN.longitude) * Math.cos(ORIGIN.latitude * Math.PI / 180);
  const length = Math.hypot(deltaLat, deltaLon) || 1;
  const perpendicularLat = -deltaLon / length;
  const perpendicularLon = deltaLat / length / Math.cos(ORIGIN.latitude * Math.PI / 180);

  return [-0.0015, 0, 0.0015].map((offset, index) => {
    const coordinates = Array.from({ length:  ninePoints }, (_, pointIndex) => {
      const t = pointIndex / (ninePoints - 1);
      const curve = Math.sin(Math.PI * t) * offset;
      return [
        ORIGIN.longitude + (destination.longitude - ORIGIN.longitude) * t + perpendicularLon * curve,
        ORIGIN.latitude + (destination.latitude - ORIGIN.latitude) * t + perpendicularLat * curve,
      ];
    });
    const distance = directDistance * [1.22, 1.36, 1.52][index];
    return {
      id: `sample-${index + 1}`,
      name: `Sample alternate ${index + 1}`,
      distance,
      duration: distance / 75 * 60,
      geometry: { type: 'LineString', coordinates },
      score: DEMO_SCORES[index],
      illustrative: true,
    };
  });
}

const ninePoints = 9;

function buildOsmUrl(route) {
  const points = route.geometry?.coordinates || [];
  const waypoints = points.length > 2
    ? Array.from({ length: Math.min(8, points.length) }, (_, i) => points[Math.round(i * (points.length - 1) / (Math.min(8, points.length) - 1))])
    : [[ORIGIN.longitude, ORIGIN.latitude], [route.destination.longitude, route.destination.latitude]];
  const routeParam = waypoints.map(([longitude, latitude]) => `${latitude},${longitude}`).join(';');
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(routeParam)}`;
}

export default function SafeRouteMap() {
  const [destination, setDestination] = useState(null);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('Choose a nearby demo destination or search for a place in Jaipur.');
  const [error, setError] = useState('');
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const routeLayer = useRef(null);
  const originMarker = useRef(null);
  const destinationMarker = useRef(null);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return undefined;
    const map = L.map(mapElement.current, { zoomControl: true }).setView([ORIGIN.latitude, ORIGIN.longitude], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    routeLayer.current = L.featureGroup().addTo(map);
    originMarker.current = L.circleMarker([ORIGIN.latitude, ORIGIN.longitude], {
      radius: 8, color: '#08251f', weight: 2, fillColor: '#57f1db', fillOpacity: 1,
    }).addTo(map).bindPopup('Manipal University Jaipur · demo start');
    destinationMarker.current = L.circleMarker([ORIGIN.latitude, ORIGIN.longitude], {
      radius: 7, color: '#ffffff', weight: 2, fillColor: '#438cff', fillOpacity: 1,
    });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      routeLayer.current = null;
      originMarker.current = null;
      destinationMarker.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayer.current) return;
    routeLayer.current.clearLayers();
    routes.forEach((route, index) => {
      const selected = route.id === selectedRouteId;
      L.geoJSON(route.geometry, {
        style: {
          color: ROUTE_COLORS[index % ROUTE_COLORS.length],
          weight: selected ? 7 : 4,
          opacity: selected ? 1 : 0.7,
          dashArray: route.illustrative ? '7 7' : undefined,
        },
      }).addTo(routeLayer.current);
    });
    if (destination) {
      destinationMarker.current.setLatLng([destination.latitude, destination.longitude]).addTo(map);
      destinationMarker.current.bindPopup(destination.label);
    } else {
      destinationMarker.current.remove();
    }
    const bounds = routeLayer.current.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
    else if (destination) map.fitBounds([[ORIGIN.latitude, ORIGIN.longitude], [destination.latitude, destination.longitude]], { padding: [28, 28] });
  }, [routes, selectedRouteId, destination]);

  async function findRoutes(nextDestination = destination) {
    if (!nextDestination) {
      setError('Choose a destination before requesting routes.');
      return;
    }
    setDestination(nextDestination);
    setLoadingRoutes(true);
    setError('');
    setRoutes([]);
    setSelectedRouteId(null);
    setMessage('Finding walking route options…');
    const coordinates = `${ORIGIN.longitude},${ORIGIN.latitude};${nextDestination.longitude},${nextDestination.latitude}`;
    try {
      const response = await fetch(`${FOOT_ROUTER}/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=3`);
      if (!response.ok) throw new Error('The walking route service is unavailable right now. Showing illustrative demo paths instead.');
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No mapped walking route was returned. Showing illustrative demo paths instead.');
      const liveRoutes = data.routes.slice(0, 3).map((route, index) => ({
        id: `live-${index + 1}`,
        name: index === 0 ? 'Mapped route 1' : `Mapped alternative ${index + 1}`,
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        score: DEMO_SCORES[index],
        illustrative: false,
        destination: nextDestination,
      }));
      const alternates = buildIllustrativeRoutes(nextDestination).map((route, index) => ({
        ...route,
        id: `sample-${liveRoutes.length + index + 1}`,
        name: `Illustrative alternate ${liveRoutes.length + index + 1}`,
        score: DEMO_SCORES[liveRoutes.length + index] ?? 64,
        destination: nextDestination,
      }));
      const combined = [...liveRoutes, ...alternates].slice(0, 3);
      setRoutes(combined);
      setSelectedRouteId(combined[0]?.id || null);
      setMessage(liveRoutes.length < 3
        ? `${liveRoutes.length} mapped path${liveRoutes.length === 1 ? '' : 's'} returned. Sample paths fill the remaining options.`
        : 'Three mapped walking paths found. Safety scores are illustrative demo values.');
    } catch (routeError) {
      const samples = buildIllustrativeRoutes(nextDestination).map((route, index) => ({
        ...route,
        destination: nextDestination,
        name: `Illustrative path ${index + 1}`,
      }));
      setRoutes(samples);
      setSelectedRouteId(samples[0].id);
      setMessage('Showing illustrative paths because live walking routes are unavailable. Safety scores are sample values.');
      setError(routeError.message);
    } finally {
      setLoadingRoutes(false);
    }
  }

  async function searchDestination(event) {
    event.preventDefault();
    if (searching || loadingRoutes) return;
    const query = destinationQuery.trim();
    if (!query) {
      setError('Enter a destination to search.');
      return;
    }
    setSearching(true);
    setError('');
    setDestination(null);
    setRoutes([]);
    setSelectedRouteId(null);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        countrycodes: 'in',
        viewbox: '75.48,26.90,75.65,26.78',
        bounded: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Place search is unavailable. Choose one of the demo destinations instead.');
      const results = await response.json();
      if (!results.length) throw new Error('No nearby place found. Try a different name or choose a demo destination.');
      const result = results[0];
      const searchedDestination = {
        id: `place-${result.place_id}`,
        label: result.display_name.split(',').slice(0, 3).join(','),
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      };
      setDestination(searchedDestination);
      await findRoutes(searchedDestination);
    } catch (searchError) {
      setError(searchError.message || 'Could not search for that place.');
    } finally {
      setSearching(false);
    }
  }

  const selectedRoute = routes.find((route) => route.id === selectedRouteId);

  return (
    <section className="safe-map-card route-planner" aria-labelledby="safe-map-title">
      <div className="safe-map-heading">
        <div>
          <div className="eyebrow"><span className="material-symbols-outlined">route</span>JAIPUR · DEMO ROUTE PLANNER</div>
          <h3 id="safe-map-title">Routes from Manipal University Jaipur</h3>
          <p className="route-planner-subtitle">Start point is a demo location. Select a nearby destination to compare paths.</p>
        </div>
      </div>

      <div className="route-planner-form">
        <div className="route-planner-origin"><span className="material-symbols-outlined">trip_origin</span><span><small>START</small><strong>Manipal University Jaipur</strong></span></div>
        <label className="route-destination-label" htmlFor="route-destination">DESTINATION</label>
        <select id="route-destination" value={destination?.id || ''} disabled={loadingRoutes || searching} onChange={(event) => {
          const next = DEMO_DESTINATIONS.find((place) => place.id === event.target.value);
          setDestination(next || null);
          setRoutes([]);
          setError('');
          setMessage(next ? 'Destination selected. Choose “Show 3 routes” to compare paths.' : 'Choose a nearby demo destination or search for a place in Jaipur.');
        }}>
          <option value="">Choose a nearby destination…</option>
          {DEMO_DESTINATIONS.map((place) => <option key={place.id} value={place.id}>{place.label}</option>)}
          {destination && !DEMO_DESTINATIONS.some((place) => place.id === destination.id) && <option value={destination.id}>{destination.label}</option>}
        </select>
        <button className="route-plan-button" type="button" onClick={() => findRoutes()} disabled={!destination || loadingRoutes}>
          <span className="material-symbols-outlined">alt_route</span>
          {loadingRoutes ? 'Finding routes…' : 'Show 3 routes'}
        </button>
      </div>

      <form className="route-place-search" onSubmit={searchDestination}>
        <label className="sr-only" htmlFor="route-place-query">Search for a nearby place</label>
        <input id="route-place-query" value={destinationQuery} onChange={(event) => setDestinationQuery(event.target.value)} placeholder="Or search a nearby place in Jaipur" />
        <button type="submit" disabled={searching || loadingRoutes}>{searching ? 'Searching…' : 'Search place'}</button>
      </form>

      <div className="route-planner-origin-note"><span className="material-symbols-outlined">info</span>Live walking paths are requested when available. Safety scores are sample estimates and are not verified.</div>

      <div className="safe-map-frame route-planner-map" aria-label="Map showing route alternatives from Manipal University Jaipur">
        <div className="safe-map-canvas" ref={mapElement} />
      </div>

      <p className={`route-planner-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || message}</p>

      {routes.length > 0 && (
        <div className="route-options" aria-label="Walking route alternatives">
          {routes.map((route, index) => (
            <article key={route.id} className={`route-option ${route.id === selectedRouteId ? 'is-selected' : ''}`}>
              <button className="route-option-select" type="button" onClick={() => setSelectedRouteId(route.id)} aria-pressed={route.id === selectedRouteId}>
                <span className="route-option-color" style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
                <span className="route-option-copy"><strong>{route.name}</strong><small>{route.illustrative ? 'Illustrative path' : 'OpenStreetMap walking path'}{index === 0 ? ' · Recommended demo option' : ''}</small></span>
                <span className="route-option-score"><strong>{route.score}</strong><small>/100 sample</small></span>
              </button>
              <div className="route-option-meta"><span>{formatDistance(route.distance)}</span><span>{formatDuration(route.duration)}</span></div>
              <a className="route-option-open" href={buildOsmUrl(route)} target="_blank" rel="noreferrer">
                <span className="material-symbols-outlined">open_in_new</span>Open route in OpenStreetMap
              </a>
            </article>
          ))}
        </div>
      )}

      {selectedRoute && <p className="route-planner-footer">Selected: {selectedRoute.name}. Route links open OpenStreetMap directions for this path’s waypoints; its safety score is sample data.</p>}
    </section>
  );
}
