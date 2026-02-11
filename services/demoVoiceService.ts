/**
 * ═══════════════════════════════════════════════════════════
 * DEMO VOICE SERVICE – Text-to-Speech for guided demo
 * ═══════════════════════════════════════════════════════════
 *
 * Primary: ElevenLabs API (high-quality, natural voices)
 * Fallback: Web Speech API (free, no API key needed)
 *
 * This file is ONLY used for the demo walkthrough.
 * Safe to delete without affecting the rest of the app.
 * ═══════════════════════════════════════════════════════════
 */

// ── Types ──────────────────────────────────────────────────

type VoiceRole = 'bot' | 'user';

// ── State ──────────────────────────────────────────────────

let muted = false;
let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;
let englishVoices: SpeechSynthesisVoice[] = [];
let elevenLabsAuthInvalid = false;
let elevenLabsBackoffUntil = 0;
let lastKnownElevenLabsKey: string | undefined;
let unlockAudioCtx: AudioContext | null = null;

// ── ElevenLabs Config ──────────────────────────────────────

// Default voice IDs (ElevenLabs premade voices)
// Bot: "Sarah" (female, warm, confident) / User: "Daniel" (male, british, Jarvis-style)
const ELEVENLABS_VOICES: Record<VoiceRole, string> = {
  bot: 'EXAVITQu4vr4xnSDxMaL',   // Sarah
  user: 'JBFqnCBsd6RMkjVDRZzb',  // George (Jarvis-style customer voice)
};

const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';
const ELEVENLABS_TEMP_BACKOFF_MS = 10000;

const getElevenLabsKey = (): string | undefined => {
  try {
    return (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || undefined;
  } catch {
    return undefined;
  }
};

const resetElevenLabsHealth = () => {
  elevenLabsAuthInvalid = false;
  elevenLabsBackoffUntil = 0;
};

const syncElevenLabsKey = (key: string | undefined) => {
  if (!key) return;
  if (lastKnownElevenLabsKey !== key) {
    lastKnownElevenLabsKey = key;
    resetElevenLabsHealth();
  }
};

const shouldBypassElevenLabs = () =>
  elevenLabsAuthInvalid || Date.now() < elevenLabsBackoffUntil;

const markElevenLabsFailure = (status?: number) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:markElevenLabsFailure',message:'ElevenLabs failure marked',data:{status,willSetAuthInvalid:status===401||status===403,backoffMs:ELEVENLABS_TEMP_BACKOFF_MS},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  // 401 (Unauthorized), 403 (Forbidden) = permanent for this session
  if (status === 401 || status === 403) {
    elevenLabsAuthInvalid = true;
    return;
  }
  // 402: do NOT set backoff so next message retries ElevenLabs (avoids "only first message ElevenLabs" when first request gets 402)
  if (status === 402) return;
  // 429, 500, network = temporary backoff
  elevenLabsBackoffUntil = Date.now() + ELEVENLABS_TEMP_BACKOFF_MS;
};

// ── Public API ─────────────────────────────────────────────

export const setMuted = (value: boolean) => { muted = value; };
export const isMuted = (): boolean => muted;
export const primeAudioPlayback = () => {
  try {
    // Warm up speech voices early while a user gesture is available.
    window.speechSynthesis?.getVoices();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!unlockAudioCtx) unlockAudioCtx = new AudioCtx();
      if (unlockAudioCtx.state === 'suspended') {
        unlockAudioCtx.resume().catch(() => undefined);
      }
      const osc = unlockAudioCtx.createOscillator();
      const gain = unlockAudioCtx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain).connect(unlockAudioCtx.destination);
      osc.start();
      osc.stop(unlockAudioCtx.currentTime + 0.01);
    }

    // Prime HTMLAudio playback path for stricter autoplay browsers.
    const unlockAudio = new Audio('/reactor_startup.mp3');
    unlockAudio.preload = 'auto';
    unlockAudio.volume = 0;
    unlockAudio.play()
      .then(() => {
        unlockAudio.pause();
        unlockAudio.currentTime = 0;
      })
      .catch(() => undefined);
  } catch {
    // Ignore priming failures; regular playback path still handles fallbacks.
  }
};

/**
 * Initialize voices (for Web Speech API fallback).
 * Call once on mount. Resolves when voices are available.
 */
