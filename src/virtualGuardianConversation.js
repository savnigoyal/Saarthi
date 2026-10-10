export const PERSONAS = [
  { id: 'papa', name: 'Papa', relation: 'Dad', avatar: '👨🏽', voice: 'hi-IN' },
  { id: 'mummy', name: 'Mummy', relation: 'Mom', avatar: '👩🏽', voice: 'hi-IN' },
  { id: 'brother', name: 'Elder Brother', relation: 'Brother', avatar: '🧑🏽', voice: 'hi-IN' },
  { id: 'friend', name: 'Trusted Friend', relation: 'Friend', avatar: '🧑🏻', voice: 'en-IN' },
];

const lines = {
  papa: {
    greeting: 'Hello beta, cab mein baith gayi?', askEta: 'Achha beta, ghar pahunchne mein kitni der aur lagegi?',
    location: 'Apni journey details kisi trusted person ke saath share kar dena.', delayed: 'Achha, koi baat nahi. Kitni der aur lag sakti hai? Dhyan se jaana.',
    reassure: 'Theek hai beta. Agar unsafe feel ho toh abhi emergency options dekho.', farewell: 'Theek hai beta, pahunch kar message kar dena.',
  },
  mummy: {
    greeting: 'Hello beta, cab mein baith gayi?', askEta: 'Achha beta, ghar pahunchne mein kitni der aur lagegi?',
    location: 'Apni journey details kisi trusted person ke saath share kar dena.', delayed: 'Koi baat nahi beta. Traffic hai? Dhyan se jaana.',
    reassure: 'Theek hai beta. Agar unsafe feel ho toh abhi emergency options dekho.', farewell: 'Pahunch kar mujhe message kar dena, beta.',
  },
  brother: {
    greeting: 'Hey, cab mein baith gayi?', askEta: 'Theek, aur kitni der lagegi pahunchne mein?',
    location: 'Journey details kisi trusted person ko share kar dena.', delayed: 'No worries. Traffic slow hai kya? Dhyan se jaana.',
    reassure: 'Samajh gaya. Unsafe lag raha hai toh emergency options khol sakte ho.', farewell: 'Pahunch ke text kar dena.',
  },
  friend: {
    greeting: 'Hey, cab mein safely baith gaye?', askEta: 'Got it. How long until you get there?',
    location: 'Share your journey details with someone you trust when you can.', delayed: 'No worries. How much longer do you think it will take?',
    reassure: 'I hear you. If you feel unsafe, you can open the emergency options now.', farewell: 'Message me when you arrive, okay?',
  },
};

export function createConversation(personaId) {
  return { persona: personaId, stage: 'boarding', lastQuestion: 'boarding', lastAssistant: '', boarding: null, destination: '', eta: '', requestedReminder: false, ended: false, unsafe: false };
}

const ack = (persona, index) => (persona === 'friend' ? ['Okay, got it.', 'Thanks for letting me know.'][index % 2] : ['Achha, theek hai.', 'Samajh gaya beta.'][index % 2]);

export function respondToUser(state, input, turn = 0) {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (!text) return { state, intent: 'follow-up', text: 'Sorry, mujhe sunai nahi diya. Ek baar phir bataoge?' };
  if (/\b(unsafe|not safe|scared|danger|help me|threat|following me|uncomfortable|unsafe feel|darr|dar lag|khatra|madad)\b/i.test(lower)) {
    const next = { ...state, unsafe: true, lastAssistant: '' };
    return { state: next, intent: 'safety-check-in', text: 'I’m sorry this feels unsafe. This is only a simulated call. You can open the existing safety screen for emergency options, or choose a trusted contact there.' , safety: true };
  }
  if (/\b(stop|hang up|end call|bye|goodbye|band karo|call kaato)\b/i.test(lower)) return { state: { ...state, ended: true }, intent: 'farewell', text: lines[state.persona].farewell };

  const next = { ...state };
  let reply;
  if (state.lastQuestion === 'boarding' && /\b(yes|yeah|yep|haan|ha|baith|inside|in the cab|got in|cab mein)\b/i.test(lower)) {
    next.boarding = true; next.stage = 'eta'; next.lastQuestion = 'eta';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].askEta}`;
  } else if (state.lastQuestion === 'boarding' && /\b(no|not yet|abhi nahi|nahi|waiting|wait kar)\b/i.test(lower)) {
    next.boarding = false; next.stage = 'boarding'; next.lastQuestion = 'boarding';
    reply = `${ack(state.persona, turn)} Koi baat nahi. Cab aa jaaye toh bata dena. Driver details kisi trusted person ke saath share kar lena.`;
  } else if (state.lastQuestion === 'eta' && /\b(?:\d+|[a-z]+(?:[- ][a-z]+)?)\s*(?:min|minute|minutes|hour|hours|hr|ghante)\b/i.test(lower)) {
    next.eta = text; next.stage = 'location'; next.lastQuestion = 'location';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].location}`;
  } else if (/\b(traffic|delay|late|stuck|slow|jam|deri|late ho|zyada time)\b/i.test(lower)) {
    next.lastQuestion = 'eta'; next.stage = 'eta';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].delayed}`;
  } else if (/\b(share|shared|location|sent|bhej|share kar)\b/i.test(lower)) {
    next.requestedReminder = true; next.lastQuestion = 'open'; next.stage = 'check-in';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].farewell}`;
  } else if (state.lastQuestion === 'eta' && /\b(home|hostel|office|school|destination|ghar|hostel|airport)\b/i.test(lower)) {
    next.destination = text; next.lastQuestion = 'eta';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].askEta}`;
  } else if (state.lastQuestion === 'location' || state.lastQuestion === 'open') {
    next.lastQuestion = 'open'; next.stage = 'check-in';
    reply = `${ack(state.persona, turn)} ${lines[state.persona].farewell}`;
  } else {
    reply = state.lastQuestion === 'eta'
      ? 'Sorry, kitni der lagegi pahunchne mein? Aap minutes ya hours mein bata sakte ho.'
      : 'Sorry, samajh nahi aaya. Aap cab mein baith gaye ho?';
  }
  next.lastAssistant = reply;
  return { state: next, intent: next.lastQuestion === 'eta' ? 'ask-eta' : next.stage === 'location' ? 'ask-location-sharing' : 'acknowledge-answer', text: reply };
}

export function getOpening(personaId) { return lines[personaId].greeting; }
