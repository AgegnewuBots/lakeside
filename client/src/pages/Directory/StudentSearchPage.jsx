import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
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
  Layers
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

      {/* Main Search Bar Card (Section 38) */}
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
            placeholder="Search by 5-digit ID (e.g. 10001), Name (e.g. Han), Parent Phone..."
            autoFocus
          />
          <Search
            size={20}
            color="#0D9488"
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Clean Filter Bar (Auto-current active year, Class / Grade optgroups) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              background: isDark ? 'rgba(13,148,136,0.15)' : '#F0FDFA',
              color: '#0D9488',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: isDark ? '1px solid rgba(13,148,136,0.3)' : '1px solid #CCFBF1'
            }}>
              Year: 2018 E.C. (Active)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#CBD5E1' : '#64748B' }}>Class / Grade:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">All Classes & Grades (KG 1 - Grade 8)</option>
              <option value="ALL_KG">All Kindergarten (KG 1 - KG 3)</option>
              <option value="ALL_PRIMARY">All Primary Grades (Grade 1 - Grade 8)</option>
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

          {selectedClassObj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#CBD5E1' : '#64748B' }}>Section:</span>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                value={selectedSectionId}
                onChange={handleSectionChange}
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
                    <button
                      onClick={() => onSelectStudent(s.id)}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0D9488', borderColor: '#0D9488', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} /> Open 7-Tab Dossier
                    </button>
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
    </div>
  );
}
