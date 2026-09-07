import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Settings, 
  Save, 
  Shield, 
  Smartphone, 
  School,
  Sun,
  Moon,
  CheckCircle2,
  Zap,
  RefreshCw,
  Palette
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    school_name: 'Lake Side Academy',
    school_motto: 'Excellence in Knowledge, Integrity in Character | በትምህርት የላቀ፣ በግብረገብ የታነጸ',
    school_phone: '+251 11 654 3210',
    school_address: 'Lake Side Campus, Addis Ababa, Ethiopia',
    sms_provider: 'SMSETHIOPIA',
    sms_sender_id: 'LAKESIDE'
  });
  const [gatewayInfo, setGatewayInfo] = useState(null);
  const [testingGateway, setTestingGateway] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    loadSettings();
    loadGatewayStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadGatewayStatus = async () => {
    try {
      const res = await api.get('/sms/provider-status');
      setGatewayInfo(res);
    } catch (err) {
      console.error('Failed to query gateway info:', err);
    }
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    try {
      const res = await api.get('/sms/provider-status');
      setGatewayInfo(res);
      if (res.live_gateway_configured) {
        notify.success('SMSEthiopia API v2 Gateway is online and authenticated!');
      } else {
        notify.info('Gateway status: ' + res.provider);
      }
    } catch (err) {
      notify.error('Gateway ping error: ' + err.message);
    } finally {
      setTestingGateway(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', { settings });
      notify.success('School settings updated successfully!');
    } catch (err) {
      notify.error(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={26} color="#2563EB" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>
              System & School Settings
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Manage Lake Side Academy branding, contact details, and SMS Gateway configuration
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* School Identity Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '2px solid #0B192C',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/logo.png" alt="Lake Side Academy Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              Official Academy Identity & Branding
            </h3>
            <span className="badge badge-primary">Active Institutional Profile</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Official School Name</label>
              <input
                type="text"
                className="form-control"
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">School Motto</label>
              <input
                type="text"
                className="form-control"
                value={settings.school_motto}
                onChange={(e) => setSettings({ ...settings, school_motto: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Main Office Phone</label>
              <input
                type="text"
                className="form-control"
                value={settings.school_phone}
                onChange={(e) => setSettings({ ...settings, school_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Campus Physical Address</label>
            <input
              type="text"
              className="form-control"
              value={settings.school_address}
              onChange={(e) => setSettings({ ...settings, school_address: e.target.value })}
            />
          </div>
        </div>

        {/* SMS Gateway Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={18} color="#D97706" /> Parent SMS Gateway Configuration
            </h3>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
              Ethio Telecom Gateway (Live)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Active SMS Provider Mode</label>
              <select
                className="form-control"
                value={settings.sms_provider}
                onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
              >
                <option value="SMSETHIOPIA">SMSEthiopia API v2 (Ethio Telecom Gateway — Active Production)</option>
                <option value="SIMULATOR">Local Parent Phone Simulator (Development & Live Testing)</option>
                <option value="TWILIO">Twilio SMS Gateway</option>
                <option value="AFRICASTALKING">Africa's Talking SMS Gateway</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sender ID (Alpha-Numeric)</label>
              <input
                type="text"
                className="form-control"
                value={settings.sms_sender_id}
                onChange={(e) => setSettings({ ...settings, sms_sender_id: e.target.value.toUpperCase() })}
                maxLength={11}
                required
              />
            </div>
          </div>

          {/* Live Gateway Diagnostics Status */}
          <div style={{
            background: isDark ? '#111A2E' : '#F8FAFC',
            border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Gateway Status: {gatewayInfo?.provider || 'SMSEthiopia API v2'}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                  {gatewayInfo?.live_gateway_configured ? 'Authenticated & Online' : 'Active'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                Endpoint: https://smsethiopia.com/api/v2/sms/send • Rate Limit: Gateway Level
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestGateway}
              className="btn btn-secondary btn-sm"
              disabled={testingGateway}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <RefreshCw size={14} className={testingGateway ? 'animate-spin' : ''} />
              <span>{testingGateway ? 'Testing Connection...' : 'Test Gateway Ping'}</span>
            </button>
          </div>
        </div>

        {/* Institutional Theme & Appearance Settings Card */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Palette size={18} color="#7C3AED" /> System Appearance & Theme Preferences
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div 
              onClick={() => setTheme('light')}
              style={{
                background: !isDark ? '#EFF6FF' : (isDark ? '#151F32' : '#FFFFFF'),
                border: !isDark ? '2px solid #2563EB' : '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Sun size={24} color="#D97706" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Light Mode</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Clean, bright school office interface</div>
              </div>
            </div>

            <div 
              onClick={() => setTheme('dark')}
              style={{
                background: isDark ? '#111A2E' : '#F8FAFC',
                border: isDark ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Moon size={24} color="#FBBF24" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Dark Mode</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Subdued obsidian palette for night grading</div>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          <Save size={18} />
          <span>{saving ? 'Saving Settings...' : 'Save School Configuration'}</span>
        </button>
      </form>
    </div>
  );
}
