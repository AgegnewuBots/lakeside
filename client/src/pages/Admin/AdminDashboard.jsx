import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentEthiopianDate } from '../../utils/ethiopianDate';
import {
  Users,
  GraduationCap,
  Send,
  Calendar,
  BarChart3,
  UserCheck,
  TrendingUp,
  Activity,
  Award,
  Layers,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentEthDate] = useState(() => getCurrentEthiopianDate());
  const notify = useNotify();
  const { isDark } = useTheme();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, classesRes, studentsRes, rankingsRes] = await Promise.all([
        api.get('/audit/stats'),
        api.get('/academic/classes'),
        api.get('/students'),
        api.get('/rankings').catch(() => ({ rankings: [] }))
      ]);

      setStats(statsRes);
      setClasses(classesRes || []);
      setStudents(studentsRes || []);
      setRankings(rankingsRes?.rankings || []);
    } catch (err) {
      notify.error(err.message || 'Failed to load dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Grade & KG Enrollment Distribution
  const gradeDistribution = classes.map(c => {
    const totalInGrade = c.sections?.reduce((acc, s) => acc + (s.student_count || 0), 0) || 0;
    return {
      id: c.id,
      name: c.name,
      grade_level: c.grade_level,
      count: totalInGrade
    };
  });
  const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
  const totalEnrolled = students.length;

  // 2. Gender Ratio Distribution
  const maleStudents = students.filter(s => s.gender === 'Male').length;
  const femaleStudents = students.filter(s => s.gender === 'Female').length;
  const malePct = totalEnrolled > 0 ? Math.round((maleStudents / totalEnrolled) * 100) : 0;
  const femalePct = totalEnrolled > 0 ? (100 - malePct) : 0;

  // 3. Section Capacity & Roster Balance (A, B, C, D, E)
  const sectionCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  classes.forEach(c => {
    c.sections?.forEach(sec => {
      const letter = sec.name?.trim().toUpperCase();
      if (sectionCounts[letter] !== undefined) {
        sectionCounts[letter] += (sec.student_count || 0);
      }
    });
  });
  const maxSectionCount = Math.max(...Object.values(sectionCounts), 1);

  // 4. Academic Standing Tiers
  const highHonors = rankings.filter(r => (r.average_percentage || 0) >= 85).length;
  const satisfactory = rankings.filter(r => (r.average_percentage || 0) >= 50 && (r.average_percentage || 0) < 85).length;
  const needsSupport = rankings.filter(r => (r.average_percentage || 0) < 50).length;
  const totalRanked = rankings.length;

  // 5. Intake Classification (New Intake vs Existing)
  const newIntakeCount = students.filter(s => !s.is_existing_student).length;
  const existingCount = students.filter(s => s.is_existing_student).length;
  const newIntakePct = totalEnrolled > 0 ? Math.round((newIntakeCount / totalEnrolled) * 100) : 0;
  const existingPct = totalEnrolled > 0 ? (100 - newIntakePct) : 0;

  // 6. SMS Telemetry Health
  const totalSmsSent = stats?.sms_success_count || 0;
  const totalSmsFailed = stats?.sms_failed_count || 0;
  const totalSms = totalSmsSent + totalSmsFailed;
  const smsSuccessPct = totalSms > 0 ? Math.round((totalSmsSent / totalSms) * 100) : 100;

  return (
    <div>
      {/* Executive Academic Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: isDark ? '#111827' : '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(15,23,42,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #0B192C',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img src="/logo.png" alt="Lake Side Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Lake Side Academy Institutional Analytics
            </h2>
            <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
              Academic Operations, Enrolled Rosters, Section Balance & Assessment Telemetry
            </p>
          </div>
        </div>

        {/* Current Ethiopian Date Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: isDark ? '#0F172A' : '#F8FAFC',
          padding: '0.5rem 0.9rem',
          borderRadius: '8px',
          border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0'
        }}>
          <Calendar size={18} color="#0D9488" />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              Academic Year {currentEthDate.year} E.C.
            </div>
            <div style={{ fontSize: '0.92rem', fontFamily: 'monospace', fontWeight: 800, color: isDark ? '#38BDF8' : '#0F766E' }}>
              {currentEthDate.formatted} ({currentEthDate.monthName})
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 Real Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Total Students Enrolled
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {stats ? stats.total_students : 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
            Active Registered Intake
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Curriculum Faculty
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {stats ? stats.total_teachers : 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600, marginTop: '0.25rem' }}>
            Assigned Teachers
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Total Parents & Guardians
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {stats ? stats.total_parents : 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600, marginTop: '0.25rem' }}>
            Primary SMS Recipients
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            SMS Deliveries
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {stats ? stats.sms_success_count : 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600, marginTop: '0.25rem' }}>
            EthioTelecom Gateway
          </div>
        </div>
      </div>

      {/* 6 Visual Analytics Graphs Suite */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* GRAPH 1: Grade & KG Enrollment Distribution Bar Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={17} color="#0D9488" /> Grade & KG Enrollment Distribution
            </div>
            <span style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              {classes.length} Levels Configured
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, justifyContent: 'center' }}>
            {gradeDistribution.map(g => {
              const pct = maxGradeCount > 0 ? ((g.count / maxGradeCount) * 100) : 0;
              const isKg = g.name.startsWith('KG');
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {g.name} {isKg ? '(Kindergarten)' : ''}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: isDark ? '#38BDF8' : '#0F766E' }}>
                      {g.count} {g.count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: isDark ? '#1E293B' : '#F1F5F9',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.max(pct, g.count > 0 ? 6 : 0)}%`,
                      height: '100%',
                      background: isKg ? 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)' : 'linear-gradient(90deg, #0D9488 0%, #14B8A6 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRAPH 2: Gender Ratio Distribution Meter */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={17} color="#2563EB" /> Student Gender Demographics
            </div>
            <span style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              Total: {totalEnrolled}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
            {/* Visual dual bar */}
            <div>
              <div style={{
                height: '18px',
                borderRadius: '9px',
                background: isDark ? '#1E293B' : '#E2E8F0',
                display: 'flex',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
              }}>
                <div
                  style={{
                    width: `${totalEnrolled > 0 ? malePct : 50}%`,
                    background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
                    transition: 'width 0.5s ease'
                  }}
                  title={`Male: ${maleStudents} (${malePct}%)`}
                />
                <div
                  style={{
                    width: `${totalEnrolled > 0 ? femalePct : 50}%`,
                    background: 'linear-gradient(90deg, #EC4899 0%, #F472B6 100%)',
                    transition: 'width 0.5s ease'
                  }}
                  title={`Female: ${femaleStudents} (${femalePct}%)`}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563EB', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} /> Male: {maleStudents} ({malePct}%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EC4899', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EC4899' }} /> Female: {femaleStudents} ({femalePct}%)
                </span>
              </div>
            </div>

            {/* Metric highlight blocks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{
                background: isDark ? '#0F172A' : '#EFF6FF',
                border: isDark ? '1px solid #1E293B' : '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, textTransform: 'uppercase' }}>Male Cohort</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#1E40AF', marginTop: '0.1rem' }}>{maleStudents}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>{malePct}% of total intake</div>
              </div>

              <div style={{
                background: isDark ? '#0F172A' : '#FDF2F8',
                border: isDark ? '1px solid #1E293B' : '1px solid #FBCFE8',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#DB2777', fontWeight: 700, textTransform: 'uppercase' }}>Female Cohort</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#F472B6' : '#9D174D', marginTop: '0.1rem' }}>{femaleStudents}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>{femalePct}% of total intake</div>
              </div>
            </div>
          </div>
        </div>

        {/* GRAPH 3: Section Roster Balance (Sections A - E) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={17} color="#7C3AED" /> Section Balance & Class Capacity
            </div>
            <span style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              Sections A through E
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
            {['A', 'B', 'C', 'D', 'E'].map(sec => {
              const count = sectionCounts[sec] || 0;
              const pct = maxSectionCount > 0 ? ((count / maxSectionCount) * 100) : 0;
              return (
                <div key={sec}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155' }}>
                      Section {sec} (All Grades)
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7C3AED' }}>
                      {count} {count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: isDark ? '#1E293B' : '#F1F5F9',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRAPH 4: Academic Performance Standing Tiers */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={17} color="#D97706" /> Academic Standing & Grade Tiers
            </div>
            <button onClick={() => onNavigate('rankings')} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
              Rankings Engine
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#059669' }}>High Distinction / Honors (&ge;85%)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>{highHonors}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${totalRanked > 0 ? (highHonors / totalRanked) * 100 : 0}%`, height: '100%', background: '#059669' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#0D9488' }}>Satisfactory Academic Standing (50% - 84%)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0D9488' }}>{satisfactory}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${totalRanked > 0 ? (satisfactory / totalRanked) * 100 : 0}%`, height: '100%', background: '#0D9488' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>Academic Support Required (&lt;50%)</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#DC2626' }}>{needsSupport}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${totalRanked > 0 ? (needsSupport / totalRanked) * 100 : 0}%`, height: '100%', background: '#DC2626' }} />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', marginTop: '0.5rem' }}>
              {totalRanked > 0 ? `${totalRanked} evaluated students in active gradebook` : 'No marks entered yet (0 evaluated).'}
            </div>
          </div>
        </div>

        {/* GRAPH 5: Student Intake Classification (New vs Promoted) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={17} color="#059669" /> Enrollment Classification
            </div>
            <span style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              Intake Source
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              <div style={{
                background: isDark ? '#0F172A' : '#ECFDF5',
                border: isDark ? '1px solid #1E293B' : '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>New Intake</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#065F46', marginTop: '0.1rem' }}>{newIntakeCount}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>{newIntakePct}% of total intake</div>
              </div>

              <div style={{
                background: isDark ? '#0F172A' : '#F1F5F9',
                border: isDark ? '1px solid #1E293B' : '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Existing / Promoted</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#E2E8F0' : '#1E293B', marginTop: '0.1rem' }}>{existingCount}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>{existingPct}% of total intake</div>
              </div>
            </div>

            <div>
              <div style={{
                height: '10px',
                borderRadius: '5px',
                background: isDark ? '#1E293B' : '#E2E8F0',
                display: 'flex',
                overflow: 'hidden'
              }}>
                <div style={{ width: `${newIntakePct}%`, background: '#059669', transition: 'width 0.4s ease' }} />
                <div style={{ width: `${existingPct}%`, background: '#64748B', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* GRAPH 6: SMS Telemetry & Gateway Reliability */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={17} color="#0D9488" /> SMS Gateway Reliability
            </div>
            <span style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B' }}>
              SMSEthiopia Telemetry
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{
                background: isDark ? '#0F172A' : '#F0FDFA',
                border: isDark ? '1px solid #1E293B' : '1px solid #CCFBF1',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase' }}>Delivered</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0D9488', marginTop: '0.1rem' }}>{totalSmsSent}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>Delivered to parents</div>
              </div>

              <div style={{
                background: isDark ? '#0F172A' : '#FEF2F2',
                border: isDark ? '1px solid #1E293B' : '1px solid #FECDD3',
                borderRadius: '8px',
                padding: '0.85rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>Failed / Undelivered</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626', marginTop: '0.1rem' }}>{totalSmsFailed}</div>
                <div style={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>Delivery issues</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155' }}>Delivery Success Rate</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0D9488' }}>{smsSuccessPct}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${smsSuccessPct}%`, height: '100%', background: '#0D9488', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
