import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { ClipboardList, Save, CheckCircle2, Search, PlusCircle, Edit3, X, Sparkles, Plus, AlertCircle, Award } from 'lucide-react';

export default function MarkEntryPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [assessmentData, setAssessmentData] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notify = useNotify();

  // Subject assessment configuration & summary state
  const [subjectSummary, setSubjectSummary] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentType, setAssessmentType] = useState('Test');
  const [assessmentName, setAssessmentName] = useState('Test 1');
  const [assessmentMaxMarks, setAssessmentMaxMarks] = useState('15');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  // Add / Edit Single Mark Modal state
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [modalSearchStudent, setModalSearchStudent] = useState('');
  const [modalSelectedStudentId, setModalSelectedStudentId] = useState('');
  const [modalAssessmentId, setModalAssessmentId] = useState('');
  const [modalScore, setModalScore] = useState('');
  const [modalIsAbsent, setModalIsAbsent] = useState(false);
  const [modalRemarks, setModalRemarks] = useState('');
  const [savingSingleMark, setSavingSingleMark] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const res = await api.get('/teachers/my-assignments');
      setAssignments(res.assignments || []);
      if (res.assignments && res.assignments.length > 0) {
        setSelectedAssignmentId(res.assignments[0].id);
        loadAssessmentsForAssignment(res.assignments[0]);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load teacher assignments.');
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentsForAssignment = async (assignment) => {
    try {
      const [assessRes, summaryRes] = await Promise.all([
        api.get(`/assessments?class_id=${assignment.class_id}&section_id=${assignment.section_id}&subject_id=${assignment.subject_id}`),
        api.get(`/assessments/subject-summary?class_id=${assignment.class_id}&section_id=${assignment.section_id}&subject_id=${assignment.subject_id}`).catch(() => null)
      ]);
      setAssessments(assessRes || []);
      setSubjectSummary(summaryRes || null);
      if (assessRes && assessRes.length > 0) {
        setSelectedAssessmentId(assessRes[0].id);
        setModalAssessmentId(assessRes[0].id);
        loadMarksheet(assessRes[0].id);
      } else {
        setAssessmentData(null);
        setStudentMarks([]);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load assessments.');
    }
  };

  const handleOpenCreateAssessment = () => {
    const curAssign = assignments.find(a => String(a.id) === String(selectedAssignmentId));
    if (!curAssign) {
      notify.error('Please select an assigned class and subject first.');
      return;
    }
    const remaining = subjectSummary ? subjectSummary.remaining_points : 100;
    if (remaining <= 0) {
      notify.error('This subject has already reached the maximum total limit of 100 points.');
      return;
    }

    const testCount = assessments.filter(a => a.name.toLowerCase().startsWith('test')).length;
    setAssessmentType('Test');
    setAssessmentName(`Test ${testCount + 1}`);
    setAssessmentMaxMarks(String(Math.min(15, remaining)));
    setAssessmentDate(new Date().toISOString().split('T')[0]);
    setIsAssessmentModalOpen(true);
  };

  const handleAssessmentTypeChange = (type) => {
    setAssessmentType(type);
    const remaining = subjectSummary ? subjectSummary.remaining_points : 100;
    if (type === 'Test') {
      const testCount = assessments.filter(a => a.name.toLowerCase().startsWith('test')).length;
      setAssessmentName(`Test ${testCount + 1}`);
      setAssessmentMaxMarks(String(Math.min(15, remaining)));
    } else if (type === 'Mid') {
      setAssessmentName('Midterm Examination');
      setAssessmentMaxMarks(String(Math.min(30, remaining)));
    } else if (type === 'Final') {
      setAssessmentName('Final Examination');
      setAssessmentMaxMarks(String(Math.min(50, remaining)));
    } else if (type === 'Bonus') {
      setAssessmentName('Bonus Project / Extra Credit');
      setAssessmentMaxMarks(String(Math.min(5, remaining)));
    } else if (type === 'NonAttended') {
      setAssessmentName('Non-attended Test');
      setAssessmentMaxMarks(String(Math.min(10, remaining)));
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    const curAssign = assignments.find(a => String(a.id) === String(selectedAssignmentId));
    if (!curAssign) return;

    const numMax = parseFloat(assessmentMaxMarks);
    if (isNaN(numMax) || numMax <= 0) {
      notify.error('Maximum marks must be a positive number greater than 0.');
      return;
    }

    const remaining = subjectSummary ? subjectSummary.remaining_points : 100;
    if (numMax > remaining) {
      notify.error(`Mark (${numMax}) exceeds remaining allowable points (${remaining}) to stay within the 100 total points limit.`);
      return;
    }

    setCreatingAssessment(true);
    try {
      const res = await api.post('/assessments', {
        class_id: curAssign.class_id,
        section_id: curAssign.section_id,
        subject_id: curAssign.subject_id,
        academic_year_id: curAssign.academic_year_id,
        name: assessmentName.trim(),
        assessment_type: assessmentType,
        max_marks: numMax,
        assessment_date: assessmentDate
      });

      notify.success(`Assessment '${assessmentName}' (Max: ${numMax} pts) created successfully!`);
      setIsAssessmentModalOpen(false);
      await loadAssessmentsForAssignment(curAssign);
      if (res && res.id) {
        setSelectedAssessmentId(res.id);
        setModalAssessmentId(res.id);
        loadMarksheet(res.id);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to create assessment.');
    } finally {
      setCreatingAssessment(false);
    }
  };

  const loadMarksheet = async (assessmentId) => {
    try {
      const res = await api.get(`/marks?assessment_id=${assessmentId}`);
      setAssessmentData(res.assessment);
      // Initialize marks editing state
      setStudentMarks(res.students.map(s => ({
        student_id: s.student_id,
        student_code: s.student_code,
        full_name: s.full_name,
        gender: s.gender,
        roll_number: s.roll_number,
        marks_obtained: s.marks_obtained !== null && s.marks_obtained !== undefined ? String(s.marks_obtained) : '',
        is_absent: !!s.is_absent,
        remarks: s.remarks || ''
      })));
    } catch (err) {
      notify.error(err.message || 'Failed to load marksheet.');
    }
  };

  const handleAssignmentChange = (e) => {
    const aid = e.target.value;
    setSelectedAssignmentId(aid);
    const assignObj = assignments.find(a => String(a.id) === String(aid));
    if (assignObj) {
      loadAssessmentsForAssignment(assignObj);
    }
  };

  const handleAssessmentChange = (e) => {
    const aid = e.target.value;
    setSelectedAssessmentId(aid);
    setModalAssessmentId(aid);
    loadMarksheet(aid);
  };

  const handleMarkChange = (studentId, value) => {
    setStudentMarks(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, marks_obtained: value, is_absent: false } : s
    ));
  };

  const handleAbsentToggle = (studentId, checked) => {
    setStudentMarks(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, is_absent: checked, marks_obtained: checked ? '' : s.marks_obtained } : s
    ));
  };

  // Open Add/Edit Mark Modal
  const handleOpenAddMarkModal = (student = null) => {
    if (student) {
      setModalSelectedStudentId(String(student.student_id));
      setModalScore(student.marks_obtained || '');
      setModalIsAbsent(student.is_absent);
      setModalRemarks(student.remarks || '');
    } else {
      setModalSelectedStudentId(studentMarks[0]?.student_id ? String(studentMarks[0].student_id) : '');
      setModalScore('');
      setModalIsAbsent(false);
      setModalRemarks('');
    }
    setModalAssessmentId(selectedAssessmentId);
    setModalSearchStudent('');
    setIsMarkModalOpen(true);
  };

  // Save single mark from modal
  const handleSaveModalMark = async (e) => {
    e.preventDefault();
    if (!modalSelectedStudentId || !modalAssessmentId) {
      notify.error('Please select both a student and an assessment benchmark.');
      return;
    }

    const currentAssess = assessments.find(a => String(a.id) === String(modalAssessmentId)) || assessmentData;
    const maxMarks = currentAssess?.max_marks || 100;

    if (!modalIsAbsent && modalScore !== '') {
      const num = parseFloat(modalScore);
      if (isNaN(num) || num < 0 || num > maxMarks) {
        notify.error(`Score (${num}) must be between 0 and maximum of ${maxMarks} points.`);
        return;
      }
    }

    setSavingSingleMark(true);
    try {
      await api.post('/marks/batch', {
        assessment_id: modalAssessmentId,
        entries: [{
          student_id: parseInt(modalSelectedStudentId, 10),
          marks_obtained: modalIsAbsent || modalScore === '' ? null : parseFloat(modalScore),
          is_absent: modalIsAbsent ? 1 : 0,
          remarks: modalRemarks.trim()
        }]
      });

      notify.success('Mark successfully updated and saved!');
      setIsMarkModalOpen(false);
      loadMarksheet(selectedAssessmentId);
    } catch (err) {
      notify.error(err.message || 'Failed to save mark.');
    } finally {
      setSavingSingleMark(false);
    }
  };

  const handleSaveMarks = async (e) => {
    e.preventDefault();
    if (!assessmentData) return;

    // Validate maximum marks
    for (const sm of studentMarks) {
      if (!sm.is_absent && sm.marks_obtained !== '') {
        const num = parseFloat(sm.marks_obtained);
        if (isNaN(num) || num < 0 || num > assessmentData.max_marks) {
          notify.error(`Mark for ${sm.full_name} (${num}) exceeds maximum allowed score of ${assessmentData.max_marks} points.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payloadEntries = studentMarks.map(sm => ({
        student_id: sm.student_id,
        marks_obtained: sm.is_absent || sm.marks_obtained === '' ? null : parseFloat(sm.marks_obtained),
        is_absent: sm.is_absent ? 1 : 0,
        remarks: sm.remarks
      }));

      await api.post('/marks/batch', {
        assessment_id: assessmentData.id,
        entries: payloadEntries
      });

      notify.success('Gradebook updated and successfully synced!');
      loadMarksheet(assessmentData.id);
    } catch (err) {
      notify.error(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // Filter student marks by search bar
  const filteredMarks = studentMarks.filter(sm => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return sm.full_name.toLowerCase().includes(q) ||
           sm.student_code.toLowerCase().includes(q) ||
           String(sm.roll_number).includes(q);
  });

  // Calculate live summary
  let enteredCount = 0;
  let totalScore = 0;
  for (const sm of studentMarks) {
    if (!sm.is_absent && sm.marks_obtained !== '') {
      enteredCount++;
      totalScore += parseFloat(sm.marks_obtained);
    }
  }
  const averageMark = enteredCount > 0 ? (totalScore / enteredCount).toFixed(1) : 0;
  const averagePct = assessmentData && assessmentData.max_marks > 0 && enteredCount > 0
    ? ((averageMark / assessmentData.max_marks) * 100).toFixed(1)
    : 0;

  // Selected modal student object
  const modalStudentObj = studentMarks.find(s => String(s.student_id) === String(modalSelectedStudentId));
  const modalAssessmentObj = assessments.find(a => String(a.id) === String(modalAssessmentId)) || assessmentData;

  // Filtered students for modal search
  const modalFilteredStudents = studentMarks.filter(s => {
    const mq = modalSearchStudent.toLowerCase().trim();
    if (!mq) return true;
    return s.full_name.toLowerCase().includes(mq) || s.student_code.includes(mq);
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardList size={26} color="#7C3AED" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Gradebook & Mark Entry
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Enter, review, and adjust student scores with instant validation and class average calculations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleOpenCreateAssessment}
            className="btn btn-primary"
            style={{ background: '#0D9488', borderColor: '#0D9488', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title="Configure dynamic tests, midterm, final, or bonus points (up to 100 max total)"
          >
            <Plus size={18} /> Configure Assessment / Bonus
          </button>
          {assessmentData && (
            <button
              type="button"
              onClick={() => handleOpenAddMarkModal()}
              className="btn btn-primary"
              style={{ background: '#7C3AED', borderColor: '#7C3AED', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <PlusCircle size={18} /> Add / Edit Mark
            </button>
          )}
        </div>
      </div>

      {/* Selectors Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid #7C3AED', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>My Assigned Class & Subject</label>
            <select
              className="form-control"
              value={selectedAssignmentId}
              onChange={handleAssignmentChange}
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.section_full_name} — {a.subject_name} ({a.subject_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Assessment Benchmark</label>
            <select
              className="form-control"
              value={selectedAssessmentId}
              onChange={handleAssessmentChange}
              disabled={assessments.length === 0}
            >
              {assessments.length > 0 ? (
                assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Max: {a.max_marks} pts) — {a.term_name} {a.assessment_type === 'Bonus' ? '[Bonus]' : ''}
                  </option>
                ))
              ) : (
                <option value="">No assessments configured for this class</option>
              )}
            </select>
          </div>
        </div>

        {/* Subject Assessment Allocation Strip (Max 100 Pts Rule) */}
        {subjectSummary && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={16} color="#7C3AED" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                  Subject Assessment Structure (Combined Max: 100 Pts)
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                <span style={{ color: subjectSummary.total_max_marks > 100 ? '#EF4444' : '#0D9488' }}>
                  {subjectSummary.total_max_marks} / 100 Pts Configured
                </span>
                {subjectSummary.remaining_points > 0 ? (
                  <span style={{ color: '#64748B', marginLeft: '0.5rem' }}>
                    ({subjectSummary.remaining_points} pts remaining)
                  </span>
                ) : (
                  <span style={{ color: '#10B981', marginLeft: '0.5rem' }}>
                    (✓ Full 100 Pts Allocated)
                  </span>
                )}
              </div>
            </div>

            {/* Allocation Progress Bar */}
            <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, subjectSummary.total_max_marks)}%`,
                background: subjectSummary.total_max_marks === 100 ? '#10B981' : (subjectSummary.total_max_marks > 100 ? '#EF4444' : '#7C3AED'),
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Assessment Benchmark Chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {subjectSummary.assessments?.map(a => {
                const isSelected = String(a.id) === String(selectedAssessmentId);
                const isBonus = a.assessment_type === 'Bonus' || a.name.toLowerCase().includes('bonus');
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssessmentId(a.id);
                      setModalAssessmentId(a.id);
                      loadMarksheet(a.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: `1.5px solid ${isSelected ? (isBonus ? '#F59E0B' : '#7C3AED') : '#CBD5E1'}`,
                      background: isSelected ? (isBonus ? '#FEF3C7' : '#EDE9FE') : '#FFFFFF',
                      color: isSelected ? (isBonus ? '#92400E' : '#6D28D9') : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isBonus && <Sparkles size={12} color="#D97706" />}
                    <span>{a.name}</span>
                    <span style={{ opacity: 0.75 }}>({a.max_marks} pts)</span>
                  </button>
                );
              })}

              {subjectSummary.remaining_points > 0 && (
                <button
                  type="button"
                  onClick={handleOpenCreateAssessment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px dashed #0D9488',
                    background: '#F0FDFA',
                    color: '#0D9488',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={13} /> Add Test / Bonus
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Marksheet Grid & Live Calculation Strip */}
      {assessmentData ? (
        <form onSubmit={handleSaveMarks}>
          {/* Summary Strip */}
          <div style={{
            background: '#0B192C',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '1.25rem 1.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Benchmark Max Score</div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#F59E0B' }}>
                  {assessmentData.max_marks} Points
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Marks Recorded</div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#FFFFFF' }}>
                  {enteredCount} / {studentMarks.length} Students
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Class Average (out of 100%)</div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#10B981' }}>
                  {averagePct}% <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>({averageMark} pts)</span>
                </div>
              </div>
              {(assessmentData.assessment_type === 'Bonus' || assessmentData.name.toLowerCase().includes('bonus')) && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid #F59E0B',
                  color: '#FCD34D',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Sparkles size={16} color="#F59E0B" /> Bonus Benchmark (Extra Credit)
                </div>
              )}
            </div>

            {/* Primary Save Button */}
            <button
              type="submit"
              className="btn btn-gold btn-lg"
              disabled={saving}
              style={{ fontWeight: 800, fontSize: '1.05rem', padding: '0.65rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Save and update gradebook marks"
            >
              <Save size={20} />
              <span>{saving ? 'Saving Marks...' : 'Save Marks'}</span>
            </button>
          </div>

          {/* Student Search Bar */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.92rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students in gradebook by full name, ID, or roll number..."
              />
              <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Roll #</th>
                  <th>Student ID</th>
                  <th>Student Full Name</th>
                  <th style={{ width: '170px' }}>Score (Max: {assessmentData.max_marks})</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Absent</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Score %</th>
                  <th>Remarks</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.length > 0 ? (
                  filteredMarks.map(sm => {
                    const numMark = parseFloat(sm.marks_obtained);
                    const isInvalid = !sm.is_absent && sm.marks_obtained !== '' && (numMark < 0 || numMark > assessmentData.max_marks);
                    const pct = !sm.is_absent && !isNaN(numMark) && assessmentData.max_marks > 0
                      ? ((numMark / assessmentData.max_marks) * 100).toFixed(1)
                      : null;

                    return (
                      <tr key={sm.student_id} style={isInvalid ? { background: '#FEF2F2' } : {}}>
                        <td style={{ fontWeight: 700, color: '#64748B' }}>#{sm.roll_number || '1'}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#7C3AED', background: '#F5F3FF', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {sm.student_code}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{sm.full_name}</strong>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-control"
                            style={{
                              width: '130px',
                              fontWeight: 800,
                              fontSize: '1rem',
                              borderColor: isInvalid ? '#EF4444' : '#CBD5E1'
                            }}
                            value={sm.marks_obtained}
                            onChange={(e) => handleMarkChange(sm.student_id, e.target.value)}
                            disabled={sm.is_absent}
                            placeholder={`0 - ${assessmentData.max_marks}`}
                          />
                          {isInvalid && (
                            <div style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700, marginTop: '0.2rem' }}>
                              Exceeds max {assessmentData.max_marks}!
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={sm.is_absent}
                            onChange={(e) => handleAbsentToggle(sm.student_id, e.target.checked)}
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            title="Mark as Absent"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {sm.is_absent ? (
                            <span className="badge badge-danger">Absent</span>
                          ) : pct !== null ? (
                            <span className={`badge ${parseFloat(pct) >= 50 ? 'badge-success' : 'badge-danger'}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                            value={sm.remarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentMarks(prev => prev.map(s => s.student_id === sm.student_id ? { ...s, remarks: val } : s));
                            }}
                            placeholder="Optional feedback"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenAddMarkModal(sm)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="Open Single Mark Modal"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                      No students matching search query "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </form>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: '#94A3B8' }}>
          Please select an assigned class with an active assessment to open the gradebook.
        </div>
      )}

      {/* Add / Edit Mark Modal */}
      {isMarkModalOpen && (
        <Modal
          isOpen={isMarkModalOpen}
          onClose={() => setIsMarkModalOpen(false)}
          title="Add / Edit Student Assessment Mark"
          maxWidth="550px"
        >
          <form onSubmit={handleSaveModalMark}>
            {/* Step 1: Search & Select Student */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Select Student</label>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.2rem', fontSize: '0.88rem' }}
                  value={modalSearchStudent}
                  onChange={(e) => setModalSearchStudent(e.target.value)}
                  placeholder="Filter student list..."
                />
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <select
                className="form-control"
                value={modalSelectedStudentId}
                onChange={(e) => {
                  const sid = e.target.value;
                  setModalSelectedStudentId(sid);
                  const st = studentMarks.find(s => String(s.student_id) === String(sid));
                  if (st) {
                    setModalScore(st.marks_obtained || '');
                    setModalIsAbsent(st.is_absent);
                    setModalRemarks(st.remarks || '');
                  }
                }}
                required
              >
                {modalFilteredStudents.map(s => (
                  <option key={s.student_id} value={s.student_id}>
                    #{s.roll_number || '1'} — {s.full_name} ({s.student_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Assessment Benchmark Selection */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Assessment Type</label>
              <select
                className="form-control"
                value={modalAssessmentId}
                onChange={(e) => setModalAssessmentId(e.target.value)}
                required
              >
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} — Max: {a.max_marks} pts ({a.term_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Score & Absent Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Score (Out of {modalAssessmentObj?.max_marks || 100} pts)
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={modalScore}
                  onChange={(e) => {
                    setModalScore(e.target.value);
                    setModalIsAbsent(false);
                  }}
                  disabled={modalIsAbsent}
                  placeholder={`e.g. 8 (out of ${modalAssessmentObj?.max_marks || 100})`}
                  style={{ fontWeight: 700, fontSize: '1.05rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Attendance</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', background: modalIsAbsent ? '#FEF2F2' : '#FFFFFF' }}>
                  <input
                    type="checkbox"
                    checked={modalIsAbsent}
                    onChange={(e) => {
                      setModalIsAbsent(e.target.checked);
                      if (e.target.checked) setModalScore('');
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: modalIsAbsent ? '#DC2626' : '#475569' }}>Absent</span>
                </label>
              </div>
            </div>

            {/* Step 4: Remarks */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Teacher Remarks</label>
              <input
                type="text"
                className="form-control"
                value={modalRemarks}
                onChange={(e) => setModalRemarks(e.target.value)}
                placeholder="e.g. Excellent improvement / Needs extra practice"
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsMarkModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-gold"
                disabled={savingSingleMark}
                style={{ fontWeight: 800 }}
              >
                <Save size={16} />
                <span>{savingSingleMark ? 'Saving...' : 'Save Mark'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dynamic Assessment Configuration Modal (Multiple Tests, Mid, Final, Bonus) */}
      {isAssessmentModalOpen && (
        <Modal
          isOpen={isAssessmentModalOpen}
          onClose={() => setIsAssessmentModalOpen(false)}
          title="Configure Subject Assessment Benchmark & Bonus"
        >
          <form onSubmit={handleCreateAssessment}>
            {/* Rule Notice */}
            <div style={{
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.86rem',
              color: '#0F766E'
            }}>
              <div style={{ fontWeight: 800, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} color="#0D9488" /> 100-Point Assessment System Policy
              </div>
              <div>
                Teachers can create tests multiple times (e.g. Test 1, Test 2, Quiz 1), midterms, finals, and bonus points. The combined maximum marks across all benchmarks for this subject cannot exceed 100 points.
              </div>
              <div style={{ marginTop: '0.4rem', fontWeight: 700, color: '#0D9488' }}>
                Remaining point allowance for this subject: <strong>{subjectSummary?.remaining_points ?? 100} points</strong>.
              </div>
            </div>

            {/* Assessment Type */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Assessment Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                {[
                  { id: 'Test', label: 'Test', desc: 'Continuous' },
                  { id: 'Mid', label: 'Midterm', desc: 'Mid Exam' },
                  { id: 'Final', label: 'Final', desc: 'Final Exam' },
                  { id: 'Bonus', label: 'Bonus', desc: 'Extra credit' },
                  { id: 'NonAttended', label: 'Non-Attended', desc: 'Zero/Absent Test' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAssessmentTypeChange(item.id)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: `1.5px solid ${assessmentType === item.id ? (item.id === 'Bonus' ? '#F59E0B' : '#7C3AED') : '#E2E8F0'}`,
                      background: assessmentType === item.id ? (item.id === 'Bonus' ? '#FEF3C7' : '#EDE9FE') : '#FFFFFF',
                      color: assessmentType === item.id ? (item.id === 'Bonus' ? '#92400E' : '#6D28D9') : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Assessment Name */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Assessment Title / Name *</label>
              <input
                type="text"
                className="form-control"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="e.g. Test 1, Quiz 2, Midterm Exam, Bonus Assignment"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                Tests can be created as many times as needed (e.g. Test 1, Test 2, Quiz 1) as long as total marks remain &le; 100.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Max Marks */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Maximum Marks (Max: {subjectSummary?.remaining_points ?? 100}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.5"
                  max={subjectSummary?.remaining_points ?? 100}
                  className="form-control"
                  value={assessmentMaxMarks}
                  onChange={(e) => setAssessmentMaxMarks(e.target.value)}
                  required
                />
              </div>

              {/* Assessment Date */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Assessment Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsAssessmentModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creatingAssessment}
                style={{ background: '#0D9488', borderColor: '#0D9488', fontWeight: 800 }}
              >
                <Plus size={16} />
                <span>{creatingAssessment ? 'Creating Benchmark...' : 'Create Assessment'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
