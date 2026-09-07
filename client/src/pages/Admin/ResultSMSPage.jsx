import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { FileSpreadsheet, Send, Sparkles, CheckCircle2, Calculator, Globe } from 'lucide-react';

export default function ResultSMSPage() {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const notify = useNotify();
  const { isDark } = useTheme();

  // Selection state
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('ALL');

  // Preview computation state
  const [previewCohort, setPreviewCohort] = useState(null);

  // Template Presets
  const ENGLISH_TEMPLATE = "Dear Parent, your child +{student_name}'s +{class_section} +{assessment_name} results: Total: +{total_marks}/+{max_marks}, Average: +{average}%, Rank: +{rank}. Lake Side Academy.";
  const AMHARIC_TEMPLATE = "ውድ ወላጅ፣ የተማሪ +{student_name} ክፍል +{class_section} የ+{assessment_name} ውጤት: ድምር +{total_marks}/+{max_marks}፣ አማካይ +{average}%፣ ደረጃ +{rank}። ሌክ ሳይድ አካዳሚ።";

  const [smsTemplate, setSmsTemplate] = useState(ENGLISH_TEMPLATE);

  const tokens = [
    '+{student_name}',
    '+{class_section}',
    '+{assessment_name}',
    '+{total_marks}',
    '+{max_marks}',
    '+{average}',
    '+{rank}'
  ];

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (selectedClassId || selectedSectionId) {
      calculateResultPreview();
    }
  }, [selectedYear, selectedClassId, selectedSectionId, selectedAssessment]);

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

      // Default select Grade 8 or first available class
      if (cRes && cRes.length > 0) {
        const g8 = cRes.find(c => c.name.includes('8')) || cRes[0];
        setSelectedClassId(g8.id);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load options.');
    } finally {
      setLoading(false);
    }
  };

  const calculateResultPreview = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedAssessment) params.append('assessment_name', selectedAssessment);
      if (selectedSectionId) {
        params.append('section_ids', selectedSectionId);
      } else if (selectedClassId) {
        params.append('class_ids', selectedClassId);
      }

      const res = await api.get(`/rankings?${params.toString()}`);
      setPreviewCohort(res);
    } catch (err) {
      console.error('Failed to compute results preview:', err);
    }
  };

  const handleSendResultSMS = async (e) => {
    e.preventDefault();
    if (!previewCohort || previewCohort.rankings.length === 0) {
      notify.error('No student academic results available for this cohort.');
      return;
    }

    setIsGenerating(true);
    try {
      const sectionIds = selectedSectionId ? [selectedSectionId] : [];
      const classIds = selectedClassId ? [selectedClassId] : [];

      const res = await api.post('/sms/result-broadcast', {
        academic_year_id: selectedYear,
        assessment_name: selectedAssessment,
        class_ids: classIds,
        section_ids: sectionIds,
        message_template: smsTemplate
      });

      notify.success(res.message || 'Result SMS dispatched successfully!');
    } catch (err) {
      notify.error(err.message || 'Failed to dispatch Result SMS.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));

  // Helper to replace tokens for preview
  const replaceTokens = (template, student, assessName) => {
    if (!template) return '';
    if (!student) return 'Select a class or section with entered marks to preview rendered Result SMS...';
    return template
      .replace(/\+?\s*\{student_name\}/gi, student.full_name || '')
      .replace(/\+?\s*\{class_section\}/gi, student.section_full_name || '')
      .replace(/\+?\s*\{assessment_name\}/gi, assessName || 'Assessments')
      .replace(/\+?\s*\{total_marks\}/gi, student.total_obtained ?? 0)
      .replace(/\+?\s*\{max_marks\}/gi, student.total_max ?? 100)
      .replace(/\+?\s*\{average\}/gi, student.average_percentage ?? 0)
      .replace(/\+?\s*\{rank\}/gi, student.rank || '1 A');
  };

  // Generate live preview message for the top student
  const sampleStudent = previewCohort?.rankings?.[0];
  const sampleRenderedMsg = replaceTokens(smsTemplate, sampleStudent, selectedAssessment);

  // Character and segment calculation
  const isUnicode = /[^\u0000-\u00ff]/.test(sampleRenderedMsg);
  const maxSegmentLen = isUnicode ? 70 : 160;
  const charCount = sampleRenderedMsg.length;
  const segments = Math.max(1, Math.ceil(charCount / maxSegmentLen));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={26} color="#0D9488" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Result SMS Auto-Generator
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Generate and dispatch bilingual Result SMS reports directly to parent mobile phones
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Result Selector & Template */}
        <div className="card" style={{ borderTop: '4px solid #0D9488' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '1.25rem' }}>
            1. Select Result Cohort from Database
          </h3>

          <form onSubmit={handleSendResultSMS}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                color: '#0D9488',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
              }}>
                Academic Year: 2018 E.C. (Active)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Class / Grade</label>
                <select
                  className="form-control"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('');
                  }}
                  required
                >
                  <option value="">-- Choose Class / Grade --</option>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Section</label>
                <select
                  className="form-control"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                >
                  <option value="">All Sections in Class</option>
                  {selectedClassObj?.sections?.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assessment Benchmark</label>
              <select
                className="form-control"
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
              >
                <option value="ALL">All Configured Assessments (Aggregate)</option>
                <option value="Mid">Mid Examination</option>
                <option value="Final">Final Examination</option>
                <option value="Tests">Tests</option>
                <option value="F.Mid">F.Mid (First Semester Mid)</option>
                <option value="F.Final">F.Final (First Semester Final)</option>
                <option value="F.Tests">F.Tests (First Semester Tests)</option>
                <option value="S.Mid">S.Mid (Second Semester Mid)</option>
                <option value="S.Final">S.Final (Second Semester Final)</option>
                <option value="S.Tests">S.Tests (Second Semester Tests)</option>
              </select>
            </div>

            {/* Bilingual Template Presets */}
            <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>Bilingual Template Language</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSmsTemplate(ENGLISH_TEMPLATE)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    English Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsTemplate(AMHARIC_TEMPLATE)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#0D9488', fontWeight: 700 }}
                  >
                    Amharic (አማርኛ)
                  </button>
                </div>
              </div>

              <textarea
                className="form-control"
                rows={4}
                value={smsTemplate}
                onChange={(e) => setSmsTemplate(e.target.value)}
                required
                style={{ fontSize: '0.88rem', lineHeight: 1.6 }}
              />

              {/* Clickable Token Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.65rem' }}>
                {tokens.map(token => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setSmsTemplate(prev => `${prev} ${token}`)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      background: isDark ? '#0F172A' : '#F0FDFA',
                      borderColor: isDark ? '#1E293B' : '#CCFBF1',
                      color: isDark ? '#38BDF8' : '#0F766E',
                      fontWeight: 700
                    }}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold btn-lg"
              style={{ width: '100%', marginTop: '1.25rem' }}
              disabled={isGenerating || !previewCohort || (previewCohort.rankings && previewCohort.rankings.length === 0)}
            >
              <Send size={18} />
              <span>
                {isGenerating
                  ? 'Compiling & Delivering Result SMS...'
                  : `Dispatch Result SMS to ${previewCohort?.rankings?.length || 0} Parents`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Handset Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Cohort Calculation Summary Card */}
          <div className="card" style={{ background: isDark ? '#0F172A' : '#F8FAFC' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calculator size={17} color="#2563EB" /> Evaluated Cohort Data
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isDark ? '#111827' : '#FFFFFF', borderRadius: '8px', border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem' }}>Selected Students:</span>
                <strong style={{ fontSize: '1rem', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  {previewCohort?.summary?.total_students || 0}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isDark ? '#111827' : '#FFFFFF', borderRadius: '8px', border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem' }}>Cohort Average:</span>
                <strong style={{ fontSize: '1rem', color: '#10B981' }}>
                  {previewCohort?.summary?.average_mark || 0}%
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: isDark ? '#111827' : '#FFFFFF', borderRadius: '8px', border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.85rem' }}>Total Marks Obtained:</span>
                <strong style={{ fontSize: '1rem', color: '#2563EB' }}>
                  {previewCohort?.summary?.total_marks_obtained || 0} / {previewCohort?.summary?.total_possible_marks || 0}
                </strong>
              </div>
            </div>
          </div>

          {/* Parent Handset Live Preview Card */}
          <div className="card" style={{ background: '#020617', color: '#FFFFFF', border: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Parent Handset Preview</span>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>Result SMS Telemetry</span>
            </div>

            <div style={{
              background: '#0F172A',
              borderRadius: '12px',
              padding: '1.1rem',
              borderLeft: '4px solid #10B981',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '0.45rem' }}>
                To: <strong style={{ color: '#F1F5F9' }}>{sampleStudent ? `${sampleStudent.parent_name || 'Guardian'} (${sampleStudent.parent_phone || '09XXXXXXXX'})` : 'Guardian (09XXXXXXXX)'}</strong>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#F8FAFC', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {sampleRenderedMsg}
              </div>
            </div>

            {/* Message Meter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.72rem', color: '#94A3B8' }}>
              <span>Encoding: <strong>{isUnicode ? 'Unicode (Amharic UTF-8)' : 'GSM-7 (English)'}</strong></span>
              <span>Length: <strong>{charCount} chars</strong> ({segments} {segments === 1 ? 'segment' : 'segments'})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
