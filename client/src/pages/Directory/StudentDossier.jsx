import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import DiffViewer from '../../components/DiffViewer';
import {
  ArrowLeft,
  User,
  Phone,
  GraduationCap,
  History,
  Trophy,
  Send,
  ShieldAlert,
  Printer,
  Calendar,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function StudentDossier({ studentId, onBack }) {
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const notify = useNotify();
  const { isDark } = useTheme();

  useEffect(() => {
    if (studentId) {
      loadDossier(studentId);
    }
  }, [studentId]);

  const loadDossier = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/students/${id}`);
      setDossier(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dossier) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#64748B' }}>
        <div>Loading student profile...</div>
      </div>
    );
  }

  const {
    overview,
    parents = [],
    academic_results = [],
    academic_summary = { total_score: 0, total_max: 0, average_percentage: 0 },
    academic_history = [],
    sms_history = [],
    audit_history = []
  } = dossier;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'parents', label: 'Parent Information', icon: Phone },
    { id: 'results', label: 'Academic Results', icon: GraduationCap },
    { id: 'history', label: 'Academic History', icon: History },
    { id: 'rankings', label: 'Rankings & Performance', icon: Trophy },
    { id: 'sms', label: 'SMS History', icon: Send },
    { id: 'audit', label: 'Audit History', icon: ShieldAlert }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Student Profile Header Banner */}
      <div style={{
        background: isDark ? '#111827' : '#FFFFFF',
        border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.04)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary btn-sm">
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #0B192C',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="Lake Side Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                {overview.full_name}
              </h2>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: '#0D9488',
                color: '#FFFFFF',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px'
              }}>
                ID: {overview.student_id}
              </span>
              <span className="badge badge-success">{overview.status || 'Active'}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: isDark ? '#94A3B8' : '#64748B', marginTop: '0.25rem' }}>
              Class: <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>{overview.section_full_name}</strong> • Academic Year: <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>{overview.academic_year_name}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Printer size={15} /> Print Dossier
        </button>
      </div>

      {/* 7-Tab Navigation */}
      <div className="tabs-nav" style={{ marginBottom: '1.25rem' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tab-btn ${isActive ? 'active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon size={15} /> {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Card 1: Student Profile */}
          <div className="card">
            <h3 className="card-title">Student Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>5-Digit Student ID:</span>
                <strong style={{ fontFamily: 'monospace', color: '#0D9488', fontSize: '1rem' }}>{overview.student_id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Full Name:</span>
                <strong>{overview.full_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Gender:</span>
                <strong>{overview.gender}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Date of Birth:</span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {formatToEthiopian(overview.date_of_birth, 'short')}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Registration Date:</span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {formatToEthiopian(overview.registration_date, 'short')}
                </strong>
              </div>
            </div>
          </div>

          {/* Card 2: Current Enrollment */}
          <div className="card">
            <h3 className="card-title">Current Enrollment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Current Class:</span>
                <strong>{overview.class_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Assigned Section:</span>
                <span className="badge badge-primary">{overview.section_full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Roll Number:</span>
                <strong>#{overview.roll_number || '1'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9', paddingBottom: '0.55rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Academic Year:</span>
                <strong>{overview.academic_year_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Student Classification:</span>
                <span className="badge badge-slate">{overview.is_existing_student ? 'Existing / Promoted' : 'New Intake'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARENT INFORMATION */}
      {activeTab === 'parents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {parents.length > 0 ? (
            parents.map(p => (
              <div key={p.id} className="card" style={{ borderLeft: p.is_primary ? '4px solid #0D9488' : '4px solid #CBD5E1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                      {p.full_name}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                      {p.relationship} • {p.occupation || 'Guardian'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {p.is_primary ? <span className="badge badge-success">Primary Contact</span> : null}
                    {p.sms_enabled ? <span className="badge badge-gold">SMS Active</span> : null}
                  </div>
                </div>

                <div style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number (SMS)</div>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: isDark ? '#38BDF8' : '#0F172A' }}>
                      {p.phone_number}
                    </strong>
                  </div>
                </div>

                {/* Sibling / Connected Children under this parent */}
                {p.children && p.children.length > 0 && (
                  <div style={{
                    background: isDark ? '#0F172A' : '#F8FAFC',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={13} color="#0D9488" /> Connected Children in Academy ({p.children.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {p.children.map(c => (
                        <div key={c.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                            {c.student_name} <span style={{ color: '#0D9488', fontFamily: 'monospace' }}>({c.student_code})</span>
                          </span>
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            {c.class_section || 'Enrolled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
              No parent contacts registered for this student.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACADEMIC RESULTS */}
      {activeTab === 'results' && (
        <div>
          {/* Summary Metric Header */}
          <div style={{
            background: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem 2rem',
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: '1.25rem',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.04)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Score Obtained
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D97706', marginTop: '0.2rem' }}>
                {academic_summary.total_score} <span style={{ fontSize: '0.9rem', color: isDark ? '#64748B' : '#94A3B8' }}>/ {academic_summary.total_max}</span>
              </div>
            </div>
            <div style={{ width: '1px', background: isDark ? '#1E293B' : '#E2E8F0' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                Academic Average
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                {academic_summary.average_percentage}%
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Assessment</th>
                  <th>Term</th>
                  <th>Marks Obtained</th>
                  <th>Max Points</th>
                  <th>Percentage</th>
                  <th>Entered By</th>
                </tr>
              </thead>
              <tbody>
                {academic_results.length > 0 ? (
                  academic_results.map(m => {
                    const pct = m.max_marks > 0 ? ((m.marks_obtained / m.max_marks) * 100).toFixed(1) : 0;
                    return (
                      <tr key={m.mark_id}>
                        <td>
                          <div style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>{m.subject_name}</div>
                          <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>{m.subject_code}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.assessment_name}</div>
                        </td>
                        <td>{m.term_name}</td>
                        <td>
                          {m.is_absent ? (
                            <span className="badge badge-danger">Absent</span>
                          ) : (
                            <strong style={{ fontSize: '1.05rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>{m.marks_obtained}</strong>
                          )}
                        </td>
                        <td>{m.max_marks}</td>
                        <td>
                          <span className={`badge ${pct >= 75 ? 'badge-success' : pct >= 50 ? 'badge-primary' : 'badge-danger'}`}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                          {m.entered_by_name}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                      No assessment marks entered for this student yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ACADEMIC HISTORY */}
      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title">Enrollment & Progression Timeline</h3>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Historical record of previous grades, classes, and placements across academic years.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {academic_history.length > 0 ? (
              academic_history.map((h, idx) => (
                <div key={h.id} style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '8px',
                  border: isDark
                    ? `1px solid ${h.is_current ? '#1E3A8A' : '#1E293B'}`
                    : `1px solid ${h.is_current ? '#93C5FD' : '#E2E8F0'}`,
                  background: isDark
                    ? (h.is_current ? '#0F172A' : '#111827')
                    : (h.is_current ? '#EFF6FF' : '#F8FAFC'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: h.is_current ? '#2563EB' : '#94A3B8',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {academic_history.length - idx}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {h.section_full_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                        Academic Year: <strong>{h.academic_year_name}</strong> • Status: <strong>{h.status}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    {h.is_current ? (
                      <span className="badge badge-primary">Current Active Enrollment</span>
                    ) : (
                      <span className="badge badge-success">Archived Record</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                No past academic history records found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RANKINGS & PERFORMANCE */}
      {activeTab === 'rankings' && (
        <div className="card">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} color="#D97706" /> Academic Performance & Standing
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
            <div style={{
              padding: '1.5rem',
              background: isDark ? '#1C1917' : '#FFFBEB',
              borderRadius: '10px',
              border: isDark ? '1px solid #78350F' : '1px solid #FCD34D',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: isDark ? '#FCD34D' : '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Marks Obtained
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: isDark ? '#FBBF24' : '#B45309', margin: '0.5rem 0' }}>
                {academic_summary.total_score}
              </div>
              <div style={{ fontSize: '0.8rem', color: isDark ? '#D97706' : '#92400E' }}>
                Out of {academic_summary.total_max} max possible points
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              background: isDark ? '#064E3B' : '#ECFDF5',
              borderRadius: '10px',
              border: isDark ? '1px solid #047857' : '1px solid #A7F3D0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: isDark ? '#A7F3D0' : '#065F46', fontWeight: 700, textTransform: 'uppercase' }}>
                Overall Percentage
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: isDark ? '#34D399' : '#047857', margin: '0.5rem 0' }}>
                {academic_summary.average_percentage}%
              </div>
              <div style={{ fontSize: '0.8rem', color: isDark ? '#6EE7B7' : '#065F46' }}>
                {academic_summary.average_percentage >= 75 ? 'Distinction Honor Tier' : academic_summary.average_percentage >= 50 ? 'Satisfactory Standing' : 'Needs Academic Support'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SMS HISTORY */}
      {activeTab === 'sms' && (
        <div className="card">
          <h3 className="card-title">Parent SMS Dispatches</h3>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Official log of all SMS messages sent to registered guardian phone numbers for this student.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ethiopian Date</th>
                  <th>Broadcast Title</th>
                  <th>Recipient Phone</th>
                  <th>Message Content</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sms_history.length > 0 ? (
                  sms_history.map(sms => (
                    <tr key={sms.id}>
                      <td style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B', whiteSpace: 'nowrap' }}>
                        {formatToEthiopian(sms.sent_at, 'short')}
                      </td>
                      <td>
                        <strong>{sms.broadcast_title}</strong>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{sms.phone_number}</td>
                      <td style={{ fontSize: '0.85rem' }}>{sms.message_content}</td>
                      <td>
                        <span className="badge badge-success">{sms.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                      No SMS notifications dispatched for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="card">
          <h3 className="card-title">Profile & Assessment Audit Trail</h3>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Immutable trace of changes to student demographic details, marks, and section placements.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {audit_history.length > 0 ? (
              audit_history.map(a => (
                <div key={a.id} style={{
                  background: isDark ? '#0F172A' : '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge badge-primary">{a.action}</span>
                      <span style={{ marginLeft: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                        by {a.user_name} ({a.user_role})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B' }}>
                      {formatToEthiopian(a.created_at, 'short')}
                    </span>
                  </div>

                  <DiffViewer oldValues={a.old_values} newValues={a.new_values} />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                No audit modification records for this student.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
