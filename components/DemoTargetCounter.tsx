/**
 * ═══════════════════════════════════════════════════════════
 * DEMO TARGET COUNTER – Animated floating counter
 * ═══════════════════════════════════════════════════════════
 * Shows "Relevant Targets: N" with animated count-down.
 * DEMO-ONLY component. Safe to delete.
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';

interface DemoTargetCounterProps {
  target: number;
  label?: string;
  visible: boolean;
}

const DemoTargetCounter: React.FC<DemoTargetCounterProps> = ({
  target,
  label = 'Relevant Targets',
  visible,
}) => {
  const [display, setDisplay] = useState(target);
  const [animating, setAnimating] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === prevTarget.current) return;

    setAnimating(true);
    setBlinking(true);
    const start = prevTarget.current;
    const end = target;
    const diff = Math.abs(end - start);
    const step = start > end ? -1 : 1;
    const interval = Math.max(30, Math.min(120, 2000 / diff));

    let current = start;
    const timer = setInterval(() => {
      current += step;
      setDisplay(current);
      if (current === end) {
        clearInterval(timer);
        setAnimating(false);
        // Blink 3 times after count finishes
        setTimeout(() => setBlinking(false), 1800);
      }
    }, interval);

    prevTarget.current = target;
    return () => clearInterval(timer);
  }, [target]);

  if (!visible) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 72,
        right: 310, // right of chat panel
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 50,
        boxShadow: blinking
          ? '0 0 20px rgba(59,130,246,0.4), 0 4px 20px rgba(0,0,0,0.3)'
          : '0 4px 20px rgba(0,0,0,0.3)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'all 0.4s ease',
        animation: blinking ? 'demoCounterBlink 0.6s ease-in-out 3' : undefined,
        border: `1px solid ${blinking ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.05)'}`,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: animating ? '#fbbf24' : '#22c55e',
          transition: 'background 0.3s',
          boxShadow: animating ? '0 0 8px #fbbf24' : '0 0 6px #22c55e',
        }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>{label}</span>
        <span style={{
          fontSize: 20, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: animating ? '#fbbf24' : '#fff',
          transition: 'color 0.3s',
          minWidth: 36, textAlign: 'center',
        }}>
          {display}
        </span>
      </div>
      <style>{`
        @keyframes demoCounterBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default DemoTargetCounter;
