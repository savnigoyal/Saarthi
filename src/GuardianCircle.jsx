import { useEffect, useMemo, useRef, useState } from 'react';
import './GuardianCircle.css';

const DEFAULT_GUARDIANS = [
  { id: 'mom', name: 'Maa (Mom)', relationship: 'Mom', phone: '', online: true, primary: true, selected: true, avatar: '👩🏽' },
  { id: 'rhea', name: 'Rhea (Roommate)', relationship: 'Roommate', phone: '', online: true, primary: false, selected: true, avatar: '👩🏻' },
  { id: 'arjun', name: 'Arjun (Brother)', relationship: 'Brother', phone: '', online: false, primary: false, selected: false, avatar: '👨🏽' },
  { id: 'security', name: 'Campus Security Desk', relationship: 'Security', phone: '', online: true, primary: false, selected: false, avatar: '✦' },
];
const DEFAULT_SETTINGS = { shareGPS: true, routeDeviationAlert: true, shareETA: true, emergencyAutoDial: false };
const DEMO_ROUTE = { routeName: 'Saathi Safe Route', destination: 'Oakridge Girls Hostel', eta: '12:04 AM' };

function readStorage(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function makeId() { return `SAFE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }
function getCurrentRouteData(route) {
  const duration = String(route?.travelTime || '').match(/([0-9]+)\s*min/i);
  const calculatedEta = duration ? new Date(Date.now() + Number(duration[1]) * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  return {
    routeName: route?.name || DEMO_ROUTE.routeName,
    destination: route?.destination || DEMO_ROUTE.destination,
    eta: route?.isCampusDemo ? null : route?.eta || calculatedEta || DEMO_ROUTE.eta,
    safetyScore: route?.isCampusDemo ? null : Number(route?.weightedScore ?? 92),
    plannedRoute: route?.geometry || route?.coordinates || null,
  };
}
function distanceToSegment(point, start, end) {
  const latScale = 111320;
  const x = (point.longitude - start.longitude) * latScale * Math.cos(point.latitude * Math.PI / 180);
  const y = (point.latitude - start.latitude) * latScale;
  const dx = (end.longitude - start.longitude) * latScale * Math.cos(point.latitude * Math.PI / 180);
  const dy = (end.latitude - start.latitude) * latScale;
  const t = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - t * dx, y - t * dy);
}
function checkRouteDeviation(currentLocation, plannedRoute) {
  if (!currentLocation || !Array.isArray(plannedRoute) || plannedRoute.length < 2) return null;
  return Math.min(...plannedRoute.slice(1).map((point, index) => distanceToSegment(currentLocation, plannedRoute[index], point))) > 100;
}

export default function GuardianCircle({ route, onBack }) {
  const [guardians, setGuardians] = useState(() => readStorage('saferoute.guardians', DEFAULT_GUARDIANS));
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readStorage('saferoute.monitoring', {}) }));
  const [journey, setJourney] = useState({ active: false, trackingId: null, startedAt: null, latitude: null, longitude: null, accuracy: null, eta: null, destination: null, routeName: null, safetyScore: null, completed: false, deviation: false, gpsStatus: 'idle' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '' });
  const [notice, setNotice] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [copied, setCopied] = useState(false);
  const gpsWatchId = useRef(null);
  const emergencyTimer = useRef(null);
  const deviationTimer = useRef(null);
  const etaTimer = useRef(null);
  const selected = useMemo(() => guardians.filter(g => g.selected), [guardians]);
  const routeData = getCurrentRouteData(route);
  const score = routeData.safetyScore;
  const routeName = routeData.routeName;
  const eta = journey.eta || routeData.eta;
  const trackingLink = journey.trackingId ? `saathi.safe/track/${journey.trackingId}` : '';
  const primaryGuardian = guardians.find(g => g.primary) || guardians[0];

  useEffect(() => { localStorage.setItem('saferoute.guardians', JSON.stringify(guardians)); }, [guardians]);
  useEffect(() => { localStorage.setItem('saferoute.monitoring', JSON.stringify(settings)); }, [settings]);
  useEffect(() => () => { stopGPSTracking(); clearTimers(); }, []);
  function clearTimers() { clearTimeout(emergencyTimer.current); clearInterval(deviationTimer.current); clearInterval(etaTimer.current); }
  function stopGPSTracking() {
    if (gpsWatchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId.current);
    gpsWatchId.current = null;
  }
  function updateGuardianCount() { return `${selected.length} Selected`; }
  function updateMonitoringSettings(key, value) { setSettings(current => ({ ...current, [key]: value })); }
  function startGPSTracking() {
    if (!navigator.geolocation) { setJourney(current => ({ ...current, gpsStatus: 'unavailable' })); setNotice('Location is not available in this browser. Journey can continue without GPS.'); return; }
    setJourney(current => ({ ...current, gpsStatus: 'requesting' }));
    gpsWatchId.current = navigator.geolocation.watchPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;
      setJourney(current => ({ ...current, latitude, longitude, accuracy, gpsStatus: 'active' }));
      // Only real route geometry from SafeRoute is used; this screen never invents coordinates.
      const deviated = checkRouteDeviation({ latitude, longitude }, routeData.plannedRoute);
      if (deviated === true) {
        setJourney(current => ({ ...current, deviation: true }));
        if (settings.routeDeviationAlert) setNotice('Route deviation detected. Share this update with selected guardians.');
      }
    }, error => {
      setJourney(current => ({ ...current, gpsStatus: error.code === 1 ? 'denied' : 'unavailable' }));
      setNotice(error.code === 1 ? 'Location permission was denied. GPS is not being shared; the journey can continue.' : 'GPS is unavailable. The journey can continue without location sharing.');
      stopGPSTracking();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  }
  function startEmergencyMonitoring() {
    if (!settings.emergencyAutoDial) return;
    emergencyTimer.current = setTimeout(() => setEmergency(true), 180000);
  }
  function startSafeJourney() {
    if (selected.length === 0) { setNotice('Please select at least one trusted guardian.'); return; }
    const trackingId = makeId();
    setJourney({ active: true, trackingId, startedAt: Date.now(), latitude: null, longitude: null, accuracy: null, eta: routeData.eta, destination: routeData.destination, routeName, safetyScore: score, completed: false, deviation: false, gpsStatus: settings.shareGPS ? 'requesting' : 'off' });
    setNotice('Journey active. Share the demo link with your guardians when ready.');
    if (settings.shareGPS) startGPSTracking();
    if (settings.routeDeviationAlert) deviationTimer.current = setInterval(() => {
      // Monitoring becomes active when planned route geometry is connected.
    }, 15000);
    if (settings.shareETA) etaTimer.current = setInterval(() => {}, 60000);
    startEmergencyMonitoring();
    const startLink = `saathi.safe/track/${trackingId}`;
    const startMessage = [`🛡️ Anushka has started her night walk to ${routeData.destination} via ${routeName}.`, score == null ? 'Safety assessment is not available for this route.' : `Safety Score: ${score}/100`, ...(settings.shareETA && routeData.eta ? [`ETA: ${routeData.eta}`] : []), settings.shareGPS ? 'Live location sharing is starting on this device.' : 'Live location sharing is paused.', ...(settings.routeDeviationAlert ? ['Route deviation alert (>100m) enabled; route data unavailable.'] : []), `Track journey:\n${startLink}`].join('\n\n');
    if (navigator.share) navigator.share({ title: 'SafeRoute journey', text: startMessage }).catch(error => { if (error.name !== 'AbortError') setNotice('Journey active. Sharing did not complete; you can copy the preview below.'); });
  }
  function completeSafeJourney() {
    stopGPSTracking(); clearTimers(); setEmergency(false);
    setJourney(current => ({ ...current, active: false, completed: true, gpsStatus: 'off', latitude: null, longitude: null, accuracy: null }));
    setNotice('Journey Completed — Arrived Safely');
  }
  function endSafeJourney() {
    if (window.confirm('End this Safe Journey and stop location sharing?')) completeSafeJourney();
  }
  function generateGuardianMessage() {
    if (!journey.trackingId) return `🛡️ Anushka is preparing for her night walk to ${routeData.destination} via ${routeName}.\n\n${score == null ? 'Safety assessment is not available for this route.' : `Safety Score: ${score}/100.`}`;
    if (journey.completed) return `✅ Anushka has arrived safely at ${journey.destination}.\n\nLocation sharing has stopped.`;
    const locationStatus = settings.shareGPS && journey.gpsStatus === 'active'
      ? 'Live location sharing is active on this device.'
      : 'Live location sharing is paused.';
    const deviationStatus = !settings.routeDeviationAlert
      ? null
      : routeData.plannedRoute && journey.gpsStatus === 'active'
        ? 'Route deviation alert (>100m) active.'
        : 'Route deviation alert (>100m) enabled; route data unavailable.';
    return [
      `🛡️ Anushka has started her night walk to ${journey.destination} via ${journey.routeName}.`,
      journey.safetyScore == null ? 'Safety assessment is not available for this route.' : `Safety Score: ${journey.safetyScore}/100`,
      settings.shareETA && journey.eta ? `ETA: ${journey.eta}` : null,
      locationStatus,
      deviationStatus,
      journey.deviation ? 'Route deviation detected. Please check in with Anushka.' : null,
      `Track journey:\n${trackingLink}`,
    ].filter(Boolean).join('\n\n');
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setNotice('Copy is unavailable in this browser. Select and copy the preview text.'); }
  }
  async function shareJourney() {
    const message = generateGuardianMessage();
    if (navigator.share) { try { await navigator.share({ title: 'SafeRoute journey', text: message }); } catch (error) { if (error.name !== 'AbortError') setNotice('Sharing did not complete. You can copy the message below.'); } }
    else await copyText(message);
  }
  function addGuardian(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setGuardians(current => [...current, { id: `guardian-${crypto.randomUUID?.() || Date.now()}`, name, relationship: form.relationship.trim() || 'Trusted contact', phone: form.phone.trim(), online: false, primary: false, selected: true, avatar: '👤' }]);
    setForm({ name: '', relationship: '', phone: '' }); setModal(false); setNotice('Guardian added and selected.');
  }
  function checkEmergencySafe() { setEmergency(false); clearTimeout(emergencyTimer.current); }
  const message = generateGuardianMessage();

  return <div className="guardian-shell">
    <header className="guardian-header"><button onClick={onBack} aria-label="Back"><span className="material-symbols-outlined">arrow_back_ios_new</span></button><h1>Haven Detail</h1><span className="guardian-live"><i />{journey.active ? 'Journey Active' : route?.isCampusDemo ? 'Map Demo' : 'Live Safe'}</span><div className="guardian-profile">A</div></header>
    <main className="guardian-content">
      <div className="guardian-eyebrow"><span className="material-symbols-outlined">verified_user</span>Pre-journey checkpoint</div>
      <h2>Safe Guardian Circle</h2><p className="guardian-subtitle">Who should look out for you tonight?</p>
      <section className="guardian-route"><div className="route-pin">▲</div><div className="route-copy"><strong>{routeData.destination}<i /></strong><span>{route?.distance || (route?.isCampusDemo ? 'Load the live route from the map' : 'Safe route')} • <b>{eta || 'ETA unavailable'}</b></span></div><span className="route-score">{score == null ? 'Not assessed' : `♥ ${score} Safe`}</span></section>

      <section className="guardian-section"><div className="guardian-section-title"><h3>Active Sentinels</h3><span className="selected-count">{updateGuardianCount()}</span><small>Tap to notify</small></div>
        <div className="guardian-list">{guardians.map(guardian => <label className={`guardian-card ${guardian.selected ? 'is-selected' : ''}`} key={guardian.id}>
          <span className={`guardian-avatar ${guardian.id === 'security' ? 'security-avatar' : ''}`}>{guardian.avatar || '👤'}</span><span className="guardian-details"><strong>{guardian.name}{guardian.primary && <em>Primary</em>}</strong><small><i className={guardian.online ? 'online-dot' : 'offline-dot'} />{guardian.online ? 'Online now' : 'Offline'}</small></span>
          <input type="checkbox" checked={!!guardian.selected} onChange={e => setGuardians(current => current.map(item => item.id === guardian.id ? { ...item, selected: e.target.checked } : item))} aria-label={`Select ${guardian.name}`} />
        </label>)}</div>
        <button className="add-guardian" onClick={() => setModal(true)}><span className="material-symbols-outlined">person_add</span>+ Add New Trusted Guardian</button>
      </section>

      <section className="guardian-section settings-section"><h3><span className="material-symbols-outlined">tune</span>Monitoring Safeguards</h3>
        <div className="settings-card">
          <Setting icon="near_me" title="Share Real-Time GPS Location" description={journey.active && settings.shareGPS ? (journey.gpsStatus === 'active' ? 'GPS active on this device' : 'Location permission requested') : 'Location sharing for this device'} checked={settings.shareGPS} onChange={value => updateMonitoringSettings('shareGPS', value)} />
          <Setting icon="alt_route" title="Auto-Notify on Route Deviation" description="Alerts circle if path shifts by >100m" checked={settings.routeDeviationAlert} onChange={value => updateMonitoringSettings('routeDeviationAlert', value)} />
          <Setting icon="task_alt" title="Share Expected Arrival Time" description={`ETA ${eta} & auto-confirm arrival`} checked={settings.shareETA} onChange={value => updateMonitoringSettings('shareETA', value)} />
          <Setting icon="emergency" title="Emergency Auto-Dial" description="Prompt if you don't check in for 3 min" checked={settings.emergencyAutoDial} onChange={value => updateMonitoringSettings('emergencyAutoDial', value)} last />
        </div>
      </section>

      <section className="dispatch-section"><div className="dispatch-title"><span className="material-symbols-outlined">chat</span><strong>GUARDIAN DISPATCH PREVIEW</strong><b>Ready to share</b></div><div className="dispatch-card"><span className="dispatch-icon material-symbols-outlined">forum</span><div><p>{message}</p>{trackingLink && <button className="tracking-link" onClick={() => copyText(trackingLink)}><span className="material-symbols-outlined">content_copy</span>{trackingLink} {copied && 'Copied'}</button>}<div className="dispatch-actions"><button onClick={shareJourney}>Share message</button><button onClick={() => copyText(message)}>{copied ? 'Copied' : 'Copy message'}</button></div></div></div><small className="honesty-note">Demo preview only. No message is sent until you choose Share.</small></section>

      {(notice || journey.active || journey.completed) && <div className={`journey-status ${journey.deviation ? 'warning' : ''}`} role="status">{journey.deviation ? 'Route deviation detected' : journey.active ? `Safe Journey Active · ${journey.gpsStatus === 'active' ? 'GPS active on this device' : settings.shareGPS ? 'GPS pending or unavailable' : 'GPS off'}` : notice || (journey.completed ? 'Arrived Safely' : '')}</div>}
      {journey.active && journey.trackingId && <p className="tracking-id">Demo tracking ID: <strong>{journey.trackingId}</strong> · Route checks need connected route geometry.</p>}
      {journey.completed && <div className="arrived-state"><span>✓</span>Arrived Safely</div>}
    </main>
    <footer className="guardian-footer"><button className="start-journey" onClick={journey.active ? endSafeJourney : journey.completed ? startSafeJourney : startSafeJourney}><span className="material-symbols-outlined">{journey.active ? 'check_circle' : 'shield'}</span>{journey.active ? 'Safe Journey Active · End Journey' : journey.completed ? 'Start Another Safe Journey' : 'Share & Start Safe Journey'}</button><p><span className="material-symbols-outlined">lock</span>Your guardians are ready to receive updates when you share. Location stays on this device.</p></footer>

    {emergency && <div className="guardian-overlay" role="dialog" aria-modal="true"><div className="emergency-dialog"><div className="emergency-mark">!</div><h2>Are you okay?</h2><p>It's been 3 minutes since your journey started. Choose an action.</p><button className="safe-button" onClick={checkEmergencySafe}>I'm Safe</button>{primaryGuardian?.phone ? <a className="call-button" href={`tel:${primaryGuardian.phone}`}>Call {primaryGuardian.name}</a> : <button className="call-button" onClick={() => setNotice(`Add a phone number for ${primaryGuardian?.name || 'your primary guardian'} to enable calling.`)}>Call Primary Guardian</button>}</div></div>}
    {modal && <div className="guardian-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setModal(false); }}><form className="guardian-dialog" onSubmit={addGuardian}><button className="dialog-close" type="button" onClick={() => setModal(false)} aria-label="Close">×</button><h2>Add Trusted Guardian</h2><label>Guardian name<input autoFocus required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" /></label><label>Relationship<input value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} placeholder="e.g. Friend" /></label><label>Phone number<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91…" /></label><button className="safe-button" type="submit">Add Guardian</button></form></div>}
  </div>;
}

function Setting({ icon, title, description, checked, onChange, last }) {
  return <div className={`setting-row ${last ? 'last' : ''}`}><span className="material-symbols-outlined setting-icon">{icon}</span><span className="setting-copy"><strong>{title}</strong><small>{description}</small></span><button role="switch" aria-checked={checked} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={title}><i /></button></div>;
}
