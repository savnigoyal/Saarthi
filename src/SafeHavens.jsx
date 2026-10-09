import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SafeHavens.css';
import {
  SAFE_PERIMETER_METERS,
  DEMO_LOCATION,
  HAVEN_CATEGORIES,
  loadSafeHavenData,
  getUserLocation,
  calculateDistance,
  formatDistance,
  estimateWalkingTime,
  getNearbySafeHavens,
  searchSafeHavens,
  filterSafeHavens,
  sortByDistance,
  navigateToHaven,
  callHaven,
  suggestSafeHaven
} from './safeHavenService';

// Leaflet map controller for dynamic panning
function MapController({ center, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
}

// User location marker icon
const userIcon = L.divIcon({
  className: 'user-marker-wrap',
  html: `
    <div class="user-location-marker">
      <div class="user-pulse-dot">
        <div class="user-inner-dot"></div>
      </div>
      <span class="user-label-pill">You</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Haven markers factory
function getHavenIcon(haven) {
  const type = haven.type || 'police';
  const iconName = type === 'police' ? 'local_police'
    : type === 'pharmacy' ? 'local_pharmacy'
    : type === 'hospital' ? 'emergency'
    : 'directions_subway';

  const typeLabel = type === 'police' ? 'Police'
    : type === 'pharmacy' ? 'Pharmacy'
    : type === 'hospital' ? 'Hospital'
    : 'Transit';

  const distText = haven.distance != null ? formatDistance(haven.distance) : '';
  const displayText = distText ? `${typeLabel} ${distText}` : typeLabel;

  return L.divIcon({
    className: 'haven-marker-wrap',
    html: `
      <div class="haven-marker-chip ${type}">
        <span class="material-symbols-outlined">${iconName}</span>
        <span>${displayText}</span>
      </div>
    `,
    iconSize: [95, 26],
    iconAnchor: [48, 13]
  });
}

export default function SafeHavens({ onNavigate, onSelectHavenAsDestination }) {
  // 1. Data states
  const [allHavens, setAllHavens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // 2. Location states
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
    isDemo: false
  });
  const [locationError, setLocationError] = useState(null);
  const [requestingGPS, setRequestingGPS] = useState(false);

  // 3. Filter & Search & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'name'
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('saferoute.bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  // 4. Map focus
  const [mapCenter, setMapCenter] = useState([DEMO_LOCATION.latitude, DEMO_LOCATION.longitude]);

  // 5. Suggestion modal
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    name: '',
    type: 'police',
    address: '',
    phone: '',
    reason: ''
  });
  const [suggestionSubmitted, setSuggestionSubmitted] = useState(false);

  // Save bookmarks
  useEffect(() => {
    localStorage.setItem('saferoute.bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  // INITIALIZATION: Load data & request location
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setLoadError(null);

      // Step 1: Load GeoJSON datasets
      try {
        const loadedData = await loadSafeHavenData();
        if (mounted) {
          setAllHavens(loadedData);
        }
      } catch (err) {
        if (mounted) {
          setLoadError(err.message || 'Safe haven data could not be loaded.');
        }
      }

      // Step 2: Request user location via browser Geolocation API
      setRequestingGPS(true);
      try {
        const pos = await getUserLocation();
        if (mounted) {
          setUserLocation({
            latitude: pos.latitude,
            longitude: pos.longitude,
            isDemo: false
          });
          setMapCenter([pos.latitude, pos.longitude]);
          setLocationError(null);
        }
      } catch (err) {
        if (mounted) {
          // Honest message: Location permission denied or unavailable
          setLocationError(err.message);
          // Default to Jaipur demo location ONLY as fallback with clear indication
          setUserLocation({
            latitude: DEMO_LOCATION.latitude,
            longitude: DEMO_LOCATION.longitude,
            isDemo: true
          });
          setMapCenter([DEMO_LOCATION.latitude, DEMO_LOCATION.longitude]);
        }
      } finally {
        if (mounted) {
          setRequestingGPS(false);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Recalculate distances when user location or havens change
  const havensWithDistance = useMemo(() => {
    if (!allHavens.length) return [];
    return allHavens.map(h => {
      const dist = (userLocation.latitude != null && userLocation.longitude != null)
        ? calculateDistance(userLocation.latitude, userLocation.longitude, h.latitude, h.longitude)
        : null;
      return {
        ...h,
        distance: dist
      };
    });
  }, [allHavens, userLocation.latitude, userLocation.longitude]);

  // Count havens within 500m perimeter
  const within500mCount = useMemo(() => {
    return havensWithDistance.filter(h => h.distance != null && h.distance <= (SAFE_PERIMETER_METERS / 1000)).length;
  }, [havensWithDistance]);

  // Count per category for filter pills
  const countsByCategory = useMemo(() => {
    const counts = { all: havensWithDistance.length };
    havensWithDistance.forEach(h => {
      counts[h.type] = (counts[h.type] || 0) + 1;
    });
    return counts;
  }, [havensWithDistance]);

  // Filtered & Searched & Sorted havens
  const displayedHavens = useMemo(() => {
    // 1. Filter by category
    let result = filterSafeHavens(havensWithDistance, selectedCategory);

    // 2. Search query
    result = searchSafeHavens(result, searchQuery);

    // 3. Sort
    if (sortBy === 'distance') {
      result = sortByDistance(result);
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [havensWithDistance, selectedCategory, searchQuery, sortBy]);

  // Handlers
  const handleToggleBookmark = (id) => {
    setBookmarkedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRecenter = () => {
    if (userLocation.latitude != null && userLocation.longitude != null) {
      setMapCenter([userLocation.latitude, userLocation.longitude]);
    }
  };

  const handleUseRealGPS = async () => {
    setRequestingGPS(true);
    try {
      const pos = await getUserLocation();
      setUserLocation({
        latitude: pos.latitude,
        longitude: pos.longitude,
        isDemo: false
      });
      setMapCenter([pos.latitude, pos.longitude]);
      setLocationError(null);
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setRequestingGPS(false);
    }
  };

  const handleSetDemoLocation = () => {
    setUserLocation({
      latitude: DEMO_LOCATION.latitude,
      longitude: DEMO_LOCATION.longitude,
      isDemo: true
    });
    setMapCenter([DEMO_LOCATION.latitude, DEMO_LOCATION.longitude]);
    setLocationError(null);
  };

  const handleSuggestionSubmit = (e) => {
    e.preventDefault();
    if (!suggestionForm.name.trim()) return;

    suggestSafeHaven(suggestionForm);
    setSuggestionSubmitted(true);
    setTimeout(() => {
      setSuggestionSubmitted(false);
      setShowSuggestModal(false);
      setSuggestionForm({ name: '', type: 'police', address: '', phone: '', reason: '' });
    }, 1800);
  };

  return (
    <div className="haven-screen">
      {/* Header */}
      <header className="haven-header">
        <div className="haven-header-left">
          <div className="haven-logo-wrap">
            <span className="material-symbols-outlined">shield</span>
          </div>
          <div className="haven-header-titles">
            <div className="haven-brand">
              <span>Saathi</span>
              <span className="material-symbols-outlined">expand_more</span>
            </div>
            <span className="haven-subtitle">NIGHT GUARDIAN</span>
          </div>
        </div>
        <div className="haven-header-right">
          <div className="haven-battery-pill" title="Night Guardian Sensor Active">
            <span className="material-symbols-outlined">shield</span>
            <span>92%</span>
          </div>
          <div className="haven-avatar-wrap">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBMTr__9XPcOSiGWSjhF0eCBPTKbG2BgYe5Y8GCR01njOkmi2j-0rLepsEngTbl2g7mc0T5CVNVJXKKuDlN6YGB2M-2058JA4XP2lNaL4Rx6tS13dQHVdXeZ_abGNw36VNIG7kJ_851_JxKt34_sjC8k04wwajcxKuHqrNyEEoT5MCEu-WPf9f6mKVnvg9HHPWBAtp4mni3sPu4aG2MtCQg4KztoYq-OZHlRPnbakzsXecgtBz6CPE"
              alt="User profile"
              className="haven-avatar-img"
            />
            <span className="haven-online-dot"></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="haven-content">
        {/* Search bar */}
        <div className="haven-search-bar">
          <span className="material-symbols-outlined haven-search-icon">search</span>
          <input
            type="text"
            className="haven-search-input"
            placeholder="Search safe havens, pharmacy"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="haven-search-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
          <div className="haven-search-actions">
            <button className="haven-search-btn" aria-label="Voice search">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button className="haven-search-btn" aria-label="Filters">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="haven-filter-scroll">
          <button
            className={`haven-filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span>All Safe Spots ({countsByCategory.all || 0})</span>
          </button>
          <button
            className={`haven-filter-pill ${selectedCategory === 'police' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('police')}
          >
            <span className="material-symbols-outlined">local_police</span>
            <span>Police Booths ({countsByCategory.police || 0})</span>
          </button>
          <button
            className={`haven-filter-pill ${selectedCategory === 'pharmacy' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('pharmacy')}
          >
            <span className="material-symbols-outlined">local_pharmacy</span>
            <span>Pharmacies ({countsByCategory.pharmacy || 0})</span>
          </button>
          <button
            className={`haven-filter-pill ${selectedCategory === 'transit' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('transit')}
          >
            <span className="material-symbols-outlined">directions_subway</span>
            <span>Transit Hubs ({countsByCategory.transit || 0})</span>
          </button>
          <button
            className={`haven-filter-pill ${selectedCategory === 'hospital' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('hospital')}
          >
            <span className="material-symbols-outlined">emergency</span>
            <span>Emergency ({countsByCategory.hospital || 0})</span>
          </button>
        </div>

        {/* GPS Permission/Demo Notice */}
        {locationError && (
          <div className="haven-gps-banner">
            <p className="haven-gps-text">
              <span className="material-symbols-outlined text-sm">warning</span>
              {locationError}
            </p>
            <div className="flex items-center gap-2">
              <button className="haven-gps-demo-btn" onClick={handleUseRealGPS} disabled={requestingGPS}>
                {requestingGPS ? 'Requesting…' : 'Retry GPS'}
              </button>
              <button className="haven-gps-demo-btn" onClick={handleSetDemoLocation}>
                Use Jaipur Demo
              </button>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="haven-map-card">
          {/* Top floating pill */}
          <div className="haven-map-badge-top">
            <span className="haven-badge-dot"></span>
            <span>500m Safety Perimeter</span>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={15}
            className="haven-map-container"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <MapController center={mapCenter} userLocation={userLocation} />

            {/* Dynamic 500m Safety Perimeter around user */}
            {userLocation.latitude != null && userLocation.longitude != null && (
              <>
                <Circle
                  center={[userLocation.latitude, userLocation.longitude]}
                  radius={SAFE_PERIMETER_METERS}
                  pathOptions={{
                    color: '#57f1db',
                    weight: 1.5,
                    dashArray: '5, 5',
                    fillColor: '#57f1db',
                    fillOpacity: 0.10
                  }}
                />
                {/* User Marker */}
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={userIcon}
                >
                  <Popup>
                    <div style={{ color: '#0b1326', fontSize: '11px', fontWeight: 'bold' }}>
                      {userLocation.isDemo ? 'Jaipur (Demo GPS)' : 'Your Current Location'}
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Safe Haven Markers */}
            {displayedHavens.map((haven) => (
              <Marker
                key={haven.id}
                position={[haven.latitude, haven.longitude]}
                icon={getHavenIcon(haven)}
                eventHandlers={{
                  click: () => {
                    setMapCenter([haven.latitude, haven.longitude]);
                  }
                }}
              >
                <Popup>
                  <div style={{ color: '#0b1326', minWidth: '150px' }}>
                    <strong style={{ fontSize: '12px' }}>{haven.name}</strong>
                    <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>
                      {haven.distance != null ? formatDistance(haven.distance) : ''}
                      {haven.open24h === true ? ' • Open 24/7' : ''}
                    </div>
                    <button
                      onClick={() => navigateToHaven(haven)}
                      style={{
                        marginTop: '6px',
                        background: '#00574d',
                        color: '#ffffff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Quick Navigate
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Bottom floating pill */}
          <div className="haven-map-badge-bottom">
            <span className="haven-badge-dot"></span>
            <span>{within500mCount} Havens Inside 500m Perimeter</span>
          </div>

          {/* Map Controls */}
          <div className="haven-map-controls">
            <button
              className="haven-map-control-btn"
              onClick={handleRecenter}
              title="Recenter to my location"
              aria-label="Recenter map"
            >
              <span className="material-symbols-outlined">my_location</span>
            </button>
          </div>
        </div>

        {/* Verification Info Banner (Data Honest) */}
        <div className="haven-verification-card">
          <div className="haven-verification-icon">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <p className="haven-verification-text">
            Safe spots are sourced from available public geographic data and may not represent real-time availability.
          </p>
        </div>

        {/* Section Header */}
        <div className="haven-section-head">
          <div className="haven-section-title-wrap">
            <h2 className="haven-section-title">Closest Safe Havens</h2>
            <span className="haven-live-badge">Live</span>
          </div>
          <div className="haven-sort-wrap">
            <span>Sort:</span>
            <select
              className="haven-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="distance">Distance</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Safe Haven Cards List */}
        <div className="haven-cards-list">
          {displayedHavens.length === 0 ? (
            <div className="haven-empty-state">
              <span className="material-symbols-outlined haven-empty-icon">search_off</span>
              <h3 className="haven-empty-title">No Safe Havens Found</h3>
              <p className="haven-empty-desc">
                {searchQuery
                  ? `No havens matching "${searchQuery}". Try a different keyword.`
                  : "No havens found for the selected category."}
              </p>
              <button
                className="haven-btn-reset"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            displayedHavens.map((haven) => {
              const categoryMeta = HAVEN_CATEGORIES[haven.type] || HAVEN_CATEGORIES.police;
              const isBookmarked = bookmarkedIds.includes(haven.id);
              const walkingTime = haven.distance != null ? estimateWalkingTime(haven.distance) : null;
              const formattedDist = haven.distance != null ? formatDistance(haven.distance) : "Nearby";

              return (
                <div key={haven.id} className="haven-card">
                  <div className="haven-card-top">
                    <div className={`haven-type-icon ${haven.type}`}>
                      <span className="material-symbols-outlined">{categoryMeta.icon}</span>
                    </div>

                    <div className="haven-card-info">
                      <div className="haven-card-meta-row">
                        <div className="haven-meta-tags">
                          <span className="haven-meta-tag">{categoryMeta.tag}</span>
                          <span>•</span>
                          <span className={`haven-status-tag ${haven.open24h === true ? 'open' : 'unverified'}`}>
                            {haven.open24h === true ? 'Open 24/7' : (haven.openingHoursRaw || 'Availability not verified')}
                          </span>
                        </div>
                        <button
                          className={`haven-bookmark-btn ${isBookmarked ? 'saved' : ''}`}
                          onClick={() => handleToggleBookmark(haven.id)}
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark haven'}
                        >
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}>
                            bookmark
                          </span>
                        </button>
                      </div>

                      <h3 className="haven-card-name" title={haven.name}>{haven.name}</h3>

                      <div className="haven-card-sub">
                        <span className="haven-dist-text">
                          <span className="material-symbols-outlined">directions_walk</span>
                          {formattedDist}
                        </span>
                        {walkingTime && <span className="haven-walk-text">({walkingTime})</span>}
                        <span>•</span>
                        <span className="haven-sub-addr">{haven.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature chips */}
                  {haven.features && haven.features.length > 0 && (
                    <div className="haven-features-row">
                      {haven.features.map((feat, idx) => (
                        <span key={idx} className="haven-feature-chip">
                          <span className="material-symbols-outlined">
                            {idx === 0 ? 'verified' : idx === 1 ? 'videocam' : 'wifi'}
                          </span>
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Buttons: Quick Navigate & Call */}
                  <div className="haven-card-actions">
                    <button
                      className="haven-btn-navigate"
                      onClick={() => navigateToHaven(haven)}
                    >
                      <span className="material-symbols-outlined">near_me</span>
                      <span>Quick Navigate</span>
                    </button>

                    {haven.phone ? (
                      <button
                        className="haven-btn-call"
                        onClick={() => callHaven(haven)}
                      >
                        <span className="material-symbols-outlined">call</span>
                        <span>{categoryMeta.callAction || 'Call Spot'}</span>
                      </button>
                    ) : (
                      <button
                        className="haven-btn-call disabled"
                        disabled
                        title="No verified phone number in public OpenStreetMap data"
                      >
                        <span className="material-symbols-outlined">call_off</span>
                        <span>Number unavailable</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Suggest Safe Haven Card */}
        <div className="haven-suggest-card">
          <div className="haven-suggest-left">
            <div className="haven-suggest-icon">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <div className="haven-suggest-info">
              <h4>Know a safe night haven?</h4>
              <p>Recommend a local store, fuel pump, or clinic.</p>
            </div>
          </div>
          <button
            className="haven-suggest-btn"
            onClick={() => setShowSuggestModal(true)}
          >
            Suggest
          </button>
        </div>
      </main>

      {/* Suggestion Modal Form */}
      {showSuggestModal && (
        <div className="haven-modal-backdrop" onClick={() => setShowSuggestModal(false)}>
          <div className="haven-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="haven-modal-head">
              <h3>Suggest a Safe Haven</h3>
              <button
                className="haven-modal-close"
                onClick={() => setShowSuggestModal(false)}
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {suggestionSubmitted ? (
              <div className="haven-submit-success">
                <span className="material-symbols-outlined text-2xl block mb-1">check_circle</span>
                Suggestion submitted for review.
              </div>
            ) : (
              <form onSubmit={handleSuggestionSubmit} className="flex flex-col gap-3">
                <div className="haven-form-group">
                  <label>Place Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24x7 Indian Oil Station, Apollo Chemist"
                    className="haven-form-input"
                    value={suggestionForm.name}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, name: e.target.value })}
                  />
                </div>

                <div className="haven-form-group">
                  <label>Category *</label>
                  <select
                    className="haven-form-select"
                    value={suggestionForm.type}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, type: e.target.value })}
                  >
                    <option value="police">Police Post / Booth</option>
                    <option value="pharmacy">Pharmacy / Chemist</option>
                    <option value="hospital">Hospital / Emergency Clinic</option>
                    <option value="transit">Metro Station / Bus Stand</option>
                    <option value="store">24/7 Store / Fuel Station</option>
                    <option value="emergency">Emergency Facility</option>
                  </select>
                </div>

                <div className="haven-form-group">
                  <label>Location / Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Near MI Road Circle, Jaipur"
                    className="haven-form-input"
                    value={suggestionForm.address}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, address: e.target.value })}
                  />
                </div>

                <div className="haven-form-group">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 141 ..."
                    className="haven-form-input"
                    value={suggestionForm.phone}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, phone: e.target.value })}
                  />
                </div>

                <div className="haven-form-group">
                  <label>Reason for consideration</label>
                  <textarea
                    placeholder="Why is this a safe place at night? (e.g. Well lit, 24/7 staff present)"
                    className="haven-form-textarea"
                    value={suggestionForm.reason}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, reason: e.target.value })}
                  />
                </div>

                <div className="haven-form-actions">
                  <button type="button" className="haven-btn-cancel" onClick={() => setShowSuggestModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="haven-btn-submit">
                    Submit Haven
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="haven-bottom-nav">
        <button
          className="haven-nav-item"
          onClick={() => onNavigate && onNavigate('home')}
        >
          <span className="material-symbols-outlined">explore</span>
          <span>Home</span>
        </button>
        <button className="haven-nav-item active">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            storefront
          </span>
          <span>Havens</span>
        </button>
        <button
          className="haven-nav-item"
          onClick={() => alert("Report Incident: Offline safe reporting logged locally.")}
        >
          <span className="material-symbols-outlined">campaign</span>
          <span>Report</span>
        </button>
        <button
          className="haven-nav-item"
          onClick={() => onNavigate && onNavigate('guardian')}
        >
          <span className="material-symbols-outlined">shield</span>
          <span>Guardian</span>
        </button>
      </nav>
    </div>
  );
}
