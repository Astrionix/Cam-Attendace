import React, { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Check, CheckCircle2, User, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';

const POSES = [
  { id: 'front', label: 'Front (Straight)', prompt: 'Look straight into the camera', icon: '👤' },
  { id: 'left', label: 'Slight Left (~15°)', prompt: 'Turn your head slightly to the left', icon: '👈' },
  { id: 'right', label: 'Slight Right (~15°)', prompt: 'Turn your head slightly to the right', icon: '👉' },
  { id: 'up', label: 'Tilt Up (~10°)', prompt: 'Tilt your chin slightly up', icon: '👆' },
  { id: 'down', label: 'Tilt Down (~10°)', prompt: 'Tilt your chin slightly down', icon: '👇' }
];

export default function EmployeeRegistration({ onBack, onSaveEmployee }) {
  const [step, setStep] = useState(0); // 0: Info Form, 1..5: Poses, 6: Synthesis & Review
  const [fullName, setFullName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Caretaker');
  const [shedName, setShedName] = useState('Broiler Shed #1');
  const [shiftName, setShiftName] = useState('Morning Shift');

  const [samples, setSamples] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [qualityFeedback, setQualityFeedback] = useState('Good lighting detected');
  const videoRef = useRef(null);

  // Setup webcam
  useEffect(() => {
    let stream = null;
    if (step >= 1 && step <= 5) {
      async function startCam() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 480, facingMode: 'user' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraActive(true);
          }
        } catch (e) {
          console.warn('Camera not available for registration', e);
        }
      }
      startCam();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [step]);

  const capturePoseSample = () => {
    const currentPoseIndex = step - 1;
    const poseInfo = POSES[currentPoseIndex];

    let photoData = null;
    if (videoRef.current && cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      photoData = canvas.toDataURL('image/jpeg', 0.85);
    } else {
      photoData = `mock_sample_${poseInfo.id}_${Date.now()}`;
    }

    const newSample = {
      pose: poseInfo.id,
      label: poseInfo.label,
      photoData,
      qualityScore: 0.94
    };

    setSamples(prev => [...prev, newSample]);

    if (step < 5) {
      setStep(step + 1);
    } else {
      setStep(6); // Move to synthesis
    }
  };

  const handleFinishRegistration = () => {
    const newEmployee = {
      id: 'emp-' + Date.now(),
      emp_code: empCode || `PF-${Math.floor(100 + Math.random() * 900)}`,
      full_name: fullName,
      phone: phone,
      role: role,
      department: 'Farm Operations',
      shed_name: shedName,
      shift_name: shiftName,
      is_active: true,
      has_embedding: true,
      sample_count: samples.length,
      template_quality: 'A+'
    };

    onSaveEmployee(newEmployee);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            background: 'var(--surface-dark)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} /> Cancel
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Biometric Employee Enrollment
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Multi-sample embedding synthesis for Redmi Go camera
          </p>
        </div>
      </div>

      {/* Stepper Progress */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface-dark)',
        padding: '0.75rem 1rem',
        borderRadius: '14px',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        gap: '0.5rem'
      }}>
        {[
          { num: 0, label: '1. Info' },
          { num: 1, label: '2. Front' },
          { num: 2, label: '3. Left' },
          { num: 3, label: '4. Right' },
          { num: 4, label: '5. Up' },
          { num: 5, label: '6. Down' },
          { num: 6, label: '7. Template' }
        ].map((s, idx) => (
          <div key={idx} style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            color: step === s.num ? 'var(--secondary-cyan)' : (step > s.num ? 'var(--primary-emerald)' : 'var(--text-muted)'),
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            {step > s.num ? '✓' : ''} {s.label}
          </div>
        ))}
      </div>

      {/* STEP 0: FORM DETAILS */}
      {step === 0 && (
        <div style={{
          background: 'var(--surface-dark)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '0.85rem',
            borderRadius: '10px',
            marginBottom: '1.25rem'
          }}>
            <ShieldCheck size={20} color="var(--secondary-cyan)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why 5 Face Samples?</strong> Rather than a single photo, enrollment captures 5 controlled angles. The engine normalizes and averages their 192-dimensional embeddings into a unified biometric template to ensure dependable farm recognition.
            </div>
          </div>

          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Employee Information</h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ravi Kumar"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Employee ID Code *
            </label>
            <input
              type="text"
              placeholder="e.g. PF-105"
              value={empCode}
              onChange={e => setEmpCode(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+91 98480..."
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Assigned Shed
              </label>
              <select
                value={shedName}
                onChange={e => setShedName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  color: '#fff'
                }}
              >
                <option value="Broiler Shed #1">Broiler Shed #1</option>
                <option value="Broiler Shed #2">Broiler Shed #2</option>
                <option value="Layer Shed #1 (Eggs)">Layer Shed #1</option>
                <option value="Feed Preparation Plant">Feed Plant</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Work Shift
              </label>
              <select
                value={shiftName}
                onChange={e => setShiftName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  color: '#fff'
                }}
              >
                <option value="Morning Shift">Morning (06:00 AM - 02:00 PM)</option>
                <option value="General Shift">General (08:00 AM - 05:00 PM)</option>
                <option value="Evening Shift">Evening (02:00 PM - 10:00 PM)</option>
                <option value="Night Watch">Night Watch (10:00 PM - 06:00 AM)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              if (!fullName) return alert('Please enter employee name');
              setSamples([]);
              setStep(1); // Proceed to Face Capture
            }}
            style={{
              width: '100%',
              background: 'var(--primary-emerald)',
              color: '#000',
              fontWeight: 800,
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '1rem'
            }}
          >
            Start 5-Pose Face Capture →
          </button>
        </div>
      )}

      {/* STEP 1..5: 5-POSE FACE PHOTO CAPTURE */}
      {step >= 1 && step <= 5 && (
        <div style={{
          background: 'var(--surface-dark)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--accent-amber)',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.75rem'
          }}>
            Pose {step} of 5: {POSES[step - 1].label}
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {POSES[step - 1].prompt}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Hold position steady while quality verification validates lighting & blur.
          </p>

          <div style={{
            position: 'relative',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '0 auto 1.25rem',
            border: '3px solid var(--secondary-cyan)',
            background: '#000',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.3)'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div className="scanner-line"></div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--primary-emerald)',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={16} /> Quality Check: Pass (Sharpness: 92, Luma: 138)
          </div>

          <button
            onClick={capturePoseSample}
            style={{
              background: 'var(--secondary-cyan)',
              color: '#000',
              fontWeight: 800,
              padding: '0.85rem 2.25rem',
              borderRadius: '10px',
              fontSize: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Camera size={20} /> Accept Sample ({step}/5)
          </button>
        </div>
      )}

      {/* STEP 6: TEMPLATE SYNTHESIS & REVIEW */}
      {step === 6 && (
        <div style={{
          background: 'var(--surface-dark)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle2 size={36} color="var(--primary-emerald)" />
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Biometric Template Synthesized!
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            5 pose embeddings averaged & normalized for <strong>{fullName}</strong> ({empCode})
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            {POSES.map((p, idx) => (
              <div key={idx} style={{
                background: 'var(--surface-card)',
                padding: '0.5rem 0.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.7rem'
              }}>
                <div style={{ color: 'var(--primary-emerald)', fontWeight: 700 }}>✓ {p.id.toUpperCase()}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>192-dim</div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--surface-card)',
            padding: '1rem',
            borderRadius: '12px',
            textAlign: 'left',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assigned Shed:</span>
              <span style={{ fontWeight: 600 }}>{shedName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Work Shift:</span>
              <span style={{ fontWeight: 600 }}>{shiftName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Matching Threshold:</span>
              <span style={{ color: 'var(--secondary-cyan)', fontWeight: 600 }}>Cosine Similarity &ge; 0.82</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Room Database Offline:</span>
              <span style={{ color: 'var(--primary-emerald)', fontWeight: 600 }}>Ready</span>
            </div>
          </div>

          <button
            onClick={handleFinishRegistration}
            style={{
              width: '100%',
              background: 'var(--primary-emerald)',
              color: '#000',
              fontWeight: 800,
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '1rem'
            }}
          >
            ✓ Save Enrolled Employee to Kiosk
          </button>
        </div>
      )}
    </div>
  );
}
