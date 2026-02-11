/**
 * ═══════════════════════════════════════════════════════════
 * DEMO HUBSPOT MODAL – Fake OAuth screen + sync progress
 * ═══════════════════════════════════════════════════════════
 * DEMO-ONLY component. Safe to delete.
 * ═══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HUBSPOT_EMAIL, HUBSPOT_PASSWORD, typeText, delay } from '../services/demoService';

interface DemoHubspotModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const DemoHubspotModal: React.FC<DemoHubspotModalProps> = ({ isOpen, onComplete, onClose }) => {
  const [phase, setPhase] = useState<'login' | 'connecting' | 'syncing' | 'done'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setPhase('login');
    setEmail('');
    setPassword('');
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      try {
        // Phase 1: Type credentials
        await delay(800, controller.signal);
        await typeText(setEmail, HUBSPOT_EMAIL, 45, controller.signal);
        await delay(400, controller.signal);
        await typeText(setPassword, HUBSPOT_PASSWORD, 50, controller.signal);
        await delay(600, controller.signal);

        // Phase 2: Connecting
        setPhase('connecting');
        await delay(1800, controller.signal);

        // Phase 3: Syncing with progress bar
        setPhase('syncing');
        for (let i = 0; i <= 100; i += 2) {
          if (controller.signal.aborted) return;
          setProgress(i);
          await delay(60, controller.signal);
        }
        await delay(500, controller.signal);

        // Phase 4: Done
        setPhase('done');
        await delay(1500, controller.signal);
        onComplete();
      } catch {
        // AbortError — demo stopped
      }
    };
    run();

    return () => { controller.abort(); };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 420, maxWidth: '90vw',
        padding: 0, overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          background: '#FF7A59', padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#FF7A59',
          }}>HS</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>HubSpot</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Connect your account</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)', fontSize: 20, padding: '0 4px',
            }}
          >×</button>
        </div>

        <div style={{ padding: '24px' }}>
          {phase === 'login' && (
            <>
              <p style={{ margin: '0 0 16px', color: '#33475b', fontSize: 14 }}>
                Sign in to authorize Atlas to sync your data.
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#516f90', marginBottom: 4, fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 6,
                    border: '1px solid #cbd6e2', fontSize: 14, color: '#33475b',
                    background: '#f5f8fa', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#516f90', marginBottom: 4, fontWeight: 500 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  readOnly
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 6,
                    border: '1px solid #cbd6e2', fontSize: 14, color: '#33475b',
                    background: '#f5f8fa', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', background: '#f0f7ff', borderRadius: 6,
                fontSize: 12, color: '#516f90',
              }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                Auto-filling demo credentials...
              </div>
            </>
          )}

          {phase === 'connecting' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid #eee', borderTopColor: '#FF7A59',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p style={{ margin: 0, fontSize: 14, color: '#33475b', fontWeight: 500 }}>
                Connecting to HubSpot...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {phase === 'syncing' && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#33475b', fontWeight: 500 }}>
                  Syncing to HubSpot...
                </span>
                <span style={{ fontSize: 14, color: '#FF7A59', fontWeight: 600 }}>
                  {progress}%
                </span>
              </div>
              <div style={{
                height: 8, borderRadius: 4, background: '#eaf0f6', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #FF7A59, #FF957A)',
                  width: `${progress}%`, transition: 'width 0.1s ease',
                }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#516f90' }}>
                {progress < 50 ? 'Uploading 31 companies...' : 'Uploading 45 contacts...'}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#00A4BD',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 28, color: '#fff',
              }}>✓</div>
              <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#33475b' }}>
                Connected!
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#516f90' }}>
                31 companies and 45 contacts synced successfully.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DemoHubspotModal;
