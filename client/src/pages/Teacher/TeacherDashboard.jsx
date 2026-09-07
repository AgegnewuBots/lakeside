import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { 
  BookOpen, 
  Users, 
  ClipboardList, 
  Trophy, 
  Send, 
  History, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function TeacherDashboard({ onNavigate, onSelectClass }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const res = await api.get('/teachers/my-assignments');
      setAssignments(res.assignments || []);
    } catch (err) {
      notify.error(err.message || 'Failed to load teacher assignments.');
    } finally {
      setLoading(false);
    }
  };

  const uniqueSubjects = new Set(assignments.map(a => a.subject_name));

  return (
    <div>
      {/* Top Header Bar (Section 43) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        background: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #7C3AED',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="Lake Side Academy Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Good morning, {user?.full_name || 'Faculty Member'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.15rem 0 0 0' }}>
              Your assigned classes, gradebook, and student performance overview.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onNavigate('marks')} className="btn btn-gold btn-sm">
            <ClipboardList size={15} /> Enter Marks
          </button>
          <button onClick={() => onNavigate('sms')} className="btn btn-secondary btn-sm" style={{ color: '#7C3AED' }}>
            <Send size={15} /> Send Class SMS
          </button>
        </div>
      </div>

      {/* Summary Cards (Section 43) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.15rem',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Assigned Classes
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
            {assignments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7C3AED', fontWeight: 600, marginTop: '0.25rem' }}>
            ● Active Sections
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.15rem',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Assigned Subjects
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
            {uniqueSubjects.size}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, marginTop: '0.25rem' }}>
            ● Curriculum Disciplines
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.15rem',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Roster Status
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
            Verified
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
            ● Strict Scope Enforced
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.15rem',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Parent SMS Gateway
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }}>
            Ready
          </div>
          <div style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600, marginTop: '0.25rem' }}>
            ● Class-Level Broadcast
          </div>
        </div>
      </div>

      {/* Main Section: My Classes (Section 43) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">My Assigned Classes & Rosters</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Select any class to review enrolled students or record assessment marks
            </span>
          </div>
          <span className="badge badge-primary">
            {assignments.length} Official Sections
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          {assignments.map(a => (
            <div 
              key={a.id} 
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F172A' }}>
                    {a.section_full_name}
                  </span>
                  <span className="badge badge-primary">{a.subject_code}</span>
                </div>
                <div style={{ color: '#7C3AED', fontWeight: 700, fontSize: '0.95rem' }}>
                  {a.subject_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.35rem' }}>
                  Academic Year: <strong>{a.academic_year_name}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onNavigate('classes')}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, fontSize: '0.8rem' }}
                >
                  <Users size={13} /> View Students
                </button>
                <button
                  onClick={() => onNavigate('marks')}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, background: '#7C3AED', borderColor: '#7C3AED', fontSize: '0.8rem' }}
                >
                  <ClipboardList size={13} /> Enter Marks
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
