import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import { History, Edit3, Save, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function MarkAdjustmentPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [marksheet, setMarksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  // Adjustment Modal state
  const [selectedStudentForAdjust, setSelectedStudentForAdjust] = useState(null);
  const [newMarkValue, setNewMarkValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History inspection modal state
  const [viewHistoryMark, setViewHistoryMark] = useState(null);
  const [markHistoryEntries, setMarkHistoryEntries] = useState([]);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const res = await api.get('/teachers/my-assignments');
      setAssignments(res.assignments || []);
      if (res.assignments && res.assignments.length > 0) {
        setSelectedAssignmentId(res.assignments[0].id);
        loadAssessments(res.assignments[0]);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async (assignment) => {
    try {
      const res = await api.get(`/assessments?class_id=${assignment.class_id}&section_id=${assignment.section_id}&subject_id=${assignment.subject_id}`);
      setAssessments(res);
      if (res.length > 0) {
        setSelectedAssessmentId(res[0].id);
        loadMarks(res[0].id);
      } else {
        setMarksheet(null);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load assessments.');
    }
  };

  const loadMarks = async (assessmentId) => {
    try {
      const res = await api.get(`/marks?assessment_id=${assessmentId}`);
      setMarksheet(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load marks.');
    }
  };

  const handleOpenAdjustModal = (student) => {
    if (!student.mark_id) {
      notify.error('No existing mark recorded for this student yet. Enter initial mark in Gradebook first.');
      return;
    }
    setSelectedStudentForAdjust(student);
    setNewMarkValue(student.marks_obtained !== null ? String(student.marks_obtained) : '');
    setAdjustReason('');
  };

  const handleOpenHistoryModal = async (student) => {
    if (!student.mark_id) return;
    try {
      const hist = await api.get(`/marks/history/${student.mark_id}`);
      setMarkHistoryEntries(hist);
      setViewHistoryMark(student);
    } catch (err) {
      notify.error(err.message || 'Failed to fetch mark history.');
    }
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!newMarkValue || !adjustReason.trim()) {
      notify.error('Both new mark and a mandatory adjustment reason are required.');
      return;
    }

    const numMark = parseFloat(newMarkValue);
    if (isNaN(numMark) || numMark < 0 || numMark > marksheet.assessment.max_marks) {
      notify.error(`Mark must be between 0 and ${marksheet.assessment.max_marks}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.put(`/marks/${selectedStudentForAdjust.mark_id}/adjust`, {
        new_mark: numMark,
        reason: adjustReason.trim()
      });

      notify.success(res.message || 'Mark adjusted and logged to immutable audit history!');
      setSelectedStudentForAdjust(null);
      loadMarks(marksheet.assessment.id);
    } catch (err) {
      notify.error(err.message || 'Failed to adjust mark.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={26} color="#D97706" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>
              Audited Mark Adjustments & Corrections
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Adjust recorded student assessment scores with mandatory justification and permanent change tracking
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid #D97706', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">My Assigned Class & Subject</label>
            <select
              className="form-control"
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                const a = assignments.find(item => String(item.id) === String(e.target.value));
                if (a) loadAssessments(a);
              }}
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.section_full_name} — {a.subject_name} ({a.subject_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Assessment</label>
            <select
              className="form-control"
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                loadMarks(e.target.value);
              }}
              disabled={assessments.length === 0}
            >
              {assessments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} (Max: {a.max_marks} pts)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Marks Table with Adjust Button */}
      {marksheet ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Roll #</th>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Recorded Mark</th>
                <th>Max Points</th>
                <th>Last Updated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {marksheet.students.map(s => (
                <tr key={s.student_id}>
                  <td style={{ fontWeight: 700 }}>#{s.roll_number || '1'}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F766E' }}>
                      {s.student_code}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>{s.full_name}</strong>
                  </td>
                  <td>
                    {s.is_absent ? (
                      <span className="badge badge-danger">Absent</span>
                    ) : s.marks_obtained !== null && s.marks_obtained !== undefined ? (
                      <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{s.marks_obtained}</strong>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>Unentered</span>
                    )}
                  </td>
                  <td>{marksheet.assessment.max_marks}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {s.last_updated_by || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenAdjustModal(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
                      >
                        <Edit3 size={13} color="#D97706" /> Adjust Mark
                      </button>
                      <button
                        onClick={() => handleOpenHistoryModal(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
                      >
                        <History size={13} /> View Audit History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Adjust Mark Modal with Mandatory Reason */}
      {selectedStudentForAdjust && (
        <Modal
          isOpen={!!selectedStudentForAdjust}
          onClose={() => setSelectedStudentForAdjust(null)}
          title={`Adjust Mark: ${selectedStudentForAdjust.full_name}`}
        >
          <form onSubmit={handleSaveAdjustment}>
            <div style={{ background: '#FFFBEB', padding: '1rem', borderRadius: '8px', border: '1px solid #FCD34D', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>Current Assessment</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                {marksheet.assessment.name} ({marksheet.assessment.subject_name})
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B45309', marginTop: '0.25rem' }}>
                Current Mark on Record: <strong>{selectedStudentForAdjust.marks_obtained} / {marksheet.assessment.max_marks}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Corrected Mark (Max: {marksheet.assessment.max_marks})</label>
              <input
                type="number"
                step="any"
                className="form-control"
                value={newMarkValue}
                onChange={(e) => setNewMarkValue(e.target.value)}
                placeholder={`0 - ${marksheet.assessment.max_marks}`}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Mandatory Reason for Adjustment <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Re-evaluating question 4 calculation error verified with head of department"
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                This reason will be permanently archived in the administrator audit log with timestamps and your identity.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setSelectedStudentForAdjust(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#D97706', borderColor: '#D97706' }} disabled={isSubmitting}>
                <Save size={16} />
                <span>{isSubmitting ? 'Recording Adjustment...' : 'Confirm & Save Adjustment'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {viewHistoryMark && (
        <Modal
          isOpen={!!viewHistoryMark}
          onClose={() => setViewHistoryMark(null)}
          title={`Mark Adjustment History: ${viewHistoryMark.full_name}`}
        >
          {markHistoryEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {markHistoryEntries.map(entry => (
                <div key={entry.id} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                      Mark changed: {entry.previous_mark !== null ? entry.previous_mark : 'None'} → <strong style={{ color: '#047857' }}>{entry.new_mark}</strong>
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748B' }}>
                      {formatToEthiopian(entry.changed_at, 'long')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    <strong>Reason:</strong> {entry.reason}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Adjusted by: {entry.changed_by_name} ({entry.changed_by_role})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
              No previous adjustment history recorded for this student's mark.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
