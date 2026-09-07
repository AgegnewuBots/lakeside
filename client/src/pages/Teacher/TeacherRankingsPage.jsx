import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Filter, Award, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TeacherRankingsPage() {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState([]);
  const [years, setYears] = useState([]);
  const [rankingsData, setRankingsData] = useState({ summary: {}, rankings: [] });
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('ALL');
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState(''); // "assignmentId"

  useEffect(() => {
    loadTeacherContext();
  }, []);

  const loadTeacherContext = async () => {
    try {
      const [assignRes, yRes] = await Promise.all([
        api.get('/teachers/my-assignments'),
        api.get('/academic/years')
      ]);

      const assignList = assignRes.assignments || (Array.isArray(assignRes) ? assignRes : []);
      setAssignments(assignList);
      setYears(yRes || []);

      const curYear = yRes?.find(y => y.is_current);
      if (curYear) setSelectedYear(curYear.id);

      if (assignList && assignList.length > 0) {
        const first = assignList[0];
        setSelectedAssignmentKey(String(first.id));
        fetchRankings(curYear?.id, 'ALL', first.class_id, first.section_id, first.subject_id);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to initialize teacher ranking scope.');
    }
  };

  const fetchRankings = async (yId, assessName, cId, sId, subId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yId) params.append('academic_year_id', yId);
      if (assessName) params.append('assessment_name', assessName);
      if (cId) params.append('class_ids', cId);
      if (sId) params.append('section_ids', sId);
      if (subId) params.append('subject_id', subId);

      const res = await api.get(`/rankings?${params.toString()}`);
      setRankingsData(res);
    } catch (err) {
      notify.error(err.message || 'Failed to compute class rankings.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (!selectedAssignmentKey) {
      notify.warning('Please select an assigned class and subject.');
      return;
    }
    const targetAssign = assignments.find(a => String(a.id) === String(selectedAssignmentKey));
    if (targetAssign) {
      fetchRankings(selectedYear, selectedAssessment, targetAssign.class_id, targetAssign.section_id, targetAssign.subject_id);
    }
  };

  const currentAssignment = assignments.find(a => String(a.id) === String(selectedAssignmentKey));
  const assignedSubjectName = currentAssignment?.subject_name || 'Assigned Subject';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={28} color="#F59E0B" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Subject Standings & Student Rankings
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Pure numeric competition ranking (1, 2, 3...) scoped strictly to your assigned teaching subject
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: isDark ? '#111827' : '#F8FAFC', border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0', padding: '1.25rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
            color: '#0D9488',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
          }}>
            Academic Year: 2018 E.C. (Active)
          </span>

          {currentAssignment && (
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              background: '#EDE9FE',
              color: '#6D28D9',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px'
            }}>
              Subject: {assignedSubjectName} ({currentAssignment.subject_code})
            </span>
          )}
        </div>

        <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>Assigned Class & Section</label>
            <select
              className="form-control"
              value={selectedAssignmentKey}
              onChange={(e) => setSelectedAssignmentKey(e.target.value)}
              required
            >
              <option value="">-- Choose Assigned Class & Subject --</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.section_full_name} — {a.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 600 }}>Assessment Benchmark</label>
            <select
              className="form-control"
              value={selectedAssessment}
              onChange={(e) => setSelectedAssessment(e.target.value)}
            >
              <option value="ALL">All Configured Assessments (Total 100)</option>
              <option value="Mid">Midterm Examination</option>
              <option value="Final">Final Examination</option>
              <option value="Tests">Continuous Assessment Tests</option>
              <option value="F.Mid">First Semester Midterm</option>
              <option value="F.Final">First Semester Final</option>
              <option value="S.Mid">Second Semester Midterm</option>
              <option value="S.Final">Second Semester Final</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#0D9488', borderColor: '#0D9488' }}
              disabled={loading}
            >
              <Filter size={16} />
              {loading ? 'Computing...' : 'Calculate Rankings'}
            </button>
          </div>
        </form>
      </div>

      {/* Summary KPI Cards */}
      {rankingsData.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #1E3A8A', padding: '1rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Total Students Enrolled</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1E3A8A' }}>
              {rankingsData.summary.total_students || 0}
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #059669', padding: '1rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Subject Average (out of 100%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>
              {rankingsData.summary.average_mark || 0}%
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #F59E0B', padding: '1rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Ranked Students (Top Tier)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706' }}>
              {rankingsData.summary.total_ranked || 0}
            </div>
          </div>
        </div>
      )}

      {/* Rankings Table (Subject-Scoped, Clean Numbers 1, 2, 3...) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748B' }}>
            Computing ranking standings for {assignedSubjectName}...
          </div>
        ) : rankingsData.rankings.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <AlertCircle size={40} color="#94A3B8" style={{ marginBottom: '1rem' }} />
            <h4 style={{ color: '#475569' }}>No ranking data found for this selection</h4>
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
              Ensure marks have been entered for {assignedSubjectName} in this class and section.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                  <th>Student Full Name</th>
                  <th>Student ID</th>
                  <th>Class & Section</th>
                  <th>Subject</th>
                  <th style={{ textAlign: 'center' }}>Score (out of 100)</th>
                  <th style={{ textAlign: 'center' }}>Academic Standing</th>
                </tr>
              </thead>
              <tbody>
                {rankingsData.rankings.map((r) => {
                  const numRank = typeof r.rank === 'number' ? r.rank : parseInt(r.rank, 10);
                  const isTop10 = numRank > 0 && numRank <= 10;
                  const isTop3 = numRank > 0 && numRank <= 3;

                  // Score for this teacher's subject
                  const subMarkObj = r.subject_marks?.[assignedSubjectName];
                  const displayScore = subMarkObj ? subMarkObj.score : r.average_percentage;

                  let rankBadgeStyle = { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
                  if (numRank === 1) rankBadgeStyle = { background: '#FEF3C7', color: '#B45309', border: '2px solid #F59E0B' };
                  else if (numRank === 2) rankBadgeStyle = { background: '#F3F4F6', color: '#374151', border: '2px solid #9CA3AF' };
                  else if (numRank === 3) rankBadgeStyle = { background: '#FFEDD5', color: '#9A3412', border: '2px solid #F97316' };
                  else if (isTop10) rankBadgeStyle = { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD' };

                  const isPromoted = displayScore >= 50;

                  return (
                    <tr key={r.student_id} style={isTop3 ? { background: isDark ? '#172554' : '#F8FAFC' } : {}}>
                      <td style={{ textAlign: 'center' }}>
                        {numRank ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            ...rankBadgeStyle
                          }}>
                            {numRank}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {r.full_name}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {r.student_code}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: isDark ? '#CBD5E1' : '#334155' }}>
                          {r.class_name} - {r.section_name}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary">
                          {assignedSubjectName}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: displayScore >= 75 ? '#059669' : displayScore >= 50 ? '#1E293B' : '#DC2626' }}>
                          {displayScore !== undefined ? `${displayScore} / 100` : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isPromoted ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                          {isPromoted ? 'Promoted (Pass)' : 'Detained (< 50%)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
