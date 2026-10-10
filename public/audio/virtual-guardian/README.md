# Virtual Guardian audio clips

No recordings are included yet. The app checks for a clip and falls back to browser speech synthesis when a clip is missing; a missing file is never presented as a recording.

## Add recordings

Create one MP3 per persona and intent using these paths:

```text
public/audio/virtual-guardian/{papa|mummy|brother|friend}/{intent}.mp3
```

Intent filenames are `greeting`, `ask-boarding`, `ask-destination`, `ask-eta`, `ask-location-sharing`, `acknowledge-answer`, `delayed-journey`, `reassurance`, `follow-up`, `farewell`, and `safety-check-in`. The manifest is in `src/virtualGuardianAudio.js`. Keep clips short, clearly spoken, and at a consistent volume. Use Hindi/Hinglish for Papa, Mummy, and Elder Brother; English or Hinglish works for Trusted Friend. Only add recordings you have permission to use.

## Suggested recording scripts

| Intent | Papa / Mummy | Elder Brother | Trusted Friend |
|---|---|---|---|
| greeting | Hello beta, cab mein baith gayi? | Hey, cab mein baith gayi? | Hey, cab mein safely baith gaye? |
| ask-boarding | Cab mein baith gayi beta? | Cab mil gayi? | Did you get into the cab? |
| ask-destination | Kahan ja rahi ho beta? | Kahan jaana hai? | Where are you headed? |
| ask-eta | Ghar pahunchne mein kitni der lagegi? | Kitni der aur lagegi? | How long until you get there? |
| ask-location-sharing | Journey details kisi trusted person ko share kar dena. | Location kisi apne ko bhej dena. | Share your trip details with someone you trust. |
| acknowledge-answer | Achha beta, theek hai. | Haan, samajh gaya. | Okay, got it. |
| delayed-journey | Koi baat nahi, dhyan se jaana. | Traffic hai? Dhyan rakhna. | No worries. Take your time and stay aware. |
| reassurance | Theek hai beta, main sun raha hoon. | Theek, batao kya hua. | I hear you. Tell me what’s going on. |
| follow-up | Ek baar phir bataoge beta? | Sorry, phir se bolna. | Sorry, could you say that again? |
| farewell | Pahunch kar message kar dena beta. | Pahunch ke text kar dena. | Message me when you arrive, okay? |
| safety-check-in | Unsafe lag raha hai? Emergency options kholo. | Unsafe feel ho toh safety options kholo. | If you feel unsafe, open your emergency options now. |

Dynamic answers such as a user-provided ETA are spoken from the generated response text through browser SpeechSynthesis. The app does not claim a matching prerecorded response exists.

## Optional server TTS

The app makes no provider request unless `VITE_GUARDIAN_TTS_ENDPOINT` is configured. Point it at your own HTTPS backend endpoint in the app's `.env.local`. The endpoint receives JSON `{ "text", "persona", "intent" }` and should return playable audio bytes with an audio content type. Keep provider credentials on that server; never put provider keys in a `VITE_` variable. If the endpoint fails, browser SpeechSynthesis is used. No TTS backend or LLM is included in this frontend-only project, and no provider is configured by default.

Speech recognition and SpeechSynthesis depend on browser and operating-system support. Recognition may send audio to a browser vendor's service; the app itself does not store recordings. Use the typed reply control when speech recognition is unavailable or denied.
