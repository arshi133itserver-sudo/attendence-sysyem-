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

// Global voice cache to solve async loading in Chrome & Android tablets
let cachedVoices = [];
function updateCachedVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const list = window.speechSynthesis.getVoices() || [];
    if (list.length > 0) {
      cachedVoices = list;
    }
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateCachedVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    updateCachedVoices();
  };
}

/**
 * Score and rank a voice for human sweetness, Indian warmth & Jarvis clarity
 * Higher score = more human-like, natural, and fitting for selected style.
 */
function scoreVoice(v, targetStyle = '') {
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

  // Style specific scoring:
  if (targetStyle === 'jarvis_hindi') {
    // JARVIS AI (Indian Male, calm, baritone)
    if (name.includes('madhur')) score += 70; // Microsoft Madhur (Hindi Natural Male)
    if (name.includes('prabhat')) score += 65; // Microsoft Prabhat (English India Male)
    if (name.includes('ravi') || name.includes('neil')) score += 50;
    if (name.includes('male') || name.includes('man') || name.includes('guy')) score += 40;
    if (name.includes('female') || name.includes('woman') || name.includes('girl')) score -= 50;
  } else {
    // Sweet Indian Female (Default / Sweet Hindi / Sweet Hinglish)
    if (name.includes('swara')) score += 70;  // Microsoft Swara (Hindi Natural Female - Sweetest)
    if (name.includes('neerja')) score += 65; // Microsoft Neerja (English India Natural Female)
    if (name.includes('heera')) score += 55;
    if (name.includes('jenny')) score += 50;
    if (name.includes('aria')) score += 45;
    if (name.includes('zira')) score += 35;
    if (name.includes('samantha')) score += 30;
    if (name.includes('female') || name.includes('woman')) score += 35;
    if (name.includes('male') || name.includes('david') || name.includes('mark')) score -= 40;
  }

  // Google / Samsung Indian Voices on Android tablets
  if (name.includes('google')) score += 35;
  if (name.includes('samsung')) score += 25;

  // Language bonuses - prefer Indian Hindi and Indian English
  if (lang.startsWith('hi')) score += 45;
  else if (lang.startsWith('en-in')) score += 40;
  else if (lang.startsWith('en')) score += 15;

  return score;
}

/**
 * Returns all available browser voices, sorted from sweetest/most human to robotic
 */
export function getAvailableVoices(targetStyle = '') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = (cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices()) || [];
  if (voices.length > 0) cachedVoices = voices;
  return [...voices].sort((a, b) => scoreVoice(b, targetStyle) - scoreVoice(a, targetStyle));
}

/**
 * Resolves the active voice to use
 */
export function getResolvedVoice(preferredStyle = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = (cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices()) || [];
  if (voices.length === 0) return null;

  const settings = getVoiceSettings();
  const currentStyle = preferredStyle || settings.style || 'sweet_hinglish';

  // 1. User chosen voice
  if (settings.voiceName) {
    const chosen = voices.find(v => v.name === settings.voiceName);
    if (chosen) return chosen;
  }

  // 2. Pick top-ranked sweet / Jarvis voice based on current style
  const sorted = [...voices].sort((a, b) => scoreVoice(b, currentStyle) - scoreVoice(a, currentStyle));
  return sorted[0] || voices[0];
}

/**
 * Get current hour strictly in Indian Standard Time (IST - Asia/Kolkata)
 */
export function getIstHour(date = new Date()) {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    }).format(date);
    return parseInt(hourStr, 10);
  } catch (e) {
    return date.getHours();
  }
}

/**
 * Helper to determine time-of-day greeting
 */
export function getTimeGreeting(hour = null) {
  const h = (hour !== null && hour !== undefined) ? hour : getIstHour();
  if (h >= 4 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 22) return 'Good Evening';
  return 'Welcome';
}

/**
 * Build sweet, respectful, human greeting text based on user preference
 */
