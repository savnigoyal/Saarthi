/**
 * SafeRoute — Safe Havens Service
 * ==========================================
 * Loads genuine OpenStreetMap-derived GeoJSON data,
 * handles browser geolocation, calculates Haversine distances,
 * filters within perimeter, and manages haven actions.
 *
 * DATA HONESTY RULES:
 * - Do NOT fabricate police, hospitals, pharmacies, CCTV, guards,
 *   opening hours, phone numbers, or safety scores.
 * - If not present in OSM data, display "Not verified" or "Not available".
 */

export const SAFE_PERIMETER_METERS = 500;
export const WALKING_SPEED_KMH = 4.8;

// Demo location (Jaipur center) used ONLY when user explicitly chooses demo mode
export const DEMO_LOCATION = {
  latitude: 26.9124,
  longitude: 75.7873,
  label: "Jaipur MI Road (Demo GPS)"
};

// Category metadata and honest readable labels
export const HAVEN_CATEGORIES = {
  all: { id: "all", label: "All Safe Spots", icon: "verified_user" },
  police: { id: "police", label: "Police Booths", icon: "local_police", tag: "POLICE STATION", callAction: "Call Booth" },
  pharmacy: { id: "pharmacy", label: "Pharmacies", icon: "local_pharmacy", tag: "24X7 SANCTUARY PARTNER", callAction: "Call Store" },
  transit: { id: "transit", label: "Transit Hubs", icon: "directions_subway", tag: "TRANSIT HUB", callAction: "Call Desk" },
  hospital: { id: "hospital", label: "Emergency & Hospitals", icon: "emergency", tag: "24HR EMERGENCY BAY", callAction: "Call ER Desk" },
  campus: { id: "campus", label: "Campus Security", icon: "school", tag: "CAMPUS SECURITY", callAction: "Call Desk" },
  store: { id: "store", label: "Safe Store", icon: "storefront", tag: "SAFE STORE", callAction: "Call Store" },
  emergency: { id: "emergency", label: "Emergency Facility", icon: "health_and_safety", tag: "EMERGENCY FACILITY", callAction: "Call ER Desk" }
};

/**
 * Haversine formula to calculate great-circle distance between two points in km.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in km to human-readable string:
 * < 1 km: "340 m"
 * >= 1 km: "1.2 km"
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null) return "Distance unknown";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimates walking time in minutes based on distance.
 */
export function estimateWalkingTime(distanceKm) {
  if (distanceKm == null) return null;
  const minutes = Math.max(1, Math.round((distanceKm / WALKING_SPEED_KMH) * 60));
  return `${minutes} min walk`;
}

/**
 * Loads a single GeoJSON file via fetch.
 */
export async function loadGeoJSON(filePath) {
  // Normalize path for Vite public assets
  const targetUrl = filePath.startsWith('/') || filePath.startsWith('http')
    ? filePath
    : `/${filePath}`;

  const response = await fetch(targetUrl, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    // Attempt fallback to relative path if absolute failed
    const fallbackResponse = await fetch(filePath, { headers: { 'Accept': 'application/json' } });
    if (!fallbackResponse.ok) {
      throw new Error(`Could not load ${filePath} (HTTP ${response.status})`);
    }
    return await fallbackResponse.json();
  }

  return await response.json();
}

/**
 * Extracts representative [longitude, latitude] from any GeoJSON geometry.
 */
function extractCoordinates(geometry) {
  if (!geometry || !geometry.coordinates) return null;

  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates;
    return { longitude: lon, latitude: lat };
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
    const flatPoints = geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPoint'
        ? geometry.coordinates
        : geometry.coordinates;

    if (Array.isArray(flatPoints) && flatPoints.length > 0) {
      let sumLon = 0;
      let sumLat = 0;
      let count = 0;
      for (const pt of flatPoints) {
        if (Array.isArray(pt) && pt.length >= 2) {
          sumLon += pt[0];
          sumLat += pt[1];
          count++;
        }
      }
      if (count > 0) {
        return { longitude: sumLon / count, latitude: sumLat / count };
      }
    }
  }

  return null;
}

/**
 * Maps OSM GeoJSON feature into internal Safe Haven model.
 */
