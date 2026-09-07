import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentEthiopianDate, formatToEthiopian } from '../../utils/ethiopianDate';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Calendar,
  Layers,
  Phone,
  BarChart3,
  Filter,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function DirectoryDashboard({ onNavigate, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parentsCount, setParentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentEthDate] = useState(() => getCurrentEthiopianDate());
  const [activeTab, setActiveTab] = useState('demographics'); // 'demographics' | 'recent'
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const notify = useNotify();
  const { isDark } = useTheme();

  useEffect(() => {
    loadDirectoryData();
  }, []);

  const loadDirectoryData = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes, parentsRes] = await Promise.all([
        api.get('/students'),
        api.get('/academic/classes'),
        api.get('/parents').catch(() => [])
      ]);
      setStudents(studentsRes || []);
      setClasses(classesRes || []);
      setParentsCount(Array.isArray(parentsRes) ? parentsRes.length : 0);
    } catch (err) {
      notify.error(err.message || 'Failed to load directory records.');
    } finally {
      setLoading(false);
    }
  };

  const totalStudents = students.length;
  const maleStudents = students.filter(s => s.gender === 'Male').length;
  const femaleStudents = students.filter(s => s.gender === 'Female').length;

  // Flatten all sections with computed demographics
  const sectionDemographics = useMemo(() => {
    const list = [];
    classes.forEach(c => {
      (c.sections || []).forEach(sec => {
        const secStudents = students.filter(s => String(s.section_id) === String(sec.id));
        const m = secStudents.filter(s => s.gender === 'Male').length;
        const f = secStudents.filter(s => s.gender === 'Female').length;
        const tot = secStudents.length;

        // Calculate birth years
        const years = secStudents
          .map(s => {
            if (!s.date_of_birth) return null;
            const y = parseInt(s.date_of_birth.substring(0, 4), 10);
            return isNaN(y) ? null : y;
          })
          .filter(Boolean);

        const minYear = years.length ? Math.min(...years) : null;
        const maxYear = years.length ? Math.max(...years) : null;
        const yearSpan = minYear
          ? (minYear === maxYear ? `${minYear} E.C.` : `${minYear} – ${maxYear} E.C.`)
          : '—';

        list.push({
          classId: c.id,
          className: c.name,
          gradeLevel: c.grade_level,
          sectionId: sec.id,
          sectionName: sec.name,
          fullName: sec.full_name || `${c.name} - Section ${sec.name}`,
          maleCount: m,
          femaleCount: f,
          total: tot,
          maleRatio: tot > 0 ? Math.round((m / tot) * 100) : 0,
          femaleRatio: tot > 0 ? Math.round((f / tot) * 100) : 0,
          yearSpan
        });
      });
    });
    return list;
  }, [classes, students]);

  const filteredSections = useMemo(() => {
    if (selectedClassFilter === 'ALL') return sectionDemographics;
    if (selectedClassFilter === 'KG') {
      return sectionDemographics.filter(s => s.gradeLevel < 1 || s.className.startsWith('KG'));
    }
    if (selectedClassFilter === 'PRIMARY') {
      return sectionDemographics.filter(s => s.gradeLevel >= 1 && s.gradeLevel <= 8);
    }
    return sectionDemographics.filter(s => String(s.classId) === String(selectedClassFilter));
  }, [sectionDemographics, selectedClassFilter]);

  const totalSectionsCount = sectionDemographics.length;
  const recentStudents = students.slice(0, 10);

  return (
    <div>
      {/* Header & Ethiopian Date Banner */}
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
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '2px solid #0D9488',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img src="/logo.png" alt="Lake Side Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Records Office Directory
            </h2>
            <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
              Official Student Registry, Class Rosters, Guardian Contacts & Demographic Analytics
            </p>
          </div>
        </div>

        {/* Current Ethiopian Date Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: isDark ? '#0F172A' : '#F8FAFC',
          padding: '0.45rem 0.85rem',
          borderRadius: '8px',
          border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0'
        }}>
          <Calendar size={16} color="#0D9488" />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
              Academic Year {currentEthDate.year} E.C.
            </div>
            <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 800, color: isDark ? '#38BDF8' : '#0F766E' }}>
              {currentEthDate.formatted} ({currentEthDate.monthName})
            </div>
          </div>
        </div>
      </div>

      {/* Real Metric Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card 1: Enrolled Students */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Enrolled Students
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {totalStudents}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              M: {maleStudents}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DB2777', background: isDark ? 'rgba(219,39,119,0.15)' : '#FDF2F8', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              F: {femaleStudents}
            </span>
          </div>
        </div>

        {/* Card 2: Curriculum Classes & Sections */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Academic Structure
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {classes.length} Classes
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0D9488', fontWeight: 600, marginTop: '0.25rem' }}>
            {totalSectionsCount} Active Sections (KG 1 – Grade 8)
          </div>
        </div>

        {/* Card 3: Capacity Standard */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Roster Compliance
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0D9488', marginTop: '0.2rem' }}>
            15 / Section
          </div>
          <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>
            Standard Class Cohort Size
          </div>
        </div>

        {/* Card 4: Parent Registry */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Registered Guardians
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {parentsCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 600, marginTop: '0.25rem' }}>
            SMS-Enabled Guardian Network
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => onNavigate('students-list')}
          className="btn btn-primary"
          style={{ background: '#0D9488', borderColor: '#0D9488' }}
        >
          <Users size={16} /> Open Student List
        </button>
        <button
          onClick={() => onNavigate('register')}
          className="btn btn-secondary"
        >
          <UserPlus size={16} /> Register Student
        </button>
        <button
          onClick={() => onNavigate('parents')}
          className="btn btn-secondary"
        >
          <Phone size={16} /> Parent Directory
        </button>
      </div>

      {/* Main Section: Tabs for Demographic Matrix & Recent Students */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '0.85rem',
          borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('demographics')}
              className={`btn btn-sm ${activeTab === 'demographics' ? 'btn-primary' : 'btn-secondary'}`}
              style={activeTab === 'demographics' ? { background: '#0D9488', borderColor: '#0D9488' } : {}}
            >
              <BarChart3 size={14} /> Class & Section Demographic Matrix
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`btn btn-sm ${activeTab === 'recent' ? 'btn-primary' : 'btn-secondary'}`}
              style={activeTab === 'recent' ? { background: '#0D9488', borderColor: '#0D9488' } : {}}
            >
              <Users size={14} /> Recent Registrations ({students.length})
            </button>
          </div>

          {/* Scope Filter for Demographic Matrix */}
          {activeTab === 'demographics' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B' }}>Filter:</span>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
              >
                <option value="ALL">All Sections ({sectionDemographics.length})</option>
                <option value="KG">Kindergarten (KG 1 – KG 3)</option>
                <option value="PRIMARY">Primary School (Grades 1 – 8)</option>
                <optgroup label="Individual Classes">
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: Class & Section Demographic Matrix */}
        {activeTab === 'demographics' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: isDark ? '#0F172A' : '#F8FAFC',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: isDark ? '#94A3B8' : '#64748B'
            }}>
              <div>
                Showing <strong>{filteredSections.length} sections</strong> | Enrolled:{' '}
                <strong style={{ color: '#0D9488' }}>
                  {filteredSections.reduce((acc, s) => acc + s.total, 0)} Students
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563EB', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} /> Male (M)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#DB2777', fontWeight: 700 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DB2777' }} /> Female (F)
                </span>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Grade / Level</th>
                    <th>Section</th>
                    <th style={{ textAlign: 'center' }}>Male (M)</th>
                    <th style={{ textAlign: 'center' }}>Female (F)</th>
                    <th style={{ textAlign: 'center' }}>Total Enrolled</th>
                    <th style={{ width: '220px' }}>Gender Balance</th>
                    <th>Birth Year Span</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.length > 0 ? (
                    filteredSections.map(sec => (
                      <tr key={sec.sectionId}>
                        <td style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {sec.className}
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ fontWeight: 800 }}>
                            Section {sec.sectionName}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            color: '#2563EB',
                            background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px'
                          }}>
                            {sec.maleCount}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            color: '#DB2777',
                            background: isDark ? 'rgba(219,39,119,0.15)' : '#FDF2F8',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px'
                          }}>
                            {sec.femaleCount}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            color: sec.total === 15 ? '#0D9488' : '#F59E0B'
                          }}>
                            {sec.total}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              flex: 1,
                              height: '8px',
                              borderRadius: '4px',
                              background: isDark ? '#1E293B' : '#E2E8F0',
                              display: 'flex',
                              overflow: 'hidden'
                            }}>
                              <div style={{ width: `${sec.maleRatio}%`, background: '#2563EB' }} title={`Male: ${sec.maleRatio}%`} />
                              <div style={{ width: `${sec.femaleRatio}%`, background: '#DB2777' }} title={`Female: ${sec.femaleRatio}%`} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B', whiteSpace: 'nowrap' }}>
                              {sec.maleRatio}% / {sec.femaleRatio}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: isDark ? '#CBD5E1' : '#475569' }}>
                          {sec.yearSpan}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onNavigate('students-list')}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            Open Roster <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                        No sections found matching selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Recent Enrolled Students */}
        {activeTab === 'recent' && (
          <div>
            {recentStudents.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th style={{ textAlign: 'center' }}>Gender</th>
                      <th>Class & Section</th>
                      <th>Parent / Guardian</th>
                      <th>Registration Date</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudents.map(s => (
                      <tr key={s.id}>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#0D9488',
                            background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {s.student_id}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {s.full_name}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            color: s.gender === 'Female' ? '#DB2777' : '#2563EB',
                            background: isDark
                              ? (s.gender === 'Female' ? 'rgba(219,39,119,0.15)' : 'rgba(37,99,235,0.15)')
                              : (s.gender === 'Female' ? '#FDF2F8' : '#EFF6FF'),
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px'
                          }}>
                            {s.gender === 'Female' ? 'F' : s.gender === 'Male' ? 'M' : s.gender}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-primary">{s.section_full_name}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.parent_name || '—'}</div>
                          <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748B' }}>
                            {s.parent_phone || ''}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B' }}>
                          {formatToEthiopian(s.registration_date, 'long')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onSelectStudent ? onSelectStudent(s.id) : onNavigate('students-list')}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <Eye size={12} /> Dossier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                No students enrolled yet. Click "Register Student" to enroll your first student.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
