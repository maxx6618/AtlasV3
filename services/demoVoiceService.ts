/**
 * DEMO VOICE SERVICE - Text-to-Speech for guided demo
 *
 * Primary: ElevenLabs API (via serverless proxy at /api/elevenlabs)
 * Fallback: Web Speech API (free, no API key needed)
 *
 * This file is ONLY used for the demo walkthrough.
 * Safe to delete without affecting the rest of the app.
 */

// -- Types --

type VoiceRole = 'bot' | 'user';

// -- State --

let muted = false;
let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;
let englishVoices: SpeechSynthesisVoice[] = [];
let elevenLabsAuthInvalid = false;
let elevenLabsBackoffUntil = 0;
let unlockAudioCtx: AudioContext | null = null;

// -- ElevenLabs Config --

const ELEVENLABS_VOICES: Record<VoiceRole, string> = {
  bot: 'EXAVITQu4vr4xnSDxMaL',
  user: 'JBFqnCBsd6RMkjVDRZzb',
};

const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';
const ELEVENLABS_TEMP_BACKOFF_MS = 10000;

const resetElevenLabsHealth = () => {
  elevenLabsAuthInvalid = false;
  elevenLabsBackoffUntil = 0;
};

const shouldBypassElevenLabs = () =>
  elevenLabsAuthInvalid || Date.now() < elevenLabsBackoffUntil;

const markElevenLabsFailure = (status?: number) => {
  if (status === 401 || status === 403) {
    elevenLabsAuthInvalid = true;
    return;
  }
  if (status === 402) return;
  elevenLabsBackoffUntil = Date.now() + ELEVENLABS_TEMP_BACKOFF_MS;
};

// -- Public API --

export const setMuted = (value: boolean) => { muted = value; };
export const isMuted = (): boolean => muted;
export const primeAudioPlayback = () => {
  try {
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
    // Ignore priming failures
  }
};

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
        setTimeout(loadVoices, 2000);
      }
    } else {
      resolve();
    }
  });
};

export const speakText = async (
  text: string,
  role: VoiceRole,
  signal?: AbortSignal
): Promise<void> => {
  if (muted || !text.trim()) return;
  if (signal?.aborted) return;

  const cleanText = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[✅❌⚙️🔗🎬📤📊🔍📋📧⏭️🟠☁️📥👋]/g, '')
    .trim();

  if (!cleanText) return;

  const bypass = shouldBypassElevenLabs();
  if (!bypass) {
    return speakElevenLabs(cleanText, role, signal);
  } else {
    return speakWebSpeech(cleanText, role, signal);
  }
};

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

// -- Audio Prefetch Cache --

const audioCache = new Map<string, Promise<Blob | null>>();

export const prefetchAudio = (text: string | undefined, role: VoiceRole): Promise<Blob | null> => {
  if (!text || muted) return Promise.resolve(null);
  
  const cleanText = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[✅❌⚙️🔗🎬📤📊🔍📋📧⏭️🟠☁️📥👋🤖😄]/g, '')
    .trim();
  if (!cleanText) return Promise.resolve(null);
  
  const cacheKey = `${role}:${cleanText}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;
  
  const bypass = shouldBypassElevenLabs();
  if (bypass) {
    return Promise.resolve(null);
  }
  
  const voiceId = ELEVENLABS_VOICES[role];
  const promise = fetch('/api/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanText,
      voiceId,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: role === 'bot' ? 0.75 : 0.6,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  }).then(r => {
    if (!r.ok) {
      markElevenLabsFailure(r.status);
      console.warn(`ElevenLabs prefetch error (${r.status}). Using Web Speech fallback.`);
      return null;
    }
    elevenLabsBackoffUntil = 0;
    return r.blob();
  }).catch(() => {
    markElevenLabsFailure();
    return null;
  });
  
  audioCache.set(cacheKey, promise);
  return promise;
};

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

export const clearAudioCache = () => {
  audioCache.clear();
  resetElevenLabsHealth();
};

let keyClickCtx: AudioContext | null = null;
export const playKeyClick = () => {
  if (muted) return;
  try {
    if (!keyClickCtx) keyClickCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = keyClickCtx;
    const t = ctx.currentTime;

    const bufSize = ctx.sampleRate * 0.012;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

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

// -- ElevenLabs Implementation (via serverless proxy) --

const speakElevenLabs = async (
  text: string,
  role: VoiceRole,
  signal?: AbortSignal
): Promise<void> => {
  const voiceId = ELEVENLABS_VOICES[role];

  try {
    const response = await fetch('/api/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: role === 'bot' ? 0.75 : 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
      signal,
    });

    if (!response.ok) {
      markElevenLabsFailure(response.status);
      console.warn(`ElevenLabs error (${response.status}). Falling back to Web Speech.`);
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
        cleanup();
      });
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    markElevenLabsFailure();
    console.warn('ElevenLabs request failed. Falling back to Web Speech.', err);
    return speakWebSpeech(text, role, signal);
  }
};

// -- Web Speech API Implementation --

const speakWebSpeech = (
  text: string,
  role: VoiceRole,
  signal?: AbortSignal
): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    if (englishVoices.length >= 2) {
      utterance.voice = role === 'bot' ? englishVoices[0] : englishVoices[1];
    } else if (englishVoices.length === 1) {
      utterance.voice = englishVoices[0];
    }

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

    utterance.onend = () => { currentUtterance = null; resolve(); };
    utterance.onerror = () => { currentUtterance = null; resolve(); };

    const onAbort = () => {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    window.speechSynthesis.speak(utterance);
  });
};

// -- Reactor Startup Sound --

export const playEngineSound = (signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const audio = new Audio('/reactor_startup.mp3');
      audio.volume = 0.25;
      currentAudio = audio;

      const cleanup = () => {
        if (fadeInterval) clearInterval(fadeInterval);
        currentAudio = null;
        resolve();
      };

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