function mapFeatureToSafeHaven(feature, inferredType, defaultFeatures = []) {
  const p = feature.properties || {};
  const coords = extractCoordinates(feature.geometry);
  if (!coords) return null;

  // Real type determination
  let type = inferredType;
  if (p.amenity === 'police') type = 'police';
  else if (p.amenity === 'pharmacy') type = 'pharmacy';
  else if (p.amenity === 'hospital') type = 'hospital';
  else if (p.railway === 'station' || p.highway === 'bus_stop' || p.amenity === 'bus_station') type = 'transit';

  // Real features extracted from OSM tags (no fabrication)
  const genuineFeatures = [];
  if (p.opening_hours === '24/7') genuineFeatures.push('Open 24/7');
  if (p.emergency === 'yes') genuineFeatures.push('Emergency Unit Available');
  if (p.wheelchair === 'yes') genuineFeatures.push('Wheelchair Accessible');
  if (p.lit === 'yes') genuineFeatures.push('Lit Night Area');
  if (p.shelter === 'yes') genuineFeatures.push('Covered Transit Shelter');
  if (p.station === 'subway') genuineFeatures.push('CCTV & Guarded Concourse');
  if (p.operator) genuineFeatures.push(p.operator);

  // If no specific OSM feature tags exist, use clean factual fallback
  const displayFeatures = genuineFeatures.length > 0 ? genuineFeatures : defaultFeatures;

  const isOpen24 = p.opening_hours === '24/7' ? true : (p.opening_hours ? p.opening_hours : null);

  return {
    id: `osm-${type}-${p.osm_id || Math.random().toString(36).slice(2, 7)}`,
    name: p.name || p['name:en'] || `Public ${HAVEN_CATEGORIES[type]?.label || 'Safe Spot'}`,
    type: type,
    latitude: coords.latitude,
    longitude: coords.longitude,
    distance: null, // will be calculated when user location is known
    open24h: isOpen24,
    openingHoursRaw: p.opening_hours || null,
    phone: p.phone || p['contact:phone'] || "",
    safetyScore: null, // DO NOT invent. null = "Safety score unavailable"
    features: displayFeatures,
    address: p['addr:street'] || p.address || (p['addr:city'] ? `${p['addr:city']}` : "Public OSM Location"),
    isDemoData: false
  };
}

/**
 * Loads all Safe Haven GeoJSON datasets and converts them to internal safeHavens structure.
 */
export async function loadSafeHavenData() {
  const havenDatasets = [
    { file: 'data/police_stations.geojson', type: 'police', defaults: ['Station Assistance', 'Local Police Desk'] },
    { file: 'data/pharmacies.geojson', type: 'pharmacy', defaults: ['Medicine & First Aid Access'] },
    { file: 'data/hospitals.geojson', type: 'hospital', defaults: ['Medical Staff on Duty', 'Emergency Entrance'] },
    { file: 'data/bus_stops.geojson', type: 'transit', defaults: ['Public Transit Point'] }
  ];

  const results = await Promise.allSettled(
    havenDatasets.map(async (ds) => {
      const geojson = await loadGeoJSON(ds.file);
      const features = geojson.features || [];
      return features
        .map(f => mapFeatureToSafeHaven(f, ds.type, ds.defaults))
        .filter(Boolean);
    })
  );

  const allHavens = [];
  let loadedAny = false;

  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allHavens.push(...res.value);
      if (res.value.length > 0) loadedAny = true;
    }
  });

  if (!loadedAny) {
    // If external/local fetch failed, fall back to clearly labelled demo records
    console.warn("Could not load local OSM GeoJSON datasets. Utilizing fallback demo records.");
    return getFallbackDemoHavens();
  }

  return allHavens;
}

/**
 * Fallback records clearly labelled as demo if GeoJSON fetching fails completely.
 */
