import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { 
  Contact, 
  Search, 
  X, 
  Printer, 
  Eye, 
  ShieldCheck, 
  Calendar, 
  Phone, 
  GraduationCap, 
  User, 
  QrCode, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export default function StudentIDLookupPage() {
  const { isDark } = useTheme();
  const notify = useNotify();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Selected student for ID Card preview modal
  const [selectedStudentForCard, setSelectedStudentForCard] = useState(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studRes, classRes] = await Promise.all([
        api.get('/students'),
        api.get('/academic/classes')
      ]);
      setStudents(studRes || []);
      setClasses(classRes || []);
    } catch (err) {
      notify.error(err.message || 'Failed to load student identity directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIDCard = (student) => {
    setSelectedStudentForCard(student);
    setIsCardModalOpen(true);
  };

  const handlePrintCard = () => {
    window.print();
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    // Search by 5-digit ID or Name
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      (s.student_id && s.student_id.toLowerCase().includes(q)) ||
      (s.full_name && s.full_name.toLowerCase().includes(q));

    // Filter by Class
    const matchesClass = !selectedClassId || String(s.class_id) === String(selectedClassId);

    // Filter by Section
    const matchesSection = !selectedSectionId || String(s.section_id) === String(selectedSectionId);

    return matchesQuery && matchesClass && matchesSection;
  });

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));

  // Live gender counters for filtered list
  const maleCount = filteredStudents.filter(s => s.gender === 'Male' || s.gender === 'M').length;
  const femaleCount = filteredStudents.filter(s => s.gender === 'Female' || s.gender === 'F').length;

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
              <Contact size={24} color="#F59E0B" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
                School ID Manager & Student Lookup
              </h2>
              <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                Confidential read-only student registration directory for ID card issuance & identity verification.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Access Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: isDark ? 'rgba(13, 148, 136, 0.15)' : '#F0FDFA',
          border: isDark ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid #CCFBF1',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#0D9488',
          fontWeight: 700
        }}>
          <ShieldCheck size={18} />
          <span>Read-Only Verification Portal &bull; Zero Academic Marks &bull; Immutable Identity Records</span>
        </div>
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid #F59E0B', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Multi-criteria Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Search by 5-Digit Student ID or Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 10001, Hana Alemu, Bekele..."
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

          {/* Filter by Grade Class */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Grade Level</label>
            <select
              className="form-control"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
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
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
            >
              <option value="">All Sections</option>
              {selectedClassObj?.sections?.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Roster Demographic Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.25rem',
          paddingTop: '0.85rem',
          borderTop: isDark ? '1px solid #1E293B' : '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            Showing <strong>{filteredStudents.length}</strong> matching student identity records
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB' }} />
              <strong>{maleCount}</strong> Male
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DB2777' }} />
              <strong>{femaleCount}</strong> Female
            </span>
          </div>
        </div>
      </div>

      {/* Student Identity Records Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: isDark ? '#94A3B8' : '#64748B' }}>
          Loading student identity directory...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: isDark ? '#94A3B8' : '#64748B' }}>
          <Contact size={44} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A', marginBottom: '0.4rem' }}>
            No Students Found
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0 }}>
            No registered student matched your search query. Verify 5-digit ID or spelling.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Student ID</th>
                <th>Student Full Name</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Gender</th>
                <th>Grade & Section</th>
                <th>Birth Date (EC / GC)</th>
                <th>Primary Guardian</th>
                <th>Guardian Phone</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => {
                const isMale = s.gender === 'Male' || s.gender === 'M';
                return (
                  <tr key={s.id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.92rem',
                        color: '#0D9488',
                        background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
                      }}>
                        {s.student_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', fontSize: '0.92rem' }}>
                        {s.full_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                        Registered: {s.registration_date || '2025-09-01'}
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
                      <span className="badge badge-primary">
                        {s.section_full_name || s.class_name}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: isDark ? '#F1F5F9' : '#0F172A', fontWeight: 600 }}>
                        {s.date_of_birth || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A', fontSize: '0.88rem' }}>
                        {s.parent_name || 'Primary Guardian'}
                      </div>
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        color: isDark ? '#38BDF8' : '#0284C7',
                        fontWeight: 700
                      }}>
                        <Phone size={12} />
                        {s.parent_phone || '—'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#059669',
                        background: isDark ? 'rgba(5,150,105,0.15)' : '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px'
                      }}>
                        <CheckCircle2 size={12} /> Active
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenIDCard(s)}
                        className="btn btn-sm btn-primary"
                        style={{
                          background: '#0B192C',
                          borderColor: '#F59E0B',
                          color: '#F59E0B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontWeight: 700,
                          fontSize: '0.78rem'
                        }}
                        title="View and print official Student ID card"
                      >
                        <Printer size={13} /> View ID Card
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Photorealistic Official Student ID Card Modal */}
      {isCardModalOpen && selectedStudentForCard && (
        <Modal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          title="Official Student Identity Card"
        >
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* ID Card Outer Container */}
            <div
              id="student-id-card-printable"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '3px solid #0B192C',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                color: '#0F172A',
                position: 'relative'
              }}
            >
              {/* Card Header */}
              <div style={{
                background: '#0B192C',
                color: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                borderBottom: '4px solid #F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #F59E0B'
                  }}>
                    <GraduationCap size={26} color="#0B192C" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.5px', color: '#FFFFFF' }}>
                      LAKE SIDE ACADEMY
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 700 }}>
                      ሌክ ሳይድ አካዳሚ &bull; Addis Ababa, Ethiopia
                    </div>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid #F59E0B',
                  color: '#F59E0B',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  STUDENT PASS
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                  {/* Photo / Silhouette Box */}
                  <div style={{
                    width: 110,
                    height: 125,
                    borderRadius: '10px',
                    background: selectedStudentForCard.gender === 'Female' || selectedStudentForCard.gender === 'F' ? '#FDF2F8' : '#EFF6FF',
                    border: `2px solid ${selectedStudentForCard.gender === 'Female' || selectedStudentForCard.gender === 'F' ? '#DB2777' : '#2563EB'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}>
                    <User size={52} color={selectedStudentForCard.gender === 'Female' || selectedStudentForCard.gender === 'F' ? '#DB2777' : '#2563EB'} />
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: selectedStudentForCard.gender === 'Female' || selectedStudentForCard.gender === 'F' ? '#DB2777' : '#2563EB',
                      textTransform: 'uppercase'
                    }}>
                      {selectedStudentForCard.gender}
                    </span>
                  </div>

                  {/* Student Key Identity Data */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                      Official Student ID
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '1.6rem',
                      color: '#0D9488',
                      letterSpacing: '1.5px',
                      lineHeight: 1.1,
                      marginBottom: '0.5rem'
                    }}>
                      #{selectedStudentForCard.student_id}
                    </div>

                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700 }}>
                      Student Full Name
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#0F172A', lineHeight: 1.2 }}>
                      {selectedStudentForCard.full_name}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '0.85rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Grade & Section
                    </span>
                    <strong style={{ color: '#0F172A' }}>{selectedStudentForCard.section_full_name}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Academic Year
                    </span>
                    <strong style={{ color: '#0D9488' }}>{selectedStudentForCard.academic_year_name || '2018 E.C.'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Date of Birth
                    </span>
                    <strong style={{ color: '#0F172A' }}>{selectedStudentForCard.date_of_birth || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Primary Guardian
                    </span>
                    <strong style={{ color: '#0F172A' }}>{selectedStudentForCard.parent_name || 'Guardian'}</strong>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Emergency Contact Phone
                    </span>
                    <strong style={{ fontFamily: 'monospace', color: '#0284C7', fontSize: '0.9rem' }}>
                      {selectedStudentForCard.parent_phone || '—'}
                    </strong>
                  </div>
                </div>

                {/* Footer Barcode / Verification Strip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px dashed #CBD5E1',
                  paddingTop: '0.75rem',
                  fontSize: '0.72rem',
                  color: '#64748B'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <QrCode size={28} color="#0B192C" />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0B192C' }}>VERIFIED REGISTRATION</div>
                      <div>Lake Side Academy ID Registry</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontStyle: 'italic', color: '#94A3B8' }}>Authorized Registrar</div>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>Directorate Office</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintCard}
                className="btn btn-primary"
                style={{ background: '#0B192C', borderColor: '#F59E0B', color: '#F59E0B', fontWeight: 800 }}
              >
                <Printer size={16} /> Print ID Card
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
