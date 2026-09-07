import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { Lock, User, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onCancel, targetPortal }) {
  const { login } = useAuth();
  const notify = useNotify();
  const { isDark } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      notify.error('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(username.trim(), password);
      notify.success(`Welcome back, ${loggedUser.full_name}!`);
      if (onLoginSuccess) {
        onLoginSuccess(loggedUser.role);
      }
    } catch (err) {
      notify.error(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: isDark ? '#080C1A' : '#FFFFFF'
    }}>
      <div style={{
        background: cardBg,
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '390px',
        width: '100%',
        boxShadow: isDark ? '0 20px 40px -10px rgba(0,0,0,0.6)' : '0 10px 30px -5px rgba(0,0,0,0.06)',
        border: `1px solid ${cardBorder}`
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem auto',
            overflow: 'hidden'
          }}>
            <img
              src="/logo.png"
              alt="Lake Side Academy Crest"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: textPrimary, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Lake Side Academy
          </h2>
          <div style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: targetPortal === 'teacher'
              ? (isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE')
              : targetPortal === 'id-manager' || targetPortal === 'id-lookup'
              ? (isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE')
              : targetPortal === 'directory' || targetPortal === 'records'
              ? (isDark ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1')
              : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
            color: targetPortal === 'teacher'
              ? '#7C3AED'
              : targetPortal === 'id-manager' || targetPortal === 'id-lookup'
              ? '#0284C7'
              : targetPortal === 'directory' || targetPortal === 'records'
              ? '#0D9488'
              : '#D97706',
            marginTop: '2px'
          }}>
            {targetPortal === 'teacher' ? 'Faculty & Teacher Workspace' :
             targetPortal === 'id-manager' || targetPortal === 'id-lookup' ? 'School ID Manager • Identity & Badges' :
             targetPortal === 'directory' ? 'Director Portal & Executive Leadership' :
             targetPortal === 'records' ? 'Records Office & Registrar' :
             targetPortal === 'admin' ? 'Administrative Gateway' :
             'Institutional Authentication Gateway'}
          </div>
        </div>

        {/* Real Production Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: textSecondary }}>
              Username or Staff ID
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color={textSecondary} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.25rem', fontSize: '0.88rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: textSecondary }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color={textSecondary} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.25rem', fontSize: '0.88rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.65rem', fontSize: '0.9rem', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        {onCancel && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: textSecondary,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <ArrowLeft size={13} /> Back to School Portal
            </button>
          </div>
        )}

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: `1px solid ${cardBorder}`,
          textAlign: 'center',
          color: textSecondary,
          fontSize: '0.72rem'
        }}>
          Protected by role-based institutional access control.
        </div>
      </div>
    </div>
  );
}
