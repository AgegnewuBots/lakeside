import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import Modal from '../../components/Modal';
import { 
  ArrowUpRight, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Save, 
  User, 
  Phone, 
  Eye, 
  GraduationCap, 
  Check, 
  Layers, 
  FileText 
} from 'lucide-react';

export default function StudentPromotionWizard({ onStudentPromoted }) {
  const { isDark } = useTheme();
  const notify = useNotify();

  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Filter & Evaluation states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [minAverageThreshold, setMinAverageThreshold] = useState(50.0);
  const [evaluationData, setEvaluationData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Complete Details & Promotion Modal state
  const [detailsStudent, setDetailsStudent] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [targetYearId, setTargetYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetRoll, setTargetRoll] = useState('');

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    try {
      const [cRes, yRes, settingsRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/academic/years'),
        api.get('/settings').catch(() => null)
      ]);
      setClasses(cRes || []);
      setYears(yRes || []);

      if (settingsRes && settingsRes.settings && settingsRes.settings.promotion_min_average) {
        setMinAverageThreshold(parseFloat(settingsRes.settings.promotion_min_average));
      }

      const curYear = yRes?.find(y => y.is_current);
      if (curYear) {
        setTargetYearId(curYear.id);
      }

      // Initial load evaluations
      await loadEvaluations(parseFloat(settingsRes?.settings?.promotion_min_average || 50.0), '', '');
    } catch (err) {
      notify.error(err.message || 'Failed to load promotion setup.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async (thresholdVal, classIdVal, sectionIdVal) => {
    try {
      const queryParams = new URLSearchParams();
      if (thresholdVal !== undefined && thresholdVal !== '') queryParams.append('min_average', thresholdVal);
      if (classIdVal) queryParams.append('class_id', classIdVal);
      if (sectionIdVal) queryParams.append('section_id', sectionIdVal);

      const res = await api.get(`/academic/promotion-evaluations?${queryParams.toString()}`);
      setEvaluationData(res);
    } catch (err) {
      notify.error(err.message || 'Failed to calculate promotion evaluations.');
    }
  };

  const handleThresholdChange = (e) => {
    const val = parseFloat(e.target.value);
    setMinAverageThreshold(isNaN(val) ? '' : val);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      loadEvaluations(val, selectedClassId, selectedSectionId);
    }
  };

  const handleSaveDefaultThreshold = async () => {
    if (minAverageThreshold === '' || isNaN(minAverageThreshold) || minAverageThreshold < 0 || minAverageThreshold > 100) {
      notify.error('Please enter a valid threshold percentage between 0 and 100.');
      return;
    }

    setSavingThreshold(true);
    try {
      await api.put('/settings', {
        settings: {
          promotion_min_average: String(minAverageThreshold)
        }
      });
      notify.success(`Default promotion minimum passing threshold saved at ${minAverageThreshold}%.`);
      loadEvaluations(minAverageThreshold, selectedClassId, selectedSectionId);
    } catch (err) {
      notify.error(err.message || 'Failed to save promotion setting.');
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleOpenDetails = (evalStudent) => {
    setDetailsStudent(evalStudent);
    // Pre-select next grade level
    const currentClass = classes.find(c => c.id === evalStudent.class_id);
    if (currentClass) {
      const nextGrade = classes.find(c => c.grade_level === currentClass.grade_level + 1);
      if (nextGrade) {
        setTargetClassId(String(nextGrade.id));
        if (nextGrade.sections && nextGrade.sections.length > 0) {
          setTargetSectionId(String(nextGrade.sections[0].id));
        }
      } else {
        setTargetClassId(String(evalStudent.class_id));
        setTargetSectionId(String(evalStudent.section_id));
      }
    }
    setIsDetailsModalOpen(true);
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!detailsStudent || !targetYearId || !targetClassId || !targetSectionId) {
      notify.error('Please complete all target promotion destination fields.');
      return;
    }

    setIsPromoting(true);
    try {
      const res = await api.post(`/students/${detailsStudent.student_id}/promote`, {
        target_academic_year_id: targetYearId,
        target_class_id: targetClassId,
        target_section_id: targetSectionId,
        roll_number: targetRoll ? parseInt(targetRoll, 10) : null
      });

      notify.success(res.message || `Student ${detailsStudent.full_name} promoted successfully!`);
      setIsDetailsModalOpen(false);
      loadEvaluations(minAverageThreshold, selectedClassId, selectedSectionId);
      if (onStudentPromoted) {
        onStudentPromoted(detailsStudent.student_id);
      }
    } catch (err) {
      notify.error(err.message || 'Promotion failed.');
    } finally {
      setIsPromoting(false);
    }
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));
  const targetClassObj = classes.find(c => String(c.id) === String(targetClassId));

  const filteredEvaluations = (evaluationData?.evaluations || []).filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.full_name.toLowerCase().includes(q) ||
           s.student_code.toLowerCase().includes(q);
  });

  const summary = evaluationData?.summary || {
    total_students: 0,
    promoted_count: 0,
    retained_count: 0,
    pending_count: 0,
    class_overall_average: 0
  };

  const promotedPercentage = summary.total_students > 0 
    ? ((summary.promoted_count / summary.total_students) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: '#0B192C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #F59E0B'
            }}>
              <ArrowUpRight size={24} color="#F59E0B" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                Promotion Evaluation & Student Advancement
              </h2>
              <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                Set passing minimum average cutoff, calculate automated promotion status, and inspect complete student subject performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Promotion Threshold Controller Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid #10B981', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: '1.25rem', alignItems: 'flex-end' }}>
          {/* Threshold input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0 }}>
                Promotion Passing Minimum Average (%)
              </label>
              <button
                type="button"
                onClick={handleSaveDefaultThreshold}
                disabled={savingThreshold}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Save as permanent school promotion policy setting"
              >
                <Save size={13} />
                <span>{savingThreshold ? 'Saving...' : 'Save As Default'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="form-control"
                style={{ width: '130px', fontWeight: 800, fontSize: '1.05rem', color: '#10B981' }}
                value={minAverageThreshold}
                onChange={handleThresholdChange}
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[50, 55, 60, 65, 70].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setMinAverageThreshold(val);
                      loadEvaluations(val, selectedClassId, selectedSectionId);
                    }}
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid ${minAverageThreshold === val ? '#10B981' : '#CBD5E1'}`,
                      background: minAverageThreshold === val ? '#ECFDF5' : '#FFFFFF',
                      color: minAverageThreshold === val ? '#065F46' : '#475569'
                    }}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter by Grade Class */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Grade Level</label>
            <select
              className="form-control"
              value={selectedClassId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedClassId(cId);
                setSelectedSectionId('');
                loadEvaluations(minAverageThreshold, cId, '');
              }}
            >
              <option value="">All Grade Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter by Section */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Section</label>
            <select
              className="form-control"
              value={selectedSectionId}
              onChange={(e) => {
                const sId = e.target.value;
                setSelectedSectionId(sId);
                loadEvaluations(minAverageThreshold, selectedClassId, sId);
              }}
              disabled={!selectedClassId}
            >
              <option value="">All Sections</option>
              {selectedClassObj?.sections?.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' }}>
            Total Evaluated
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '0.2rem' }}>
            {summary.total_students} Students
          </div>
          <div style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', marginTop: '0.25rem' }}>
            Cutoff Threshold: <strong>&ge; {minAverageThreshold}%</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
            Eligible for Promotion
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            {summary.promoted_count} <span style={{ fontSize: '1rem', fontWeight: 600 }}>({promotedPercentage}%)</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.25rem' }}>
            Overall Average &ge; {minAverageThreshold}%
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
            Retained / Needs Support
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626', marginTop: '0.2rem' }}>
            {summary.retained_count} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Students</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '0.25rem' }}>
            Below passing cutoff (&lt; {minAverageThreshold}%)
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
            Class Overall Average
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706', marginTop: '0.2rem' }}>
            {summary.class_overall_average}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#D97706', marginTop: '0.25rem' }}>
            Across all enrolled subjects
          </div>
        </div>
      </div>

      {/* Search & Student Evaluation Table */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter evaluated candidates by student name or 5-digit ID..."
          />
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Interactive Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Student ID</th>
              <th>Student Full Name</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Gender</th>
              <th>Enrolled Section</th>
              <th>Overall Average %</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Automated Status</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Deficient Subjects</th>
              <th style={{ width: '170px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvaluations.map(s => {
              const isMale = s.gender === 'Male' || s.gender === 'M';
              const isPromoted = s.status === 'Promoted';
              const isPending = s.status === 'Pending Evaluation';

              return (
                <tr key={s.student_id}>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      color: '#0D9488',
                      fontSize: '0.9rem',
                      background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px'
                    }}>
                      {s.student_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', fontSize: '0.92rem' }}>
                      {s.full_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                      Guardian: {s.parent_name || 'Primary Guardian'} &bull; {s.parent_phone}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      color: '#FFFFFF',
                      background: isMale ? '#2563EB' : '#DB2777'
                    }}>
                      {isMale ? 'M' : 'F'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary">{s.section_full_name}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <strong style={{
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: isPending ? '#94A3B8' : (isPromoted ? '#059669' : '#DC2626')
                      }}>
                        {isPending ? '—' : `${s.overall_average}%`}
                      </strong>
                      {!isPending && (
                        <div style={{ width: '70px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, s.overall_average)}%`,
                            height: '100%',
                            background: isPromoted ? '#10B981' : '#EF4444'
                          }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isPending ? (
                      <span className="badge badge-secondary">Pending Marks</span>
                    ) : isPromoted ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        background: isDark ? 'rgba(5,150,105,0.15)' : '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0'
                      }}>
                        <CheckCircle2 size={13} /> Promoted
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        background: isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA'
                      }}>
                        <XCircle size={13} /> Retained
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.failed_subjects_count > 0 ? (
                      <span style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem' }}>
                        {s.failed_subjects_count} Subject{s.failed_subjects_count > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
                        None (All Passed)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(s)}
                      className="btn btn-sm btn-primary"
                      style={{
                        background: '#0D9488',
                        borderColor: '#0D9488',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 700,
                        fontSize: '0.78rem'
                      }}
                    >
                      <Eye size={13} /> Complete Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Complete Details & Promotion Destination Modal */}
      {isDetailsModalOpen && detailsStudent && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Academic Performance & Promotion Dossier: ${detailsStudent.full_name}`}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            {/* Candidate Identity Overview */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    color: '#FFFFFF',
                    background: detailsStudent.gender === 'Female' || detailsStudent.gender === 'F' ? '#DB2777' : '#2563EB'
                  }}>
                    {detailsStudent.gender === 'Female' || detailsStudent.gender === 'F' ? 'F' : 'M'}
                  </span>
                  <strong style={{ fontSize: '1.2rem', color: '#0F172A' }}>{detailsStudent.full_name}</strong>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0D9488' }}>
                    #{detailsStudent.student_code}
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Current Section: <strong>{detailsStudent.section_full_name}</strong> &bull; Guardian: {detailsStudent.parent_name} ({detailsStudent.parent_phone})
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  Cumulative Average
                </div>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: detailsStudent.status === 'Promoted' ? '#059669' : '#DC2626'
                }}>
                  {detailsStudent.overall_average}%
                </div>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  background: detailsStudent.status === 'Promoted' ? '#ECFDF5' : '#FEF2F2',
                  color: detailsStudent.status === 'Promoted' ? '#059669' : '#DC2626',
                  border: `1px solid ${detailsStudent.status === 'Promoted' ? '#A7F3D0' : '#FECACA'}`
                }}>
                  {detailsStudent.status === 'Promoted' ? '✓ Eligible for Promotion' : '✗ Retained (Below Cutoff)'}
                </span>
              </div>
            </div>

            {/* Subject-by-Subject Score Breakdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} color="#0D9488" />
                Subject Performance Breakdown (Passing Cutoff: {minAverageThreshold}%)
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <table className="table" style={{ margin: 0, fontSize: '0.82rem' }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th>Subject</th>
                      <th style={{ textAlign: 'center' }}>Score / Max</th>
                      <th style={{ textAlign: 'center' }}>Percentage</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsStudent.subject_breakdown?.map(sub => (
                      <tr key={sub.subject_id}>
                        <td>
                          <strong>{sub.subject_name}</strong> ({sub.subject_code})
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {sub.marks_obtained} / {sub.max_marks}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <strong>{sub.percentage}%</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {sub.passed ? (
                            <span style={{ color: '#059669', fontWeight: 800 }}>✓ Pass</span>
                          ) : (
                            <span style={{ color: '#DC2626', fontWeight: 800 }}>✗ Deficient</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Target Promotion Form */}
            <form onSubmit={handlePromote}>
              <div style={{ background: '#FFFBEB', padding: '1rem', borderRadius: '8px', border: '1px solid #FDE68A', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GraduationCap size={18} color="#D97706" />
                  Target Promotion Destination
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Promote into Academic Year *</label>
                  <select
                    className="form-control"
                    value={targetYearId}
                    onChange={(e) => setTargetYearId(e.target.value)}
                    required
                  >
                    {years.map(y => (
                      <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Active Year)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Target Grade Class *</label>
                    <select
                      className="form-control"
                      value={targetClassId}
                      onChange={(e) => {
                        setTargetClassId(e.target.value);
                        setTargetSectionId('');
                      }}
                      required
                    >
                      <option value="">-- Choose Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Target Section *</label>
                    <select
                      className="form-control"
                      value={targetSectionId}
                      onChange={(e) => setTargetSectionId(e.target.value)}
                      required
                      disabled={!targetClassId}
                    >
                      <option value="">-- Choose Section --</option>
                      {targetClassObj?.sections?.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>New Roll Number (Optional)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={targetRoll}
                    onChange={(e) => setTargetRoll(e.target.value)}
                    placeholder="e.g. 1"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPromoting}
                  style={{ background: '#D97706', borderColor: '#D97706', fontWeight: 800 }}
                >
                  <ArrowUpRight size={16} />
                  <span>{isPromoting ? 'Advancing Candidate...' : `Confirm Promotion to ${targetClassObj?.name || 'Target Grade'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
