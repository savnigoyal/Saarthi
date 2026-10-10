import { useRef, useState } from 'react';
import safetyVideoUrl from '../safety.mp4';

export default function VirtualGuardian() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);

  function startVideo() {
    setStarted(true);
    videoRef.current?.play().catch(() => {});
  }

  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', background: '#080f1f' }}>
    {!started && <button type="button" onClick={startVideo} style={{ padding: '14px 42px', border: 0, borderRadius: 28, background: '#57f1db', color: '#09201f', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Play safety video</button>}
    <video
      ref={videoRef}
      controls={started}
      playsInline
      preload="metadata"
      aria-label="Safetu safety video"
      style={{ display: started ? 'block' : 'none', width: 'min(100%, 960px)', maxHeight: '85dvh', borderRadius: 16, background: '#000' }}
    >
      <source src={safetyVideoUrl} type="video/mp4" />
      Your browser does not support video playback.
    </video>
  </main>;
}
