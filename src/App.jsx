import React, { useState, useEffect } from 'react';
import { getAlternativeRoutes } from './mockService';
import GuardianCircle from './GuardianCircle';

const ScoreRing = ({ score, targetScore }) => {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    // Reset and animate when target changes
    setCurrentScore(0);
    const timeout = setTimeout(() => setCurrentScore(targetScore), 150);
    return () => clearTimeout(timeout);
  }, [targetScore]);

  const circumference = 427.26;
  const offset = circumference - (circumference * currentScore) / 100;

  return (
    <div className="relative w-48 h-48 my-space-xs flex items-center justify-center mx-auto score-ring">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
        <circle className="text-surface-container-highest" cx="80" cy="80" fill="transparent" r="68" stroke="currentColor" strokeWidth="12" />
        <circle 
          className="transition-all duration-1000 ease-out" 
          cx="80" cy="80" fill="transparent" r="68" 
          stroke="url(#teal-glow-grad)" 
          strokeDasharray="427.26" 
          strokeDashoffset={offset} 
          strokeLinecap="round" strokeWidth="12" 
        />
        <defs>
          <linearGradient id="teal-glow-grad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#57f1db" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary mb-1">
          <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>shield</span>
        </div>
        <div className="flex items-baseline">
          <span className="font-headline-xl text-headline-xl font-bold text-on-surface leading-none tracking-tight">
            {Math.round(currentScore)}
          </span>
          <span className="font-label-md text-label-md text-primary font-bold">/100</span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5">Safety Index</span>
      </div>
    </div>
  );
};

