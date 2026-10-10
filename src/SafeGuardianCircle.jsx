import React, { useState, useEffect, useRef } from 'react';

// Default initial guardians structure required by spec
const INITIAL_GUARDIANS = [
  {
    id: "mom",
    name: "Maa (Mom)",
    relationship: "Mom",
    phone: "+919876543210",
    online: true,
    primary: true,
    selected: true
  },
  {
    id: "rhea",
    name: "Rhea (Roommate)",
    relationship: "Roommate",
    phone: "+919876543211",
    online: true,
    primary: false,
    selected: true
  },
  {
    id: "arjun",
    name: "Arjun (Brother)",
    relationship: "Brother",
    phone: "+919876543212",
    online: false,
    primary: false,
    selected: false
  },
  {
    id: "security",
    name: "Campus Security Desk",
    relationship: "Security",
    phone: "+919876543213",
    online: true,
    primary: false,
    selected: false
  }
];

const INITIAL_SETTINGS = {
  shareGPS: true,
  routeDeviationAlert: true,
  shareETA: true,
  emergencyAutoDial: false
};

// Calculate Haversine distance in meters between two lat/lng pairs
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SafeGuardianCircle({ selectedRoute, onNavigateBack }) {
  // -------------------------------------------------------------
  // 1. GUARDIANS STATE & LOCAL STORAGE
  // -------------------------------------------------------------
  const [guardians, setGuardians] = useState(() => {
    try {
      const saved = localStorage.getItem('safeRoute_guardians');
      return saved ? JSON.parse(saved) : INITIAL_GUARDIANS;
    } catch (e) {
      return INITIAL_GUARDIANS;
    }
  });

  const saveGuardians = (updatedGuardians) => {
    setGuardians(updatedGuardians);
    try {
      localStorage.setItem('safeRoute_guardians', JSON.stringify(updatedGuardians));
    } catch (e) {
      console.error('Failed to save guardians to localStorage', e);
    }
  };

  const loadGuardians = () => {
    try {
      const saved = localStorage.getItem('safeRoute_guardians');
      if (saved) setGuardians(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load guardians from localStorage', e);
    }
  };

  // -------------------------------------------------------------
  // 2. MONITORING SETTINGS & LOCAL STORAGE
  // -------------------------------------------------------------
  const [safeJourneySettings, setSafeJourneySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('safeRoute_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch (e) {
      return INITIAL_SETTINGS;
    }
  });

  const updateMonitoringSettings = (key, value) => {
    const updated = { ...safeJourneySettings, [key]: value };
    setSafeJourneySettings(updated);
    try {
      localStorage.setItem('safeRoute_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  };

  // -------------------------------------------------------------
  // 3. JOURNEY STATE & GPS WATCH
  // -------------------------------------------------------------
  const [journeyState, setJourneyState] = useState({
    active: false,
    trackingId: null,
    startedAt: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    eta: null,
    destination: null,
    routeName: null,
    safetyScore: null,
    status: 'idle', // 'idle' | 'active' | 'completed'
    routeDeviationDetected: false,
    deviationDistance: 0
  });

  const [gpsWatchId, setGpsWatchId] = useState(null);
  const gpsWatchIdRef = useRef(null);
  const emergencyTimerRef = useRef(null);

  // Modals & Feedback UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuardian, setNewGuardian] = useState({ name: '', relationship: '', phone: '' });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  // -------------------------------------------------------------
  // 7. SAFE ROUTE DATA CONNECTION
  // -------------------------------------------------------------
  function getCurrentRouteData() {
    if (selectedRoute && selectedRoute.name) {
      return {
        routeName: selectedRoute.name,
        destination: selectedRoute.destination || "Oakridge Girls Hostel",
        eta: selectedRoute.eta || "12:04 AM",
        safetyScore: selectedRoute.weightedScore !== undefined ? Math.round(selectedRoute.weightedScore) : 92
      };
    }
    // DEMO fallback values
    return {
      routeName: "Saathi Safe Route",
      destination: "Oakridge Girls Hostel",
      eta: "12:04 AM",
      safetyScore: 92
    };
  }

  const routeData = getCurrentRouteData();

  // -------------------------------------------------------------
  // 5. TRACKING ID GENERATOR
  // -------------------------------------------------------------
  function generateTrackingId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SAFE-${code}`;
  }

  // -------------------------------------------------------------
  // 8. DYNAMIC GUARDIAN MESSAGE GENERATOR
  // -------------------------------------------------------------
  function generateGuardianMessage(customTrackingId = null) {
    const trackingId = customTrackingId || journeyState.trackingId || 'SAFE-A7K92P';
    const lines = [];

    lines.push(`🛡️ Anushka has started her night walk to ${routeData.destination} via ${routeData.routeName}.`);
    lines.push('');
    lines.push(`Safety Score: ${routeData.safetyScore}/100`);

    if (safeJourneySettings.shareETA) {
      lines.push(`ETA: ${routeData.eta}`);
    }

    lines.push('');

    if (safeJourneySettings.shareGPS) {
      lines.push('Live location sharing is enabled.');
    } else {
      lines.push('Live location sharing is paused.');
    }

    if (safeJourneySettings.routeDeviationAlert) {
      lines.push('Route deviation alert (>100m) active.');
    }

    if (safeJourneySettings.emergencyAutoDial) {
      lines.push('Emergency auto-dial alert enabled.');
    }

    lines.push('');
    lines.push('Track journey:');
    lines.push(`saathi.safe/track/${trackingId}`);

    return lines.join('\n');
  }

  // -------------------------------------------------------------
  // 1. GUARDIAN SELECTION & COUNTER
  // -------------------------------------------------------------
  const toggleGuardianSelection = (id) => {
    const updated = guardians.map((g) => (g.id === id ? { ...g, selected: !g.selected } : g));
    saveGuardians(updated);
  };

  const selectedCount = guardians.filter((g) => g.selected).length;

  // -------------------------------------------------------------
  // 2. ADD NEW GUARDIAN FUNCTIONALITY
  // -------------------------------------------------------------
  const handleAddGuardianSubmit = (e) => {
    e.preventDefault();
    if (!newGuardian.name.trim()) {
      showToast("Please enter a guardian name.");
      return;
    }
    const created = {
      id: `guardian-${Date.now()}`,
      name: newGuardian.name.trim(),
      relationship: newGuardian.relationship.trim() || 'Trusted Contact',
      phone: newGuardian.phone.trim() || '+919876500000',
      online: true,
      primary: false,
      selected: true
    };

    const updated = [...guardians, created];
    saveGuardians(updated);
    setNewGuardian({ name: '', relationship: '', phone: '' });
    setShowAddModal(false);
    showToast(`Added ${created.name} to your Safe Circle.`);
  };

  // -------------------------------------------------------------
  // 4. GPS TRACKING FUNCTIONS
  // -------------------------------------------------------------
  function startGPSTracking() {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setJourneyState((prev) => {
          const newState = {
            ...prev,
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp
          };

          // If active and deviation alert is enabled, check deviation
          if (prev.active && safeJourneySettings.routeDeviationAlert) {
            // Planned route demo reference coordinates (centered around current position)
            const plannedRouteRef = {
              latitude: latitude - 0.0001, // ~11 meters away
              longitude: longitude - 0.0001
            };
            checkRouteDeviation({ latitude, longitude }, plannedRouteRef);
          }

          return newState;
        });
      },
      (error) => {
        console.warn("GPS Permission or Signal Error:", error.message);
        showToast("GPS permission denied or unavailable. Location tracking disabled.");
        updateMonitoringSettings('shareGPS', false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    setGpsWatchId(watchId);
    gpsWatchIdRef.current = watchId;
  }

  function stopGPSTracking() {
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      setGpsWatchId(null);
      gpsWatchIdRef.current = null;
    }
  }

  // -------------------------------------------------------------
  // 9. ROUTE DEVIATION CHECK
  // -------------------------------------------------------------
  function checkRouteDeviation(currentLocation, plannedRoute) {
    if (!currentLocation || !plannedRoute) return;
    const distanceMeters = getHaversineDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      plannedRoute.latitude,
      plannedRoute.longitude
    );

    const threshold = 100; // 100 meters threshold per spec
    if (distanceMeters > threshold) {
      setJourneyState((prev) => ({
        ...prev,
        routeDeviationDetected: true,
        deviationDistance: Math.round(distanceMeters)
      }));
    } else {
      setJourneyState((prev) => ({
        ...prev,
        routeDeviationDetected: false,
        deviationDistance: Math.round(distanceMeters)
      }));
    }
  }

  // Demo helper to simulate >100m route deviation for testing
  const simulateRouteDeviation = () => {
    setJourneyState((prev) => ({
      ...prev,
      routeDeviationDetected: true,
      deviationDistance: 145
    }));
    showToast("⚠️ Route Deviation (>100m) Simulated!");
  };

  // -------------------------------------------------------------
  // 13. EMERGENCY MONITORING
  // -------------------------------------------------------------
  function startEmergencyMonitoring() {
    // If emergencyAutoDial is enabled, trigger emergency modal after demo timeout or manually
    if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current);
    // For demo purpose, set up monitor check
  }

  function stopEmergencyMonitoring() {
    if (emergencyTimerRef.current) {
      clearTimeout(emergencyTimerRef.current);
      emergencyTimerRef.current = null;
    }
  }

  const triggerEmergencyAlert = () => {
    setShowEmergencyModal(true);
  };

  const handleImSafe = () => {
    setShowEmergencyModal(false);
    showToast("Emergency alert cancelled. Glad you're safe!");
  };

  const handleCallPrimaryGuardian = () => {
    const primary = guardians.find((g) => g.primary && g.phone) || guardians.find((g) => g.phone) || guardians[0];
    const phoneNum = primary ? primary.phone : '+919876543210';
    showToast(`Dialing primary sentinel: ${primary ? primary.name : 'Guardian'}`);
    window.location.href = `tel:${phoneNum}`;
  };

  // -------------------------------------------------------------
  // 6. SAFE JOURNEY START
  // -------------------------------------------------------------
  function startSafeJourney() {
    // Requirement 1: Check at least one guardian selected
    if (selectedCount === 0) {
      showToast("Please select at least one trusted guardian.");
      return;
    }

    const trackingId = generateTrackingId();
    const now = Date.now();

    const newJourney = {
      active: true,
      trackingId,
      startedAt: now,
      latitude: null,
      longitude: null,
      accuracy: null,
      eta: routeData.eta,
      destination: routeData.destination,
      routeName: routeData.routeName,
      safetyScore: routeData.safetyScore,
      status: 'active',
      routeDeviationDetected: false,
      deviationDistance: 0
    };

    setJourneyState(newJourney);

    // Request & start GPS if enabled
    if (safeJourneySettings.shareGPS) {
      startGPSTracking();
    }

    // Start Emergency monitoring if enabled
    if (safeJourneySettings.emergencyAutoDial) {
      startEmergencyMonitoring();
    }

    showToast(`Safe Journey Started! Tracking ID: ${trackingId}`);

    // Requirement 15: Share journey via navigator.share if supported
    const messageText = generateGuardianMessage(trackingId);
    if (navigator.share) {
      navigator.share({
        title: 'SafeRoute - Safe Journey Active',
        text: messageText,
        url: `https://saathi.safe/track/${trackingId}`
      }).catch(() => {
        // User cancelled share or failed
      });
    }
  }

  // -------------------------------------------------------------
  // 11 & 12. END & COMPLETE JOURNEY
  // -------------------------------------------------------------
  function completeSafeJourney() {
    stopGPSTracking();
    stopEmergencyMonitoring();
    setJourneyState((prev) => ({
      ...prev,
      active: false,
      status: 'completed'
    }));
    setShowArrivalModal(true);
  }

  function endSafeJourney() {
    if (window.confirm("Are you sure you want to end your Safe Journey?")) {
      stopGPSTracking();
      stopEmergencyMonitoring();
      setJourneyState((prev) => ({
        ...prev,
        active: false,
        status: 'idle',
        routeDeviationDetected: false
      }));
      showToast("Safe Journey ended.");
    }
  }

  // -------------------------------------------------------------
  // 15. SHARE / COPY HELPERS
  // -------------------------------------------------------------
  const copyDispatchMessage = () => {
    const messageText = generateGuardianMessage();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(messageText)
        .then(() => showToast("Dispatch message copied to clipboard!"))
        .catch(() => showToast("Failed to copy message."));
    } else {
      showToast("Clipboard copy not supported on this device.");
    }
  };

  const copyTrackingLink = () => {
    const id = journeyState.trackingId || 'SAFE-A7K92P';
    const link = `saathi.safe/track/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
        .then(() => showToast("Demo tracking link copied!"))
        .catch(() => showToast("Failed to copy link."));
    } else {
      showToast("Clipboard copy not supported.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGPSTracking();
      stopEmergencyMonitoring();
    };
  }, []);

  const dispatchPreviewMessage = generateGuardianMessage();

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-on-primary-container text-on-surface">
      
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-surface-container-highest text-primary border border-primary/40 px-4 py-3 rounded-xl shadow-2xl font-label-md font-bold text-center animate-bounce pointer-events-auto max-w-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* HEADER - Preserved dark theme mobile style */}
      <header className="sticky top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_4px_24px_rgba(6,14,32,0.80)]">
        <div className="h-16 px-gutter flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            {onNavigateBack && (
              <button 
                onClick={onNavigateBack}
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors -ml-2 shrink-0"
                aria-label="Back to Safety Details"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
            )}
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface truncate leading-tight">
              Safe Guardian Circle
            </h1>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${journeyState.active ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-on-surface-variant'}`}>
              <span className={`w-2 h-2 rounded-full ${journeyState.active ? 'bg-primary animate-ping' : 'bg-on-surface-variant/60'}`}></span>
              <span className="font-label-sm text-label-sm font-bold">
                {journeyState.active ? 'Journey Active' : 'Circle Ready'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex flex-col relative w-full bg-surface flex-1">
        <div className="flex flex-col w-full pb-safe px-gutter pt-space-md gap-space-lg max-w-lg mx-auto mb-28">

          {/* ACTIVE JOURNEY TELEMETRY BANNER (If Active) */}
          {journeyState.active && (
            <div className="flex flex-col bg-surface-container rounded-xl p-space-md shadow-xl border border-primary/40 gap-space-sm relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl animate-spin">radial_glow</span>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Live Journey Telemetry</h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-xs font-bold">
                  {journeyState.trackingId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 bg-surface-container-high rounded-lg flex flex-col">
                  <span className="font-label-sm text-on-surface-variant text-xs">GPS Status</span>
                  <span className="font-body-sm font-bold text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    {safeJourneySettings.shareGPS ? (journeyState.latitude ? 'Transmitting' : 'Acquiring Signal') : 'Disabled'}
                  </span>
                </div>
                <div className="p-2 bg-surface-container-high rounded-lg flex flex-col">
                  <span className="font-label-sm text-on-surface-variant text-xs">Route Path Status</span>
                  <span className={`font-body-sm font-bold ${journeyState.routeDeviationDetected ? 'text-error' : 'text-primary'}`}>
                    {journeyState.routeDeviationDetected ? `Deviated (${journeyState.deviationDistance}m)` : 'On Corridor'}
                  </span>
                </div>
              </div>

              {/* Coordinates display if GPS active */}
              {safeJourneySettings.shareGPS && journeyState.latitude && (
                <div className="px-3 py-1.5 bg-surface-container-lowest rounded text-xs font-mono text-on-surface-variant flex items-center justify-between">
                  <span>Lat: {journeyState.latitude.toFixed(4)}, Lng: {journeyState.longitude.toFixed(4)}</span>
                  <span>Accuracy: ±{Math.round(journeyState.accuracy || 10)}m</span>
                </div>
              )}

              {/* Warning alert if route deviation detected */}
              {journeyState.routeDeviationDetected && (
                <div className="p-3 bg-error/15 border border-error/30 rounded-lg flex items-start gap-2 text-error text-body-sm">
                  <span className="material-symbols-outlined text-xl shrink-0">warning</span>
                  <div>
                    <span className="font-bold block">Route Deviation Alert Triggered!</span>
                    <span>Your location is {journeyState.deviationDistance}m off the safe route corridor.</span>
                  </div>
                </div>
              )}

              {/* Hackathon Demo Test Controls */}
              <div className="mt-2 pt-2 border-t border-surface-variant/40 flex flex-wrap gap-2">
                <button 
                  onClick={simulateRouteDeviation}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-secondary">alt_route</span>
                  Simulate &gt;100m Deviation
                </button>
                <button 
                  onClick={triggerEmergencyAlert}
                  className="px-3 py-1.5 rounded-lg bg-error/20 hover:bg-error/30 text-error text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">sos</span>
                  Trigger Emergency Check
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={completeSafeJourney}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md font-bold flex items-center justify-center gap-1 shadow-md hover:opacity-90 active:scale-[0.98] transition-transform"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Arrived Safely
                </button>
                <button 
                  onClick={endSafeJourney}
                  className="py-2.5 px-4 rounded-xl bg-surface-container-highest text-on-surface font-label-md font-bold flex items-center justify-center gap-1 hover:bg-surface-variant active:scale-[0.98] transition-transform"
                >
                  End Journey
                </button>
              </div>
            </div>
          )}

          {/* ROUTE PREVIEW CARD */}
          <div className="flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">map</span>
                <span className="font-label-md font-bold text-on-surface">Selected Route Corridor</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary font-label-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">shield</span>
                {routeData.safetyScore} Safe
              </span>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{routeData.destination}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-sm text-primary">navigation</span>
                  {routeData.routeName}
                </p>
              </div>
              <div className="text-right">
                <span className="font-label-sm text-on-surface-variant text-xs block">Expected Arrival</span>
                <span className="font-headline-md text-headline-md font-bold text-primary">{routeData.eta}</span>
              </div>
            </div>
          </div>

          {/* ACTIVE SENTINELS / TRUSTED GUARDIANS SECTION */}
          <div className="flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">shield_person</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Active Sentinels</h3>
              </div>
              {/* Dynamic counter badge required by spec */}
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm font-bold border border-primary/30">
                {selectedCount} Selected
              </span>
            </div>

            {/* Guardians list */}
            <div className="flex flex-col gap-2">
              {guardians.map((g) => (
                <div 
                  key={g.id}
                  onClick={() => toggleGuardianSelection(g.id)}
                  className={`flex items-center justify-between p-space-sm rounded-xl cursor-pointer transition-all border ${
                    g.selected 
                      ? 'bg-surface-container-high border-primary/40 shadow-sm' 
                      : 'bg-surface-container-low border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="contact-checkbox w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
                      checked={g.selected}
                      onChange={() => {}} // Handled by container click
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md font-bold text-on-surface">{g.name}</span>
                        {g.primary && (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/20 text-primary">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
                        <span>{g.relationship}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${g.online ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                          {g.online ? 'Online' : 'Offline'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-lg">
                      {g.relationship.toLowerCase().includes('security') ? 'local_police' : 'call'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Trusted Guardian Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md font-bold flex items-center justify-center gap-2 border border-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              <span>+ Add New Trusted Guardian</span>
            </button>
          </div>

          {/* MONITORING SAFEGUARDS TOGGLES */}
          <div className="flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Monitoring Safeguards</h3>
            </div>

            <div className="flex flex-col gap-space-sm divide-y divide-surface-container-highest/60">
              
              {/* Toggle A: Share Real-Time GPS Location */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col pr-4">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Share Real-Time GPS Location</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Stream live location coordinates to selected sentinels</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={safeJourneySettings.shareGPS}
                    onChange={(e) => updateMonitoringSettings('shareGPS', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle B: Auto-Notify on Route Deviation */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex flex-col pr-4">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Auto-Notify on Route Deviation</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Alerts circle if path shifts by &gt;100m</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={safeJourneySettings.routeDeviationAlert}
                    onChange={(e) => updateMonitoringSettings('routeDeviationAlert', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle C: Share Expected Arrival Time */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex flex-col pr-4">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Share Expected Arrival Time</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">ETA {routeData.eta} &amp; auto-confirm arrival</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={safeJourneySettings.shareETA}
                    onChange={(e) => updateMonitoringSettings('shareETA', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Toggle D: Emergency Auto-Dial */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex flex-col pr-4">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Emergency Auto-Dial</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Call top sentinel if unresponsive for 3 min</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={safeJourneySettings.emergencyAutoDial}
                    onChange={(e) => updateMonitoringSettings('emergencyAutoDial', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

            </div>
          </div>

          {/* ENCRYPTED DISPATCH PREVIEW CARD */}
          <div className="flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">lock_clock</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Encrypted Dispatch Preview</h3>
              </div>
              <span className="font-label-sm text-xs text-on-surface-variant italic">(Demo Preview)</span>
            </div>

            <div className="p-space-sm bg-surface-container-lowest rounded-xl font-mono text-xs text-on-surface-variant whitespace-pre-wrap border border-surface-variant/40 leading-relaxed">
              {dispatchPreviewMessage}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={copyDispatchMessage}
                className="flex-1 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy Text
              </button>
              <button 
                onClick={copyTrackingLink}
                className="flex-1 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Copy Demo Link
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* BOTTOM ACTION BAR - "Share & Start Safe Journey" */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-gutter bg-surface/85 backdrop-blur-xl border-t border-surface-container shadow-2xl">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {!journeyState.active ? (
            <button
              onClick={startSafeJourney}
              className="w-full h-14 rounded-full bg-primary-container text-on-primary-fixed font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined text-2xl">send</span>
              <span>Share &amp; Start Safe Journey</span>
            </button>
          ) : (
            <button
              onClick={endSafeJourney}
              className="w-full h-14 rounded-full bg-error/20 border border-error/40 text-error font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined text-2xl">stop_circle</span>
              <span>End Safe Journey</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW GUARDIAN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-surface-container rounded-2xl p-6 w-full max-w-md shadow-2xl border border-surface-variant flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-surface-variant/40 pb-3">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Add Trusted Guardian
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleAddGuardianSubmit} className="flex flex-col gap-3">
              <div>
                <label className="font-label-sm text-xs text-on-surface-variant font-bold block mb-1">Guardian Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Papa, Neha (Bestie)"
                  value={newGuardian.name}
                  onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-surface-variant text-on-surface font-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-xs text-on-surface-variant font-bold block mb-1">Relationship</label>
                <input
                  type="text"
                  placeholder="e.g. Dad, Sister, Friend, Security"
                  value={newGuardian.relationship}
                  onChange={(e) => setNewGuardian({ ...newGuardian, relationship: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-surface-variant text-on-surface font-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-xs text-on-surface-variant font-bold block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={newGuardian.phone}
                  onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-high border border-surface-variant text-on-surface font-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-surface-variant/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-bold hover:bg-surface-container-highest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:opacity-90 shadow-md"
                >
                  Save Sentinel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EMERGENCY CONFIRMATION ("Are You Okay?") */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-container rounded-2xl p-6 w-full max-w-md shadow-2xl border border-error/50 flex flex-col gap-4 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-error/20 text-error flex items-center justify-center mx-auto mb-1 animate-pulse">
              <span className="material-symbols-outlined text-4xl">sos</span>
            </div>

            <h3 className="font-headline-md text-xl font-bold text-on-surface">Emergency Check — Are you okay?</h3>
            <p className="font-body-md text-on-surface-variant text-sm">
              An emergency safeguard condition or inactivity timeout has been triggered for your journey.
            </p>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={handleImSafe}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined">verified</span>
                <span>I'm Safe</span>
              </button>

              <button
                onClick={handleCallPrimaryGuardian}
                className="w-full py-3.5 rounded-xl bg-error text-on-error font-label-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90"
              >
                <span className="material-symbols-outlined">call</span>
                <span>Call Sentinel ({guardians.find(g => g.primary)?.name || 'Maa'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: JOURNEY COMPLETED ("Arrived Safely") */}
      {showArrivalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-surface-container rounded-2xl p-6 w-full max-w-md shadow-2xl border border-primary/50 flex flex-col gap-4 text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-1">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <h3 className="font-headline-md text-xl font-bold text-on-surface">Arrived Safely! 🎉</h3>
            <p className="font-body-md text-on-surface-variant text-sm">
              You have completed your Safe Journey to <strong className="text-on-surface">{routeData.destination}</strong>. GPS monitoring has been turned off.
            </p>

            <button
              onClick={() => setShowArrivalModal(false)}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg font-bold shadow-lg mt-2"
            >
              Close &amp; Finish
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