export const initVoices = (): Promise<void> => {
  return new Promise((resolve) => {
    if (voicesLoaded) { resolve(); return; }

    const loadVoices = () => {
      const all = window.speechSynthesis?.getVoices() || [];
      englishVoices = all.filter(v => v.lang.startsWith('en'));
      if (englishVoices.length === 0) englishVoices = all.slice(0, 2);
      voicesLoaded = true;
      resolve();
    };

    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        // Timeout fallback in case onvoiceschanged never fires
        setTimeout(loadVoices, 2000);
      }
    } else {
      resolve(); // No speech synthesis available
    }
  });
};

/**
 * Speak text using ElevenLabs (primary) or Web Speech API (fallback).
 * Returns a Promise that resolves when speaking is done.
 */
export const speakText = async (
  text: string,
  role: VoiceRole,
  signal?: AbortSignal
): Promise<void> => {
  if (muted || !text.trim()) return;
  if (signal?.aborted) return;

  // Clean text for TTS
  const cleanText = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[✅❌⚙️🔗🎬📤📊🔍📋📧⏭️🟠☁️📥👋]/g, '')
    .trim();

  if (!cleanText) return;

  const elevenLabsKey = getElevenLabsKey();
  syncElevenLabsKey(elevenLabsKey);
  const bypass = shouldBypassElevenLabs();
  const useEleven = !!elevenLabsKey && !bypass;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:speakText',message:useEleven?'Using ElevenLabs':'Using WebSpeech',data:{role,hasKey:!!elevenLabsKey,bypass,reason:!elevenLabsKey?'noKey':bypass?'bypass':'elevenLabs'},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  if (elevenLabsKey && !bypass) {
    return speakElevenLabs(cleanText, role, elevenLabsKey, signal);
  } else {
    return speakWebSpeech(cleanText, role, signal);
  }
};

/**
 * Cancel any currently playing speech.
 */
export const cancelSpeech = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentUtterance && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

// ── Audio Prefetch Cache ────────────────────────────────────

const audioCache = new Map<string, Promise<Blob | null>>();

/**
 * Pre-generate audio and store in cache. Returns a promise for the blob.
 * Call this early (e.g. during typing indicator) so audio is ready when needed.
 */
