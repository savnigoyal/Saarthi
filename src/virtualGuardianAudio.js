import safetyAudioUrl from '../safety_audio.mp4';

let activeAudio = null;

export function stopGuardianAudio() {
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

// Use the recording supplied with the app for every guardian audio prompt.
// The conversation captions still provide the text for each individual reply.
export function speakGuardianText() {
  stopGuardianAudio();

  return new Promise(resolve => {
    const audio = new Audio(safetyAudioUrl);
    activeAudio = audio;

    const finish = result => {
      if (activeAudio === audio) activeAudio = null;
      resolve(result);
    };

    audio.onended = () => finish({ mode: 'recording' });
    audio.onerror = () => finish({ mode: 'recording', error: 'The saved safety audio could not be played.' });
    audio.play().catch(() => finish({ mode: 'recording', error: 'The saved safety audio could not be played.' }));
  });
}
