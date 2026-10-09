import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, CheckCircle2, Clock, MapPin, AlertCircle, Lock, RefreshCw, Sparkles, Cpu, Eye } from 'lucide-react';
import { playChime, speakGreeting } from '../utils/audio';

export default function KioskMode({
  employees = [],
  onRecordPunch,
  onOpenAdmin,
  isOnline = true,
  pendingCount = 0
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentPunch, setCurrentPunch] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState(null);

  const videoRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));

      if (hour < 12) setGreeting('Good Morning ☀️');
      else if (hour < 16) setGreeting('Good Afternoon 🌤️');
      else setGreeting('Good Evening 🌙');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize webcam stream
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Webcam permission not granted or no webcam available:', err);
        setCameraError(true);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-dismiss punch card after 3 seconds
  useEffect(() => {
    if (currentPunch) {
      const timer = setTimeout(() => {
        setCurrentPunch(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPunch]);

  useEffect(() => {
    if (cooldownMessage) {
      const timer = setTimeout(() => {
        setCooldownMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cooldownMessage]);

  const handleTriggerPunch = async (employee) => {
    if (currentPunch || cooldownMessage) return;

    try {
      const punchRecord = await onRecordPunch(employee);
      setCurrentPunch({
        employee,
        record: punchRecord
      });

      // Sound & Voice
      const isCheckIn = punchRecord.type === 'CHECK_IN';
      playChime(isCheckIn);
      speakGreeting(employee.full_name, isCheckIn);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.25rem 1.5rem',
      maxWidth: '720px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* TOP HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '18px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src="/poultry_icon.jpg" 
              alt="Poultry Logo" 
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '14px', 
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                border: '1.5px solid rgba(16, 185, 129, 0.5)',
                display: 'block'
              }} 
            />
            <span className="live-dot" style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #030712'
            }}></span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                PoultryAttend
              </h1>
              <span style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
                color: 'var(--secondary-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.05em'
              }}>
                PRO TERMINAL
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Sri Rama Poultry Farm • Biometric Attendance Kiosk
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Network status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
            color: isOnline ? '#34d399' : '#fbbf24',
            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#f59e0b',
              boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
            }}></span>
            {pendingCount > 0 ? `Offline (${pendingCount} queued)` : (isOnline ? 'Cloud Synced' : 'Offline')}
          </div>

          {/* Admin Lock Button */}
          <button
            onClick={onOpenAdmin}
            title="Manager Login (PIN: 6999)"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              color: 'var(--secondary-cyan)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Lock size={18} />
          </button>
        </div>
      </div>

      {/* GREETING / FARM UNIT BANNER */}
      <div style={{ textAlign: 'center', margin: '0.6rem 0' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
          {greeting}
        </h2>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          color: 'var(--secondary-cyan)',
          marginTop: '0.25rem',
          fontWeight: 600
        }}>
          <Cpu size={14} />
          <span>MobileFaceNet AI • Redmi Go Hardware Terminal</span>
        </div>
      </div>

      {/* CAMERA VIEWPORT BOX WITH HIGH-TECH BIOMETRIC HUD */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3.3',
        borderRadius: '28px',
        overflow: 'hidden',
        background: '#020617',
        border: `2px solid ${currentPunch ? 'var(--primary-emerald)' : 'rgba(6, 182, 212, 0.4)'}`,
        boxShadow: currentPunch 
          ? '0 0 50px rgba(16, 185, 129, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.9)' 
          : '0 0 40px rgba(6, 182, 212, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.5rem 0',
        transition: 'all 0.3s ease'
      }}>
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirror view
          }}
        />

        {/* Fallback if webcam is not active */}
        {!cameraActive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            background: 'radial-gradient(circle at center, #0f172a 0%, #030712 100%)',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1.5px solid rgba(6, 182, 212, 0.3)',
              boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
            }} className="radar-pulse-ring">
              <Camera size={38} color="var(--secondary-cyan)" />
            </div>
            <p style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Face Camera Kiosk Active
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.5 }}>
              Stand straight in front of the lens for instant recognition, or tap worker badge below to simulate.
            </p>
          </div>
        )}

        {/* Laser scanner line animation */}
        <div className="scanner-line"></div>

        {/* HUD TELEMETRY CORNER OVERLAYS */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(2, 6, 23, 0.75)',
          padding: '0.3rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--secondary-cyan)',
          fontWeight: 600,
          pointerEvents: 'none'
        }}>
          <Eye size={12} />
          <span>LIVENESS: ACTIVE</span>
        </div>

        <div style={{
          position: 'absolute',
          top: '16px',
          right: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(2, 6, 23, 0.75)',
          padding: '0.3rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: '#34d399',
          fontWeight: 600,
          pointerEvents: 'none'
        }}>
          <span>SNAPDRAGON 425 • 30 FPS</span>
        </div>

        {/* Viewfinder Target Reticle with Cybernetic Corner Brackets */}
        <div style={{
          position: 'absolute',
          inset: '28px',
          border: '1px dashed rgba(6, 182, 212, 0.35)',
          borderRadius: '24px',
          pointerEvents: 'none'
        }}>
          {/* Futuristic Corner Brackets */}
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '32px', height: '32px', borderTop: '3.5px solid var(--secondary-cyan)', borderLeft: '3.5px solid var(--secondary-cyan)', borderTopLeftRadius: '16px', filter: 'drop-shadow(0 0 6px var(--secondary-cyan))' }}></div>
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '32px', height: '32px', borderTop: '3.5px solid var(--secondary-cyan)', borderRight: '3.5px solid var(--secondary-cyan)', borderTopRightRadius: '16px', filter: 'drop-shadow(0 0 6px var(--secondary-cyan))' }}></div>
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '32px', height: '32px', borderBottom: '3.5px solid var(--secondary-cyan)', borderLeft: '3.5px solid var(--secondary-cyan)', borderBottomLeftRadius: '16px', filter: 'drop-shadow(0 0 6px var(--secondary-cyan))' }}></div>
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '32px', height: '32px', borderBottom: '3.5px solid var(--secondary-cyan)', borderRight: '3.5px solid var(--secondary-cyan)', borderBottomRightRadius: '16px', filter: 'drop-shadow(0 0 6px var(--secondary-cyan))' }}></div>
        </div>

        {/* PUNCH SUCCESS MODAL OVERLAY */}
        {currentPunch && (
          <div style={{
            position: 'absolute',
            inset: '16px',
            background: 'rgba(3, 7, 18, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            border: `2px solid ${currentPunch.record.type === 'CHECK_IN' ? 'var(--primary-emerald)' : 'var(--accent-amber)'}`,
            boxShadow: `0 0 50px ${currentPunch.record.type === 'CHECK_IN' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: currentPunch.record.type === 'CHECK_IN' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: `2px solid ${currentPunch.record.type === 'CHECK_IN' ? 'var(--primary-emerald)' : 'var(--accent-amber)'}`
            }}>
              <CheckCircle2 size={46} color={currentPunch.record.type === 'CHECK_IN' ? 'var(--primary-emerald)' : 'var(--accent-amber)'} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
              ✓ Welcome {currentPunch.employee.full_name}
            </h3>

            <div style={{
              background: currentPunch.record.type === 'CHECK_IN' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              fontWeight: 900,
              fontSize: '1.15rem',
              padding: '0.4rem 1.6rem',
              borderRadius: '10px',
              letterSpacing: '0.06em',
              marginBottom: '0.75rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
            }}>
              {currentPunch.record.type}
            </div>

            <p style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {currentPunch.record.punch_time}
            </p>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontWeight: 500 }}>
              {currentPunch.record.shift_name} &bull; {currentPunch.record.shed_name}
            </p>

            {currentPunch.record.status === 'LATE' && (
              <span style={{
                marginTop: '0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px'
              }}>
                ⚠️ LATE ARRIVAL NOTED
              </span>
            )}

            <div style={{
              marginTop: '1.25rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <RefreshCw size={12} className="spin" />
              <span>Returning to kiosk scanner in 3s...</span>
            </div>
          </div>
        )}
      </div>

      {/* DUAL-LANGUAGE GUIDANCE PROMPT */}
      <div style={{
        textAlign: 'center',
        margin: '0.5rem 0',
        padding: '0.85rem 1.25rem',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
          Please look at the camera
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--secondary-cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
          దయచేసి కెమెరా వైపు చూడండి
        </p>
      </div>

      {/* SIMULATE WORKER TAP BAR */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        borderRadius: '18px',
        padding: '0.85rem 1rem',
        border: '1px solid var(--border-color)',
        marginBottom: '0.75rem',
        boxShadow: '0 8px 20px -5px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Simulate Worker Stand at Camera:
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--primary-emerald)', fontWeight: 600 }}>Tap profile to test</span>
        </div>
        <div style={{
          display: 'flex',
          gap: '0.6rem',
          overflowX: 'auto',
          paddingBottom: '0.3rem'
        }}>
          {employees.slice(0, 5).map(emp => (
            <button
              key={emp.id}
              onClick={() => handleTriggerPunch(emp)}
              style={{
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-emerald)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
              }}
            >
              <span style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.2)',
                color: 'var(--secondary-cyan)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {emp.full_name[0]}
              </span>
              <span>{emp.full_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* EXECUTIVE DIGITAL CLOCK BAR */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(3, 7, 18, 0.95) 100%)',
        borderRadius: '22px',
        padding: '1rem',
        textAlign: 'center',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-mono)',
          textShadow: '0 0 20px rgba(255, 255, 255, 0.15)'
        }}>
          {timeStr || '06:02:00 AM'}
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: 'var(--secondary-cyan)',
          fontWeight: 700,
          marginTop: '0.2rem',
          letterSpacing: '0.02em'
        }}>
          {dateStr || '08 October 2026'}
        </div>
      </div>
    </div>
  );
}
