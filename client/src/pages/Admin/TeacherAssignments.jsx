import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { Network, Plus, Trash2, CheckCircle2, User, BookOpen, Layers } from 'lucide-react';

export default function TeacherAssignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const notify = useNotify();

  const [form, setForm] = useState({
    teacher_id: '',
    academic_year_id: '',
    class_id: '',
    section_id: '',
    subject_id: ''
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [tRes, cRes, sRes, yRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/academic/classes'),
        api.get('/academic/subjects'),
        api.get('/academic/years')
      ]);
      setTeachers(tRes);
      setClasses(cRes);
      setSubjects(sRes);
      setYears(yRes);

      // Default active year
      const activeYear = yRes.find(y => y.is_current);
      if (activeYear) {
        setForm(prev => ({ ...prev, academic_year_id: activeYear.id }));
      }
    } catch (err) {
      notify.error(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teachers/assignments', form);
      notify.success('Teacher assigned successfully!');
      setIsAssignModalOpen(false);
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to create assignment.');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this teacher assignment?')) return;
    try {
      await api.delete(`/teachers/assignments/${assignmentId}`);
      notify.success('Assignment removed.');
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to delete assignment.');
    }
  };

  // Selected class's sections for the assignment form dropdown
  const selectedClassObj = classes.find(c => String(c.id) === String(form.class_id));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>Teacher Assignments Matrix</h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Map faculty teachers to specific classes, sections, and subjects
          </p>
        </div>
        <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> New Assignment Mapping
        </button>
      </div>

      {/* Teachers Matrix Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {teachers.map(teacher => (
          <div key={teacher.id} className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{teacher.full_name}</h3>
                  <span className="badge badge-primary">{teacher.staff_id}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
                  {teacher.qualification || 'Faculty Member'} • Username: @{teacher.username} • Phone: {teacher.phone || '—'}
                </div>
              </div>
              <span className="badge" style={{ background: '#F5F3FF', color: '#6D28D9', fontWeight: 700 }}>
                {teacher.assignments?.length || 0} Assigned Sections
              </span>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                Assigned Class & Subject Roster
              </div>

              {teacher.assignments && teacher.assignments.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {teacher.assignments.map(a => (
                    <div key={a.id} style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                          {a.section_full_name}
                        </div>
                        <div style={{ fontSize: '0.825rem', color: '#2563EB', fontWeight: 600 }}>
                          {a.subject_name} ({a.subject_code})
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                          Academic Year: {a.academic_year_name}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="btn btn-sm"
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.3rem' }}
                        title="Remove Assignment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  No active class assignments. Click "New Assignment Mapping" to assign this teacher.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Teacher to Class & Subject"
      >
        <form onSubmit={handleCreateAssignment}>
          <div className="form-group">
            <label className="form-label">Select Teacher</label>
            <select
              className="form-control"
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              required
            >
              <option value="">-- Choose Faculty Teacher --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.staff_id})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <select
              className="form-control"
              value={form.academic_year_id}
              onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
              required
            >
              <option value="">-- Select Year --</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>
              ))}
            </select>
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
                <option value="">-- Select Class --</option>
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
                <option value="">-- Select Section --</option>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Assignment Mapping</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
