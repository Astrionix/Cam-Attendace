import React, { useState } from 'react';
import { X, Database, Check, Shield, AlertTriangle } from 'lucide-react';
import { db } from '../utils/supabase';

export default function SettingsModal({ onClose, onSaved }) {
  const [sbUrl, setSbUrl] = useState(localStorage.getItem('poultry_sb_url') || '');
  const [sbKey, setSbKey] = useState(localStorage.getItem('poultry_sb_key') || '');
  const [pin, setPin] = useState(localStorage.getItem('poultry_admin_pin') || '6999');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    db.setSupabaseConfig(sbUrl.trim(), sbKey.trim());
    localStorage.setItem('poultry_admin_pin', pin.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onSaved();
      onClose();
    }, 800);
  };

  const handleCleanData = () => {
    if (confirm('Delete all employees and attendance punches?')) {
      db.cleanAllData();
      onSaved();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      zIndex: 100
    }}>
      <div className="settings-modal-box" style={{
        background: 'var(--surface-dark)',
        borderRadius: '20px',
        padding: '1.5rem',
        maxWidth: '520px',
        width: '100%',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} color="var(--primary-emerald)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Settings & Cloud Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Supabase Project URL
          </label>
          <input
            type="text"
            placeholder="https://xyzcompany.supabase.co"
            value={sbUrl}
            onChange={e => setSbUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Supabase Anon Public API Key
          </label>
          <input
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={sbKey}
            onChange={e => setSbKey(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '0.85rem'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Tip: Leave empty to run in 100% Offline / Local mode.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Manager Access PIN (4 Digits)
          </label>
          <input
            type="text"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value)}
            style={{
              width: '120px',
              padding: '0.6rem',
              borderRadius: '8px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '1.1rem',
              textAlign: 'center',
              fontWeight: 700
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: isSaved ? 'var(--primary-emerald)' : 'var(--primary-emerald-dark)',
              color: '#fff',
              fontWeight: 700,
              padding: '0.75rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isSaved ? <Check size={18} /> : null}
            {isSaved ? 'Saved!' : 'Save Configuration'}
          </button>

          <button
            onClick={handleCleanData}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger-red)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clean Data
          </button>
        </div>
      </div>
    </div>
  );
}
