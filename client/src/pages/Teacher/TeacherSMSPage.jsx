import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import {
  Send,
  Smartphone,
  Users,
  UserCheck,
  CheckCircle2,
  Search,
  CheckSquare,
  Square,
  Filter,
  User,
  PhoneCall,
  Sparkles
} from 'lucide-react';

export default function TeacherSMSPage() {
  const [assignments, setAssignments] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  
  // Student-level targeting
  const [recipientScope, setRecipientScope] = useState('SECTION'); // 'SECTION' | 'STUDENT'
  const [sectionStudents, setSectionStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const notify = useNotify();
  const { isDark } = useTheme();

  useEffect(() => {
    loadAssignmentsAndHistory();
  }, []);

  // Fetch students whenever selected sections change or scope switches to STUDENT
  useEffect(() => {
    if (selectedSectionIds.length > 0) {
      loadStudentsForSections(selectedSectionIds);
    } else {
      setSectionStudents([]);
      setSelectedStudentIds([]);
    }
  }, [selectedSectionIds]);

  const loadAssignmentsAndHistory = async () => {
    try {
      const [aRes, bRes] = await Promise.all([
        api.get('/teachers/my-assignments'),
        api.get('/sms/broadcasts')
      ]);
      setAssignments(aRes.assignments || []);
      setBroadcasts(bRes || []);

      // Pre-select first assigned section
      if (aRes.assignments && aRes.assignments.length > 0) {
        setSelectedSectionIds([aRes.assignments[0].section_id]);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load SMS data.');
    }
  };

  const loadStudentsForSections = async (secIds) => {
    setLoadingStudents(true);
    try {
      // Fetch scoped students for teacher
      const students = await api.get('/students');
      // Filter students whose section_id is in selectedSectionIds
      const filtered = (students || []).filter(s => secIds.includes(s.section_id));
      setSectionStudents(filtered);
      // Auto-select all loaded students by default when switching to student scope
      setSelectedStudentIds(filtered.map(s => s.id));
    } catch (err) {
      notify.error(err.message || 'Failed to load section students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleSection = (sId) => {
    setSelectedSectionIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Filter students by name letters or 5-digit student ID
  const filteredStudents = sectionStudents.filter(s => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase().trim();
    const nameMatch = (s.full_name || '').toLowerCase().includes(q);
    const codeMatch = String(s.student_id || '').toLowerCase().includes(q);
    const idMatch = String(s.id || '').includes(q);
    const parentPhoneMatch = (s.parent_phone || '').includes(q);
    return nameMatch || codeMatch || idMatch || parentPhoneMatch;
  });

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredStudents.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredStudents.map(s => s.id));
    setSelectedStudentIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      notify.error('Title and message text are required.');
      return;
    }
    if (selectedSectionIds.length === 0) {
      notify.error('Please select at least one of your assigned sections.');
      return;
    }

    if (recipientScope === 'STUDENT' && selectedStudentIds.length === 0) {
      notify.error('Please select at least one student recipient, or choose "Whole Section".');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        deduplicate_parents: true
      };

      if (recipientScope === 'STUDENT') {
        payload.target_type = 'STUDENT';
        payload.student_ids = selectedStudentIds;
        payload.section_ids = selectedSectionIds;
      } else {
        payload.target_type = 'SECTION';
        payload.section_ids = selectedSectionIds;
      }

      const res = await api.post('/sms/broadcast', payload);
      notify.success(res.message || 'SMS broadcast dispatched successfully to parents!');
      setTitle('');
      setMessage('');
      loadAssignmentsAndHistory();
    } catch (err) {
      notify.error(err.message || 'Failed to dispatch SMS.');
    } finally {
      setIsSending(false);
    }
  };

  // Distinct sections from assignments
  const uniqueSections = [];
  const seen = new Set();
  for (const a of assignments) {
    if (!seen.has(a.section_id)) {
      seen.add(a.section_id);
      uniqueSections.push(a);
    }
  }

  // Theme tokens
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const cardBg = isDark ? '#0F172A' : '#FFFFFF';
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Send size={26} color="#7C3AED" />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: textPrimary, margin: 0 }}>
              Class & Parent SMS Broadcast
            </h2>
          </div>
          <p style={{ color: textSecondary, fontSize: '0.92rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Send academic updates and direct notices to parents of your assigned classes and individual students
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1.75rem', marginBottom: '2.5rem' }}>
        {/* Left Form Card */}
        <div className="card" style={{ borderTop: '4px solid #7C3AED', background: cardBg, borderColor: cardBorder }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: textPrimary, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#7C3AED" /> Compose Class Notice SMS
          </h3>

          <form onSubmit={handleSend}>
            {/* Subject */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>Subject / Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mathematics Module 3 Test Preparation"
                required
              />
            </div>

            {/* Section Selection with Fixed High-Contrast Buttons */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: textPrimary, margin: 0 }}>
                  Select Recipient Assigned Sections
                </label>
                <span style={{ fontSize: '0.75rem', color: textSecondary }}>
                  {selectedSectionIds.length} of {uniqueSections.length} sections selected
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {uniqueSections.map(s => {
                  const isChecked = selectedSectionIds.includes(s.section_id);
                  return (
                    <button
                      key={s.section_id}
                      type="button"
                      onClick={() => handleToggleSection(s.section_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.95rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        transition: 'all 0.18s ease',
                        background: isChecked
                          ? (isDark ? 'rgba(124, 58, 237, 0.28)' : '#EDE9FE')
                          : (isDark ? '#1E293B' : '#F8FAFC'),
                        border: isChecked
                          ? (isDark ? '2px solid #A78BFA' : '2px solid #7C3AED')
                          : (isDark ? '1px solid #334155' : '1px solid #CBD5E1'),
                        color: isChecked
                          ? (isDark ? '#FFFFFF' : '#4C1D95')
                          : (isDark ? '#CBD5E1' : '#475569'),
                        boxShadow: isChecked
                          ? (isDark ? '0 0 12px rgba(139, 92, 246, 0.35)' : '0 2px 6px rgba(124, 58, 237, 0.15)')
                          : 'none'
                      }}
                    >
                      <span style={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        border: isChecked ? 'none' : `1.5px solid ${isDark ? '#64748B' : '#94A3B8'}`,
                        background: isChecked ? '#7C3AED' : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                      }}>
                        {isChecked && <CheckCircle2 size={13} strokeWidth={3} />}
                      </span>
                      <span>{s.section_full_name} ({s.subject_code})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Scope Toggle: Whole Section vs Individual Students */}
            <div className="form-group" style={{ marginBottom: '1.25rem', background: isDark ? '#1E293B' : '#F1F5F9', padding: '0.85rem', borderRadius: '10px' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary, marginBottom: '0.5rem', display: 'block' }}>
                Recipient Targeting Scope
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: recipientScope === 'SECTION' ? 700 : 500,
                  color: recipientScope === 'SECTION' ? '#7C3AED' : textPrimary
                }}>
                  <input
                    type="radio"
                    name="recipientScope"
                    checked={recipientScope === 'SECTION'}
                    onChange={() => setRecipientScope('SECTION')}
                  />
                  <span>👥 Whole Section (All Enrolled Parents)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: recipientScope === 'STUDENT' ? 700 : 500,
                  color: recipientScope === 'STUDENT' ? '#7C3AED' : textPrimary
                }}>
                  <input
                    type="radio"
                    name="recipientScope"
                    checked={recipientScope === 'STUDENT'}
                    onChange={() => setRecipientScope('STUDENT')}
                  />
                  <span>👤 Select Specific Individual Students</span>
                </label>
              </div>
            </div>

            {/* Individual Student Selector Box */}
            {recipientScope === 'STUDENT' && (
              <div style={{
                marginBottom: '1.5rem',
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem',
                background: isDark ? '#111827' : '#FAFAFA'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: textPrimary }}>
                      Select Students ({selectedStudentIds.length} of {sectionStudents.length} selected)
                    </span>
                  </div>

                  {/* Select All / Deselect All */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                    >
                      <CheckSquare size={13} /> Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                    >
                      <Square size={13} /> Clear
                    </button>
                  </div>
                </div>

                {/* Search Bar for filtering students by name or ID */}
                <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                  <Search size={15} color={textSecondary} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                    placeholder="Search by student name letters or 5-digit ID (e.g. Selam, 10023)..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: textSecondary,
                        fontSize: '0.75rem'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Scrollable Students List */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {loadingStudents ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: textSecondary, fontSize: '0.85rem' }}>
                      Loading enrolled students in selected sections...
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.25rem', color: textSecondary, fontSize: '0.85rem' }}>
                      {sectionStudents.length === 0
                        ? 'No active students found enrolled in the selected section(s).'
                        : 'No students match your search filter.'}
                    </div>
                  ) : (
                    filteredStudents.map(student => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          onClick={() => handleToggleStudent(student.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isSelected
                              ? (isDark ? 'rgba(124, 58, 237, 0.22)' : '#EDE9FE')
                              : (isDark ? '#1E293B' : '#FFFFFF'),
                            border: isSelected
                              ? '1.5px solid #7C3AED'
                              : (isDark ? '1px solid #334155' : '1px solid #E2E8F0')
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container click
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: textPrimary }}>
                                  {student.full_name}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  color: '#7C3AED',
                                  background: isDark ? 'rgba(124, 58, 237, 0.15)' : '#F5F3FF',
                                  padding: '1px 5px',
                                  borderRadius: '3px'
                                }}>
                                  ID: {student.student_id}
                                </span>
                                <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>
                                  {student.section_full_name || student.section_name}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: textSecondary, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span>Parent: {student.parent_name || 'Guardian'}</span>
                                {student.parent_phone && (
                                  <span style={{ color: '#10B981', fontWeight: 600 }}>📞 {student.parent_phone}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? '#7C3AED' : textSecondary }}>
                            {isSelected ? 'Selected' : 'Click to select'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: textPrimary }}>Message Content</label>
              <textarea
                className="form-control"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dear Parents, Mr. Abebe would like to inform you that..."
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: textSecondary, marginTop: '0.35rem' }}>
                <span>Standard SMS unit: 160 characters</span>
                <span style={{ fontWeight: 700, color: '#7C3AED' }}>
                  {message.length} chars ({Math.ceil(message.length / 160) || 1} SMS unit)
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', background: '#7C3AED', borderColor: '#7C3AED' }}
              disabled={isSending || selectedSectionIds.length === 0 || (recipientScope === 'STUDENT' && selectedStudentIds.length === 0)}
            >
              <Send size={18} />
              <span>
                {isSending
                  ? 'Dispatching SMS Broadcast...'
                  : recipientScope === 'STUDENT'
                  ? `Dispatch SMS to ${selectedStudentIds.length} Selected Student Parents`
                  : 'Dispatch SMS to Assigned Class Parents'}
              </span>
            </button>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="card" style={{ background: '#0B1120', color: '#FFFFFF', border: '1px solid #1E293B', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8' }}>HANDSET LIVE PREVIEW</span>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>● LAKESIDE SENDER ID</span>
            </div>

            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '1.25rem', minHeight: '130px', borderLeft: '4px solid #7C3AED' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>From: LAKESIDE</span>
                <span style={{ color: '#38BDF8' }}>
                  {recipientScope === 'STUDENT' ? `Direct to ${selectedStudentIds.length} Student(s)` : 'Class Broadcast'}
                </span>
              </div>
              <div style={{ fontSize: '0.925rem', color: '#F8FAFC', lineHeight: 1.5 }}>
                {message || (
                  <span style={{ color: '#64748B', fontStyle: 'italic' }}>
                    Your message text will appear here formatted as received by parents on their mobile phones...
                  </span>
                )}
              </div>
            </div>

            {/* Target Summary pill */}
            <div style={{ marginTop: '1.25rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
              <div style={{ fontSize: '0.78rem', color: '#C4B5FD', fontWeight: 700, marginBottom: '0.25rem' }}>
                ACTIVE TARGETING:
              </div>
              <div style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>
                {recipientScope === 'STUDENT' ? (
                  <span>🎯 Targeting <strong>{selectedStudentIds.length}</strong> individual student parent(s) across {selectedSectionIds.length} section(s).</span>
                ) : (
                  <span>📢 Broadcasting to all enrolled parents in <strong>{selectedSectionIds.length}</strong> assigned section(s).</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '1.5rem', background: '#1E293B', padding: '0.75rem', borderRadius: '8px' }}>
            ℹ️ As a faculty teacher, you can only message parents of students in your assigned roster. Unassigned classes cannot be reached.
          </div>
        </div>
      </div>

      {/* Broadcast History */}
      <div className="card" style={{ background: cardBg, borderColor: cardBorder }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: textPrimary }}>My Dispatched SMS Broadcasts</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Title</th>
                <th>Target Scope</th>
                <th>Message Content</th>
                <th>Recipients</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: textSecondary }}>
                    No SMS broadcasts dispatched yet.
                  </td>
                </tr>
              ) : (
                broadcasts.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: textSecondary, whiteSpace: 'nowrap' }}>
                      {formatToEthiopian(b.created_at, 'long')}
                    </td>
                    <td>
                      <strong style={{ color: textPrimary }}>{b.title}</strong>
                    </td>
                    <td>
                      <span className="badge badge-primary">{b.target_type}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: textSecondary, maxWidth: '350px' }}>
                      {b.message_template}
                    </td>
                    <td>
                      <strong style={{ color: textPrimary }}>{b.sent_count} / {b.total_recipients}</strong>
                    </td>
                    <td>
                      <span className="badge badge-success">{b.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
