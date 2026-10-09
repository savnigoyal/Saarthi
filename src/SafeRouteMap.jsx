import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SafeRouteMap.css';

const DEFAULT_CENTER = [20, 0];
const FOOT_ROUTER = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

export default function SafeRouteMap() {
  const [draft, setDraft] = useState('');
  const [destination, setDestination] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('Your location is only requested when you tap the button.');
  const [destinationError, setDestinationError] = useState('');
  const [searching, setSearching] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeMessage, setRouteMessage] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const destinationMarker = useRef(null);
  const locationMarker = useRef(null);
  const routeLine = useRef(null);
  const routeRequestKey = useRef('');

  useEffect(() => {
    if (!mapOpen || !mapElement.current || mapRef.current) return undefined;

    let cancelled = false;
    let createdMap;
    Promise.resolve().then(() => {
      if (cancelled || !mapElement.current) return;
      createdMap = L.map(mapElement.current, { zoomControl: true }).setView(DEFAULT_CENTER, 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(createdMap);
      destinationMarker.current = L.circleMarker(DEFAULT_CENTER, { radius: 8, color: '#08251f', weight: 2, fillColor: '#57f1db', fillOpacity: 1 });
      locationMarker.current = L.circleMarker(DEFAULT_CENTER, { radius: 7, color: '#ffffff', weight: 2, fillColor: '#438cff', fillOpacity: 1 });
      routeLine.current = L.geoJSON(null, { style: { color: '#57f1db', weight: 5, opacity: 0.9 } }).addTo(createdMap);
      createdMap.on('click', (event) => {
        setDestination({ latitude: event.latlng.lat, longitude: event.latlng.lng, label: 'Selected map point' });
        setDraft('');
        setDestinationError('');
        setRoute(null);
        setRouteMessage('');
      });
      mapRef.current = createdMap;
      setMapInstance(createdMap);
      window.setTimeout(() => createdMap?.invalidateSize(), 0);
    }).catch(() => setRouteMessage('The map could not be loaded. Check your connection and try again.'));

    return () => {
      cancelled = true;
      createdMap?.remove();
      if (mapRef.current === createdMap) mapRef.current = null;
      destinationMarker.current = null;
      locationMarker.current = null;
      routeLine.current = null;
    };
  }, [mapOpen]);

  useEffect(() => {
    if (!mapInstance) return;
    if (destination) {
      destinationMarker.current.setLatLng([destination.latitude, destination.longitude]).addTo(mapInstance);
      if (!location && !route) mapInstance.setView([destination.latitude, destination.longitude], 14);
    }
    if (location) {
      locationMarker.current.setLatLng([location.latitude, location.longitude]).addTo(mapInstance);
      if (!destination) mapInstance.setView([location.latitude, location.longitude], 14);
    }
    if (route) {
      routeLine.current.clearLayers().addData(route.geometry);
      const bounds = routeLine.current.getBounds();
      if (bounds.isValid()) mapInstance.fitBounds(bounds, { padding: [24, 24] });
    } else {
      routeLine.current.clearLayers();
    }
  }, [mapInstance, destination, location, route]);

  useEffect(() => {
    if (!location || !destination) {
      routeRequestKey.current = '';
      return undefined;
    }

    const key = `${location.latitude},${location.longitude}|${destination.latitude},${destination.longitude}`;
    if (routeRequestKey.current === key) return undefined;
    routeRequestKey.current = key;
    const controller = new AbortController();
    setRouteMessage('Getting a walking route…');
    const coordinates = `${location.longitude},${location.latitude};${destination.longitude},${destination.latitude}`;
    fetch(`${FOOT_ROUTER}/${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 429) throw new Error('The walking route service is rate limited. Please wait a little and try again.');
        if (!response.ok) throw new Error('The walking route service is temporarily unavailable. Please try again later.');
        return response.json();
      })
      .then((data) => {
        if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No walking route was found between these points. Try a nearby destination.');
        setRoute(data.routes[0]);
        setRouteMessage('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRouteMessage(error.message || 'Could not get a walking route. Please try again.');
      });
    return () => controller.abort();
  }, [location, destination]);

  function requestLocation() {
    setRoute(null);
    setRouteMessage('');
    if (!navigator.geolocation) {
      setLocationState('error');
      setLocationMessage('Location is not available in this browser. You can still select a destination.');
      return;
    }
    setLocationState('loading');
    setLocationMessage('Requesting your location…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationState('ready');
      setLocationMessage('Current location detected.');
      setMapOpen(true);
    }, (error) => {
      setLocationState('error');
      const messages = {
        1: 'Location permission was denied. Allow location access in browser settings and retry.',
        2: 'Your location is unavailable right now. Check your device location settings and retry.',
        3: 'Location detection timed out. Check GPS reception and retry.',
      };
      setLocationMessage(messages[error.code] || 'Could not detect your location. Please retry.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  async function submitDestination(event) {
    event.preventDefault();
    if (searching) return;
    const value = draft.trim();
    if (!value || value.length > 200) {
      setDestinationError('Enter a destination between 1 and 200 characters.');
      return;
    }
    setSearching(true);
    setDestinationError('');
    setRoute(null);
    setRouteMessage('');
    try {
      const params = new URLSearchParams({ q: value, format: 'jsonv2', limit: '1' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (response.status === 429) throw new Error('Place search is rate limited. Please wait before searching again.');
      if (!response.ok) throw new Error('Place search is temporarily unavailable. Please try again later.');
      const results = await response.json();
      if (!results.length) throw new Error('No matching place was found. Try a more specific address.');
      const result = results[0];
      setDestination({ latitude: Number(result.lat), longitude: Number(result.lon), label: result.display_name });
      setMapOpen(true);
      setRouteMessage('');
    } catch (error) {
      setDestinationError(error.message || 'Could not search for that place. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="safe-map-card" aria-labelledby="safe-map-title">
      <div className="safe-map-heading">
        <div>
          <div className="eyebrow"><span className="material-symbols-outlined">map</span>OpenStreetMap</div>
          <h3 id="safe-map-title">Plan your walk</h3>
        </div>
        <button type="button" className="safe-map-location" onClick={requestLocation} disabled={locationState === 'loading'}>
          <span className={`material-symbols-outlined ${locationState === 'loading' ? 'safe-map-spin' : ''}`}>{locationState === 'loading' ? 'progress_activity' : 'my_location'}</span>
          {locationState === 'loading' ? 'Finding you…' : location ? 'Refresh location' : 'Use my location'}
        </button>
      </div>

      <p className={`safe-map-location-status ${locationState === 'error' ? 'is-error' : ''}`} role="status">{locationMessage}</p>
      <form className="safe-map-search" onSubmit={submitDestination}>
        <label className="sr-only" htmlFor="safe-map-destination">Destination address or place</label>
        <input id="safe-map-destination" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={200} placeholder="Search a place or address" autoComplete="street-address" />
        <button type="submit" className="safe-map-submit" disabled={searching}>{searching ? 'Searching…' : 'Find place'}</button>
      </form>
      {destinationError && <p className="safe-map-error" role="alert">{destinationError}</p>}

      {!mapOpen ? (
        <button className="safe-map-launch" type="button" onClick={() => setMapOpen(true)}>
          <span className="material-symbols-outlined">map</span>
          <strong>Open interactive map</strong>
          <span>Tap the map to choose a destination.</span>
        </button>
      ) : (
        <div className="safe-map-frame" aria-label="Interactive map. Tap a point to choose it as your destination.">
          <div className="safe-map-canvas" ref={mapElement} />
        </div>
      )}

      {destination && <p className="safe-map-destination">Destination: {destination.label}</p>}
      {(routeMessage || route) && <div className={`safe-map-route ${routeMessage && routeMessage !== 'Getting a walking route…' ? 'is-error' : ''}`} role="status">
        {route ? <><strong>Walking route</strong><span>{formatDistance(route.distance)} · about {formatDuration(route.duration)}</span></> : <span>{routeMessage}</span>}
      </div>}
      <div className="safe-map-footer">
        <p>Walking routes and place search use public OpenStreetMap community services. Coverage and availability vary; route data does not indicate safety conditions.</p>
        {destination && location && <a className="safe-map-open" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${location.latitude}%2C${location.longitude}%3B${destination.latitude}%2C${destination.longitude}`} target="_blank" rel="noreferrer">Open route in OSM</a>}
      </div>
    </section>
  );
}