const FactorCard = ({ icon, title, score, colorClass, evidence }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      className="flex flex-col bg-surface-container-high rounded-lg p-space-sm gap-1.5 cursor-pointer hover:bg-surface-container-highest transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`material-symbols-outlined text-lg ${colorClass}`}>{icon}</span>
          <span className="font-label-md text-label-md text-on-surface font-bold truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-label-md text-label-md font-bold ${colorClass}`}>{score}%</span>
          <span className="material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
        </div>
      </div>
      <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colorClass === 'text-secondary' ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${score}%` }}></div>
      </div>
      {expanded && (
        <div className="mt-2 p-2 bg-surface-container-lowest rounded text-on-surface-variant text-body-sm font-body-sm leading-relaxed border-l-2 border-primary">
          {evidence}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuardians, setShowGuardians] = useState(false);

  useEffect(() => {
    getAlternativeRoutes().then(data => {
      setRoutes(data);
      if (data.length > 0) setSelectedRouteId(data[0].id);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <span className="font-label-lg font-bold">Loading Safety Engine Data...</span>
        </div>
      </div>
    );
  }

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  if (selectedRoute && showGuardians) {
    return <GuardianCircle route={selectedRoute} onBack={() => setShowGuardians(false)} />;
  }
  
  if (!selectedRoute) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <header className="sticky top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_4px_24px_rgba(6,14,32,0.80)]">
          <div className="h-16 px-gutter flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs min-w-0">
              <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors -ml-2 shrink-0">
                <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
              </button>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface truncate leading-tight">Haven Detail</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant p-gutter text-center">
          <span className="material-symbols-outlined text-6xl mb-4 text-primary/50">satellite_alt</span>
          <h2 className="font-headline-md font-bold text-on-surface mb-2">Awaiting Telemetry Data</h2>
          <p className="font-body-md max-w-sm">No route candidates are currently available. Please submit a route request to receive a safety score assessment.</p>
        </div>
      </div>
    );
  }

  const p = selectedRoute.parameters;

  return (
    <div className="app-shell flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-on-primary-container">
      
      <header className="sticky top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_4px_24px_rgba(6,14,32,0.80)]">
        <div className="h-16 px-gutter flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <button className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high transition-colors -ml-2 shrink-0">
              <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
            </button>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface truncate leading-tight">Haven Detail</h1>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
              <span className="material-symbols-outlined text-xs">bolt</span>
              <span className="font-label-sm text-label-sm font-bold">Live Safe</span>
            </div>
            <img alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-primary/40 shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBMTr__9XPcOSiGWSjhF0eCBPTKbG2BgYe5Y8GCR01njOkmi2j-0rLepsEngTbl2g7mc0T5CVNVJXKKuDlN6YGB2M-2058JA4XP2lNaL4Rx6tS13dQHVdXeZ_abGNw36VNIG7kJ_851_JxKt34_sjC8k04wwajcxKuHqrNyEEoT5MCEu-WPf9f6mKVnvg9HHPWBAtp4mni3sPu4aG2MtCQg4KztoYq-OZHlRPnbakzsXecgtBz6CPE"/>
          </div>
        </div>
        {/* Route Selector */}
        <div className="px-gutter pb-3 flex gap-2 overflow-x-auto">
          {routes.map(r => (
            <button 
              key={r.id} 
              onClick={() => setSelectedRouteId(r.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-label-sm font-bold transition-colors ${selectedRouteId === r.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </header>

      <main className="app-main flex flex-col relative w-full bg-surface flex-1">
        <div className="app-content flex flex-col w-full pb-safe px-gutter pt-space-md gap-space-lg max-w-lg mx-auto mb-20">
          <section className="route-intro">
            <div className="eyebrow"><span className="material-symbols-outlined">verified_user</span>Route inspection</div>
            <h2>{selectedRoute.name}</h2>
            <div className="route-meta">
              <span><span className="material-symbols-outlined">route</span>{selectedRoute.distance}</span>
              <span><span className="material-symbols-outlined">schedule</span>{selectedRoute.travelTime}</span>
              <span><span className="material-symbols-outlined">verified</span>{selectedRoute.dataConfidence} confidence</span>
            </div>
          </section>

          <div className="score-card flex flex-col items-center bg-surface-container rounded-xl p-space-lg shadow-xl relative overflow-hidden text-center">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>
            
            <ScoreRing score={selectedRoute.weightedScore} targetScore={selectedRoute.weightedScore} />
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary mt-space-xs">
              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
              <span className="font-label-sm text-label-sm font-bold">
                {selectedRoute.weightedScore >= 90 ? 'Exceptionally Safe Night Corridor' : 
                 selectedRoute.weightedScore >= 70 ? 'Moderate Caution Advised' : 
                 'High Alert Route'}
              </span>
            </div>

            <p className="score-summary">Safety estimate based on mapped lighting, nearby activity, police proximity, safe havens, and available incident data.</p>
            
            <div className="score-duplicate-meta flex items-center gap-space-sm mt-space-sm text-on-surface-variant font-body-sm text-body-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-primary">route</span> {selectedRoute.distance}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-primary">schedule</span> {selectedRoute.travelTime}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-primary">verified</span> {selectedRoute.dataConfidence} Confidence
              </span>
            </div>
          </div>

          <details className="why-score">
            <summary><span><span className="material-symbols-outlined">auto_awesome</span><span><strong>Why this score?</strong><small>How the route estimate is calculated</small></span></span><span className="material-symbols-outlined">expand_more</span></summary>
            <p>The score combines five weighted factors: street lighting (25%), estimated pedestrian activity (20%), police and CCTV proximity (15%), safe havens (15%), and historical incident safety (25%). Values come from mapped data and estimates; historical incident data is provisional, and live sensors or verified CCTV coverage are not connected.</p>
            <div className="why-note"><span className="material-symbols-outlined">info</span>Use this estimate as guidance, not a safety guarantee.</div>
          </details>

          <div className="factor-section flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Safety Factor Breakdown</h3>
              </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">5 factors</span>
            </div>
            <div className="flex flex-col gap-space-sm">
              <FactorCard icon="lightbulb" title="Street Lighting & Visibility" score={p.lighting.score} colorClass="text-primary" evidence={p.lighting.evidence} />
              <FactorCard icon="groups" title="Pedestrian Footfall" score={p.pedestrian.score} colorClass="text-secondary" evidence={p.pedestrian.evidence} />
              <FactorCard icon="videocam" title="Police & CCTV Proximity" score={p.police.score} colorClass="text-primary" evidence={p.police.evidence} />
              <FactorCard icon="storefront" title="Safe Havens" score={p.safeHavens.score} colorClass="text-primary" evidence={p.safeHavens.evidence} />
              <FactorCard icon="verified" title="Historical Incident Index" score={p.historical.score} colorClass="text-primary" evidence={p.historical.evidence} />
            </div>
          </div>

          <div className="segment-section flex flex-col bg-surface-container rounded-xl p-space-md shadow-md gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">alt_route</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Segment Inspection Preview</h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{selectedRoute.segments.length} Stages</span>
            </div>
            
            <div className="relative flex flex-col gap-space-md">
              {selectedRoute.segments.map((seg, idx) => (
                <div key={seg.id} className="flex gap-space-sm items-start relative">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-label-sm text-label-sm font-bold z-10 shadow-sm">
                      {idx + 1}
                    </div>
                    {idx < selectedRoute.segments.length - 1 && (
                      <div className="w-0.5 h-16 bg-surface-variant my-1"></div>
                    )}
                  </div>
                  <div className="flex flex-col bg-surface-container-high rounded-xl p-space-sm flex-1 cursor-pointer hover:bg-surface-container-highest transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md font-bold text-on-surface">{seg.name}</span>
                      <span className="font-label-sm text-label-sm text-primary font-bold">{seg.distance}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{seg.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {seg.tags.map((tag, tIdx) => (
                        <span key={tIdx} className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm ${tag.type === 'primary' ? 'bg-primary/10 text-primary' : tag.type === 'secondary' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                          {tag.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedRoute.review && (
            <div className="review-card flex items-center gap-space-sm p-space-md rounded-xl bg-surface-container-low shadow-sm">
              <img className="w-14 h-14 rounded-full object-cover shrink-0" src={selectedRoute.review.avatar} alt="Reviewer" />
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-bold text-on-surface">Walked by {selectedRoute.review.user} {selectedRoute.review.timeAgo}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">"{selectedRoute.review.text}"</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-50 p-gutter bg-surface/85 backdrop-blur-xl border-t border-surface-container shadow-2xl">
        <button onClick={() => setShowGuardians(true)} className="w-full max-w-lg mx-auto h-14 rounded-full bg-primary-container text-on-primary-fixed font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-transform">
          <span>Proceed with this safe route</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
