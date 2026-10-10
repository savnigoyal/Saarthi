import { ArrowLeft } from 'lucide-react';
import safetyVideoUrl from '../safety_audio.mp4';
import './VirtualGuardian.css';

export default function VirtualGuardian({ onBack }) {
  return <main className="vg-page">
    <header className="vg-header">
      <button onClick={onBack} aria-label="Back"><ArrowLeft /></button>
      <div><strong>Safetu Audio</strong><small>Safety video</small></div>
    </header>
    <section className="vg-body" aria-label="Safety video">
      <video controls playsInline preload="metadata" aria-label="Safetu safety video" style={{ display: 'block', width: '100%', maxHeight: '75dvh', borderRadius: 16, background: '#000' }}>
        <source src={safetyVideoUrl} type="video/mp4" />
        Your browser does not support video playback.
      </video>
    </section>
  </main>;
}
