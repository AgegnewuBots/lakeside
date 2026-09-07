import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Search, CheckCircle2, Award, Sparkles, AlertCircle } from 'lucide-react';

export default function RankingsPage({ isDirectoryView = false }) {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [rankingsData, setRankingsData] = useState({ summary: {}, rankings: [] });
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const notify = useNotify();
  const { isDark } = useTheme();

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('ALL');
  const [selectedRankingScope, setSelectedRankingScope] = useState('GRADE_1_8'); // 'GRADE_1_8', 'GRADES_1_4', 'GRADES_5_8', 'KG_1_3'
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  // Live tracking: Automatically trigger recalculation on filter changes
  useEffect(() => {
    if (selectedYear) {
      fetchLiveRankings(selectedYear, selectedAssessment, selectedRankingScope, selectedClassId);
    }
  }, [selectedYear, selectedAssessment, selectedRankingScope, selectedClassId]);

  const loadMetadata = async () => {
    try {
      const [cRes, yRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/academic/years')
      ]);
      setClasses(cRes || []);
      setYears(yRes || []);

      const curYear = yRes.find(y => y.is_current);
      if (curYear) setSelectedYear(curYear.id);
    } catch (err) {
      notify.error(err.message || 'Failed to initialize ranking filters.');
    }
  };

  const fetchLiveRankings = async (yId, assessName, scope, classId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yId) params.append('academic_year_id', yId);
      if (assessName) params.append('assessment_name', assessName);
      if (scope) params.append('scope', scope);
      if (classId) params.append('class_ids', classId);

      const res = await api.get(`/rankings?${params.toString()}`);
      setRankingsData(res || { summary: {}, rankings: [] });
    } catch (err) {
      notify.error(err.message || 'Failed to compute live rankings.');
    } finally {
      setLoading(false);
    }
  };

  // Filter students instantly by search string
  const displayedRankings = useMemo(() => {
    const list = rankingsData.rankings || [];
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.student_code?.toLowerCase().includes(q) ||
      r.section_full_name?.toLowerCase().includes(q)
    );
  }, [rankingsData.rankings, searchFilter]);

  // Unique subject names across ranked students
  const allSubjectNames = Array.from(new Set(
    (rankingsData.rankings || []).flatMap(r => Object.keys(r.subject_marks || {}))
  ));

  // Top 3 students for podium presentation
  const top3Students = (rankingsData.rankings || []).filter(r => r.is_top_3 && r.qualified).slice(0, 3);

  return (
    <div>
      {/* Title & Live Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={28} color="#F59E0B" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Live Academic Rankings
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Live-tracking leaderboard with competition tie-breaking (1 A, 1 B, 3 C) and 50 marks minimum threshold
          </p>
        </div>

        {/* Live Indicator Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isDark ? '#0F172A' : '#F0FDF4',
          border: isDark ? '1px solid #1E293B' : '1px solid #BBF7D0',
          padding: '0.4rem 0.8rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#15803D'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          {loading ? 'Recalculating Live...' : 'Live Tracking Active'}
        </div>
      </div>

      {/* Filter Toolbar (Auto-updates without Compute button) */}
      <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid #F59E0B', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
            color: '#D97706',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #FDE68A'
          }}>
            Academic Year: 2018 E.C. (Active)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* 1. Scope Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Ranking Scope</label>
            <select
              className="form-control"
              value={selectedRankingScope}
              onChange={(e) => {
                setSelectedRankingScope(e.target.value);
                setSelectedClassId('');
              }}
            >
              <option value="GRADE_1_8">Grade 1 - 8 (Elementary All)</option>
              <option value="GRADES_1_4">Grades 1 - 4 (Primary Lower)</option>
              <option value="GRADES_5_8">Grades 5 - 8 (Primary Upper)</option>
              <option value="KG_1_3">KG 1 - KG 3 (Kindergarten)</option>
            </select>
          </div>

          {/* 2. Class / Grade Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Class / Grade</label>
            <select
              className="form-control"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">All Classes in Scope</option>
              <optgroup label="Kindergarten">
                {classes.filter(c => c.name.startsWith('KG')).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Primary School (Grades 1 - 8)">
                {classes.filter(c => !c.name.startsWith('KG')).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 3. Assessment Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Assessment Benchmark</label>
            <select
              className="form-control"
              value={selectedAssessment}
              onChange={(e) => setSelectedAssessment(e.target.value)}
            >
              <option value="ALL">All Configured Assessments</option>
              <option value="Mid">Mid Examination</option>
              <option value="Final">Final Examination</option>
              <option value="Tests">Tests</option>
              <option value="F.Mid">F.Mid (First Sem. Mid)</option>
              <option value="F.Final">F.Final (First Sem. Final)</option>
              <option value="F.Tests">F.Tests (First Sem. Tests)</option>
              <option value="S.Mid">S.Mid (Second Sem. Mid)</option>
              <option value="S.Final">S.Final (Second Sem. Final)</option>
              <option value="S.Tests">S.Tests (Second Sem. Tests)</option>
            </select>
          </div>

          {/* 4. Live Search Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Find Student</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Type name or ID..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3Students.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {top3Students.map((s, idx) => {
            const isFirst = s.rank_number === 1;
            const isSecond = s.rank_number === 2;
            const isThird = s.rank_number === 3;
            const badgeColor = isFirst ? '#F59E0B' : isSecond ? '#94A3B8' : '#B45309';
            const bgGrad = isFirst ? (isDark ? '#2E1E05' : '#FFFBEB') : (isDark ? '#0F172A' : '#F8FAFC');

            return (
              <div
                key={s.student_id}
                className="card"
                style={{
                  background: bgGrad,
                  border: isFirst ? '2px solid #F59E0B' : isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: isFirst ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: badgeColor,
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {s.rank}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: 800, textTransform: 'uppercase' }}>
                    {isFirst ? '1st Place Winner' : isSecond ? '2nd Place' : '3rd Place'}
                  </div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {s.full_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                    {s.section_full_name} • <strong style={{ color: '#0D9488' }}>{s.average_percentage}%</strong> ({s.total_obtained} pts)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cohort Summary Strip */}
      <div style={{
        background: '#0B192C',
        color: '#FFFFFF',
        borderRadius: '10px',
        padding: '1rem 1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase' }}>Active Scope</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {selectedRankingScope === 'GRADE_1_8' ? 'Grades 1 – 8 (Elementary)' :
               selectedRankingScope === 'GRADES_1_4' ? 'Grades 1 – 4 (Lower Primary)' :
               selectedRankingScope === 'GRADES_5_8' ? 'Grades 5 – 8 (Upper Primary)' : 'KG 1 – KG 3 (Kindergarten)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase' }}>Qualified & Ranked</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38BDF8' }}>
              {rankingsData.summary?.total_ranked || 0} Students
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase' }}>Cohort Average</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10B981' }}>
              {rankingsData.summary?.average_mark || 0}%
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '0.74rem',
          color: '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <CheckCircle2 size={14} color="#10B981" />
          <span>Minimum 50 marks threshold enforced for Top 10 rankings</span>
        </div>
      </div>

      {/* Rankings Data Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '90px', textAlign: 'center' }}>Rank</th>
              <th>Student</th>
              <th>Class & Section</th>
              <th>Total Marks</th>
              <th>Average %</th>
              {allSubjectNames.map(subName => (
                <th key={subName}>{subName}</th>
              ))}
              <th>Parent Phone</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6 + allSubjectNames.length} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748B' }}>
                  Updating live rankings...
                </td>
              </tr>
            ) : displayedRankings.length > 0 ? (
              displayedRankings.map(student => {
                const isTop3 = student.is_top_3;
                const isTop10 = student.is_top_10;
                const isFirst = student.rank_number === 1;

                return (
                  <tr
                    key={student.student_id}
                    style={{
                      background: isFirst ? (isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB') :
                                  isTop3 ? (isDark ? 'rgba(56, 189, 248, 0.04)' : '#F0FDFA') : 'inherit'
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      {student.qualified ? (
                        <div style={{
                          minWidth: 44,
                          height: 32,
                          padding: '0 8px',
                          borderRadius: '6px',
                          background: isFirst ? '#F59E0B' :
                                      student.rank_number === 2 ? '#94A3B8' :
                                      student.rank_number === 3 ? '#B45309' :
                                      isTop10 ? '#0F766E' : (isDark ? '#1E293B' : '#F1F5F9'),
                          color: (isTop3 || isTop10) ? '#FFFFFF' : (isDark ? '#CBD5E1' : '#475569'),
                          fontWeight: 900,
                          fontSize: isTop10 ? '0.95rem' : '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          letterSpacing: '0.02em',
                          boxShadow: isTop3 ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                        }}>
                          {student.rank}
                        </div>
                      ) : (
                        <span className="badge badge-slate" style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem' }}>
                          &lt; 50 pts
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: isTop10 ? 800 : 600, color: isDark ? '#FFFFFF' : '#0F172A', fontSize: isTop10 ? '0.96rem' : '0.9rem' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                        ID: {student.student_code} • {student.gender}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{student.section_full_name}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {student.total_obtained} <span style={{ fontSize: '0.75rem', color: '#64748B' }}>/ {student.total_max}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        student.average_percentage >= 85 ? 'badge-success' :
                        student.average_percentage >= 50 ? 'badge-primary' : 'badge-danger'
                      }`} style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        {student.average_percentage}%
                      </span>
                    </td>
                    {allSubjectNames.map(subName => {
                      const sMark = student.subject_marks?.[subName];
                      return (
                        <td key={subName} style={{ fontSize: '0.82rem' }}>
                          {sMark ? (
                            <div>
                              <strong>{sMark.obtained}</strong> <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>/{sMark.max}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {student.parent_phone || '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6 + allSubjectNames.length} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8' }}>
                  No students ranked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
