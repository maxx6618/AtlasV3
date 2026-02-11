/**
 * ═══════════════════════════════════════════════════════════
 * DEMO REACTOR LOADING – Sphere charges up synced to sound
 * ═══════════════════════════════════════════════════════════
 * Flow: Login slides away → Sphere fades in center with
 * "Initializing..." → Sound starts → sphere charges from
 * inside out → Sound ends → smooth explosion → dashboard
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DemoReactorLoadingProps {
  onComplete: () => void;
  fromSharedBall?: boolean;
}

const PARTICLE_COUNT = 45;
const REACTOR_MIN_CHARGE_MS = 3200;
const REACTOR_EXPLODE_MS = 1000;
const AUDIO_READY_TIMEOUT_MS = 1500;

const DemoReactorLoading: React.FC<DemoReactorLoadingProps> = ({ onComplete, fromSharedBall = false }) => {
  const [phase, setPhase] = useState<'init' | 'charging' | 'explode' | 'done'>('init');
  const [charge, setCharge] = useState(0); // 0 to 1
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const chargeRef = useRef(0);
  const particlesRef = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      angle: (i / PARTICLE_COUNT) * 360 + (Math.random() - 0.5) * 12,
      speed: 250 + Math.random() * 550,
      size: 3 + Math.random() * 7,
      delay: Math.random() * 0.1,
    }))
  );

  // Sync charge to audio currentTime/duration using requestAnimationFrame
  const updateCharge = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration && !audio.paused) {
      const raw = audio.currentTime / audio.duration;
      const eased = raw < 0.5
        ? 2 * raw * raw  // ease in first half
        : 1 - Math.pow(-2 * raw + 2, 2) / 2; // ease out second half
      const next = Math.min(1, eased);
      // Avoid re-rendering on near-identical per-frame values.
      if (Math.abs(next - chargeRef.current) > 0.004) {
        chargeRef.current = next;
        setCharge(next);
      }
    }
    rafRef.current = requestAnimationFrame(updateCharge);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Phase 1: Init — direct handoff path starts charging immediately.
      setPhase('init');
      await new Promise(r => setTimeout(r, fromSharedBall ? 0 : 1200));
      if (cancelled) return;

      // Phase 2: Start sound + charge
      setPhase('charging');

      const audio = new Audio('/reactor_startup.mp3');
      audio.volume = 0.25;
      audio.preload = 'auto';
      audioRef.current = audio;

      // Wait until metadata/canplay is available so charge progression is less jittery.
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const cleanup = () => {
          clearTimeout(safety);
          audio.removeEventListener('loadedmetadata', finish);
          audio.removeEventListener('canplay', finish);
          audio.removeEventListener('error', finish);
        };
        const safety = setTimeout(finish, AUDIO_READY_TIMEOUT_MS);

        if (audio.readyState >= 1) {
          finish();
          return;
        }
        audio.addEventListener('loadedmetadata', finish, { once: true });
        audio.addEventListener('canplay', finish, { once: true });
        audio.addEventListener('error', finish, { once: true });
      });
      if (cancelled) return;

      // Start tracking charge via rAF
      rafRef.current = requestAnimationFrame(updateCharge);

      // Play and wait for end
      const chargeStartedAt = performance.now();
      let playbackFailed = false;
      try {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          audio.onerror = () => {
            playbackFailed = true;
            finish();
          };
          audio.onended = finish;
          audio.play().catch(() => {
            playbackFailed = true;
            finish();
          });

          // Safety fallback; keep generous to avoid ending before audio.
          const safety = setTimeout(() => finish(), 30000);
          audio.addEventListener('ended', () => clearTimeout(safety), { once: true });
          audio.addEventListener('error', () => clearTimeout(safety), { once: true });
        });
      } catch { /* */ }

      if (cancelled) return;

      const elapsedMs = performance.now() - chargeStartedAt;
      const remainingChargeMs = Math.max(0, REACTOR_MIN_CHARGE_MS - elapsedMs);
      if (remainingChargeMs > 0) {
        if (playbackFailed) {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          const startCharge = chargeRef.current;
          const fallbackStart = performance.now();
          await new Promise<void>((resolve) => {
            const tick = () => {
              if (cancelled) {
                resolve();
                return;
              }
              const progress = Math.min(1, (performance.now() - fallbackStart) / remainingChargeMs);
              const next = Math.min(0.98, startCharge + (1 - startCharge) * progress);
              if (Math.abs(next - chargeRef.current) > 0.003) {
                chargeRef.current = next;
                setCharge(next);
              }
              if (progress >= 1) {
                resolve();
                return;
              }
              rafRef.current = requestAnimationFrame(tick);
            };
            tick();
          });
        } else {
          await new Promise(r => setTimeout(r, remainingChargeMs));
        }
      }

      if (cancelled) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      // End of sound: lock to full charge and explode immediately.
      chargeRef.current = 1;
      setCharge(1);
      setPhase('explode');
      await new Promise(r => setTimeout(r, REACTOR_EXPLODE_MS));
      if (cancelled) return;

      setPhase('done');
      onComplete();
    };

    run();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [fromSharedBall, onComplete, updateCharge]);

  if (phase === 'done') return null;

  const isInit = phase === 'init';
  const isCharging = phase === 'charging';
  const isExplode = phase === 'explode';
  const active = isCharging;

  // Derived visual values from charge (0-1)
  const c = charge;
  const sphereScale = isExplode ? 1.8 : fromSharedBall ? 0.92 : isInit ? 0.7 : 0.7 + c * 0.3;
  const sphereOpacity = isExplode ? 0 : fromSharedBall ? 1 : isInit ? 0.6 : 0.7 + c * 0.3;
  const coreGlow = c * 0.4;
  const ringBright = isInit ? 0.15 : 0.15 + c * 0.45;
  const spinSec = isInit ? 20 : Math.max(2.5, 20 - c * 18);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#050a15',
      animation: isExplode ? 'drl-bgfade 0.8s ease-out forwards' : undefined,
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />

      {/* Background glow */}
      {!isExplode && (
        <div style={{
          position: 'absolute',
          width: 200 + c * 500, height: 200 + c * 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(59,130,246,${coreGlow}) 0%, transparent 60%)`,
          filter: 'blur(60px)',
        }} />
      )}

      {/* ── Sphere ── */}
      <div style={{
        position: 'relative', width: 400, height: 400,
        transform: `scale(${sphereScale})`,
        opacity: sphereOpacity,
        transition: isExplode
          ? 'transform 0.5s ease-out, opacity 0.3s ease-out'
          : isInit && !fromSharedBall
            ? 'transform 1s cubic-bezier(0.16,1,0.3,1), opacity 1s ease'
            : undefined,
        animation: isInit && !fromSharedBall ? 'drl-appear 1s cubic-bezier(0.16,1,0.3,1) forwards' : undefined,
      }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid rgba(59,130,246,${ringBright})`,
          boxShadow: active ? `0 0 ${c * 50}px rgba(59,130,246,${c * 0.25}), inset 0 0 ${c * 30}px rgba(59,130,246,${c * 0.08})` : 'none',
          animation: `drl-spin ${spinSec}s linear infinite`,
        }} />

        {/* Middle ring */}
        <div style={{
          position: 'absolute', inset: 40, borderRadius: '50%',
          border: `2px solid rgba(59,130,246,${ringBright * 0.75})`,
          boxShadow: active ? `0 0 ${c * 30}px rgba(59,130,246,${c * 0.15})` : 'none',
          animation: `drl-spin ${spinSec * 1.3}s linear infinite reverse`,
        }} />

        {/* Inner ring */}
        <div style={{
          position: 'absolute', inset: 75, borderRadius: '50%',
          border: `1.5px solid rgba(59,130,246,${ringBright * 0.55})`,
          animation: `drl-spin ${spinSec * 0.8}s linear infinite`,
        }} />

        {/* Orbiting dots */}
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <div key={`d${i}`} style={{
            position: 'absolute',
            width: 3 + (i%3)*2, height: 3 + (i%3)*2,
            borderRadius: '50%',
            background: `rgba(96,165,250,${0.3 + c * 0.5})`,
            boxShadow: `0 0 ${4 + c * 10}px rgba(59,130,246,${0.2 + c * 0.4})`,
            left: '50%', top: '50%',
            marginLeft: -(1.5 + i%3), marginTop: -(1.5 + i%3),
            animation: `drl-spin ${spinSec * (0.5 + i*0.12)}s linear infinite`,
            transformOrigin: `0px ${-85 - i*12}px`,
          }} />
        ))}

        {/* Inner charge glow — grows from center */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: c * 250, height: c * 250,
          marginLeft: -(c * 125), marginTop: -(c * 125),
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(59,130,246,${c * 0.2}) 0%, rgba(59,130,246,${c * 0.05}) 50%, transparent 70%)`,
        }} />

        {/* Center bright core */}
        <div style={{
          position: 'absolute',
          width: 6 + c * 16, height: 6 + c * 16,
          borderRadius: '50%',
          background: `rgba(96,165,250,${0.2 + c * 0.7})`,
          boxShadow: `0 0 ${c * 50}px rgba(59,130,246,${c * 0.6}), 0 0 ${c * 100}px rgba(59,130,246,${c * 0.2})`,
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          animation: active ? `drl-pulse ${Math.max(0.35, 1.6 - c)}s ease-in-out infinite` : undefined,
        }} />

        {!fromSharedBall && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 40, fontWeight: 800, color: '#fff',
              letterSpacing: '0.2em',
              textShadow: `0 0 ${15 + c * 40}px rgba(59,130,246,${0.15 + c * 0.45})`,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>ATLAS</span>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: `rgba(147,197,253,${0.5 + c * 0.5})`,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              marginTop: 10,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              animation: active ? `drl-pulse ${Math.max(0.5, 2 - c * 1.5)}s ease-in-out infinite` : undefined,
            }}>
              {isInit ? 'Initializing...' : 'Firing up the reactor...'}
            </span>
          </div>
        )}
      </div>

      {/* ── Explosion ── */}
      {isExplode && (
        <>
          {/* Flash */}
          <div style={{
            position: 'absolute', width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.7) 0%, transparent 70%)',
            animation: 'drl-flash 0.7s ease-out forwards',
          }} />
          {/* Particles */}
          {particlesRef.current.map(p => {
            const rad = (p.angle * Math.PI) / 180;
            return (
              <div key={`e${p.id}`} style={{
                position: 'absolute',
                width: p.size, height: p.size, borderRadius: '50%',
                background: 'rgba(96,165,250,0.9)',
                boxShadow: `0 0 ${p.size * 4}px rgba(59,130,246,0.7)`,
                left: '50%', top: '50%',
                marginLeft: -p.size/2, marginTop: -p.size/2,
                animation: `drl-e${p.id} 0.85s cubic-bezier(0.15,0,0.4,1) forwards`,
                animationDelay: `${p.delay}s`,
              }}>
                <style>{`@keyframes drl-e${p.id}{0%{transform:translate(0,0) scale(1.5);opacity:1}50%{opacity:.7}100%{transform:translate(${Math.cos(rad)*p.speed}px,${Math.sin(rad)*p.speed}px) scale(0);opacity:0}}`}</style>
              </div>
            );
          })}
        </>
      )}

      <style>{`
        @keyframes drl-spin{to{transform:rotate(360deg)}}
        @keyframes drl-pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes drl-flash{0%{transform:scale(1);opacity:1}100%{transform:scale(12);opacity:0}}
        @keyframes drl-appear{0%{transform:scale(0.3);opacity:0}100%{transform:scale(0.7);opacity:0.6}}
        @keyframes drl-bgfade{0%{opacity:1}100%{opacity:0}}
      `}</style>
    </div>
  );
};

export default DemoReactorLoading;
