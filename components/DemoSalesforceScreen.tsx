/**
 * ═══════════════════════════════════════════════════════════
 * DEMO SALESFORCE SCREEN – Fake Salesforce data export dialog
 * ═══════════════════════════════════════════════════════════
 * DEMO-ONLY component. Safe to delete.
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface DemoSalesforceScreenProps {
  isOpen: boolean;
  onComplete: () => void;
}

const ROWS = [
  { company: 'Bergstein Consulting GmbH', industry: 'IT Consulting', contact: 'T. Bergstein' },
  { company: 'Rheinwerk IT Solutions',    industry: 'SAP Services',  contact: 'M. Lindner' },
  { company: 'Nordlicht Digital GmbH',    industry: 'Cloud Services', contact: 'J. Kaltenberg' },
];

const DemoSalesforceScreen: React.FC<DemoSalesforceScreenProps> = ({ isOpen, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setDone(false);

    const controller = new AbortController();
    abortRef.current = controller;

    const delay = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, ms);
        controller.signal.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Aborted', 'AbortError')); });
      });

    const run = async () => {
      try {
        // Fill progress bar over ~2s
        for (let i = 0; i <= 100; i += 2) {
          if (controller.signal.aborted) return;
          setProgress(i);
          await delay(40);
        }

        // Show checkmark at ~2.5s
        await delay(500);
        setDone(true);

        // Wait then complete
        await delay(500);
        onComplete();
      } catch {
        // AbortError — component unmounted
      }
    };
    run();

    return () => { controller.abort(); };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      animation: 'sfFadeIn 0.3s ease',
    }}>
      <div style={{
        background: '#1e1e2e', borderRadius: 12, width: 480, maxWidth: '92vw',
        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Salesforce header */}
        <div style={{
          background: '#00A1E0', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22, color: '#fff' }}>☁</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: 0.3 }}>
            Salesforce
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600, color: '#e0e0e0' }}>
            Export Data
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
            Exporting company records...
          </p>

          {/* Mini table preview */}
          <div style={{
            borderRadius: 8, overflow: 'hidden', marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontSize: 12,
            }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {['Company', 'Industry', 'Contact'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 12px',
                      color: '#999', fontWeight: 600, fontSize: 11,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    <td style={{ padding: '7px 12px', color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {r.company}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {r.industry}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {r.contact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#bbb', fontWeight: 500 }}>
              {done ? '30 records exported' : 'Exporting...'}
            </span>
            <span style={{ fontSize: 13, color: '#00A1E0', fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #00A1E0, #00C8F8)',
              width: `${progress}%`, transition: 'width 0.08s linear',
            }} />
          </div>

          {/* Checkmark */}
          {done && (
            <div style={{
              textAlign: 'center', marginTop: 18,
              animation: 'sfFadeIn 0.3s ease',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#00A1E0',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
              }}>✓</div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes sfFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>,
    document.body
  );
};

export default DemoSalesforceScreen;
