import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import EthiopianDatePicker from '../../components/EthiopianDatePicker';
import { getCurrentEthiopianDate } from '../../utils/ethiopianDate';
import { 
  UserPlus, 
  CheckCircle2, 
  ArrowLeft,
  Eye,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Phone,
  User,
  Search,
  RotateCw,
  ShieldCheck,
  Check,
  AlertCircle,
  Lock
} from 'lucide-react';

export default function StudentRegistration({ onStudentCreated, onCancel, onViewStudent }) {
  const [registrationMode, setRegistrationMode] = useState('new'); // 'new' | 'returning'
  const [nextId, setNextId] = useState('10011');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [currentEthDate] = useState(() => getCurrentEthiopianDate());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState(null);
  const notify = useNotify();
  const { isDark } = useTheme();

  // New student form
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'Female',
    date_of_birth: '',
    class_id: '',
    section_id: '',
    academic_year_id: '',
    parent_name: '',
    parent_phone: '',
    parent_relationship: 'Father',
    is_existing_student: 0,
    custom_student_id: ''
  });

  const [additionalParents, setAdditionalParents] = useState([]);

  // Returning student state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedReturningStudent, setSelectedReturningStudent] = useState(null);
  const [returningEnrollment, setReturningEnrollment] = useState({
    target_academic_year_id: '',
    target_class_id: '',
    target_section_id: '',
    parent_name: '',
    parent_phone: '',
    parent_relationship: 'Father'
  });

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [idRes, cRes, yRes] = await Promise.all([
        api.get('/students/next-id'),
        api.get('/academic/classes'),
        api.get('/academic/years')
      ]);
      setNextId(idRes.next_student_id);
      setClasses(cRes || []);
      setYears(yRes || []);

      const curYear = yRes?.find(y => y.is_current) || yRes?.[0];
      if (curYear) {
        setFormData(prev => ({ ...prev, academic_year_id: curYear.id }));
        setReturningEnrollment(prev => ({ ...prev, target_academic_year_id: curYear.id }));
      }
      if (cRes && cRes.length > 0) {
        const defaultClass = cRes[0];
        setFormData(prev => ({
          ...prev,
          class_id: defaultClass.id,
          section_id: defaultClass.sections?.[0]?.id || ''
        }));
        setReturningEnrollment(prev => ({
          ...prev,
          target_class_id: defaultClass.id,
          target_section_id: defaultClass.sections?.[0]?.id || ''
        }));
      }
    } catch (err) {
      notify.error(err.message || 'Failed to initialize registration.');
    } finally {
      setLoading(false);
    }
  };

  // Search returning students
  const handleSearchReturning = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/students/search-returning?query=${encodeURIComponent(q)}`);
      setSearchResults(res || []);
      if (!res || res.length === 0) {
        notify.info('No matching students found. Try searching by Name, 5-digit ID, or Parent Phone.');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to search students.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectReturningStudent = (stu) => {
    setSelectedReturningStudent(stu);

    // Auto-suggest next class if possible
    let targetClassId = stu.last_class_id || (classes[0]?.id || '');
    const currentClassIdx = classes.findIndex(c => c.id === stu.last_class_id);
    if (currentClassIdx >= 0 && currentClassIdx + 1 < classes.length) {
      // Suggest next grade level
      targetClassId = classes[currentClassIdx + 1].id;
    }

    const targetClass = classes.find(c => String(c.id) === String(targetClassId));
    const targetSectionId = targetClass?.sections?.[0]?.id || '';

    setReturningEnrollment(prev => ({
      ...prev,
      target_class_id: targetClassId,
      target_section_id: targetSectionId,
      parent_name: stu.parent_name || '',
      parent_phone: stu.parent_phone || '',
      parent_relationship: stu.parent_relationship || 'Father'
    }));
  };

  const handleAddParent = () => {
    setAdditionalParents(prev => [
      ...prev,
      { name: '', phone: '', relationship: 'Mother' }
    ]);
  };

  const handleRemoveParent = (idx) => {
    setAdditionalParents(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateAdditionalParent = (idx, field, val) => {
    setAdditionalParents(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  // New Student Submission
  const handleSubmitNew = async (e) => {
    e.preventDefault();
    if (!formData.date_of_birth) {
      notify.error('Please enter a valid Ethiopian date of birth.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedId = formData.is_existing_student && formData.custom_student_id
        ? formData.custom_student_id
        : nextId;

      const payload = {
        ...formData,
        custom_student_id: assignedId
      };

      const res = await api.post('/students', payload);
      notify.success(res.message || 'Student registered successfully.');

      // If additional parents were added, link them
      for (const ap of additionalParents) {
        if (ap.name && ap.phone) {
          try {
            await api.post('/parents', {
              student_id: res.id,
              full_name: ap.name,
              phone_number: ap.phone,
              relationship: ap.relationship,
              is_primary: 0
            });
          } catch (pErr) {
            // Non-blocking
          }
        }
      }

      setRegisteredStudent({
        id: res.id,
        student_id: assignedId,
        full_name: formData.full_name,
        gender: formData.gender,
        class_name: selectedClassObj?.name,
        section_name: selectedClassObj?.sections?.find(s => String(s.id) === String(formData.section_id))?.full_name || 'Assigned Section',
        academic_year_name: years.find(y => String(y.id) === String(formData.academic_year_id))?.name || 'Current Year',
        is_re_enrollment: false
      });
    } catch (err) {
      notify.error(err.message || 'Failed to register student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Returning Student Re-enrollment Submission
  const handleSubmitReturning = async (e) => {
    e.preventDefault();
    if (!selectedReturningStudent) {
      notify.error('Please search and select a returning student first.');
      return;
    }
    if (!returningEnrollment.target_academic_year_id || !returningEnrollment.target_class_id || !returningEnrollment.target_section_id) {
      notify.error('Please select academic year, target grade level, and section.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        student_id: selectedReturningStudent.id,
        target_academic_year_id: returningEnrollment.target_academic_year_id,
        target_class_id: returningEnrollment.target_class_id,
        target_section_id: returningEnrollment.target_section_id,
        parent_name: returningEnrollment.parent_name || undefined,
        parent_phone: returningEnrollment.parent_phone || undefined,
        parent_relationship: returningEnrollment.parent_relationship || undefined
      };

      const res = await api.post('/students/re-enroll', payload);
      notify.success(res.message || 'Student re-enrolled successfully.');

      const targetClassObj = classes.find(c => String(c.id) === String(returningEnrollment.target_class_id));
      const targetSecObj = targetClassObj?.sections?.find(s => String(s.id) === String(returningEnrollment.target_section_id));
      const targetYearObj = years.find(y => String(y.id) === String(returningEnrollment.target_academic_year_id));

      setRegisteredStudent({
        id: res.internal_id || selectedReturningStudent.id,
        student_id: selectedReturningStudent.student_code,
        full_name: selectedReturningStudent.full_name,
        gender: selectedReturningStudent.gender,
        class_name: targetClassObj?.name,
        section_name: targetSecObj?.full_name || 'Target Section',
        academic_year_name: targetYearObj?.name || 'Upcoming Year',
        is_re_enrollment: true
      });
    } catch (err) {
      notify.error(err.message || 'Failed to re-enroll student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setRegisteredStudent(null);
    setSelectedReturningStudent(null);
    setSearchResults([]);
    setSearchQuery('');
    setFormData(prev => ({
      ...prev,
      full_name: '',
      date_of_birth: '',
      parent_name: '',
      parent_phone: '',
      custom_student_id: ''
    }));
    setAdditionalParents([]);
    loadPrerequisites();
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(formData.class_id));
  const targetReturningClassObj = classes.find(c => String(c.id) === String(returningEnrollment.target_class_id));

  // Success Confirmation Card
  if (registeredStudent) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem', borderTop: '5px solid #0D9488', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: isDark ? '#064E3B' : '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: registeredStudent.is_re_enrollment ? 'rgba(59,130,246,0.15)' : 'rgba(13,148,136,0.15)', color: registeredStudent.is_re_enrollment ? '#3B82F6' : '#0D9488', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {registeredStudent.is_re_enrollment ? <RotateCw size={13} /> : <UserPlus size={13} />}
            {registeredStudent.is_re_enrollment ? 'RETURNING STUDENT RE-ENROLLED' : 'NEW STUDENT REGISTERED'}
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '0.4rem' }}>
            {registeredStudent.is_re_enrollment ? 'Enrollment Confirmed' : 'Student Registered'}
          </h2>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {registeredStudent.is_re_enrollment 
              ? `Student successfully placed for academic year ${registeredStudent.academic_year_name} with permanent 5-digit ID preserved.`
              : 'Official student record established in the Lake Side Academy registry.'
            }
          </p>

          <div style={{
            background: isDark ? '#0F172A' : '#F8FAFC',
            border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.4rem',
            textAlign: 'left',
            marginBottom: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.6rem', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0' }}>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={13} color="#0D9488" /> Permanent 5-Digit ID:
              </span>
              <strong style={{ fontFamily: 'monospace', fontSize: '1.15rem', color: '#0D9488', letterSpacing: '1px' }}>
                {registeredStudent.student_id}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Full Name:</span>
              <strong style={{ color: isDark ? '#F1F5F9' : '#0F172A', fontSize: '1.02rem' }}>{registeredStudent.full_name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Gender:</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                fontWeight: 900,
                fontSize: '0.75rem',
                color: '#fff',
                background: registeredStudent.gender === 'Female' ? '#DB2777' : '#2563EB'
              }}>
                {registeredStudent.gender === 'Female' ? 'F' : 'M'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Academic Placement:</span>
              <span className="badge badge-primary">{registeredStudent.class_name} • {registeredStudent.section_name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Academic Year:</span>
              <span style={{ fontWeight: 700, color: isDark ? '#38BDF8' : '#0284C7' }}>{registeredStudent.academic_year_name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => onViewStudent ? onViewStudent(registeredStudent.id) : (onStudentCreated ? onStudentCreated(registeredStudent.id) : (onCancel && onCancel()))}
              className="btn btn-primary"
              style={{ background: '#0D9488', borderColor: '#0D9488' }}
            >
              <Eye size={15} /> View Student Profile
            </button>
            <button
              onClick={handleResetForAnother}
              className="btn btn-secondary"
            >
              <UserPlus size={15} /> {registeredStudent.is_re_enrollment ? 'Enroll Another Student' : 'Register Another'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
            {registrationMode === 'new' ? 'Student Registration' : 'Returning Student Re-Enrollment'}
          </h2>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            {registrationMode === 'new' 
              ? 'Intake new students, assign 5-digit student IDs, and set up initial class placement.' 
              : 'Search existing/old students by Name, 5-digit ID, or Parent Phone to enroll them for the next year.'}
          </p>
        </div>

        {onCancel && (
          <button onClick={onCancel} className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Back
          </button>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: isDark ? '#1E293B' : '#E2E8F0',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '1.5rem'
      }}>
        <button
          type="button"
          onClick={() => {
            setRegistrationMode('new');
            setSelectedReturningStudent(null);
          }}
          style={{
            flex: 1,
            padding: '0.7rem 1rem',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            background: registrationMode === 'new' ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
            color: registrationMode === 'new' ? '#0D9488' : (isDark ? '#94A3B8' : '#64748B'),
            boxShadow: registrationMode === 'new' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <UserPlus size={16} /> New Student Intake (New 5-Digit ID)
        </button>

        <button
          type="button"
          onClick={() => setRegistrationMode('returning')}
          style={{
            flex: 1,
            padding: '0.7rem 1rem',
            borderRadius: '9px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            background: registrationMode === 'returning' ? (isDark ? '#0F172A' : '#FFFFFF') : 'transparent',
            color: registrationMode === 'returning' ? '#2563EB' : (isDark ? '#94A3B8' : '#64748B'),
            boxShadow: registrationMode === 'returning' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <RotateCw size={16} /> Returning / Old Student Enrollment (Next Year)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* RETURNING / OLD STUDENT WORKFLOW                                          */}
      {/* ========================================================================= */}
      {registrationMode === 'returning' ? (
        <div>
          {/* Step 1: Search Banner & Input */}
          {!selectedReturningStudent ? (
            <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem', borderTop: '4px solid #2563EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  background: 'rgba(37,99,235,0.12)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Search size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                    Lookup Existing / Old Student
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: isDark ? '#94A3B8' : '#64748B', margin: 0, marginTop: '2px' }}>
                    Search directory by Student Name, 5-digit Student ID, or Parent Phone Number.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearchReturning} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#64748B' : '#94A3B8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter student name, 5-digit ID (e.g. 10001), or phone (e.g. 0911...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem', height: '46px', fontSize: '0.95rem' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSearching || !searchQuery.trim()}
                  style={{ background: '#2563EB', borderColor: '#2563EB', padding: '0 1.5rem', fontWeight: 700 }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Matching Students ({searchResults.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {searchResults.map((stu) => (
                      <div
                        key={stu.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.25rem',
                          borderRadius: '10px',
                          border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                          background: isDark ? '#0F172A' : '#F8FAFC',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            color: '#fff',
                            background: stu.gender === 'Female' ? '#DB2777' : '#2563EB'
                          }}>
                            {stu.gender === 'Female' ? 'F' : 'M'}
                          </span>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                                {stu.full_name}
                              </strong>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                color: '#0D9488',
                                background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                #{stu.student_code}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span>Previous: <strong>{stu.last_class_name || 'Unassigned'} {stu.last_section_full_name ? `• ${stu.last_section_full_name}` : ''}</strong></span>
                              {stu.last_academic_year_name && <span>({stu.last_academic_year_name})</span>}
                              {stu.parent_phone && <span>Phone: {stu.parent_phone} ({stu.parent_name || 'Guardian'})</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectReturningStudent(stu)}
                          className="btn btn-primary btn-sm"
                          style={{ background: '#2563EB', borderColor: '#2563EB', fontWeight: 700 }}
                        >
                          <Check size={14} /> Select & Continue
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Selected Student Re-Enrollment Form */
            <form onSubmit={handleSubmitReturning}>
              {/* Selected Student Banner */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderLeft: '5px solid #2563EB', background: isDark ? '#0F172A' : '#EFF6FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      color: '#fff',
                      background: selectedReturningStudent.gender === 'Female' ? '#DB2777' : '#2563EB'
                    }}>
                      {selectedReturningStudent.gender === 'Female' ? 'F' : 'M'}
                    </span>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                          {selectedReturningStudent.full_name}
                        </h3>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          color: '#0D9488',
                          background: isDark ? 'rgba(13,148,136,0.2)' : '#CCFBF1',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          ID: {selectedReturningStudent.student_code}
                        </span>
                      </div>
                      <p style={{ margin: 0, marginTop: '2px', fontSize: '0.82rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                        Previous Placement: {selectedReturningStudent.last_class_name || 'N/A'} {selectedReturningStudent.last_section_full_name || ''} ({selectedReturningStudent.last_academic_year_name || 'Prior Year'})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReturningStudent(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Change Student
                  </button>
                </div>
              </div>

              {/* Target Academic Year & Grade Placement */}
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                    Target Academic Placement (For Next Year)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 700, background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    Re-Enrollment
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Academic Year *</label>
                    <select
                      className="form-control"
                      value={returningEnrollment.target_academic_year_id}
                      onChange={(e) => setReturningEnrollment({ ...returningEnrollment, target_academic_year_id: e.target.value })}
                      required
                    >
                      <option value="">Select Year</option>
                      {years.map(y => (
                        <option key={y.id} value={y.id}>
                          {y.name} {y.is_current ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Grade Level *</label>
                    <select
                      className="form-control"
                      value={returningEnrollment.target_class_id}
                      onChange={(e) => {
                        const targetClass = classes.find(c => String(c.id) === String(e.target.value));
                        setReturningEnrollment({
                          ...returningEnrollment,
                          target_class_id: e.target.value,
                          target_section_id: targetClass?.sections?.[0]?.id || ''
                        });
                      }}
                      required
                    >
                      <option value="">Select Grade</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Section *</label>
                    <select
                      className="form-control"
                      value={returningEnrollment.target_section_id}
                      onChange={(e) => setReturningEnrollment({ ...returningEnrollment, target_section_id: e.target.value })}
                      required
                      disabled={!returningEnrollment.target_class_id}
                    >
                      <option value="">Select Section</option>
                      {targetReturningClassObj?.sections?.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.student_count || 0} enrolled)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Guardian Contact Info (Pre-populated) */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0, marginBottom: '0.4rem' }}>
                  Parent / Guardian Verification
                </h3>
                <p style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', marginBottom: '1.25rem' }}>
                  Confirm or update contact information for notifications and SMS alerts.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Parent / Guardian Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={returningEnrollment.parent_name}
                      onChange={(e) => setReturningEnrollment({ ...returningEnrollment, parent_name: e.target.value })}
                      placeholder="e.g. Worku Bekele"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (For SMS)</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={returningEnrollment.parent_phone}
                      onChange={(e) => setReturningEnrollment({ ...returningEnrollment, parent_phone: e.target.value })}
                      placeholder="0911234567"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Relationship</label>
                    <select
                      className="form-control"
                      value={returningEnrollment.parent_relationship}
                      onChange={(e) => setReturningEnrollment({ ...returningEnrollment, parent_relationship: e.target.value })}
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturningStudent(null)}
                  className="btn btn-secondary"
                >
                  Cancel Selection
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ background: '#2563EB', borderColor: '#2563EB', padding: '0.65rem 1.75rem', fontWeight: 700 }}
                >
                  <RotateCw size={15} /> {isSubmitting ? 'Re-Enrolling...' : 'Re-Enroll Student for Next Year'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* NEW STUDENT INTAKE WORKFLOW                                               */
        /* ========================================================================= */
        <form onSubmit={handleSubmitNew}>
          {/* Section 1: Basic Information */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                Student Information
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>Assigned ID:</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  color: '#0D9488',
                  fontSize: '1.05rem',
                  background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
                }}>
                  {formData.is_existing_student && formData.custom_student_id ? formData.custom_student_id : nextId}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Selam Worku"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select
                  className="form-control"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  required
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Date of Birth (Ethiopian Calendar) *</label>
                <EthiopianDatePicker
                  value={formData.date_of_birth}
                  onChange={(iso) => setFormData(prev => ({ ...prev, date_of_birth: iso }))}
                  placeholder="DD/MM/YYYY (e.g. 01/07/2010)"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registration Date (Automatic)</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  background: isDark ? '#0F172A' : '#F8FAFC',
                  border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  fontSize: '0.88rem',
                  fontFamily: 'monospace',
                  color: isDark ? '#38BDF8' : '#0F766E',
                  fontWeight: 700
                }}>
                  <Calendar size={15} color="#0D9488" /> {currentEthDate.formatted} ({currentEthDate.monthName} {currentEthDate.year} E.C.)
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Academic Placement */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                Academic Placement
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#0D9488', fontWeight: 700, background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA', padding: '2px 8px', borderRadius: '4px' }}>
                Academic Year: 2018 E.C. (Active)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Grade Level *</label>
                <select
                  className="form-control"
                  value={formData.class_id}
                  onChange={(e) => {
                    const targetClass = classes.find(c => String(c.id) === String(e.target.value));
                    setFormData({
                      ...formData,
                      class_id: e.target.value,
                      section_id: targetClass?.sections?.[0]?.id || ''
                    });
                  }}
                  required
                >
                  <option value="">Select Grade</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Section (5 Sections: A, B, C, D, E) *</label>
                <select
                  className="form-control"
                  value={formData.section_id}
                  onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                  required
                  disabled={!formData.class_id}
                >
                  <option value="">Select Section</option>
                  {selectedClassObj?.sections?.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_count || 0} students)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Parent Information */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                  Parent / Guardian Contact
                </h3>
                <p style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                  Used for EthioTelecom SMS broadcasts, report cards, and multi-child sibling linking.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddParent}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                <Plus size={14} /> Add Secondary Contact
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Parent / Guardian Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="e.g. Worku Bekele"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone (For SMS) *</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  placeholder="0911234567"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship</label>
                <select
                  className="form-control"
                  value={formData.parent_relationship}
                  onChange={(e) => setFormData({ ...formData, parent_relationship: e.target.value })}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            {/* Secondary parents list */}
            {additionalParents.map((ap, idx) => (
              <div key={idx} style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                background: isDark ? '#0F172A' : '#F8FAFC'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                    Secondary Contact #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParent(idx)}
                    style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full Name"
                    value={ap.name}
                    onChange={(e) => handleUpdateAdditionalParent(idx, 'name', e.target.value)}
                  />
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Phone"
                    value={ap.phone}
                    onChange={(e) => handleUpdateAdditionalParent(idx, 'phone', e.target.value)}
                  />
                  <select
                    className="form-control"
                    value={ap.relationship}
                    onChange={(e) => handleUpdateAdditionalParent(idx, 'relationship', e.target.value)}
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {onCancel && (
              <button type="button" onClick={onCancel} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ background: '#0D9488', borderColor: '#0D9488', padding: '0.65rem 1.75rem', fontWeight: 700 }}
            >
              {isSubmitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
