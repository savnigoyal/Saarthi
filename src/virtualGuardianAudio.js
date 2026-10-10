import { PERSONAS } from './virtualGuardianConversation';

const intents = ['greeting', 'ask-boarding', 'ask-destination', 'ask-eta', 'ask-location-sharing', 'acknowledge-answer', 'delayed-journey', 'reassurance', 'follow-up', 'farewell', 'safety-check-in'];
// These are expected clip paths. A clip is used only after it successfully loads.
export const AUDIO_MANIFEST = Object.fromEntries(PERSONAS.map(({ id }) => [id, Object.fromEntries(intents.map(intent => [intent, `/audio/virtual-guardian/${id}/${intent}.mp3`]))]));

let activeAudio = null;
export function stopGuardianAudio() {
  if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null; }
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

export function speakGuardianText(text, personaId, intent = 'follow-up') {
  stopGuardianAudio();
  return new Promise(resolve => {
    const clip = AUDIO_MANIFEST[personaId]?.[intent];
    if (clip) {
      const audio = new Audio(clip);
      activeAudio = audio;
      audio.onended = () => { if (activeAudio === audio) activeAudio = null; resolve({ mode: 'clip' }); };
      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        speakWithSynthesis(text, personaId).then(resolve);
      };
      audio.play().catch(() => {
        if (activeAudio === audio) activeAudio = null;
        speakWithSynthesis(text, personaId).then(resolve);
      });
      return;
    }
    const endpoint = import.meta.env.VITE_GUARDIAN_TTS_ENDPOINT;
    if (endpoint) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, persona: personaId, intent }) })
        .then(response => { if (!response.ok) throw new Error(`TTS service returned ${response.status}.`); return response.blob(); })
        .then(blob => {
          const audio = new Audio(URL.createObjectURL(blob)); activeAudio = audio;
          const cleanup = () => { URL.revokeObjectURL(audio.src); if (activeAudio === audio) activeAudio = null; };
          audio.onended = () => { cleanup(); resolve({ mode: 'external' }); };
          audio.onerror = () => { cleanup(); speakWithSynthesis(text, personaId).then(result => resolve(result.error ? { ...result, error: `Configured TTS failed. ${result.error}` } : result)); };
          audio.play().catch(() => { cleanup(); speakWithSynthesis(text, personaId).then(resolve); });
        })
        .catch(() => speakWithSynthesis(text, personaId).then(result => resolve(result.error ? { ...result, error: `Configured TTS failed. ${result.error}` } : result)));
      return;
    }
    speakWithSynthesis(text, personaId).then(resolve);
  });
}

function speakWithSynthesis(text, personaId) {
  if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve({ mode: 'text', error: 'Speech synthesis is unavailable.' });
  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = PERSONAS.find(persona => persona.id === personaId)?.voice || 'en-IN';
    utterance.rate = 0.94;
    utterance.onend = () => resolve({ mode: 'speech' });
    utterance.onerror = event => resolve({ mode: 'text', error: event.error || 'Speech playback failed.' });
    try { window.speechSynthesis.speak(utterance); } catch { resolve({ mode: 'text', error: 'Speech playback failed.' }); }
  });
}
