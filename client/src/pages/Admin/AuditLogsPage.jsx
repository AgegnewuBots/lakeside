import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import DiffViewer from '../../components/DiffViewer';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import { ShieldAlert, Eye, Filter, Search, History, RefreshCw, Lock } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const notify = useNotify();

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchUser, actionFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchUser.trim()) params.append('search', searchUser.trim());
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);
      params.append('limit', '150');

      const res = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={28} color="#EF4444" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>
              Security & Audit Logs
            </h2>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Track system changes, user authentications, student modifications, and mark adjustments across your school.
          </p>
        </div>

        <button onClick={loadLogs} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search User / Action</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search user, admin, teacher..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter by Action</label>
            <select
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">-- All Actions --</option>
              <option value="LOGIN">LOGIN</option>
              <option value="FAILED_LOGIN">FAILED_LOGIN</option>
              <option value="ADJUST_MARK">ADJUST_MARK</option>
              <option value="BATCH_ENTER_MARKS">BATCH_ENTER_MARKS</option>
              <option value="REGISTER_NEW_STUDENT">REGISTER_NEW_STUDENT</option>
              <option value="PROMOTE_STUDENT">PROMOTE_STUDENT</option>
              <option value="UPDATE_STUDENT">UPDATE_STUDENT</option>
              <option value="UPDATE_USER_PERMISSIONS">UPDATE_USER_PERMISSIONS</option>
              <option value="SEND_SMS_BROADCAST">SEND_SMS_BROADCAST</option>
              <option value="DISPATCH_RESULT_SMS">DISPATCH_RESULT_SMS</option>
              <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Filter by Entity Type</label>
            <select
              className="form-control"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">-- All Entity Types --</option>
              <option value="AUTH">AUTH</option>
              <option value="STUDENT">STUDENT</option>
              <option value="MARK">MARK</option>
              <option value="TEACHER">TEACHER</option>
              <option value="USER_PERMISSIONS">USER_PERMISSIONS</option>
              <option value="SMS_BROADCAST">SMS_BROADCAST</option>
              <option value="SETTINGS">SETTINGS</option>
            </select>
          </div>

          {(searchUser || actionFilter || entityFilter) && (
            <div>
              <button
                onClick={() => { setSearchUser(''); setActionFilter(''); setEntityFilter(''); }}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>IP Address</th>
              <th>State Diff</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.825rem', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>
                  {formatToEthiopian(log.created_at, 'long')}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{log.user_name}</div>
                  <div style={{ fontSize: '0.725rem', color: '#94A3B8', textTransform: 'uppercase' }}>{log.user_role}</div>
                </td>
                <td>
                  <span className={`badge ${
                    log.action.includes('FAILED') ? 'badge-danger' :
                    log.action.includes('LOGIN') ? 'badge-primary' :
                    log.action.includes('ADJUST') ? 'badge-warning' :
                    log.action.includes('DELETE') ? 'badge-danger' : 'badge-slate'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.entity_type}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {log.entity_id ? `ID: ${log.entity_id}` : '—'}
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
                  {log.ip_address}
                </td>
                <td>
                  {(log.old_values_parsed || log.new_values_parsed) ? (
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      <Eye size={13} /> View Diff
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No Diff</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record: ${selectedLog.action} (#${selectedLog.id})`}
          maxWidth="750px"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748B' }}>User Actor:</span> <strong>{selectedLog.user_name} ({selectedLog.user_role})</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Recorded At:</span> <strong style={{ fontFamily: 'monospace' }}>{formatToEthiopian(selectedLog.created_at, 'long')}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>Entity:</span> <strong>{selectedLog.entity_type} #{selectedLog.entity_id}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>IP Address:</span> <code>{selectedLog.ip_address}</code>
            </div>
          </div>

          <DiffViewer
            oldValues={selectedLog.old_values_parsed}
            newValues={selectedLog.new_values_parsed}
            title="State Transition Diff (Old vs New Values)"
          />
        </Modal>
      )}
    </div>
  );
}
