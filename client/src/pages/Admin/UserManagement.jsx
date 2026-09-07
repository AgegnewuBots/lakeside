import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { Users, UserPlus, KeyRound, Check, X, Shield, Lock, Phone, Mail, Edit2 } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
  const [userPermsState, setUserPermsState] = useState([]);
  const notify = useNotify();

  // New user form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'records',
    phone: '',
    qualification: '' // for teachers
  });

  // Edit user & Reset password state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    full_name: '',
    role: 'records',
    phone: '',
    new_password: ''
  });

  useEffect(() => {
    loadUsersAndPerms();
  }, []);

  const loadUsersAndPerms = async () => {
    try {
      const [usersRes, catalogRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/permissions-catalog')
      ]);
      setUsers(usersRes);
      setPermissionsCatalog(catalogRes);
    } catch (err) {
      notify.error(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (formData.role === 'teacher') {
        await api.post('/teachers', {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          qualification: formData.qualification
        });
      } else {
        await api.post('/users', formData);
      }
      notify.success(`User '${formData.username}' created successfully!`);
      setIsAddModalOpen(false);
      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'records',
        phone: '',
        qualification: ''
      });
      loadUsersAndPerms();
    } catch (err) {
      notify.error(err.message || 'Failed to create user.');
    }
  };

  const handleOpenPermsModal = (user) => {
    setSelectedUserForPerms(user);
    setUserPermsState(user.permissions || []);
  };

  const handleTogglePerm = (code) => {
    setUserPermsState(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSavePerms = async () => {
    try {
      await api.put(`/users/${selectedUserForPerms.id}/permissions`, {
        permissions: userPermsState
      });
      notify.success(`Permissions updated for '${selectedUserForPerms.username}'.`);
      setSelectedUserForPerms(null);
      loadUsersAndPerms();
    } catch (err) {
      notify.error(err.message || 'Failed to update permissions.');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.put(`/users/${user.id}/status`, {
        is_active: !user.is_active
      });
      notify.success(`User status updated.`);
      loadUsersAndPerms();
    } catch (err) {
      notify.error(err.message || 'Failed to update user status.');
    }
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setEditFormData({
      username: u.username || '',
      full_name: u.full_name || '',
      role: u.role || 'records',
      phone: u.phone || '',
      new_password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.username.trim() || !editFormData.full_name.trim()) {
      notify.error('Username and full name are required.');
      return;
    }

    try {
      const payload = {
        username: editFormData.username.trim(),
        full_name: editFormData.full_name.trim(),
        role: editFormData.role,
        phone: editFormData.phone.trim() || null
      };
      if (editFormData.new_password.trim()) {
        payload.new_password = editFormData.new_password.trim();
      }

      const res = await api.put(`/users/${editingUser.id}`, payload);
      notify.success(res.message || `User '${payload.username}' updated successfully!`);
      setIsEditModalOpen(false);
      setEditingUser(null);
      loadUsersAndPerms();
    } catch (err) {
      notify.error(err.message || 'Failed to update user account.');
    }
  };

  // Group catalog permissions by category
  const categories = Array.from(new Set(permissionsCatalog.map(p => p.category)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>Staff & User Accounts</h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Manage administrative staff, registrars, and faculty credentials
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <UserPlus size={18} /> Add New Account
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone Number</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>@{u.username}</div>
                </td>
                <td>
                  <span className={`badge ${
                    u.role === 'admin' ? 'badge-primary' :
                    u.role === 'director' ? 'badge-gold' :
                    u.role === 'records' ? 'badge-success' :
                    u.role === 'teacher' ? 'badge-secondary' : 'badge-neutral'
                  }`}>
                    {u.role === 'director' ? 'DIRECTOR' :
                     u.role === 'records' ? 'RECORDS' :
                     u.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#1E293B', fontFamily: 'monospace' }}>
                    {u.phone || '—'}
                  </div>
                </td>
                <td>
                  {u.role === 'admin' && (
                    <span className="badge badge-primary">Full System Access</span>
                  )}
                  {(u.role === 'directory' || u.role === 'director' || u.role === 'records') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F766E' }}>
                        {u.permissions?.length || 0} active grants
                      </span>
                      <button
                        onClick={() => handleOpenPermsModal(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <KeyRound size={13} /> Configure
                      </button>
                    </div>
                  )}
                  {u.role === 'teacher' && (
                    <span style={{ fontSize: '0.8rem', color: '#6D28D9', fontStyle: 'italic' }}>
                      Assigned classes & subjects
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      title="Edit User & Reset Password"
                    >
                      <Edit2 size={13} /> Edit / Reset Pass
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New User Account"
      >
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="records">Records Office (Registrar & Admissions)</option>
              <option value="director">School Director (Director Portal)</option>
              <option value="teacher">Faculty Teacher (Teacher Workspace)</option>
              <option value="admin">Administrator (Full Sovereignty)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Sister Martha or Mr. Daniel"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. dmulugeta"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input
                type="password"
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 91 234 5678"
                required
              />
            </div>
          </div>

          {formData.role === 'teacher' && (
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input
                type="text"
                className="form-control"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. B.Ed in Mathematics"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure Granular Permissions Modal */}
      {selectedUserForPerms && (
        <Modal
          isOpen={!!selectedUserForPerms}
          onClose={() => setSelectedUserForPerms(null)}
          title={`Configure Permissions: ${selectedUserForPerms.full_name} (@${selectedUserForPerms.username})`}
          maxWidth="750px"
          footer={
            <>
              <button onClick={() => setSelectedUserForPerms(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSavePerms} className="btn btn-primary">Save Permission Grants</button>
            </>
          }
        >
          <div style={{ marginBottom: '1rem', color: '#64748B', fontSize: '0.9rem' }}>
            Admin controls which actions Directory users can perform. Checked permissions are granted.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
            {categories.map(cat => {
              const catPerms = permissionsCatalog.filter(p => p.category === cat);
              return (
                <div key={cat} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cat} Permissions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.6rem' }}>
                    {catPerms.map(p => {
                      const isChecked = userPermsState.includes(p.code);
                      return (
                        <label
                          key={p.code}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.6rem',
                            padding: '0.5rem 0.75rem',
                            background: isChecked ? '#F0FDFA' : '#FFFFFF',
                            border: `1px solid ${isChecked ? '#14B8A6' : '#CBD5E1'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePerm(p.code)}
                            style={{ marginTop: '0.2rem' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isChecked ? '#0F766E' : '#1E293B' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                              {p.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Edit User Account & Reset Password Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Account: ${editingUser?.full_name} (@${editingUser?.username})`}
        >
          <form onSubmit={handleSaveUserEdit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Login Username</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                User logs in with this unique username
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">System Role</label>
              <select
                className="form-control"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                disabled={editingUser?.username === 'admin'}
              >
                <option value="records">Records Office (Registrar & Admissions)</option>
                <option value="director">School Director (Director Portal)</option>
                <option value="teacher">Faculty Teacher (Teacher Workspace)</option>
                <option value="admin">Administrator (Full Sovereignty)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="0911234567"
              />
            </div>

            {/* Direct Password Reset */}
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <KeyRound size={15} /> Reset User Password (Optional)
              </label>
              <input
                type="text"
                className="form-control"
                style={{ background: '#FFFFFF', borderColor: '#F59E0B' }}
                value={editFormData.new_password}
                onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                placeholder="Leave blank to keep current password unchanged"
              />
              <span style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '4px', display: 'block' }}>
                As administrator, entering a new password here will immediately reset and hash their login credentials.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Account Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
