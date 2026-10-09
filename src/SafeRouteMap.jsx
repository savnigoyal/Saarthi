import { useMemo, useState } from 'react';
import './SafeRouteMap.css';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY?.trim();

function makeEmbedUrl(apiKey, destination, location) {
  if (!apiKey || !destination) return '';
  const params = new URLSearchParams({ key: apiKey });

  if (location) {
    params.set('origin', `${location.latitude},${location.longitude}`);
    params.set('destination', destination);
    params.set('mode', 'walking');
    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
  }

  params.set('q', destination);
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

function makeGoogleMapsUrl(destination, location) {
  const params = new URLSearchParams({ api: '1', destination });
  if (location) {
    params.set('origin', `${location.latitude},${location.longitude}`);
    params.set('travelmode', 'walking');
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function SafeRouteMap() {
  const [draft, setDraft] = useState('');
  const [destination, setDestination] = useState('');
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [destinationError, setDestinationError] = useState('');

  const embedUrl = useMemo(
    () => makeEmbedUrl(API_KEY, destination, location),
    [destination, location],
  );
  const mapsUrl = destination ? makeGoogleMapsUrl(destination, location) : '';

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationState('error');
      setLocationMessage('Location is not available in this browser. You can still search for a place.');
      return;
    }

    setLocationState('loading');
    setLocationMessage('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationState('ready');
        setLocationMessage('Current location detected.');
      },
      (error) => {
        setLocation(null);
        setLocationState('error');
        const messages = {
          1: 'Location permission was denied. Allow location access in your browser settings and retry.',
          2: 'Your location is unavailable right now. Check your device location settings and retry.',
          3: 'Location detection timed out. Check your connection or move to an area with better GPS reception, then retry.',
        };
        setLocationMessage(messages[error.code] || 'Could not detect your location. Please retry.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function submitDestination(event) {
    event.preventDefault();
    const value = draft.trim();
    const containsControlCharacter = [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    });
    if (!value || value.length > 200 || containsControlCharacter) {
      setDestinationError('Enter a destination between 1 and 200 characters.');
      return;
    }
    setDestinationError('');
    setDestination(value);
  }

  return (
    <section className="safe-map-card" aria-labelledby="safe-map-title">
      <div className="safe-map-heading">
        <div>
          <div className="eyebrow"><span className="material-symbols-outlined">map</span>Google Maps</div>
          <h3 id="safe-map-title">Plan your walk</h3>
        </div>
        <button type="button" className="safe-map-location" onClick={requestLocation} disabled={locationState === 'loading'}>
          <span className={`material-symbols-outlined ${locationState === 'loading' ? 'safe-map-spin' : ''}`}>
            {locationState === 'loading' ? 'progress_activity' : 'my_location'}
          </span>
          {locationState === 'loading' ? 'Finding you…' : location ? 'Refresh location' : 'Use my location'}
        </button>
      </div>

      <p className={`safe-map-location-status ${locationState === 'error' ? 'is-error' : ''}`} role="status">
        {locationMessage || 'Your location is only requested when you tap the button.'}
      </p>

      <form className="safe-map-search" onSubmit={submitDestination}>
        <label className="sr-only" htmlFor="safe-map-destination">Destination address or place</label>
        <input
          id="safe-map-destination"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={200}
          placeholder="Enter a destination or place name"
          autoComplete="street-address"
        />
        <button type="submit" className="safe-map-submit">Show map</button>
      </form>
      {destinationError && <p className="safe-map-error" role="alert">{destinationError}</p>}

      <div className="safe-map-frame">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            title={location ? `Walking directions to ${destination}` : `Map showing ${destination}`}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="safe-map-empty">
            <span className="material-symbols-outlined">{destination ? 'key' : 'pin_drop'}</span>
            <strong>{destination ? 'Google Maps setup required' : 'Choose a destination to view the map'}</strong>
            <span>{destination ? 'Add VITE_GOOGLE_MAPS_EMBED_API_KEY to your environment and restart the app.' : 'Walking directions appear after you set a destination and detect your location.'}</span>
          </div>
        )}
      </div>

      <div className="safe-map-footer">
        <p>{destination && location ? 'Google Maps walking directions are shown for your selected destination.' : 'Route distance and travel time are provided by Google Maps, not this safety estimate.'}</p>
        {destination && (
          <a className="safe-map-open" href={mapsUrl} target="_blank" rel="noreferrer">
            <span className="material-symbols-outlined">open_in_new</span>Open in Google Maps
          </a>
        )}
      </div>
    </section>
  );
}
