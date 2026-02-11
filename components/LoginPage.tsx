import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Zap } from 'lucide-react';

type DemoEntryStage = 'login' | 'slideOut' | 'loading' | 'blueFlash' | 'dashboard';

interface LoginPageProps {
  onLogin: () => void;
  onStartDemo?: () => void;
  onStartDemoSilent?: () => void;
  onStartDemoFast?: () => void;
  /** When demo mode is active, these let the demo orchestrator drive the inputs */
  demoEmail?: string;
  demoPassword?: string;
  demoEntryStage?: DemoEntryStage;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onStartDemo,
  onStartDemoSilent,
  onStartDemoFast,
  demoEmail,
  demoPassword,
  demoEntryStage = 'login',
}) => {
  const [phase, setPhase] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isTransitioning = demoEntryStage === 'slideOut' || demoEntryStage === 'loading' || demoEntryStage === 'blueFlash';
  const isLoading = demoEntryStage === 'loading' || demoEntryStage === 'blueFlash';
  const isBlueFlash = demoEntryStage === 'blueFlash';
  const transitionMs = 700;

  // Kugel bleibt immer zentriert
  const orbitalBallTransform = 'translate(-50%, -50%)';
  const orbitalBallOpacity = phase >= 2 ? 1 : 0;
  const scatteredDots = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI * 2 + i * 0.7;
        const radius = 60 + Math.random() * 140;
        const x = 220 + Math.cos(angle) * radius;
        const y = 220 + Math.sin(angle) * radius;
        const size = 1 + Math.random() * 2.5;
        return {
          id: i,
          x,
          y,
          size,
          alpha: 0.3 + Math.random() * 0.4,
          blur: 2 + Math.random() * 4,
        };
      }),
    []
  );

  // Allow demo service to drive the input fields
  useEffect(() => {
    if (demoEmail !== undefined) setEmail(demoEmail);
  }, [demoEmail]);
  useEffect(() => {
    if (demoPassword !== undefined) setPassword(demoPassword);
  }, [demoPassword]);

  useEffect(() => {
    // Phase 0: initial blue screen
    const t1 = setTimeout(() => setPhase(1), 300);   // Phase 1: background settles
    const t2 = setTimeout(() => setPhase(2), 1200);  // Phase 2: branding + ring appear
    const t3 = setTimeout(() => setPhase(3), 2600);  // Phase 3: login form slides in
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <>
      <style>{`
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(59,130,246,0.25), 0 0 80px rgba(59,130,246,0.1), inset 0 0 30px rgba(59,130,246,0.05); }
          50% { box-shadow: 0 0 60px rgba(59,130,246,0.4), 0 0 120px rgba(59,130,246,0.15), inset 0 0 50px rgba(59,130,246,0.08); }
        }
        @keyframes ringRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes dotOrbit1 {
          from { transform: rotate(0deg) translateX(220px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(220px) rotate(-360deg); }
        }
        @keyframes dotOrbit2 {
          from { transform: rotate(120deg) translateX(220px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(220px) rotate(-480deg); }
        }
        @keyframes dotOrbit3 {
          from { transform: rotate(240deg) translateX(220px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(220px) rotate(-600deg); }
        }
        @keyframes dotOrbit4 {
          from { transform: rotate(60deg) translateX(220px) rotate(-60deg); }
          to { transform: rotate(420deg) translateX(220px) rotate(-420deg); }
        }
        @keyframes dotOrbit5 {
          from { transform: rotate(180deg) translateX(220px) rotate(-180deg); }
          to { transform: rotate(540deg) translateX(220px) rotate(-540deg); }
        }
        @keyframes dotOrbit6 {
          from { transform: rotate(300deg) translateX(220px) rotate(-300deg); }
          to { transform: rotate(660deg) translateX(220px) rotate(-660deg); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFadeOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(30px); }
        }
        @keyframes gridFade {
          from { opacity: 0; }
          to { opacity: 0.06; }
        }
        @keyframes innerRingPulse {
          0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.25; transform: translate(-50%, -50%) scale(1.03); }
        }
        .login-ring {
          animation: ringPulse 4s ease-in-out infinite;
        }
        .login-ring-rotate {
          animation: ringRotate 60s linear infinite;
        }
        .login-inner-ring {
          animation: innerRingPulse 5s ease-in-out infinite;
        }
        .login-dot-1 { animation: dotOrbit1 20s linear infinite; }
        .login-dot-2 { animation: dotOrbit2 25s linear infinite; }
        .login-dot-3 { animation: dotOrbit3 22s linear infinite; }
        .login-dot-4 { animation: dotOrbit4 28s linear infinite; }
        .login-dot-5 { animation: dotOrbit5 18s linear infinite; }
        .login-dot-6 { animation: dotOrbit6 30s linear infinite; }
        .login-brand-appear {
          animation: fadeScaleIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-form-appear {
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="fixed inset-0 flex overflow-hidden"
        style={{
          backgroundColor: '#070b14',
          transition: 'background-color 1s ease',
        }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            animation: phase >= 1 ? 'gridFade 2s ease forwards' : 'none',
            opacity: phase >= 1 ? undefined : 0,
          }}
        />

        {/* Left side - Branding & Animation */}
        <div className="relative flex-1 flex items-center justify-center">
          {/* Orbital ring */}
          <div
            className="absolute"
            data-shared-demo-ball="true"
            style={{
              width: '440px',
              height: '440px',
              left: '50%',
              top: '50%',
              transform: orbitalBallTransform,
              opacity: orbitalBallOpacity,
              transition: 'opacity 0.6s ease',
            }}
          >
            {/* Outer ring */}
            <div
              className="login-ring absolute inset-0 rounded-full"
              style={{
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            />
            {/* Inner ring */}
            <div
              className="login-inner-ring absolute rounded-full"
              style={{
                width: '320px',
                height: '320px',
                left: '50%',
                top: '50%',
                border: '1px solid rgba(59,130,246,0.15)',
              }}
            />
            {/* Orbiting dots container */}
            <div
              className="absolute"
              style={{
                width: 0,
                height: 0,
                left: '50%',
                top: '50%',
              }}
            >
              {/* Orbiting dots */}
              <div className="login-dot-1 absolute" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.8)', boxShadow: '0 0 10px rgba(59,130,246,0.6)', marginLeft: '-3px', marginTop: '-3px' }} />
              <div className="login-dot-2 absolute" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(96,165,250,0.6)', boxShadow: '0 0 8px rgba(96,165,250,0.4)', marginLeft: '-2px', marginTop: '-2px' }} />
              <div className="login-dot-3 absolute" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.7)', boxShadow: '0 0 10px rgba(59,130,246,0.5)', marginLeft: '-2.5px', marginTop: '-2.5px' }} />
              <div className="login-dot-4 absolute" style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'rgba(147,197,253,0.5)', boxShadow: '0 0 6px rgba(147,197,253,0.3)', marginLeft: '-1.5px', marginTop: '-1.5px' }} />
              <div className="login-dot-5 absolute" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.6)', boxShadow: '0 0 8px rgba(59,130,246,0.4)', marginLeft: '-2.5px', marginTop: '-2.5px' }} />
              <div className="login-dot-6 absolute" style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'rgba(96,165,250,0.4)', boxShadow: '0 0 6px rgba(96,165,250,0.3)', marginLeft: '-1.5px', marginTop: '-1.5px' }} />
            </div>
            {/* Static scattered dots inside the ring to simulate data points */}
            {phase >= 2 && (
              <div className="absolute inset-0" style={{ opacity: 0.4 }}>
                {scatteredDots.map((dot) => (
                  <div
                    key={dot.id}
                    className="absolute rounded-full"
                    style={{
                      width: `${dot.size}px`,
                      height: `${dot.size}px`,
                      left: `${dot.x}px`,
                      top: `${dot.y}px`,
                      backgroundColor: `rgba(59,130,246,${dot.alpha})`,
                      boxShadow: `0 0 ${dot.blur}px rgba(59,130,246,0.3)`,
                      transition: 'opacity 2s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Branding text — stays visible during transition */}
          {phase >= 2 && (
            <div
              className="login-brand-appear relative z-10 text-center"
              style={{ opacity: 1 }}
            >
              <h1
                className="font-black tracking-wider"
                style={{
                  fontSize: '4.5rem',
                  color: '#ffffff',
                  letterSpacing: '0.25em',
                  textShadow: '0 0 40px rgba(59,130,246,0.3), 0 0 80px rgba(59,130,246,0.1)',
                }}
              >
                ATLAS
              </h1>
              <div
                className="mt-3 font-light tracking-widest uppercase"
                style={{
                  fontSize: '1rem',
                  color: 'rgba(148,163,184,0.9)',
                  letterSpacing: '0.35em',
                }}
              >
                NextGen Data Analysis
              </div>
            </div>
          )}
        </div>

        {/* Right side - Login form / Loading */}
        <div
          className="flex items-center justify-center"
          style={{
            width: '420px',
            minWidth: '380px',
            position: 'relative',
          }}
        >
          {/* Loading indicator — shown during loading stage */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              opacity: isLoading ? 1 : 0,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              width: 32, height: 32,
              border: '2px solid rgba(59,130,246,0.15)',
              borderTopColor: 'rgba(59,130,246,0.7)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{
              fontSize: '0.75rem',
              color: 'rgba(148,163,184,0.5)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              Loading...
            </span>
          </div>

          {/* Login form — slides out right on transition */}
          <div
            style={{
              width: '100%',
              opacity: phase >= 3 && !isTransitioning ? 1 : 0,
              pointerEvents: phase >= 3 && !isTransitioning ? 'auto' : 'none',
              transform: isTransitioning ? 'translateX(120px)' : 'translateX(0)',
              transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms cubic-bezier(0.4, 0, 1, 1)`,
            }}
          >
          {phase >= 3 && (
            <div className="login-form-appear w-full px-12" style={{ opacity: 0 }}>
              <div className="text-center mb-10">
                <h2
                  className="text-2xl font-semibold mb-2"
                  style={{ color: '#f1f5f9' }}
                >
                  Willkommen!
                </h2>
                <p
                  className="text-sm"
                  style={{ color: 'rgba(148,163,184,0.7)' }}
                >
                  Melden Sie sich an, um fortzufahren
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@unternehmen.de"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(59,130,246,0.2)',
                      color: '#e2e8f0',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 pr-11"
                      style={{
                        backgroundColor: 'rgba(15,23,42,0.8)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        color: '#e2e8f0',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(59,130,246,0.5)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(59,130,246,0.2)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                      style={{ color: 'rgba(148,163,184,0.5)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(148,163,184,0.8)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(148,163,184,0.5)')}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#ffffff',
                    boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(59,130,246,0.45)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Anmelden
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  className="text-xs transition-colors"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(96,165,250,0.8)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(148,163,184,0.5)')}
                >
                  Passwort vergessen?
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Bottom tagline + Demo button */}
        <div
          className="absolute bottom-6 left-8 flex items-center gap-4"
          style={{
            opacity: phase >= 2 && !isTransitioning ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <span className="text-xs font-light" style={{ color: 'rgba(148,163,184,0.3)' }}>
            Automatisierte datenbasierte Unternehmensanalyse für jedes Unternehmen
          </span>
          {onStartDemo && (
            <button
              onClick={onStartDemo}
              className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
              style={{
                border: '1px solid rgba(59,130,246,0.3)',
                color: 'rgba(59,130,246,0.6)',
                backgroundColor: 'transparent',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.7)';
                e.currentTarget.style.color = 'rgba(59,130,246,1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                e.currentTarget.style.color = 'rgba(59,130,246,0.6)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Volume2 size={11} /> Demo
            </button>
          )}
          {onStartDemoSilent && (
            <button
              onClick={onStartDemoSilent}
              className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
              style={{
                border: '1px solid rgba(100,116,139,0.3)',
                color: 'rgba(100,116,139,0.5)',
                backgroundColor: 'transparent',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(100,116,139,0.6)';
                e.currentTarget.style.color = 'rgba(100,116,139,0.9)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(100,116,139,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)';
                e.currentTarget.style.color = 'rgba(100,116,139,0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <VolumeX size={11} /> Demo
            </button>
          )}
          {onStartDemoFast && (
            <button
              onClick={onStartDemoFast}
              className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
              style={{
                border: '1px solid rgba(250,204,21,0.3)',
                color: 'rgba(250,204,21,0.5)',
                backgroundColor: 'transparent',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250,204,21,0.7)';
                e.currentTarget.style.color = 'rgba(250,204,21,1)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(250,204,21,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250,204,21,0.3)';
                e.currentTarget.style.color = 'rgba(250,204,21,0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Zap size={11} /> 1.5x
            </button>
          )}
        </div>

        {/* Bottom right links */}
        <div
          className="absolute bottom-6 right-8 flex gap-6 text-xs"
          style={{
            color: 'rgba(148,163,184,0.25)',
            opacity: phase >= 3 && !isTransitioning ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        >
          <span className="cursor-pointer hover:text-slate-400 transition-colors">Impressum</span>
          <span className="cursor-pointer hover:text-slate-400 transition-colors">Datenschutzerklärung</span>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