export const prefetchAudio = (text: string | undefined, role: VoiceRole): Promise<Blob | null> => {
  if (!text || muted) return Promise.resolve(null);
  
  const cleanText = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[✅❌⚙️🔗🎬📤📊🔍📋📧⏭️🟠☁️📥👋🤖😄]/g, '')
    .trim();
  if (!cleanText) return Promise.resolve(null);
  
  const cacheKey = `${role}:${cleanText}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;
  
  const elevenLabsKey = getElevenLabsKey();
  syncElevenLabsKey(elevenLabsKey);
  const bypass = shouldBypassElevenLabs();
  if (!elevenLabsKey || bypass) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:prefetchAudio',message:'Prefetch skip returning null',data:{role,hasKey:!!elevenLabsKey,bypass},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return Promise.resolve(null);
  }
  
  const voiceId = ELEVENLABS_VOICES[role];
  const promise = fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsKey },
      body: JSON.stringify({
        text: cleanText,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: role === 'bot' ? 0.75 : 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  ).then(r => {
    if (!r.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:prefetchAudio.then',message:'Prefetch response not ok',data:{status:r.status,role},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      markElevenLabsFailure(r.status);
      if (r.status === 401) {
        console.warn('ElevenLabs auth problem during prefetch (401). Switching demo voice to Web Speech.');
      } else {
        console.warn(`ElevenLabs prefetch temporary error (${r.status}). Using short fallback backoff.`);
      }
      return null;
    }
    elevenLabsBackoffUntil = 0;
    return r.blob();
  }).catch((err) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:prefetchAudio.catch',message:'Prefetch fetch failed',data:{role,err:String(err)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    markElevenLabsFailure();
    return null;
  });
  
  audioCache.set(cacheKey, promise);
  return promise;
};

/**
 * Play a pre-fetched audio blob. Returns when playback finishes.
 */
export const playAudioBlob = (blob: Blob | null, signal?: AbortSignal, role?: VoiceRole): Promise<void> => {
  if (!blob || muted) return Promise.resolve();
  if (signal?.aborted) return Promise.resolve();
  
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = role === 'bot' ? 0.5 : 1.0;
  currentAudio = audio;
  
  return new Promise<void>((resolve) => {
    const cleanup = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    const onAbort = () => { audio.pause(); audio.src = ''; cleanup(); };
    signal?.addEventListener('abort', onAbort, { once: true });
    audio.play().catch(cleanup);
  });
};

/** Clear the prefetch cache AND reset ElevenLabs health (call on demo stop / restart) */
export const clearAudioCache = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6433edd6-c072-4453-af26-f6668d6cdc52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'demoVoiceService.ts:clearAudioCache',message:'Cache cleared ElevenLabs reset',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  audioCache.clear();
  resetElevenLabsHealth();
};

/** Play a realistic keyboard click sound (synthetic, ~30ms). Respects muted state. */
let keyClickCtx: AudioContext | null = null;
export const playKeyClick = () => {
  if (muted) return;
  try {
    if (!keyClickCtx) keyClickCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = keyClickCtx;
    const t = ctx.currentTime;

    // Layer 1: Sharp click (noise-like)
    const bufSize = ctx.sampleRate * 0.012; // 12ms noise burst
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15)); // fast decay
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    // Bandpass filter for mechanical click character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000 + Math.random() * 2000, t);
    filter.Q.setValueAtTime(2, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08 + Math.random() * 0.03, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.03);

    // Layer 2: Subtle tonal tap
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 600, t);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.015, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.015);
  } catch { /* ignore audio errors */ }
};

// ── ElevenLabs Implementation ──────────────────────────────

const speakElevenLabs = async (
  text: string,
  role: VoiceRole,
  apiKey: string,
  signal?: AbortSignal
): Promise<void> => {
  const voiceId = ELEVENLABS_VOICES[role];

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: role === 'bot' ? 0.75 : 0.6,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
        signal,
      }
    );

    if (!response.ok) {
      markElevenLabsFailure(response.status);
      if (response.status === 401) {
        console.warn('ElevenLabs auth problem (401). Falling back to Web Speech.');
      } else {
        console.warn(`ElevenLabs temporary error (${response.status}). Falling back to Web Speech.`);
      }
      return speakWebSpeech(text, role, signal);
    }

    elevenLabsBackoffUntil = 0;
    const blob = await response.blob();
    if (signal?.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = role === 'bot' ? 0.5 : 1.0;
    currentAudio = audio;

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(url);
        currentAudio = null;
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = () => {
        console.warn('Audio playback error. Falling back to Web Speech.');
        cleanup();
      };

      const onAbort = () => {
        audio.pause();
        audio.src = '';
        cleanup();
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      audio.play().catch(() => {
        // Autoplay blocked — resolve silently
        cleanup();
      });
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    markElevenLabsFailure();
    console.warn('ElevenLabs request failed (temporary). Falling back to Web Speech.', err);
    return speakWebSpeech(text, role, signal);
  }
};

// ── Web Speech API Implementation ──────────────────────────

const speakWebSpeech = (
  text: string,
  role: VoiceRole,
  signal?: AbortSignal
): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    // Pick different voices for bot vs user
    if (englishVoices.length >= 2) {
      utterance.voice = role === 'bot' ? englishVoices[0] : englishVoices[1];
    } else if (englishVoices.length === 1) {
      utterance.voice = englishVoices[0];
    }

    // Differentiate by pitch, rate and volume
    if (role === 'bot') {
      utterance.pitch = 0.85;
      utterance.rate = 0.92;
      utterance.volume = 0.5;
    } else {
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      utterance.volume = 1.0;
    }

    utterance.lang = 'en-US';

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };
    utterance.onerror = () => {
      currentUtterance = null;
      resolve();
    };

    const onAbort = () => {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    window.speechSynthesis.speak(utterance);
  });
};

// ── Reactor Startup Sound (real MP3) ────────────────────────

export const playEngineSound = (signal?: AbortSignal): Promise<void> => {
  // Always play reactor sound regardless of mute (it's a sound effect, not voice)
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const audio = new Audio('/reactor_startup.mp3');
      audio.volume = 0.25; // 25% volume
      currentAudio = audio;

      const cleanup = () => {
        if (fadeInterval) clearInterval(fadeInterval);
        currentAudio = null;
        resolve();
      };

      // Fade-out in the last 2 seconds
      let fadeInterval: ReturnType<typeof setInterval> | null = null;
      audio.ontimeupdate = () => {
        if (audio.duration && audio.currentTime > audio.duration - 2 && !fadeInterval) {
          fadeInterval = setInterval(() => {
            if (audio.volume > 0.02) {
              audio.volume = Math.max(0, audio.volume - 0.025);
            } else {
              audio.volume = 0;
              if (fadeInterval) clearInterval(fadeInterval);
            }
          }, 100);
        }
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      const onAbort = () => {
        audio.pause();
        audio.src = '';
        cleanup();
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      audio.play().catch(cleanup);
    } catch {
      resolve();
    }
  });
};
