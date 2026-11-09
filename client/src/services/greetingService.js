/**
 * Greeting & Voice Synthesis Service for Arshi Enterprises
 * Ultra-Natural, Sweet, Human-like Voice Synthesis
 */

const STORAGE_KEYS = {
  ENABLED: 'arshi_voice_greeting_enabled',
  VOICE_NAME: 'arshi_voice_selected_name',
  STYLE: 'arshi_voice_style', // 'sweet_hinglish' | 'sweet_english' | 'pure_hindi'
  RATE: 'arshi_voice_rate',   // 0.85 - 1.1
  PITCH: 'arshi_voice_pitch'  // 0.9 - 1.1
};

export function isVoiceGreetingEnabled() {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ENABLED);
    if (val !== null) return val === 'true';
  } catch (e) {}
  return true;
}

export function setVoiceGreetingEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.ENABLED, enabled ? 'true' : 'false');
  } catch (e) {}
}

export function getVoiceSettings() {
  try {
    return {
      voiceName: localStorage.getItem(STORAGE_KEYS.VOICE_NAME) || '',
      style: localStorage.getItem(STORAGE_KEYS.STYLE) || 'sweet_hinglish',
      rate: parseFloat(localStorage.getItem(STORAGE_KEYS.RATE)) || 0.90,
      pitch: parseFloat(localStorage.getItem(STORAGE_KEYS.PITCH)) || 1.0
    };
  } catch (e) {
    return { voiceName: '', style: 'sweet_hinglish', rate: 0.90, pitch: 1.0 };
  }
}

export function saveVoiceSettings(settings = {}) {
  try {
    if (settings.voiceName !== undefined) localStorage.setItem(STORAGE_KEYS.VOICE_NAME, settings.voiceName);
    if (settings.style !== undefined) localStorage.setItem(STORAGE_KEYS.STYLE, settings.style);
    if (settings.rate !== undefined) localStorage.setItem(STORAGE_KEYS.RATE, String(settings.rate));
    if (settings.pitch !== undefined) localStorage.setItem(STORAGE_KEYS.PITCH, String(settings.pitch));
  } catch (e) {}
}

/**
 * Score and rank a voice for human sweetness & natural warmth
 * Higher score = more human-like, sweeter, less robotic.
 */
function scoreVoice(v) {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();

  let score = 50;

  // Heavily penalize infamous robotic legacy SAPI voices
  if (name.includes('david')) score -= 40;
  if (name.includes('mark')) score -= 35;
  if (name.includes('desktop')) score -= 20;
  if (name.includes('sam')) score -= 30;

  // Heavily reward Natural / Neural online voices
  if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 50;

  // Reward sweet female & warm Indian voices
  if (name.includes('zira')) score += 35;
  if (name.includes('jenny')) score += 45;
  if (name.includes('aria')) score += 40;
  if (name.includes('neerja')) score += 45;
  if (name.includes('swara')) score += 45;
  if (name.includes('heera')) score += 35;
  if (name.includes('samantha')) score += 30;
  if (name.includes('victoria')) score += 25;
  if (name.includes('karen')) score += 25;
  if (name.includes('google')) score += 25;

  // Language bonuses
  if (lang.startsWith('en-in') || lang.startsWith('hi')) score += 25;
  else if (lang.startsWith('en')) score += 15;

  if (name.includes('female')) score += 20;

  return score;
}

/**
 * Returns all available browser voices, sorted from sweetest/most human to robotic
 */
export function getAvailableVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

/**
 * Resolves the active voice to use
 */
export function getResolvedVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const settings = getVoiceSettings();

  // 1. User chosen voice
  if (settings.voiceName) {
    const chosen = voices.find(v => v.name === settings.voiceName);
    if (chosen) return chosen;
  }

  // 2. Pick top-ranked sweet voice
  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || voices[0];
}

/**
 * Helper to determine time-of-day greeting
 */
export function getTimeGreeting(hour = new Date().getHours()) {
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Welcome';
}

/**
 * Build sweet, respectful, human greeting text based on user preference
 */
