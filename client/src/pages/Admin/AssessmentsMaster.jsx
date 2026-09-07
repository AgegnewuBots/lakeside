import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import Modal from '../../components/Modal';
import { ClipboardList, Plus, Calendar, CheckCircle2, Award, Users } from 'lucide-react';

export default function AssessmentsMaster() {
  const { isDark } = useTheme();
  const [assessments, setAssessments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const notify = useNotify();

  const [form, setForm] = useState({
    academic_year_id: '',
    term_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    name: 'Mid',
    max_marks: '80',
    weight_percentage: '20',
    assessment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [aRes, cRes, sRes, yRes, tRes] = await Promise.all([
        api.get('/assessments'),
        api.get('/academic/classes'),
        api.get('/academic/subjects'),
        api.get('/academic/years'),
        api.get('/academic/terms')
      ]);
      setAssessments(aRes);
      setClasses(cRes);
      setSubjects(sRes);
      setYears(yRes);
      setTerms(tRes);

      const curYear = yRes.find(y => y.is_current);
      const curTerm = tRes.find(t => t.is_current);
      if (curYear) setForm(prev => ({ ...prev, academic_year_id: curYear.id }));
      if (curTerm) setForm(prev => ({ ...prev, term_id: curTerm.id }));
    } catch (err) {
      notify.error(err.message || 'Failed to load assessments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      const isBonus = form.name.toLowerCase().includes('bonus');
      const isMid = form.name.toLowerCase().includes('mid');
      const isFinal = form.name.toLowerCase().includes('final');
      const aType = isBonus ? 'Bonus' : (isMid ? 'Mid' : (isFinal ? 'Final' : 'Test'));

      await api.post('/assessments', {
        ...form,
        assessment_type: aType,
        max_marks: parseFloat(form.max_marks),
        weight_percentage: parseFloat(form.weight_percentage || 0)
      });
      notify.success(`Assessment '${form.name}' created.`);
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to create assessment.');
    }
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(form.class_id));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>Assessments & Marks Oversight</h2>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Configure and monitor academic tests, midterms, quizzes, and final examinations
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
          <Plus size={18} /> Configure New Assessment
        </button>
      </div>

      {/* Assessments Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Assessment Name</th>
              <th>Class & Section</th>
              <th>Subject</th>
              <th>Term / Academic Year</th>
              <th>Max Marks</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map(a => {
              const entered = a.marks_entered_count || 0;
              const total = a.total_students_count || 0;
              const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
              return (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>{a.name}</div>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>Date: {a.assessment_date || '—'}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{a.section_full_name}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0D9488' }}>{a.subject_name}</div>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'monospace' }}>[{a.subject_code}]</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: isDark ? '#E2E8F0' : '#1E293B' }}>{a.term_name}</div>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{a.academic_year_name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>{a.max_marks}</div>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>Max Points</div>
                  </td>
                  <td>
                    <div style={{ width: '120px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span>{entered} / {total}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10B981' : '#3B82F6' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'Completed' ? 'badge-success' : 'badge-primary'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Configure New Assessment"
      >
        <form onSubmit={handleCreateAssessment}>
          <div className="form-group">
            <label className="form-label">Assessment Type / Name</label>
            <select
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            >
              <option value="Tests">Tests (General)</option>
              <option value="Test 1">Test 1</option>
              <option value="Test 2">Test 2</option>
              <option value="Test 3">Test 3</option>
              <option value="Mid">Mid Examination</option>
              <option value="Final">Final Examination</option>
              <option value="Bonus">Bonus / Extra Credit</option>
              <option value="F.Mid">F.Mid (First Sem. Mid)</option>
              <option value="F.Final">F.Final (First Sem. Final)</option>
              <option value="F.Tests">F.Tests (First Sem. Tests)</option>
              <option value="S.Mid">S.Mid (Second Sem. Mid)</option>
              <option value="S.Final">S.Final (Second Sem. Final)</option>
              <option value="S.Tests">S.Tests (Second Sem. Tests)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Grade Class</label>
              <select
                className="form-control"
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}
                required
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select
                className="form-control"
                value={form.section_id}
                onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                required
                disabled={!form.class_id}
              >
                <option value="">-- Choose Section --</option>
                {selectedClassObj && selectedClassObj.sections && selectedClassObj.sections.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <select
              className="form-control"
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              required
            >
              <option value="">-- Choose Subject --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Maximum Marks</label>
              <input
                type="number"
                step="any"
                className="form-control"
                value={form.max_marks}
                onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
                placeholder="e.g. 40, 80, 100"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assessment Date</label>
              <input
                type="date"
                className="form-control"
                value={form.assessment_date}
                onChange={(e) => setForm({ ...form, assessment_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Create Assessment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
