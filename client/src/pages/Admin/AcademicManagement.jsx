import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import Modal from '../../components/Modal';
import {
  GraduationCap,
  Calendar,
  Plus,
  BookOpen,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  Search
} from 'lucide-react';

export default function AcademicManagement({ isDirectoryView = false }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();
  const { isDark } = useTheme();

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Subject assignment & edit modal states
  const [isAssignSubjectModalOpen, setIsAssignSubjectModalOpen] = useState(false);
  const [targetClassForSubject, setTargetClassForSubject] = useState(null);
  const [assignSubjectMode, setAssignSubjectMode] = useState('existing');
  const [selectedSubjectIdToAssign, setSelectedSubjectIdToAssign] = useState('');
  const [newSubjectForClass, setNewSubjectForClass] = useState({ name: '', code: '' });

  // Edit subject modal state
  const [isEditSubjectModalOpen, setIsEditSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState({ id: null, name: '', code: '' });

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Section management modal states
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [targetClassForSection, setTargetClassForSection] = useState(null);
  const [newSectionLetter, setNewSectionLetter] = useState('');

  // Creation forms
  const [newClass, setNewClass] = useState({ name: '', grade_level: '', sections: 'A, B, C' });
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/academic/subjects')
      ]);
      setClasses(cRes || []);
      setSubjects(sRes || []);
    } catch (err) {
      notify.error(err.message || 'Failed to load academic curriculum.');
    } finally {
      setLoading(false);
    }
  };

  // Create Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const sectionArr = newClass.sections.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      await api.post('/academic/classes', {
        name: newClass.name.trim(),
        grade_level: parseInt(newClass.grade_level, 10),
        section_names: sectionArr.length > 0 ? sectionArr : ['A', 'B', 'C', 'D', 'E']
      });
      notify.success(`Class ${newClass.name} created.`);
      setIsClassModalOpen(false);
      setNewClass({ name: '', grade_level: '', sections: 'A, B, C, D, E' });
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to create class.');
    }
  };

  // Create Subject (Global Library)
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/academic/subjects', {
        name: newSubject.name.trim(),
        code: newSubject.code.trim().toUpperCase()
      });
      notify.success(`Subject ${newSubject.name} registered.`);
      setIsSubjectModalOpen(false);
      setNewSubject({ name: '', code: '' });
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to create subject.');
    }
  };

  // Open Assign Subject Modal for a Class
  const handleOpenAssignSubject = (cls) => {
    setTargetClassForSubject(cls);
    setAssignSubjectMode('existing');
    setSelectedSubjectIdToAssign('');
    setNewSubjectForClass({ name: '', code: '' });
    setIsAssignSubjectModalOpen(true);
  };

  // Submit Assign Subject to Class
  const handleAssignSubjectToClass = async (e) => {
    e.preventDefault();
    if (!targetClassForSubject) return;

    try {
      let subjectIdToLink = selectedSubjectIdToAssign;

      if (assignSubjectMode === 'new') {
        if (!newSubjectForClass.name.trim() || !newSubjectForClass.code.trim()) {
          notify.error('Subject name and code are required.');
          return;
        }
        const created = await api.post('/academic/subjects', {
          name: newSubjectForClass.name.trim(),
          code: newSubjectForClass.code.trim().toUpperCase()
        });
        subjectIdToLink = created.id;
      }

      if (!subjectIdToLink) {
        notify.error('Please select a subject to assign.');
        return;
      }

      await api.post(`/academic/classes/${targetClassForSubject.id}/subjects`, {
        subject_id: parseInt(subjectIdToLink, 10)
      });

      notify.success(`Subject assigned to ${targetClassForSubject.name}.`);
      setIsAssignSubjectModalOpen(false);
      setTargetClassForSubject(null);
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to assign subject to class.');
    }
  };

  // Open Edit Subject Modal
  const handleOpenEditSubject = (subject) => {
    setEditingSubject({
      id: subject.id,
      name: subject.name,
      code: subject.code
    });
    setIsEditSubjectModalOpen(true);
  };

  // Submit Edit Subject
  const handleSaveEditSubject = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/academic/subjects/${editingSubject.id}`, {
        name: editingSubject.name.trim(),
        code: editingSubject.code.trim().toUpperCase()
      });
      notify.success(`Subject updated to "${editingSubject.name}" (${editingSubject.code.toUpperCase()}).`);
      setIsEditSubjectModalOpen(false);
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to update subject.');
    }
  };

  // Request Remove Subject from Class
  const handlePromptRemoveSubjectFromClass = (cls, subject) => {
    setDeleteTarget({
      type: 'class_subject',
      classId: cls.id,
      subjectId: subject.id,
      name: subject.name,
      code: subject.code,
      className: cls.name
    });
    setIsDeleteModalOpen(true);
  };

  // Request Delete Subject Globally
  const handlePromptDeleteSubjectGlobal = (subject) => {
    setDeleteTarget({
      type: 'global_subject',
      subjectId: subject.id,
      name: subject.name,
      code: subject.code
    });
    setIsDeleteModalOpen(true);
  };

  // Open Add Section Modal for a Class
  const handleOpenAddSection = (cls) => {
    setTargetClassForSection(cls);
    const existingNames = (cls.sections || []).map(s => s.name.toUpperCase());
    const candidates = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextLetter = candidates.find(c => !existingNames.includes(c)) || '';
    setNewSectionLetter(nextLetter);
    setIsAddSectionModalOpen(true);
  };

  // Submit Add Section
  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!targetClassForSection || !newSectionLetter.trim()) return;

    try {
      await api.post('/academic/sections', {
        class_id: targetClassForSection.id,
        name: newSectionLetter.trim().toUpperCase()
      });
      notify.success(`Section ${targetClassForSection.name}${newSectionLetter.trim().toUpperCase()} added successfully!`);
      setIsAddSectionModalOpen(false);
      setTargetClassForSection(null);
      setNewSectionLetter('');
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to add section.');
    }
  };

  // Prompt Remove Section
  const handlePromptDeleteSection = (cls, section) => {
    setDeleteTarget({
      type: 'section',
      sectionId: section.id,
      name: section.full_name,
      className: cls.name
    });
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete / Remove Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'class_subject') {
        await api.delete(`/academic/classes/${deleteTarget.classId}/subjects/${deleteTarget.subjectId}`);
        notify.success(`Subject ${deleteTarget.name} removed from ${deleteTarget.className}.`);
      } else if (deleteTarget.type === 'global_subject') {
        await api.delete(`/academic/subjects/${deleteTarget.subjectId}`);
        notify.success(`Subject ${deleteTarget.name} deleted.`);
      } else if (deleteTarget.type === 'section') {
        await api.delete(`/academic/sections/${deleteTarget.sectionId}`);
        notify.success(`Section ${deleteTarget.name} deleted successfully.`);
      }
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      notify.error(err.message || 'Failed to delete item.');
    }
  };

  const filteredSubjects = [...subjects]
    .filter(s =>
      s.name.toLowerCase().includes(subjectFilter.toLowerCase()) ||
      s.code.toLowerCase().includes(subjectFilter.toLowerCase())
    )
    .sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Academic Structure & Curriculum
            </h2>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
              color: '#0D9488',
              padding: '2px 8px',
              borderRadius: '4px',
              border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
            }}>
              Academic Year: 2018 E.C. (Active)
            </span>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Grades 1 through 8 with 5 Sections (A, B, C, D, E) each, and curriculum subject assignments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setIsSubjectModalOpen(true)} className="btn btn-secondary btn-sm">
            <BookOpen size={15} /> Add Subject
          </button>
          <button onClick={() => setIsClassModalOpen(true)} className="btn btn-primary btn-sm" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
            <Plus size={15} /> Add Class
          </button>
        </div>
      </div>

      {/* Curriculum Subjects Library */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
              <BookOpen size={17} color="#0D9488" /> Curriculum Subjects Library
            </h3>
            <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>Total: {subjects.length} registered subjects</span>
          </div>

          <div style={{ width: '220px' }}>
            <input
              type="text"
              className="form-control"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              placeholder="Search subjects..."
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {filteredSubjects.map(s => (
            <div key={s.id} style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: isDark ? '#0F172A' : '#F8FAFC',
              border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#0D9488',
                    background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}>
                    {s.code}
                  </span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      onClick={() => handleOpenEditSubject(s)}
                      title="Edit Subject"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handlePromptDeleteSubjectGlobal(s)}
                      title="Delete Subject"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#EF4444' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#F1F5F9' : '#1E293B' }}>
                  {s.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Classes & Sections Master (KG 1 to 3, Grades 1 to 8 with Sections A, B, C, D, E) */}
      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
            <Layers size={18} color="#7C3AED" /> Kindergarten & Elementary Classes & Sections
          </h3>
          <span style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B' }}>
            Grades 1 through 8 and KG 1 through 3 each support 5 sections (A, B, C, D, E) with live enrolled counts and curriculum subjects listed by their codes
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {classes.map(c => {
            const classSubjectsList = c.subjects || [];
            const sortedSubjects = [...classSubjectsList].sort((a, b) => (a.code || '').localeCompare(b.code || ''));

            return (
              <div
                key={c.id}
                style={{
                  background: isDark ? '#0F172A' : '#FFFFFF',
                  borderRadius: '10px',
                  border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  padding: '1.25rem',
                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Class Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      background: c.name.startsWith('KG') ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? '#1E1B4B' : '#F5F3FF'),
                      color: c.name.startsWith('KG') ? '#10B981' : '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {c.name.startsWith('KG') ? c.name.replace(' ', '') : `G${c.grade_level}`}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: isDark ? '#FFFFFF' : '#0F172A' }}>{c.name}</span>
                        <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>
                          {c.name.startsWith('KG') ? 'Kindergarten' : `Grade ${c.grade_level}`}
                        </span>
                      </div>
                      {/* Dynamic Sections with student count and controls */}
                      <div style={{ fontSize: '0.8rem', color: isDark ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>Sections ({c.sections?.length || 0}):</span>
                        {c.sections && c.sections.map(s => (
                          <span key={s.id} style={{
                            background: isDark ? '#064E3B' : '#F0FDFA',
                            border: isDark ? '1px solid #047857' : '1px solid #CCFBF1',
                            color: isDark ? '#34D399' : '#0F766E',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <span>{s.name} ({s.student_count || 0} students)</span>
                            {(s.student_count || 0) === 0 && (
                              <button
                                type="button"
                                onClick={() => handlePromptDeleteSection(c, s)}
                                title={`Delete Section ${s.full_name}`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: '#EF4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.75
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.75'}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleOpenAddSection(c)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '1px 7px',
                            fontSize: '0.72rem',
                            borderRadius: '4px',
                            borderColor: isDark ? 'rgba(124, 58, 237, 0.4)' : '#DDD6FE',
                            color: isDark ? '#DDD6FE' : '#6D28D9'
                          }}
                          title={`Add a section to ${c.name}`}
                        >
                          <Plus size={11} /> Add Section
                        </button>
                      </div>

                      {/* Subject Codes Summary Badge Strip */}
                      {sortedSubjects.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B' }}>Subject Codes:</span>
                          {sortedSubjects.map(sub => (
                            <span key={sub.id} style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              color: '#7C3AED',
                              background: isDark ? '#1E1B4B' : '#F5F3FF',
                              border: isDark ? '1px solid #312E81' : '1px solid #DDD6FE',
                              padding: '0.5px 5px',
                              borderRadius: '3px'
                            }}>
                              {sub.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAssignSubject(c)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Plus size={13} /> Add Subject to {c.name}
                  </button>
                </div>

                {/* Assigned Subjects in this class listed by their codes */}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Curriculum Subjects by Code ({sortedSubjects.length})
                  </div>

                  {sortedSubjects.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {sortedSubjects.map(sub => (
                        <div key={sub.id} style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          background: isDark ? '#111827' : '#F8FAFC',
                          border: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#7C3AED',
                              background: isDark ? '#1E1B4B' : '#F5F3FF',
                              border: isDark ? '1px solid #312E81' : '1px solid #DDD6FE',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {sub.code}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.84rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                              {sub.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleOpenEditSubject(sub)}
                              title="Edit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: isDark ? '#94A3B8' : '#64748B' }}
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handlePromptRemoveSubjectFromClass(c, sub)}
                              title="Remove from class"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#EF4444' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      No subjects assigned yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: Assign Subject to Class */}
      <Modal
        isOpen={isAssignSubjectModalOpen}
        onClose={() => setIsAssignSubjectModalOpen(false)}
        title={targetClassForSubject ? `Add Subject to ${targetClassForSubject.name}` : 'Add Subject to Class'}
      >
        <form onSubmit={handleAssignSubjectToClass}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: isDark ? '#0F172A' : '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setAssignSubjectMode('existing')}
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                background: assignSubjectMode === 'existing' ? (isDark ? '#1E293B' : '#FFFFFF') : 'transparent',
                color: assignSubjectMode === 'existing' ? (isDark ? '#FFFFFF' : '#0F172A') : '#64748B',
                cursor: 'pointer'
              }}
            >
              Select from Library
            </button>
            <button
              type="button"
              onClick={() => setAssignSubjectMode('new')}
              style={{
                flex: 1,
                padding: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                background: assignSubjectMode === 'new' ? (isDark ? '#1E293B' : '#FFFFFF') : 'transparent',
                color: assignSubjectMode === 'new' ? (isDark ? '#FFFFFF' : '#0F172A') : '#64748B',
                cursor: 'pointer'
              }}
            >
              Create New Subject
            </button>
          </div>

          {assignSubjectMode === 'existing' ? (
            <div className="form-group">
              <label className="form-label">Select Subject</label>
              <select
                className="form-control"
                value={selectedSubjectIdToAssign}
                onChange={(e) => setSelectedSubjectIdToAssign(e.target.value)}
                required
              >
                <option value="">-- Choose Subject by Code --</option>
                {subjects
                  .filter(s => !(targetClassForSubject?.subjects || []).some(cs => cs.id === s.id))
                  .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                  .map(s => (
                    <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newSubjectForClass.name}
                  onChange={(e) => setNewSubjectForClass({ ...newSubjectForClass, name: e.target.value })}
                  placeholder="e.g. Environmental Science"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={newSubjectForClass.code}
                  onChange={(e) => setNewSubjectForClass({ ...newSubjectForClass, code: e.target.value })}
                  placeholder="e.g. ENV"
                  required
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAssignSubjectModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
              Assign Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Subject */}
      <Modal
        isOpen={isEditSubjectModalOpen}
        onClose={() => setIsEditSubjectModalOpen(false)}
        title="Edit Subject"
      >
        <form onSubmit={handleSaveEditSubject}>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              type="text"
              className="form-control"
              value={editingSubject.name}
              onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input
              type="text"
              className="form-control"
              value={editingSubject.code}
              onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsEditSubjectModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={14} /> Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Delete / Remove Item */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={
          deleteTarget?.type === 'class_subject'
            ? 'Remove Subject from Class'
            : deleteTarget?.type === 'section'
            ? 'Remove Academic Section'
            : 'Delete Subject'
        }
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '0.35rem' }}>
              {deleteTarget?.type === 'class_subject'
                ? `Remove "${deleteTarget?.name}" from ${deleteTarget?.className}?`
                : deleteTarget?.type === 'section'
                ? `Remove Section "${deleteTarget?.name}"?`
                : `Delete "${deleteTarget?.name}"?`}
            </h4>
            <p style={{ fontSize: '0.85rem', color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1.5, margin: 0 }}>
              {deleteTarget?.type === 'class_subject'
                ? `This will remove ${deleteTarget?.name} from ${deleteTarget?.className}. It will remain in other classes.`
                : deleteTarget?.type === 'section'
                ? `This will remove section ${deleteTarget?.name} from ${deleteTarget?.className}. Only empty sections with 0 enrolled students can be removed.`
                : `This will permanently delete ${deleteTarget?.name} from the curriculum.`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleConfirmDelete} className="btn btn-danger" style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626' }}>
            <Trash2 size={14} /> {deleteTarget?.type === 'class_subject' ? 'Remove' : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* MODAL 4: Create Class */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Grade Class"
      >
        <form onSubmit={handleCreateClass}>
          <div className="form-group">
            <label className="form-label">Class Name</label>
            <input
              type="text"
              className="form-control"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              placeholder="e.g. Grade 9"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Numeric Grade Level</label>
            <input
              type="number"
              className="form-control"
              value={newClass.grade_level}
              onChange={(e) => setNewClass({ ...newClass, grade_level: e.target.value })}
              placeholder="e.g. 9"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sections to Generate (A, B, C, D, E)</label>
            <input
              type="text"
              className="form-control"
              value={newClass.sections}
              onChange={(e) => setNewClass({ ...newClass, sections: e.target.value })}
              placeholder="A, B, C, D, E"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsClassModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>Create Class</button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Create Subject (Library) */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add Subject to Curriculum"
      >
        <form onSubmit={handleCreateSubject}>
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              type="text"
              className="form-control"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              placeholder="e.g. General Science"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input
              type="text"
              className="form-control"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
              placeholder="e.g. GSC"
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>Save Subject</button>
          </div>
        </form>
      </Modal>
      {/* MODAL 6: Add Section to Class */}
      <Modal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        title={`Add Section to ${targetClassForSection?.name || 'Class'}`}
      >
        <form onSubmit={handleCreateSection}>
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: isDark ? '#94A3B8' : '#64748B', margin: 0 }}>
              Add a new section (e.g. <strong>D</strong>, <strong>E</strong>) specifically to <strong>{targetClassForSection?.name}</strong>. Other classes will maintain their own configured sections.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Section Identifier / Letter</label>
            <input
              type="text"
              className="form-control"
              value={newSectionLetter}
              onChange={(e) => setNewSectionLetter(e.target.value.toUpperCase())}
              placeholder="e.g. D"
              maxLength={3}
              required
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', marginTop: '4px', display: 'block' }}>
              Full name will be generated as: <strong>{targetClassForSection?.name}{newSectionLetter.trim().toUpperCase() || '?'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAddSectionModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>
              <Plus size={14} /> Add Section to {targetClassForSection?.name}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