export function generateGreetingText(staffName, scanType = 'IN', options = {}) {
  const cleanName = (staffName || 'Staff Member').trim();
  const hour = new Date().getHours();
  const settings = getVoiceSettings();
  const style = options.style || settings.style;
  const punchTime = options.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const activeVoice = getResolvedVoice();
  const isHindiVoice = activeVoice && (activeVoice.lang.startsWith('hi') || activeVoice.name.toLowerCase().includes('hindi') || activeVoice.name.toLowerCase().includes('swara'));

  if (scanType === 'IN') {
    // Check-in (Welcome)
    if (style === 'pure_hindi' && isHindiVoice) {
      let timeHindi = 'शुभ प्रभात';
      if (hour >= 12 && hour < 17) timeHindi = 'शुभ दोपहर';
      else if (hour >= 17) timeHindi = 'शुभ संध्या';

      return `नमस्ते ${cleanName} जी! ${timeHindi}, आर्शी एंटरप्राइजेज में आपका हार्दिक स्वागत है। आपका दिन शुभ और मंगलमय हो!`;
    }

    if (style === 'sweet_hinglish') {
      let timeWord = 'Good morning';
      if (hour >= 12 && hour < 17) timeWord = 'Good afternoon';
      else if (hour >= 17) timeWord = 'Good evening';

      return `Welcome, ${cleanName} ji! Wishing you a very ${timeWord}. Your entry is marked at ${punchTime}. Have a happy and productive day at Arshi Enterprises!`;
    }

    // Default: Sweet Polite English
    let timeWord = 'Good morning';
    if (hour >= 12 && hour < 17) timeWord = 'Good afternoon';
    else if (hour >= 17) timeWord = 'Good evening';

    return `Welcome, ${cleanName}! Wishing you a wonderful ${timeWord}. Your entry is registered at ${punchTime}. Have a great day at Arshi Enterprises!`;
  } else {
    // Checkout (Check-out)
    if (style === 'pure_hindi' && isHindiVoice) {
      return `धन्यवाद ${cleanName} जी! आपका चेकआउट सफल रहा। शुभ संध्या, अपना ख्याल रखें, अलविदा!`;
    }

    if (style === 'sweet_hinglish') {
      const exitWish = hour >= 18 ? 'Wishing you a peaceful evening and a good night!' : (hour >= 12 ? 'Have a wonderful afternoon!' : 'Have a wonderful day!');
      const hrsText = options.totalHours ? ` Total duty time today: ${options.totalHours}.` : '';
      return `Thank you so much, ${cleanName} ji! Checkout successful at ${punchTime}.${hrsText} ${exitWish} Take care, and goodbye!`;
    }

    // Default: Sweet Polite English
    const exitWish = hour >= 18 ? 'Wishing you a relaxing evening!' : (hour >= 12 ? 'Have a wonderful afternoon!' : 'Have a wonderful day!');
    const hrsText = options.totalHours ? ` Total working hours: ${options.totalHours}.` : '';
    return `Thank you, ${cleanName}! Checkout successful at ${punchTime}.${hrsText} ${exitWish} Take care, and goodbye!`;
  }
}

/**
 * Speak greeting aloud with gentle, natural, human pacing
 */
export function speakStaffGreeting(staffName, scanType = 'IN', options = {}) {
  if (!isVoiceGreetingEnabled()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const settings = getVoiceSettings();
    const textToSpeak = options.customSpokenText || generateGreetingText(staffName, scanType, options);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Warm, gentle human cadence (0.90 speed sounds calm and polite, not robotic)
    utterance.rate = options.rate !== undefined ? options.rate : settings.rate;
    utterance.pitch = options.pitch !== undefined ? options.pitch : settings.pitch;
    utterance.volume = 1.0;

    const voice = getResolvedVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Speech synthesis error:', err);
  }
}

/**
 * Quick preview / test of the configured voice
 */
export function testVoiceGreeting(customOptions = {}) {
  speakStaffGreeting('Parbhat', 'IN', {
    ...customOptions,
    customSpokenText: customOptions.text || undefined
  });
}
