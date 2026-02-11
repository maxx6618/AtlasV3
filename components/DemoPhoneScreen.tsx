/**
 * ═══════════════════════════════════════════════════════════
 * DEMO PHONE SCREEN – Fake iPhone showing a trade fair website
 * ═══════════════════════════════════════════════════════════
 *
 * Shows a convincing iPhone displaying the "M&A TECH SUMMIT"
 * exhibitor listing website. Auto-animates: slides in from
 * bottom → pulsing "Uploading to Atlas…" overlay → scales
 * down & fades out → calls onComplete().
 *
 * ONLY rendered during demo mode. Safe to delete.
 * ═══════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

// ── Props ───────────────────────────────────────────────────

interface DemoPhoneScreenProps {
  isOpen: boolean;
  onComplete: () => void;
}

// ── Company data ────────────────────────────────────────────

const COMPANIES: { name: string; industry: string }[] = [
  { name: 'Rheintech Solutions GmbH', industry: 'SAP Consulting' },
  { name: 'Alpine Data GmbH', industry: 'Cloud Integration' },
  { name: 'NordStar Consulting AG', industry: 'IT Advisory' },
  { name: 'BayernCloud AG', industry: 'Cloud Services' },
  { name: 'Hanseatik IT GmbH', industry: 'SAP Development' },
  { name: 'Bodensee Analytics GmbH', industry: 'Data Analytics' },
  { name: 'Schwarzwald Digital AG', industry: 'ERP Solutions' },
  { name: 'Elbe Systems GmbH', industry: 'S/4HANA Migration' },
  { name: 'Franken IT Consulting', industry: 'IT Infrastructure' },
  { name: 'Mosel Tech AG', industry: 'SAP Basis' },
  { name: 'Taunus Solutions GmbH', industry: 'Cloud Consulting' },
  { name: 'Hanse Digital GmbH', industry: 'Digital Transformation' },
  { name: 'Pfalz IT Services AG', industry: 'SAP Analytics' },
  { name: 'Ruhr Valley Tech GmbH', industry: 'Managed Services' },
  { name: 'Spree Innovations AG', industry: 'AI & Automation' },
  { name: 'Weser Consulting GmbH', industry: 'SAP Security' },
  { name: 'Neckar Systems AG', industry: 'ERP Consulting' },
  { name: 'Alster Digital GmbH', industry: 'Business Intelligence' },
  { name: 'Isar Tech Solutions', industry: 'Cloud Native' },
  { name: 'Main IT Partners AG', industry: 'SAP Integration' },
];

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488'];

function getInitials(name: string): string {
  const words = name.split(' ');
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Phases ──────────────────────────────────────────────────

const PHASE_SLIDE_IN  = 0;
const PHASE_UPLOAD    = 1;
const PHASE_SCALE_OUT = 2;
const PHASE_DONE      = 3;

// ── Component ───────────────────────────────────────────────

const DemoPhoneScreen: React.FC<DemoPhoneScreenProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState(PHASE_SLIDE_IN);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase(PHASE_SLIDE_IN);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;

    const run = async () => {
      try {
        // 0–1.5s: phone visible
        await wait(1500, ac.signal);
        setPhase(PHASE_UPLOAD);

        // 1.5–3.0s: "Uploading to Atlas…" overlay
        await wait(1500, ac.signal);
        setPhase(PHASE_SCALE_OUT);

        // 3.0–3.5s: scale down & fade
        await wait(500, ac.signal);
        setPhase(PHASE_DONE);
        onComplete();
      } catch {
        /* aborted */
      }
    };

    run();

    return () => {
      ac.abort();
      abortRef.current = null;
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  // ── Keyframes ──────────────────────────────────────────────

  const keyframes = `
    @keyframes dps-slideUp {
      0%   { transform: translateY(120%) scale(0.92); opacity: 0; }
      60%  { transform: translateY(-4%) scale(1.02); opacity: 1; }
      80%  { transform: translateY(2%) scale(0.99); opacity: 1; }
      100% { transform: translateY(0%) scale(1); opacity: 1; }
    }
    @keyframes dps-scaleOut {
      0%   { transform: translateY(0%) scale(1); opacity: 1; }
      100% { transform: translateY(-30%) scale(0.35); opacity: 0; }
    }
    @keyframes dps-pulse {
      0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
      50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.05); }
    }
    @keyframes dps-fadeIn {
      0%   { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes dps-arrowBounce {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-4px); }
    }
  `;

  // ── Styles ─────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.72)',
    animation: 'dps-fadeIn 0.3s ease-out',
  };

  const phoneAnimation =
    phase >= PHASE_SCALE_OUT
      ? 'dps-scaleOut 0.5s ease-in forwards'
      : 'dps-slideUp 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards';

  const phoneStyle: React.CSSProperties = {
    position: 'relative',
    width: 310,
    height: 640,
    borderRadius: 40,
    background: '#1c1c1e',
    boxShadow: '0 0 0 3px #3a3a3c, 0 30px 80px rgba(0,0,0,0.7)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: phoneAnimation,
  };

  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px 6px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    background: '#1c1c1e',
    flexShrink: 0,
  };

  const notchStyle: React.CSSProperties = {
    width: 120,
    height: 28,
    background: '#000',
    borderRadius: '0 0 18px 18px',
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
  };

  const screenStyle: React.CSSProperties = {
    flex: 1,
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '0 0 36px 36px',
  };

  // ── Banner ─────────────────────────────────────────────────

  const bannerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    padding: '16px 20px 12px',
    textAlign: 'center',
    flexShrink: 0,
  };

  const bannerTitleStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: 2.5,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    margin: 0,
  };

  const bannerSubStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    letterSpacing: 1,
  };

  // ── Nav tabs ───────────────────────────────────────────────

  const navStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  };

  const navTabs = ['Program', 'Exhibitors', 'Speakers', 'Tickets'];

  const getNavTabStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: isActive ? 700 : 500,
    color: isActive ? '#1e3a5f' : '#64748b',
    padding: '9px 4px 7px',
    borderBottom: isActive ? '2px solid #1e3a5f' : '2px solid transparent',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    cursor: 'default',
    whiteSpace: 'nowrap',
  });

  // ── Section header ─────────────────────────────────────────

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '14px 18px 8px',
    flexShrink: 0,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    margin: 0,
  };

  const sectionCountStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  };

  // ── Company list ───────────────────────────────────────────

  const listContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '0 14px 12px',
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 10px',
    borderBottom: '1px solid #f1f5f9',
    gap: 12,
  };

  const getAvatarStyle = (colorIndex: number): React.CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    flexShrink: 0,
    letterSpacing: 0.5,
  });

  const cardTextStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const companyNameStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const industryTagStyle: React.CSSProperties = {
    fontSize: 10.5,
    color: '#94a3b8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    marginTop: 1,
  };

  const arrowStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#cbd5e1',
    flexShrink: 0,
    fontWeight: 300,
  };

  const homeBarStyle: React.CSSProperties = {
    width: 130,
    height: 5,
    borderRadius: 3,
    background: '#d1d5db',
    margin: '6px auto 8px',
    flexShrink: 0,
  };

  // ── Upload overlay ─────────────────────────────────────────

  const uploadOverlay = phase >= PHASE_UPLOAD && phase < PHASE_SCALE_OUT && (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.80)',
      borderRadius: 40,
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'dps-fadeIn 0.3s ease-out',
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        animation: 'dps-pulse 1.2s ease-in-out infinite',
      }}>
        <div style={{
          fontSize: 28,
          color: '#60a5fa',
          animation: 'dps-arrowBounce 1s ease-in-out infinite',
          lineHeight: 1,
        }}>
          ↑
        </div>
        <span style={{
          fontSize: 14,
          color: '#ffffff',
          fontWeight: 600,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          Uploading to Atlas…
        </span>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────

  return ReactDOM.createPortal(
    <div style={overlayStyle}>
      <style>{keyframes}</style>

      <div style={phoneStyle}>
        {/* Notch */}
        <div style={notchStyle} />

        {/* Status bar */}
        <div style={statusBarStyle}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11 }}>WiFi</span>
            <span style={{ fontSize: 13 }}>▉</span>
          </div>
        </div>

        {/* Screen content */}
        <div style={screenStyle}>
          {/* Banner */}
          <div style={bannerStyle}>
            <div style={bannerTitleStyle}>M&A TECH SUMMIT</div>
            <div style={bannerSubStyle}>Frankfurt 2026</div>
          </div>

          {/* Nav tabs */}
          <div style={navStyle}>
            {navTabs.map((tab) => (
              <span key={tab} style={getNavTabStyle(tab === 'Exhibitors')}>
                {tab}
              </span>
            ))}
          </div>

          {/* Section header */}
          <div style={sectionHeaderStyle}>
            <div style={sectionTitleStyle}>Exhibitors</div>
            <span style={sectionCountStyle}>(47 companies)</span>
          </div>

          {/* Company list */}
          <div style={listContainerStyle}>
            {COMPANIES.map((company, i) => (
              <div key={i} style={cardStyle}>
                <div style={getAvatarStyle(i)}>
                  {getInitials(company.name)}
                </div>
                <div style={cardTextStyle}>
                  <div style={companyNameStyle}>{company.name}</div>
                  <div style={industryTagStyle}>{company.industry}</div>
                </div>
                <span style={arrowStyle}>›</span>
              </div>
            ))}
          </div>

          {/* Home bar */}
          <div style={homeBarStyle} />
        </div>

        {/* Upload overlay (on top of screen) */}
        {uploadOverlay}
      </div>
    </div>,
    document.body
  );
};

// ── Helpers ──────────────────────────────────────────────────

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

export default DemoPhoneScreen;
