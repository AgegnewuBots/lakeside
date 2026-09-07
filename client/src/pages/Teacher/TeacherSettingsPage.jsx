import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  KeyRound,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  BookOpen,
  Award,
  Eye,
  EyeOff
} from 'lucide-react';

export default function TeacherSettingsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const { isDark } = useTheme();

  // Profile Form
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Assignments & Profile Info
  const [assignments, setAssignments] = useState([]);
  const [teacherDetails, setTeacherDetails] = useState(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setPhone(user.phone || '');
    }
    loadTeacherInfo();
  }, [user]);

  const loadTeacherInfo = async () => {
    try {
      const res = await api.get('/teachers/my-assignments');
      setAssignments(res.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  // Submit Profile & Username update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      notify.error('Username cannot be empty.');
      return;
    }
    if (username.trim().length < 3) {
      notify.error('Username must be at least 3 characters.');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        username: username.trim(),
        phone: phone.trim()
      });

      if (res.token) {
        localStorage.setItem('lakeside_token', res.token);
      }
      notify.success(res.message || 'Login credentials and profile updated successfully!');
    } catch (err) {
      notify.error(err.message || 'Failed to update credentials.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Submit Password update
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      notify.error('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      notify.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.put('/auth/profile', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.token) {
        localStorage.setItem('lakeside_token', res.token);
      }
      notify.success('Password changed successfully! Please use your new password next time.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      notify.error(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Theme tokens
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#0F172A' : '#FFFFFF';
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <KeyRound size={26} color="#7C3AED" />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: textPrimary, margin: 0 }}>
              Teacher Account & Security Settings
            </h2>
          </div>
          <p style={{ color: textSecondary, fontSize: '0.92rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Manage your personal login credentials, username, password, and institutional contact details
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        {/* Card 1: Teacher Profile Information */}
        <div className="card" style={{ background: cardBg, borderColor: cardBorder, borderTop: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE',
              color: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: textPrimary, margin: 0 }}>
                {user?.full_name || 'Faculty Member'}
              </h3>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem', marginTop: '3px' }}>
                Verified Faculty Teacher
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: isDark ? '#1E293B' : '#F8FAFC', border: isDark ? '1px solid #334155' : '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', color: textSecondary, marginBottom: '2px' }}>Role & System Privilege</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: textPrimary }}>
                {user?.role ? user.role.toUpperCase() : 'TEACHER'} (Scoped to Assigned Classes)
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '8px', background: isDark ? '#1E293B' : '#F8FAFC', border: isDark ? '1px solid #334155' : '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.75rem', color: textSecondary, marginBottom: '6px' }}>Assigned Teaching Sections ({assignments.length})</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {assignments.length > 0 ? (
                  assignments.map(a => (
                    <span
                      key={a.id}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isDark ? 'rgba(124, 58, 237, 0.25)' : '#EDE9FE',
                        color: isDark ? '#DDD6FE' : '#6D28D9',
                        border: isDark ? '1px solid #6D28D9' : '1px solid #C4B5FD'
                      }}
                    >
                      {a.section_full_name} ({a.subject_code})
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: textSecondary }}>No classes currently assigned.</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>
                Login Username
              </label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. abebe"
                required
              />
              <span style={{ fontSize: '0.72rem', color: textSecondary, marginTop: '3px', display: 'block' }}>
                Used to log into the Teacher Workspace. Must be unique.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>
                Phone Number
              </label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0911234567"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', background: '#7C3AED', borderColor: '#7C3AED' }}
              disabled={updatingProfile}
            >
              <Save size={16} />
              <span>{updatingProfile ? 'Saving Changes...' : 'Save Profile & Username'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Security & Password Update */}
        <div className="card" style={{ background: cardBg, borderColor: cardBorder, borderTop: '4px solid #10B981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: textPrimary, margin: 0 }}>
                Security & Password
              </h3>
              <span style={{ fontSize: '0.8rem', color: textSecondary }}>
                Update your account password
              </span>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            {/* Current Password */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: textSecondary
                  }}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: textSecondary, marginTop: '3px', display: 'block' }}>
                Required to authorize password changes
              </span>
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: textSecondary
                  }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', background: '#10B981', borderColor: '#10B981' }}
              disabled={changingPassword}
            >
              <Lock size={16} />
              <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
