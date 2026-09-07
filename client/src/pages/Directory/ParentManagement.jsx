import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { useTheme } from '../../context/ThemeContext';
import { Users, UserPlus, Phone, Search, Link2, Plus, Eye } from 'lucide-react';

export default function ParentManagement({ onSelectStudent }) {
  const { isDark } = useTheme();
  const [parents, setParents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedParentForLink, setSelectedParentForLink] = useState(null);
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('Father');
  const notify = useNotify();

  const [viewChildrenParent, setViewChildrenParent] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    occupation: ''
  });

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    try {
      const res = await api.get('/parents');
      setParents(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load parents.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parents', formData);
      notify.success(`Parent '${formData.full_name}' added.`);
      setIsAddModalOpen(false);
      setFormData({ full_name: '', phone_number: '', occupation: '' });
      loadParents();
    } catch (err) {
      notify.error(err.message || 'Failed to add parent.');
    }
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    if (!selectedParentForLink || !linkStudentId) return;

    try {
      await api.post(`/parents/${selectedParentForLink.id}/link-student`, {
        student_id: linkStudentId.trim(),
        relationship: linkRelationship,
        is_primary: 1,
        sms_enabled: 1
      });
      notify.success('Student linked to parent successfully!');
      setSelectedParentForLink(null);
      setLinkStudentId('');
      loadParents();
    } catch (err) {
      notify.error(err.message || 'Failed to link student.');
    }
  };

  const filteredParents = parents.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone_number.includes(searchQuery)
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={26} color="#0D9488" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Parent & Guardian Directory
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Official parent contact registry and multi-student sibling associations
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
          <UserPlus size={18} /> Register Parent Contact
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parents by guardian name or phone number..."
          />
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Parents Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredParents.map(p => {
          const childCount = p.children?.length || 0;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                background: isDark ? '#111827' : '#FFFFFF',
                border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A', margin: '0 0 4px 0' }}>
                      {p.full_name}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>
                      {p.occupation || 'Primary Guardian'}
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {p.phone_number}
                  </span>
                </div>

                {/* Connected Children Pop-up Button */}
                <div style={{
                  background: isDark ? '#1E293B' : '#F1F5F9',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B' }}>
                      Family Students
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: childCount > 1 ? '#0D9488' : (isDark ? '#F1F5F9' : '#1E293B') }}>
                        {childCount === 0 ? '0 Linked Children' :
                         childCount === 1 ? '1 Connected Child' :
                         `${childCount} Connected Children`}
                      </span>
                      {(p.is_auto_family || childCount > 1) && (
                        <span className="badge badge-teal" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                          One Family (Auto-detected)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setViewChildrenParent(p)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                    disabled={childCount === 0}
                  >
                    View Records
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedParentForLink(p)}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Link2 size={14} /> Link Sibling / Child
              </button>
            </div>
          );
        })}
      </div>

      {/* Connected Children Pop-up Modal */}
      {viewChildrenParent && (
        <Modal
          isOpen={!!viewChildrenParent}
          onClose={() => setViewChildrenParent(null)}
          title={`Connected Children — ${viewChildrenParent.full_name} (${viewChildrenParent.phone_number})`}
          maxWidth="600px"
        >
          <div>
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '8px', color: '#0F766E', fontSize: '0.88rem' }}>
              Family Group: <strong>{viewChildrenParent.children?.length || 0} enrolled student(s)</strong> linked to this guardian phone number.
            </div>

            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Student Full Name</th>
                    <th>Enrolled Class</th>
                    <th>Relationship</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {viewChildrenParent.children && viewChildrenParent.children.length > 0 ? (
                    viewChildrenParent.children.map(c => (
                      <tr key={c.student_id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0D9488' }}>
                            {c.student_code}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {c.student_name}
                        </td>
                        <td>
                          <span className="badge badge-primary">
                            {c.class_section || 'Active'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-neutral">
                            {c.relationship || 'Child'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const sid = c.student_id;
                              setViewChildrenParent(null);
                              if (onSelectStudent) onSelectStudent(sid);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <Eye size={12} /> Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                        No connected children found for this guardian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setViewChildrenParent(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Parent Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Parent Contact"
      >
        <form onSubmit={handleCreateParent}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Alemu Bekele"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number (For SMS Notifications)</label>
              <input
                type="tel"
                className="form-control"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="e.g. 0911234567"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Occupation</label>
              <input
                type="text"
                className="form-control"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g. Civil Engineer"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
              Save Parent Contact
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Student Modal */}
      {selectedParentForLink && (
        <Modal
          isOpen={!!selectedParentForLink}
          onClose={() => setSelectedParentForLink(null)}
          title={`Link Student to Parent: ${selectedParentForLink.full_name}`}
        >
          <form onSubmit={handleLinkStudent}>
            <div className="form-group">
              <label className="form-label">Student ID (5-Digit Code or ID)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 10002"
                value={linkStudentId}
                onChange={(e) => setLinkStudentId(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Enter the 5-digit Student ID (e.g. 10001, 10002) of the sibling or child.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Relationship to Student</label>
              <select
                className="form-control"
                value={linkRelationship}
                onChange={(e) => setLinkRelationship(e.target.value)}
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setSelectedParentForLink(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#0D9488', borderColor: '#0D9488' }}>
                Confirm Link
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