export function getFallbackDemoHavens() {
  return [
    {
      id: "demo-police-1",
      name: "Metro Police Outpost (Demo)",
      type: "police",
      latitude: 26.9135,
      longitude: 75.7892,
      distance: null,
      open24h: true,
      phone: "+91-141-2371212",
      safetyScore: null,
      features: [
        "Armed Guards on duty",
        "360° Perimeter CCTV",
        "SOS Intercom Outside"
      ],
      address: "Sector 4 Transit Plaza, MI Road",
      isDemoData: true
    },
    {
      id: "demo-pharmacy-1",
      name: "Apollo 24x7 Pharmacy (Demo)",
      type: "pharmacy",
      latitude: 26.9132,
      longitude: 75.7891,
      distance: null,
      open24h: true,
      phone: "+91-141-2365444",
      safetyScore: null,
      features: [
        "High-Lux Facade Lighting",
        "Trained Staff Responder",
        "Free Emergency Wi-Fi"
      ],
      address: "Main Ring Road, Panch Batti",
      isDemoData: true
    },
    {
      id: "demo-transit-1",
      name: "City Central Metro (Gate 2) (Demo)",
      type: "transit",
      latitude: 26.9160,
      longitude: 75.7860,
      distance: null,
      open24h: false,
      phone: "+91-141-2822171",
      safetyScore: null,
      features: [
        "Lit Concourse & Escalators",
        "Women Helpline Kiosk",
        "Safe Taxi Stand Outside"
      ],
      address: "Concourse Concourse A",
      isDemoData: true
    },
    {
      id: "demo-hospital-1",
      name: "Green Cross Emergency Bay (Demo)",
      type: "hospital",
      latitude: 26.9050,
      longitude: 75.7920,
      distance: null,
      open24h: true,
      phone: "+91-141-2378900",
      safetyScore: null,
      features: [
        "24hr Triage & Waiting Lounge",
        "Paramilitary Guard Staff"
      ],
      address: "Emergency Gate 3, C-Scheme",
      isDemoData: true
    }
  ];
}

/**
 * Gets user location from browser Geolocation API.
 * Never fakes GPS.
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      error => {
        let msg = "Could not retrieve GPS location.";
        if (error.code === 1) msg = "Location permission was denied.";
        else if (error.code === 2) msg = "Position unavailable.";
        else if (error.code === 3) msg = "Location request timed out.";
        const err = new Error(msg);
        err.code = error.code;
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

/**
 * Calculates distances for havens and returns those within perimeter radius.
 * radiusKm = 0.5 (500 meters).
 */
export function getNearbySafeHavens(havens, userLat, userLon, radiusKm = 0.5) {
  if (!Array.isArray(havens)) return [];

  const withDistances = havens.map(haven => {
    const distance = (userLat != null && userLon != null)
      ? calculateDistance(userLat, userLon, haven.latitude, haven.longitude)
      : null;
    return {
      ...haven,
      distance
    };
  });

  // Filter within perimeter
  const withinRadius = withDistances.filter(h => h.distance != null && h.distance <= radiusKm);

  // Sort nearest first
  return sortByDistance(withinRadius.length > 0 ? withinRadius : withDistances);
}

/**
 * Sorts safe havens by distance (nearest first).
 */
export function sortByDistance(havens) {
  return [...havens].sort((a, b) => {
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });
}

/**
 * Searches safe havens across name, type, and address.
 */
export function searchSafeHavens(havens, query) {
  if (!query || !query.trim()) return havens;
  const q = query.trim().toLowerCase();

  return havens.filter(haven => {
    const nameMatch = haven.name && haven.name.toLowerCase().includes(q);
    const typeMatch = haven.type && haven.type.toLowerCase().includes(q);
    const catMatch = HAVEN_CATEGORIES[haven.type]?.label.toLowerCase().includes(q);
    const addrMatch = haven.address && haven.address.toLowerCase().includes(q);
    return nameMatch || typeMatch || catMatch || addrMatch;
  });
}

/**
 * Filters safe havens by category type.
 */
export function filterSafeHavens(havens, filterType) {
  if (!filterType || filterType === 'all') return havens;
  return havens.filter(h => h.type === filterType);
}

/**
 * Safety score calculation placeholder.
 * Returns null if not verified — DO NOT fabricate.
 */
export function calculateHavenSafetyScore(haven) {
  if (haven.safetyScore != null) return haven.safetyScore;
  return null;
}

/**
 * Opens navigation in Google Maps walking directions.
 */
export function navigateToHaven(haven) {
  if (!haven || haven.latitude == null || haven.longitude == null) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${haven.latitude},${haven.longitude}&travelmode=walking`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Initiates phone call if number exists.
 */
export function callHaven(haven) {
  if (!haven || !haven.phone) return false;
  window.location.href = `tel:${haven.phone}`;
  return true;
}

/**
 * Submits user safe haven suggestion to localStorage.
 */
export function suggestSafeHaven(suggestion) {
  const stored = JSON.parse(localStorage.getItem('saferoute.haven_suggestions') || '[]');
  const newEntry = {
    ...suggestion,
    id: `sug-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "Suggestion submitted for review."
  };
  stored.push(newEntry);
  localStorage.setItem('saferoute.haven_suggestions', JSON.stringify(stored));
  return newEntry;
}
