import React, { useState } from 'react';
import { Lock, X, Delete } from 'lucide-react';

export default function PinModal({ onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = localStorage.getItem('poultry_admin_pin') || '6999';

  const handleKeyPress = (num) => {
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onSuccess();
        } else {
          setError(true);
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      zIndex: 100
    }}>
      <div style={{
        background: 'var(--surface-dark)',
        borderRadius: '24px',
        padding: '2rem 1.75rem',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.7)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <Lock size={28} color="var(--secondary-cyan)" />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Manager Access
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Enter 4-digit Manager Security PIN
        </p>

        {/* PIN Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: error ? 'var(--danger-red)' : (i < pin.length ? 'var(--primary-emerald)' : 'var(--surface-card)'),
                border: '1px solid var(--border-color)',
                transition: 'all 0.15s'
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger-red)', fontWeight: 600, marginBottom: '1rem' }}>
            Incorrect PIN! Try again.
          </p>
        )}

        {/* Keypad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              style={{
                aspectRatio: '1',
                borderRadius: '50%',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '1.4rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.1s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {num}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              aspectRatio: '1',
              borderRadius: '50%',
              background: 'transparent',
              color: 'var(--danger-red)',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            style={{
              aspectRatio: '1',
              borderRadius: '50%',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '1.4rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)'
            }}
          >
            0
          </button>
          <button
            onClick={handleDelete}
            style={{
              aspectRatio: '1',
              borderRadius: '50%',
              background: 'transparent',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Delete size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
