// Native & Web Audio Alert Utility for ScanCode Mobile
// Synthesizes order alarm chimes and handles audio feedback across mobile & web environments.
// Supports custom admin-selected alarm tones persisted via AsyncStorage.
//
// Uses expo-audio (expo-av was fully removed as of Expo SDK 55 — this project is on SDK 57).
// Unlike the old expo-av setup, expo-audio has real web support, so custom tones now play
// on web too instead of always falling back to the synthesizer there.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// ─── AsyncStorage Keys ───────────────────────────────────────────────────────

const CUSTOM_ALARM_URI_KEY = 'scancode_custom_alarm_uri';
const CUSTOM_CHIME_URI_KEY = 'scancode_custom_chime_uri';

// Default synthesizer fallback frequencies
const ALARM_FREQ = 880;
const CHIME_FREQ = 440;

// In-memory cache of custom URIs (loaded on init)
let _customAlarmUri: string | null = null;
let _customChimeUri: string | null = null;
let _audioInitialized = false;
let audioConfigured = false;

// ─── Initialisation ──────────────────────────────────────────────────────────

/**
 * Load persisted custom tone URIs from AsyncStorage.
 * Call once on app start (or before the first alarm is triggered).
 */
export async function initAudioAlert(): Promise<void> {
  if (_audioInitialized) return;
  try {
    _customAlarmUri = await AsyncStorage.getItem(CUSTOM_ALARM_URI_KEY);
    _customChimeUri = await AsyncStorage.getItem(CUSTOM_CHIME_URI_KEY);
  } catch {
    // Ignore — defaults will be used
  } finally {
    _audioInitialized = true;
  }
}

// ─── Custom Tone Setters / Getters ───────────────────────────────────────────

/**
 * Persist a custom alarm tone URI. Pass null to revert to the synthesizer.
 */
export async function setCustomAlarmUri(uri: string | null): Promise<void> {
  _customAlarmUri = uri;
  try {
    if (uri) {
      await AsyncStorage.setItem(CUSTOM_ALARM_URI_KEY, uri);
    } else {
      await AsyncStorage.removeItem(CUSTOM_ALARM_URI_KEY);
    }
  } catch {
    console.warn('[audioAlert] Failed to persist custom alarm URI');
  }
}

/**
 * Persist a custom status-change chime URI. Pass null to revert to the synthesizer.
 */
export async function setCustomChimeUri(uri: string | null): Promise<void> {
  _customChimeUri = uri;
  try {
    if (uri) {
      await AsyncStorage.setItem(CUSTOM_CHIME_URI_KEY, uri);
    } else {
      await AsyncStorage.removeItem(CUSTOM_CHIME_URI_KEY);
    }
  } catch {
    console.warn('[audioAlert] Failed to persist custom chime URI');
  }
}

/** Returns the currently active custom alarm URI (or null if using synthesizer). */
export function getCustomAlarmUri(): string | null {
  return _customAlarmUri;
}

/** Returns the currently active custom chime URI (or null if using synthesizer). */
export function getCustomChimeUri(): string | null {
  return _customChimeUri;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Configure the shared audio session (iOS silent-mode playback, Android ducking).
 */
async function configureAudioSession() {
  if (audioConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });
    audioConfigured = true;
  } catch (e) {
    console.warn('Failed to configure audio session:', e);
  }
}

/**
 * Play an audio file via expo-audio, auto-releasing the player once playback
 * completes. Falls back to the synthesizer on any error (missing file,
 * unsupported format, playback failure, etc).
 */
async function playSoundFile(uri: string, fallbackFreq: number) {
  let player: AudioPlayer | null = null;
  try {
    await configureAudioSession();
    player = createAudioPlayer(uri);

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        subscription.remove();
        player?.remove();
      }
    });

    player.play();
  } catch (err) {
    console.warn('expo-audio playback error, falling back to synthesizer:', err);
    player?.remove();
    synthFallbackBeep(fallbackFreq, 0.4);
  }
}

/**
 * Web Audio API Synthesizer fallback — generates a short beep/chime tone.
 */
function synthFallbackBeep(frequency = 880, duration = 0.4) {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      }
    }
  } catch {
    // Ignore audio context errors silently
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Play the order alarm sound.
 * Uses the admin-selected custom tone if set, otherwise falls back to the Web Audio synthesizer.
 */
export async function playOrderAlarmSound(): Promise<void> {
  await initAudioAlert();
  if (_customAlarmUri) {
    await playSoundFile(_customAlarmUri, ALARM_FREQ);
  } else {
    // No real default URL available — synthesize a distinctive alarm beep
    synthFallbackBeep(ALARM_FREQ, 0.5);
  }
}

/**
 * Play the status-change chime (order confirmed / rejected).
 * Uses the admin-selected custom chime if set, otherwise falls back to synthesizer.
 */
export async function playStatusChangeSound(): Promise<void> {
  await initAudioAlert();
  if (_customChimeUri) {
    await playSoundFile(_customChimeUri, CHIME_FREQ);
  } else {
    synthFallbackBeep(CHIME_FREQ, 0.3);
  }
}

// Exported alias for compatibility
export const playOrderChime = playOrderAlarmSound;
