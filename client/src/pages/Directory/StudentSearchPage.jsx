import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import Modal from '../../components/Modal';
import { 
  Search, 
  Users, 
  Eye, 
  Filter, 
  X,
  GraduationCap,
  Phone,
  User,
  Calendar,
  Layers,
  Send
} from 'lucide-react';

export default function StudentSearchPage({ onSelectStudent }) {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);
  const notify = useNotify();

  useEffect(() => {
    Promise.all([
      api.get('/academic/classes'),
      api.get('/academic/years')
    ]).then(([cRes, yRes]) => {
      setClasses(cRes);
      setYears(yRes);
      const cur = yRes.find(y => y.is_current);
      if (cur) setSelectedYearId(cur.id);
    }).catch(() => {});
    
    // Initial fetch
    performSearch('');
  }, []);

  const performSearch = async (term, classId = selectedClassId, sectionId = selectedSectionId, yearId = selectedYearId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.append('q', term);
      if (classId) params.append('class_id', classId);
      if (sectionId) params.append('section_id', sectionId);
      if (yearId) params.append('academic_year_id', yearId);

      const data = await api.get(`/search/students?${params.toString()}`);
      setResults(data.students || []);
    } catch (err) {
      notify.error(err.message || 'Search query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(val, selectedClassId, selectedSectionId, selectedYearId);
    }, 180);
  };

  const handleClassChange = (e) => {
    const cid = e.target.value;
    setSelectedClassId(cid);
    setSelectedSectionId('');
    performSearch(searchTerm, cid, '', selectedYearId);
  };

  const handleSectionChange = (e) => {
    const sid = e.target.value;
    setSelectedSectionId(sid);
    performSearch(searchTerm, selectedClassId, sid, selectedYearId);
  };

  const handleYearChange = (e) => {
    const yid = e.target.value;
    setSelectedYearId(yid);
    performSearch(searchTerm, selectedClassId, selectedSectionId, yid);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedClassId('');
    setSelectedSectionId('');
    performSearch('', '', '', selectedYearId);
  };

  const handleOpenSmsModal = (student) => {
    setSmsStudent(student);
    setSmsMessage(`Dear Parent of ${student.full_name}, `);
  };

  const handleSendIndividualSms = async (e) => {
    e.preventDefault();
    if (!smsStudent?.parent_phone) {
      notify.error('This student does not have a recorded parent phone number.');
      return;
    }
    if (!smsMessage.trim()) {
      notify.error('Message text cannot be blank.');
      return;
    }

    setSmsSending(true);
    try {
      const res = await api.post('/sms/send-individual', {
        student_id: smsStudent.id,
        phone_number: smsStudent.parent_phone,
        message: smsMessage.trim()
      });
      notify.success(res.message || 'SMS sent successfully!');
      setSmsStudent(null);
      setSmsMessage('');
    } catch (err) {
      notify.error(err.message || 'Failed to dispatch SMS.');
    } finally {
      setSmsSending(false);
    }
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));

  return (
    <div>
      {/* Header Bar */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Search size={26} color="#0D9488" />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
            Directory Records Search
          </h2>
        </div>
        <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Real-time debounced registry lookup by student name, 5-digit ID, parent phone, or section.
        </p>
      </div>

      {/* Main Search Bar Card */}
      <div className="card" style={{ marginBottom: '1.75rem', borderTop: '4px solid #0D9488', padding: '1.5rem' }}>
        <div style={{ position: 'relative', width: '100%', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="form-control"
            style={{
              padding: '0.85rem 1.25rem 0.85rem 2.85rem',
              fontSize: '1.05rem',
              borderRadius: '10px',
              border: isDark ? '2px solid #2A364F' : '2px solid #CBD5E1',
              fontWeight: 500
            }}
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Search by Parent Phone (e.g. 09...), 5-digit ID (e.g. 10001), or Name..."
            autoFocus
          />
          <Search
            size={20}
            color="#0D9488"
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); performSearch('', selectedClassId, selectedSectionId, selectedYearId); }}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={selectedYearId}
              onChange={handleYearChange}
              style={{ fontSize: '0.88rem' }}
            >
              <option value="">All Academic Years</option>
              {years.map(y => (
                <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={selectedClassId}
              onChange={handleClassChange}
              style={{ fontSize: '0.88rem' }}
            >
              <option value="">All Classes</option>
              <option value="ALL_KG">All Kindergarten (KG 1–3)</option>
              <option value="ALL_PRIMARY">All Primary (Grades 1–8)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedClassObj && (
            <div style={{ minWidth: '150px' }}>
              <select
                className="form-control"
                value={selectedSectionId}
                onChange={handleSectionChange}
                style={{ fontSize: '0.88rem' }}
              >
                <option value="">All Sections</option>
                {selectedClassObj.sections?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {(searchTerm || selectedClassId || selectedSectionId) && (
            <button onClick={handleClear} className="btn btn-secondary btn-sm">
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#0D9488', fontWeight: 700 }}>
            {loading ? 'Searching...' : `Found ${results.length} students`}
          </div>
        </div>
      </div>

      {/* Instant Search Results Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Student ID</th>
              <th>Student Full Name</th>
              <th>Gender</th>
              <th>Class & Section</th>
              <th>Parent / Guardian</th>
              <th>Parent Phone</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.length > 0 ? (
              results.map(s => (
                <tr key={s.id}>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: '#0D9488',
                      background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
                    }}>
                      {s.student_id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {s.full_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                      DOB: {formatToEthiopian(s.date_of_birth, 'short')}
                    </div>
                  </td>
                  <td>{s.gender}</td>
                  <td>
                    <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                      {s.section_full_name}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>{s.parent_name || '—'}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#CBD5E1' : '#0F172A' }}>
                    {s.parent_phone || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                      {s.parent_phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenSmsModal(s)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.25rem 0.55rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#0D9488',
                            borderColor: isDark ? 'rgba(13,148,136,0.3)' : '#99F6E4'
                          }}
                          title={`Send individual SMS to ${s.parent_phone}`}
                        >
                          <Send size={13} /> Send SMS
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectStudent(s.id)}
                        className="btn btn-primary btn-sm"
                        style={{ background: '#0D9488', borderColor: '#0D9488', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Eye size={13} /> Dossier
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: '#94A3B8' }}>
                  {loading ? 'Searching records...' : `No records match your query "${searchTerm}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Individual Parent SMS Modal */}
      {smsStudent && (
        <Modal
          isOpen={!!smsStudent}
          onClose={() => setSmsStudent(null)}
          title={`Send Individual SMS — Parent of ${smsStudent.full_name}`}
        >
          <form onSubmit={handleSendIndividualSms}>
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: isDark ? '#1E293B' : '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Recipient Phone:</span>
                <strong style={{ fontFamily: 'monospace', color: '#0D9488' }}>{smsStudent.parent_phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Student:</span>
                <strong>{smsStudent.full_name} (#{smsStudent.student_id})</strong>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                SMS Message Text <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>(Supports manual Amharic or English typing)</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type SMS in English or Amharic (e.g. ውድ ወላጅ ወይም Dear Parent)..."
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                <span>Length: {smsMessage.length} chars (~{Math.ceil(smsMessage.length / 160) || 1} SMS)</span>
                <span>Gateway: Ethio Telecom via SMSEthiopia</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSmsStudent(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={smsSending}
                style={{ background: '#0D9488', borderColor: '#0D9488', fontWeight: 800 }}
              >
                <Send size={15} />
                <span>{smsSending ? 'Sending SMS...' : 'Send SMS Now'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
