import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { Users, BookOpen, Search, Eye, CheckCircle2, Award } from 'lucide-react';

export default function MyClassesPage({ onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewGradesStudent, setViewGradesStudent] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/students'),
        api.get('/teachers/my-assignments')
      ]);
      setStudents(sRes);
      setAssignments(aRes.assignments || []);
    } catch (err) {
      notify.error(err.message || 'Failed to load assigned students.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGrades = async (student) => {
    setViewGradesStudent(student);
    setLoadingGrades(true);
    try {
      const res = await api.get(`/students/${student.id}`);
      setGradesData(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load student grades.');
    } finally {
      setLoadingGrades(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesQuery = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.student_id.includes(searchQuery);
    const matchesSection = selectedSection ? String(s.section_id) === String(selectedSection) : true;
    return matchesQuery && matchesSection;
  });

  // Unique sections from teacher assignments
  const uniqueSections = [];
  const seenSecs = new Set();
  for (const a of assignments) {
    if (!seenSecs.has(a.section_id)) {
      seenSecs.add(a.section_id);
      uniqueSections.push(a);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={26} color="#7C3AED" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>
              My Assigned Classes & Students
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Strictly scoped student roster for your assigned classes and sections
          </p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assigned students by name or ID..."
            />
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>Section:</span>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="">All My Assigned Sections</option>
              {uniqueSections.map(u => (
                <option key={u.section_id} value={u.section_id}>{u.section_full_name}</option>
              ))}
            </select>
          </div>

          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#7C3AED', fontWeight: 700 }}>
            {filteredStudents.length} Students in Scope
          </span>
        </div>
      </div>

      {/* Student Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Full Name</th>
              <th style={{ textAlign: 'center' }}>Gender</th>
              <th>Class & Section</th>
              <th>Roll #</th>
              <th>Parent Phone</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7C3AED', background: '#F5F3FF', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {s.student_id}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{s.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>DOB: {s.date_of_birth}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    background: s.gender === 'Female' ? '#FDF2F8' : '#EFF6FF',
                    color: s.gender === 'Female' ? '#DB2777' : '#2563EB',
                    border: `1px solid ${s.gender === 'Female' ? '#FBCFE8' : '#BFDBFE'}`
                  }}>
                    {s.gender === 'Female' ? 'F' : 'M'}
                  </span>
                </td>
                <td>
                  <span className="badge badge-primary">{s.section_full_name}</span>
                </td>
                <td>#{s.roll_number || '1'}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{s.parent_name || '—'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>{s.parent_phone || '—'}</div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => handleOpenGrades(s)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                  >
                    <Eye size={14} /> View Grades
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Student Grades Dossier Modal */}
      {viewGradesStudent && (
        <Modal
          isOpen={!!viewGradesStudent}
          onClose={() => setViewGradesStudent(null)}
          title={`Academic Grade Dossier: ${viewGradesStudent.full_name} (${viewGradesStudent.student_id})`}
          maxWidth="750px"
        >
          {loadingGrades ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              Loading student assessments and marks...
            </div>
          ) : gradesData ? (
            <div>
              {/* Student Summary Strip */}
              <div style={{
                background: '#0B192C',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Enrolled Class</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {viewGradesStudent.class_name} — Section {viewGradesStudent.section_name}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Total Score</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F59E0B' }}>
                      {gradesData.academic_summary?.total_score || 0} / {gradesData.academic_summary?.total_max || 0}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Cumulative Average</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10B981' }}>
                      {gradesData.academic_summary?.average_percentage || 0}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Academic Standing</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: (gradesData.academic_summary?.average_percentage || 0) >= 50 ? '#34D399' : '#EF4444' }}>
                      {(gradesData.academic_summary?.average_percentage || 0) >= 50 ? 'Promoted' : 'Detained'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Marks Table */}
              <div className="table-responsive">
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assessment</th>
                      <th style={{ textAlign: 'center' }}>Max Score</th>
                      <th style={{ textAlign: 'center' }}>Score Obtained</th>
                      <th style={{ textAlign: 'center' }}>Score %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradesData.academic_results && gradesData.academic_results.length > 0 ? (
                      gradesData.academic_results.map((m, idx) => {
                        const pct = m.max_marks > 0 && !m.is_absent && m.marks_obtained !== null
                          ? ((m.marks_obtained / m.max_marks) * 100).toFixed(1)
                          : null;
                        const isPass = pct !== null && parseFloat(pct) >= 50;

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>
                              {m.subject_name}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{m.assessment_name}</span>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{m.term_name}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748B' }}>
                              {m.max_marks} pts
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {m.is_absent ? (
                                <span className="badge badge-danger">Absent</span>
                              ) : (
                                <strong style={{ fontSize: '1rem', color: '#0F172A' }}>
                                  {m.marks_obtained !== null ? m.marks_obtained : '—'}
                                </strong>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {pct !== null ? (
                                <span className={`badge ${isPass ? 'badge-success' : 'badge-danger'}`}>
                                  {pct}%
                                </span>
                              ) : '—'}
                            </td>
                            <td>
                              {m.is_absent ? (
                                <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 600 }}>Unattended</span>
                              ) : isPass ? (
                                <span style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 700 }}>Pass</span>
                              ) : pct !== null ? (
                                <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 700 }}>Needs Support</span>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                          No recorded assessment marks found for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
                <button onClick={() => setViewGradesStudent(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>
              Failed to load grades for this student.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
