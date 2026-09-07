import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Eye,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  CheckCircle2,
  X,
  UserCheck
} from 'lucide-react';

export default function StudentListPage({ onSelectStudent, onRegisterStudent }) {
  const { isDark } = useTheme();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [firstNameFilter, setFirstNameFilter] = useState('ALL'); // 'ALL', 'SAME_SECTION', 'SAME_GRADE', 'GLOBAL'
  
  // Sorting state
  const [sortField, setSortField] = useState('student_id');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const notify = useNotify();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        api.get('/students'),
        api.get('/academic/classes')
      ]);
      setStudents(studentsRes);
      setClasses(classesRes);
    } catch (err) {
      notify.error(err.message || 'Failed to load student records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper to extract first name
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.trim().split(/\s+/)[0].toLowerCase();
  };

  // Pre-calculate homonym counts across scopes
  const firstNameStats = useMemo(() => {
    const sectionCounts = {};
    const gradeCounts = {};
    const globalCounts = {};

    students.forEach(s => {
      const fn = getFirstName(s.full_name);
      if (!fn) return;

      globalCounts[fn] = (globalCounts[fn] || 0) + 1;

      const secKey = `${s.section_id}_${fn}`;
      sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;

      const grKey = `${s.class_id}_${fn}`;
      gradeCounts[grKey] = (gradeCounts[grKey] || 0) + 1;
    });

    return { sectionCounts, gradeCounts, globalCounts };
  }, [students]);

  const filteredAndSortedStudents = useMemo(() => {
    let list = [...students];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        s.student_id?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) ||
        s.parent_name?.toLowerCase().includes(q) ||
        s.parent_phone?.toLowerCase().includes(q) ||
        s.section_full_name?.toLowerCase().includes(q)
      );
    }

    // Class filter
    if (selectedClassId) {
      if (selectedClassId === 'ALL_KG') {
        list = list.filter(s => s.grade_level < 1 || (s.section_full_name && s.section_full_name.startsWith('KG')) || (s.class_name && s.class_name.startsWith('KG')));
      } else if (selectedClassId === 'ALL_PRIMARY') {
        list = list.filter(s => (s.grade_level >= 1 && s.grade_level <= 8) || (!s.section_full_name?.startsWith('KG')));
      } else {
        list = list.filter(s => String(s.class_id) === String(selectedClassId));
      }
    }

    // Section filter
    if (selectedSectionId) {
      list = list.filter(s => String(s.section_id) === String(selectedSectionId));
    }

    // Same First Name Filter
    if (firstNameFilter === 'SAME_SECTION') {
      list = list.filter(s => {
        const fn = getFirstName(s.full_name);
        return (firstNameStats.sectionCounts[`${s.section_id}_${fn}`] || 0) > 1;
      });
    } else if (firstNameFilter === 'SAME_GRADE') {
      list = list.filter(s => {
        const fn = getFirstName(s.full_name);
        return (firstNameStats.gradeCounts[`${s.class_id}_${fn}`] || 0) > 1;
      });
    } else if (firstNameFilter === 'GLOBAL') {
      list = list.filter(s => {
        const fn = getFirstName(s.full_name);
        return (firstNameStats.globalCounts[fn] || 0) > 1;
      });
    }

    // Sorting
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = aVal || 0;
      bVal = bVal || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [students, searchTerm, selectedClassId, selectedSectionId, selectedStatus, firstNameFilter, firstNameStats, sortField, sortOrder]);

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));

  return (
    <div>
      {/* Header Bar (Section 39) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={26} color="#0D9488" />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', margin: 0 }}>
              Students
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
            Manage all active and historical student records across Lake Side Academy.
          </p>
        </div>

        <button onClick={onRegisterStudent} className="btn btn-primary btn-sm" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
          <UserPlus size={15} /> Register Student
        </button>
      </div>

      {/* Filter & Search Toolbar (Section 39) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Active Year Badge */}
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

          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, parent name, or phone..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#CBD5E1' : '#64748B' }}>Class / Grade:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSectionId(''); }}
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

          {/* Section Filter */}
          {selectedClassObj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>Section:</span>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
              >
                <option value="">All Sections</option>
                {selectedClassObj.sections?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Same First Name Homonym Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>First Name:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              value={firstNameFilter}
              onChange={(e) => setFirstNameFilter(e.target.value)}
            >
              <option value="ALL">All Students</option>
              <option value="SAME_SECTION">Same First Name (In Same Section)</option>
              <option value="SAME_GRADE">Same First Name (In Same Grade)</option>
              <option value="GLOBAL">Same First Name (Globally Across School)</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedClassId || selectedSectionId || firstNameFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedClassId(''); setSelectedSectionId(''); setFirstNameFilter('ALL'); }}
              className="btn btn-secondary btn-sm"
            >
              Reset Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#0F766E', fontWeight: 700 }}>
              {filteredAndSortedStudents.length} Students
            </span>
            <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 800, background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              M: {filteredAndSortedStudents.filter(s => s.gender === 'Male').length}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#DB2777', fontWeight: 800, background: isDark ? 'rgba(219,39,119,0.15)' : '#FDF2F8', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              F: {filteredAndSortedStudents.filter(s => s.gender === 'Female').length}
            </span>
          </div>
        </div>
      </div>

      {/* Professional Data Table (Section 39) */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th 
                className="sortable" 
                onClick={() => handleSort('student_id')}
                style={{ width: '120px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Student ID
                  {sortField === 'student_id' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} color="#CBD5E1" />}
                </div>
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('full_name')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Student Full Name
                  {sortField === 'full_name' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} color="#CBD5E1" />}
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>Gender</th>
              <th 
                className="sortable" 
                onClick={() => handleSort('section_full_name')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Class & Section
                  {sortField === 'section_full_name' ? (sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} color="#CBD5E1" />}
                </div>
              </th>
              <th>Primary Guardian</th>
              <th>Contact Phone</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  Loading student roster...
                </td>
              </tr>
            ) : filteredAndSortedStudents.length > 0 ? (
              filteredAndSortedStudents.map(s => {
                const fn = getFirstName(s.full_name);
                const secCount = firstNameStats.sectionCounts[`${s.section_id}_${fn}`] || 0;
                const grCount = firstNameStats.gradeCounts[`${s.class_id}_${fn}`] || 0;
                const globCount = firstNameStats.globalCounts[fn] || 0;

                return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {s.full_name}
                        </div>
                        {secCount > 1 ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                            {secCount} Same Name in Section
                          </span>
                        ) : grCount > 1 ? (
                          <span className="badge badge-slate" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                            {grCount} Same Name in Grade
                          </span>
                        ) : globCount > 1 ? (
                          <span className="badge badge-slate" style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem' }}>
                            {globCount} Same Name in School
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                        DOB: {formatToEthiopian(s.date_of_birth, 'short')}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: s.gender === 'Female' ? '#DB2777' : '#2563EB',
                        background: isDark
                          ? (s.gender === 'Female' ? 'rgba(219,39,119,0.15)' : 'rgba(37,99,235,0.15)')
                          : (s.gender === 'Female' ? '#FDF2F8' : '#EFF6FF'),
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px'
                      }}>
                        {s.gender === 'Female' ? 'F' : s.gender === 'Male' ? 'M' : s.gender}
                      </span>
                    </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                      {s.section_full_name}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>{s.parent_name || '—'}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: isDark ? '#CBD5E1' : '#0F172A' }}>
                    {s.parent_phone || '—'}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => onSelectStudent(s.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        title="Open Complete 7-Tab Student Dossier"
                      >
                        <Eye size={13} color="#0D9488" /> View Record
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={32} color="#CBD5E1" />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B' }}>
                      {students.length === 0 ? 'No students registered in the academy directory yet (0)' : 'No students found matching current filters'}
                    </div>
                    {students.length === 0 && onRegisterStudent && (
                      <button onClick={onRegisterStudent} className="btn btn-primary btn-sm" style={{ marginTop: '0.25rem' }}>
                        <UserPlus size={14} /> Register New Student
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
