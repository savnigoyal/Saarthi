import { useRef, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import safetyVideoUrl from '../safety.mp4';
import './SafetuAudio.css';

export default function VirtualGuardian({ onBack }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [playbackError, setPlaybackError] = useState('');

  function startVideo() {
    setStarted(true);
    setPlaybackError('');
    videoRef.current?.play().catch(() => setPlaybackError('The video could not start. Please try again.'));
  }

  return <main className="safetu-page">
    <button className="safetu-back" type="button" onClick={onBack} aria-label="Go back">
      <ArrowLeft aria-hidden="true" />
      <span>Back</span>
    </button>
    <div className="safetu-shell">
      <section className={`safetu-card${started ? ' safetu-card--playing' : ''}`} aria-labelledby="safetu-title">
        {!started && <div className="safetu-intro">
          <span className="safetu-eyebrow">A MOMENT FOR YOUR JOURNEY</span>
          <h1 id="safetu-title">A reassuring start, wherever you’re headed.</h1>
          <p>Play your safety video before you set off. It’s ready whenever you are.</p>
          <button className="safetu-play-button" type="button" onClick={startVideo}>
            <span className="safetu-play-icon"><Play aria-hidden="true" fill="currentColor" /></span>
            <span>Play safety video</span>
          </button>
          <p className="safetu-device-note">Your video plays on this device.</p>
        </div>}

        <video
          ref={videoRef}
          className="safetu-video"
          controls={started}
          playsInline
          preload="metadata"
          aria-label="Safetu safety video"
          onError={() => setPlaybackError('The video could not be loaded. Please try again later.')}
          style={{ display: started ? 'block' : 'none' }}
        >
          <source src={safetyVideoUrl} type="video/mp4" />
          Your browser does not support video playback.
        </video>
        {playbackError && <p className="safetu-error" role="status">{playbackError}</p>}
      </section>

      {!started && <p className="safetu-footer">Take a breath. You’re in control of your journey.</p>}
    </div>
  </main>;
}
