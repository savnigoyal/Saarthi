import { useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import safetyVideoUrl from '../safety.mp4';
import './VirtualGuardian.css';

export default function VirtualGuardian({ onBack }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);

  function startVideo() {
    setStarted(true);
    videoRef.current?.play().catch(() => {});
  }

  return <main className="vg-page">
    <header className="vg-header">
      <button onClick={onBack} aria-label="Back"><ArrowLeft /></button>
      <div><strong>Safetu Audio</strong><small>Safety video</small></div>
    </header>
    <section className="vg-body" aria-label="Safety video">
      {!started ? <button type="button" onClick={startVideo} style={{ display: 'block', margin: '32px auto', padding: '14px 42px', border: 0, borderRadius: 28, background: '#57f1db', color: '#09201f', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Start</button> :
        <video ref={videoRef} controls autoPlay playsInline preload="metadata" aria-label="Safetu safety video" style={{ display: 'block', width: '100%', maxHeight: '75dvh', borderRadius: 16, background: '#000' }}>
          <source src={safetyVideoUrl} type="video/mp4" />
          Your browser does not support video playback.
        </video>}
    </section>
  </main>;
}
