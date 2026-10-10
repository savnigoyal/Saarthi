import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Phone, PhoneOff, Mic, MicOff, Volume2, Square, Send, ShieldAlert, RotateCcw } from 'lucide-react';
import { PERSONAS, createConversation, getOpening, respondToUser } from './virtualGuardianConversation';
import { speakGuardianText, stopGuardianAudio } from './virtualGuardianAudio';
import './VirtualGuardian.css';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function VirtualGuardian({ onBack, onSafety }) {
  const [personaId, setPersonaId] = useState('papa');
  const [phase, setPhase] = useState('ready');
  const [conversation, setConversation] = useState(() => createConversation('papa'));
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const timers = useRef(new Set());
  const turnRef = useRef(0);
  const persona = PERSONAS.find(item => item.id === personaId);

  useEffect(() => {
    if (phase !== 'connected') return undefined;
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => () => {
    stopRecognition(); stopGuardianAudio();
    timers.current.forEach(window.clearTimeout); timers.current.clear();
  }, []);

  function stopRecognition() {
    if (recognitionRef.current) { recognitionRef.current.onresult = null; recognitionRef.current.onerror = null; recognitionRef.current.onend = null; try { recognitionRef.current.abort(); } catch { /* already stopped */ } }
    recognitionRef.current = null; setListening(false);
  }

  async function play(text, intent) {
    setSpeaking(true); setError('');
    const result = await speakGuardianText(text, personaId, intent);
    setSpeaking(false);
    if (result.error) setError(`${result.error} Captions remain available.`);
  }

  function startCall() {
    stopRecognition(); stopGuardianAudio(); setError(''); setConversation(createConversation(personaId)); setHistory([]); setElapsed(0); setPhase('connected');
    const opening = getOpening(personaId);
    setConversation(current => ({ ...current, lastAssistant: opening }));
    setHistory([{ speaker: 'guardian', text: opening }]);
    const id = window.setTimeout(() => play(opening, 'greeting'), 450); timers.current.add(id);
  }

  function endCall() {
    stopRecognition(); stopGuardianAudio(); timers.current.forEach(window.clearTimeout); timers.current.clear(); setSpeaking(false); setPhase('ended');
  }

  function processInput(raw) {
    const value = raw.trim(); if (!value || phase !== 'connected') return;
    setHistory(current => [...current, { speaker: 'you', text: value }]); setDraft('');
    const result = respondToUser(conversation, value, turnRef.current++);
    setConversation(result.state);
    setHistory(current => [...current, { speaker: 'guardian', text: result.text }]);
    if (result.safety) { stopGuardianAudio(); setSpeaking(false); setError('You can return to the safety screen using the option below. Nothing has been sent or called.'); return; }
    const id = window.setTimeout(() => play(result.text, result.intent), 500); timers.current.add(id);
  }

  function listen(force = false) {
    if (phase !== 'connected' || (speaking && !force) || listening) return;
    setError('');
    if (!SpeechRecognition) { setError('Speech recognition is not supported in this browser. Type your reply below.'); return; }
    try {
      const recognition = new SpeechRecognition(); recognitionRef.current = recognition; recognition.lang = persona.voice; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.continuous = false;
      recognition.onresult = event => { const transcript = event.results?.[0]?.[0]?.transcript || ''; if (transcript) processInput(transcript); };
      recognition.onerror = event => setError(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone permission was denied. You can type a reply instead.' : `Speech recognition error (${event.error}). You can type a reply instead.`);
      recognition.onend = () => { setListening(false); recognitionRef.current = null; };
      recognition.start(); setListening(true);
    } catch { setListening(false); recognitionRef.current = null; setError('Could not start the microphone. You can type a reply instead.'); }
  }

  function interrupt() { stopGuardianAudio(); setSpeaking(false); if (phase === 'connected') { const id = window.setTimeout(() => listen(true), 0); timers.current.add(id); } }
  function replay() { if (conversation.lastAssistant) play(conversation.lastAssistant, 'follow-up'); }
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return <main className="vg-page">
    <header className="vg-header"><button onClick={onBack} aria-label="Back to Guardian Circle"><ArrowLeft /></button><div><strong>Virtual Guardian</strong><small>Simulated safety check-in</small></div><span className="vg-demo-pill">DEMO</span></header>
    <div className="vg-body">
      <div className="vg-call-card">
        <div className="vg-status"><span className={phase === 'connected' ? 'vg-dot active' : 'vg-dot'} />{phase === 'connected' ? 'Simulated call connected' : phase === 'ended' ? 'Call ended' : 'Incoming simulated check-in'}</div>
        {phase !== 'connected' && <div className="vg-persona-picker"><h1>Who would you like to check in with?</h1><p>Choose a familiar voice for a simulated conversation.</p><div className="vg-personas">{PERSONAS.map(item => <button key={item.id} className={personaId === item.id ? 'selected' : ''} onClick={() => setPersonaId(item.id)}><span>{item.avatar}</span><b>{item.name}</b><small>{item.relation}</small></button>)}</div></div>}
        <div className={`vg-avatar ${speaking ? 'speaking' : ''}`} aria-label={`${persona.name} avatar`}>{persona.avatar}</div>
        <h2>{persona.name}</h2>
        <p className="vg-call-state">{phase === 'connected' ? time : phase === 'ended' ? 'Check-in complete' : 'Virtual voice assistant'}</p>
        <div className="vg-indicator" aria-live="polite">{speaking ? <><span className="vg-bars"><i/><i/><i/><i/><i/></span> Speaking</> : listening ? <><span className="vg-listening-dot"/> Listening for your reply</> : phase === 'connected' ? 'Ready when you are' : 'No real person is on this call'}</div>
      </div>

      {phase === 'connected' && <section className="vg-transcript" aria-label="Conversation captions"><div className="vg-transcript-heading">Conversation <span>Current session only</span></div>{history.map((item, index) => <div key={`${index}-${item.speaker}`} className={`vg-line ${item.speaker}`}><span>{item.speaker === 'you' ? 'You' : persona.name}</span><p>{item.text}</p></div>)}</section>}

      {error && <div className="vg-error" role="status">{error}</div>}
      {conversation.unsafe && phase === 'connected' && <div className="vg-safety-card"><ShieldAlert/><div><strong>Need real safety options?</strong><p>Open your existing Guardian Circle. The simulated assistant has not contacted anyone.</p></div><button onClick={onSafety}>Open safety screen</button></div>}
      {phase === 'connected' && <form className="vg-reply" onSubmit={event => { event.preventDefault(); processInput(draft); }}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Type a reply…" aria-label="Type your reply"/><button type="submit" disabled={!draft.trim()} aria-label="Send reply"><Send/></button></form>}

      <div className="vg-controls">
        {phase !== 'connected' ? <button className="vg-start" onClick={startCall}><Phone/> {phase === 'ended' ? 'Start another check-in' : 'Start simulated call'}</button> : <>
          <button onClick={interrupt} disabled={!speaking} aria-label="Stop speaking and interrupt"><Square/><span>Interrupt</span></button>
          <button onClick={listening ? stopRecognition : listen} disabled={speaking} className={listening ? 'active' : ''} aria-label={listening ? 'Stop listening' : 'Use microphone'}>{listening ? <MicOff/> : <Mic/>}<span>{listening ? 'Stop listening' : 'Speak'}</span></button>
          <button onClick={replay} disabled={speaking || !conversation.lastAssistant} aria-label="Replay last response"><Volume2/><span>Replay</span></button>
          <button className="vg-end" onClick={endCall} aria-label="End simulated call"><PhoneOff/><span>End</span></button>
        </>}
      </div>
      <p className="vg-privacy"><RotateCcw/> Microphone starts only when you tap Speak. Speech recognition depends on browser support and may use browser services. No recording is stored by this app.</p>
    </div>
  </main>;
}