export function generateGreetingText(staffName, scanType = 'IN', options = {}) {
  const cleanName = (staffName || 'Staff Member').trim();
  const hour = getIstHour();
  const settings = getVoiceSettings();
  const style = options.style || settings.style;
  const punchTime = options.time || new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date());

  const activeVoice = getResolvedVoice();
  const isHindiVoice = activeVoice && (activeVoice.lang.startsWith('hi') || activeVoice.name.toLowerCase().includes('hindi') || activeVoice.name.toLowerCase().includes('swara'));

  if (scanType === 'IN') {
    // 1. JARVIS AI (Calm, baritone, respectful Hindi)
    if (style === 'jarvis_hindi') {
      let timeHindi = 'शुभ प्रभात';
      if (hour >= 12 && hour < 17) timeHindi = 'शुभ दोपहर';
      else if (hour >= 17) timeHindi = 'शुभ संध्या';

      return `नमस्ते ${cleanName}! ${timeHindi}। आर्शी एंटरप्राइजेज में आपका स्वागत है। आपकी एंट्री समय पर दर्ज हो चुकी है। हैव अ प्रोडक्टिव डे।`;
    }

    // 2. Sweet & Lovely Hindi (Warm, pyari, respectful)
    if (style === 'sweet_hindi' || style === 'pure_hindi') {
      let timeHindi = 'शुभ प्रभात';
      if (hour >= 12 && hour < 17) timeHindi = 'शुभ दोपहर';
      else if (hour >= 17) timeHindi = 'शुभ संध्या';

      return `नमस्ते ${cleanName} जी! ${timeHindi}। आर्शी एंटरप्राइजेज में आपका बहुत-बहुत स्वागत है। आपका दिन बहुत शुभ और प्यारा हो!`;
    }

    // 3. Sweet Hinglish (Friendly Indian Corporate)
    if (style === 'sweet_hinglish') {
      let timeWord = 'Good morning';
      if (hour >= 12 && hour < 17) timeWord = 'Good afternoon';
      else if (hour >= 17) timeWord = 'Good evening';

      return `Welcome, ${cleanName} ji! Wishing you a very ${timeWord}. Your entry is marked at ${punchTime}. Have a happy and productive day at Arshi Enterprises!`;
    }

    // 4. Default: Sweet Polite English
    let timeWord = 'Good morning';
    if (hour >= 12 && hour < 17) timeWord = 'Good afternoon';
    else if (hour >= 17) timeWord = 'Good evening';

    return `Welcome, ${cleanName}! Wishing you a wonderful ${timeWord}. Your entry is registered at ${punchTime}. Have a great day at Arshi Enterprises!`;
  } else {
    // Checkout (Clock Out)
    // 1. JARVIS AI
    if (style === 'jarvis_hindi') {
      const hrsText = options.totalHours ? ` आज का कुल कार्य समय: ${options.totalHours}।` : '';
      const exitWish = hour >= 18 ? 'शुभ रात्रि, अपना ख्याल रखें।' : (hour >= 12 ? 'शुभ दोपहर, आपका समय मंगलमय हो।' : 'अलविदा!');
      return `धन्यवाद ${cleanName}! चेकआउट सफल रहा।${hrsText} ${exitWish}`;
    }

    // 2. Sweet & Lovely Hindi
    if (style === 'sweet_hindi' || style === 'pure_hindi') {
      const hrsText = options.totalHours ? ` आज आपने ${options.totalHours} काम किया।` : '';
      const exitWish = hour >= 18 ? 'शुभ रात्रि, अपना अच्छे से ख्याल रखिएगा!' : 'आपका दिन बहुत अच्छा रहे!';
      return `बहुत-बहुत धन्यवाद ${cleanName} जी! आपका चेकआउट पूरा हो गया है।${hrsText} ${exitWish}`;
    }

    // 3. Sweet Hinglish
    if (style === 'sweet_hinglish') {
      const exitWish = hour >= 18 ? 'Wishing you a peaceful evening and a good night!' : (hour >= 12 ? 'Have a wonderful afternoon!' : 'Have a wonderful day!');
      const hrsText = options.totalHours ? ` Total duty time today: ${options.totalHours}.` : '';
      return `Thank you so much, ${cleanName} ji! Checkout successful at ${punchTime}.${hrsText} ${exitWish} Take care, and goodbye!`;
    }

    // 4. Default: Sweet Polite English
    const exitWish = hour >= 18 ? 'Wishing you a relaxing evening!' : (hour >= 12 ? 'Have a wonderful afternoon!' : 'Have a wonderful day!');
    const hrsText = options.totalHours ? ` Total working hours: ${options.totalHours}.` : '';
    return `Thank you, ${cleanName}! Checkout successful at ${punchTime}.${hrsText} ${exitWish} Take care, and goodbye!`;
  }
}

/**
 * Unlock SpeechSynthesis and Web Audio on Tablets & Mobile Browsers
 * Must be triggered on user interaction (touch/click) to bypass autoplay restrictions.
 */
export function unlockSpeechSynthesis() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Resume Web AudioContext if available
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }

    // 2. Resume & unpause speechSynthesis
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Speak a silent micro-utterance to prime the browser TTS engine
      const dummy = new SpeechSynthesisUtterance(' ');
      dummy.volume = 0.01;
      dummy.rate = 1.0;
      window._unlockUtterance = dummy;
      dummy.onend = () => { window._unlockUtterance = null; };
      dummy.onerror = () => { window._unlockUtterance = null; };
      window.speechSynthesis.speak(dummy);
    }
  } catch (e) {
    console.warn('Could not unlock speech synthesis:', e);
  }
}

/**
 * Speak greeting aloud with gentle, natural, human pacing
 */
export function speakStaffGreeting(staffName, scanType = 'IN', options = {}) {
  if (!isVoiceGreetingEnabled()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // Unpause if stalled on Android Chrome
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
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
      utterance.lang = voice.lang || 'en-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    // Protect from Chromium / Android garbage collection bug
    window._activeStaffUtterance = utterance;
    utterance.onend = () => {
      window._activeStaffUtterance = null;
    };
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis utterance event:', e);
      window._activeStaffUtterance = null;
    };

    // Small delay so cancel() clears queue before speak()
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak execution error:', err);
      }
    }, 40);
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
