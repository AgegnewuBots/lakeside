import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import Modal from '../../components/Modal';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import { useTheme } from '../../context/ThemeContext';
import { Send, Smartphone, Users, CheckCircle2, AlertCircle, RefreshCw, Eye, Sparkles } from 'lucide-react';

export default function SMSBroadcastPage({ isDirectory = false }) {
  const { isDark } = useTheme();
  const [classes, setClasses] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [selectedBroadcastDetails, setSelectedBroadcastDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const notify = useNotify();

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('ALL'); // 'ALL', 'GRADE', 'SECTION'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [deduplicateParents, setDeduplicateParents] = useState(true);

  // Live Recipient Estimation
  const [estimates, setEstimates] = useState({
    total_students_selected: 0,
    total_unique_phones: 0,
    estimated_sms_count: 0
  });

  useEffect(() => {
    loadClassesAndBroadcasts();
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [targetType, selectedClassId, selectedSectionIds, deduplicateParents]);

  const loadClassesAndBroadcasts = async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/sms/broadcasts')
      ]);
      setClasses(cRes);
      setBroadcasts(bRes);
    } catch (err) {
      notify.error(err.message || 'Failed to load SMS data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstimates = async () => {
    try {
      const classIds = selectedClassId ? [selectedClassId] : [];
      const res = await api.post('/sms/calculate-recipients', {
        target_type: targetType,
        class_ids: classIds,
        section_ids: selectedSectionIds,
        deduplicate_parents: deduplicateParents
      });
      setEstimates(res);
    } catch (err) {
      console.error('Recipient calculation error:', err);
    }
  };

  const handleToggleSection = (sId) => {
    setSelectedSectionIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      notify.error('Title and message text are required.');
      return;
    }

    if (estimates.total_unique_phones === 0) {
      notify.error('No recipients match the selected criteria.');
      return;
    }

    setIsSending(true);
    try {
      const classIds = selectedClassId ? [selectedClassId] : [];
      const res = await api.post('/sms/broadcast', {
        title,
        message,
        target_type: targetType,
        class_ids: classIds,
        section_ids: selectedSectionIds,
        deduplicate_parents: deduplicateParents
      });

      notify.success(res.message || 'SMS broadcast sent successfully!');
      setTitle('');
      setMessage('');
      loadClassesAndBroadcasts();
    } catch (err) {
      notify.error(err.message || 'Failed to dispatch SMS broadcast.');
    } finally {
      setIsSending(false);
    }
  };

  const handleViewBroadcastDetails = async (id) => {
    try {
      const res = await api.get(`/sms/broadcasts/${id}`);
      setSelectedBroadcastDetails(res);
    } catch (err) {
      notify.error(err.message || 'Failed to load broadcast recipients.');
    }
  };

  const handleRetryRecipient = async (recipientId) => {
    try {
      await api.post(`/sms/retry/${recipientId}`, {});
      notify.success('SMS redelivery scheduled.');
      if (selectedBroadcastDetails) {
        handleViewBroadcastDetails(selectedBroadcastDetails.broadcast.id);
      }
    } catch (err) {
      notify.error(err.message || 'Retry failed.');
    }
  };

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClassId));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={26} color="#2563EB" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              SMS Broadcast Center
            </h2>
          </div>
          <p style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Broadcast notices, emergency announcements, and official school circulars to parent phones
          </p>
        </div>
      </div>

      {/* Broadcast Composer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Composer Card */}
        <div className="card" style={{
          background: isDark ? '#111827' : '#FFFFFF',
          border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0',
          borderTop: '4px solid #2563EB'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '1.25rem' }}>
            Compose Parent SMS Broadcast
          </h3>

          <form onSubmit={handleSendBroadcast}>
            <div className="form-group">
              <label className="form-label">Broadcast Title (Internal Reference)</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. End of Term Parent Teacher Conference"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Recipient Scope</label>
              <select
                className="form-control"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setSelectedSectionIds([]);
                }}
              >
                <option value="ALL">Whole School (All Enrolled Parents)</option>
                <option value="GRADE">Specific Grade Level / KG</option>
                <option value="SECTION">Custom Sections</option>
              </select>
            </div>

            {targetType !== 'ALL' && (
              <div className="form-group">
                <label className="form-label">Select Class / Grade</label>
                <select
                  className="form-control"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionIds([]);
                  }}
                  required
                >
                  <option value="">-- Choose Class / Grade --</option>
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
            )}

            {targetType === 'SECTION' && selectedClassObj && (
              <div className="form-group">
                <label className="form-label">Select Target Sections</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {selectedClassObj.sections?.map(s => {
                    const isChecked = selectedSectionIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.85rem',
                          background: isChecked ? (isDark ? 'rgba(37,99,235,0.2)' : '#EFF6FF') : (isDark ? '#151F32' : '#F8FAFC'),
                          border: `1px solid ${isChecked ? '#2563EB' : (isDark ? '#2A364F' : '#CBD5E1')}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: isDark ? '#F1F5F9' : '#0F172A'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSection(s.id)}
                        />
                        <span>{s.full_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">SMS Message Content</label>
              <textarea
                className="form-control"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dear Parents, please be informed that..."
                required
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', marginTop: '0.35rem' }}>
                <span>Standard SMS length: 160 characters</span>
                <span style={{ fontWeight: 700, color: message.length > 160 ? '#D97706' : '#2563EB' }}>
                  {message.length} chars ({Math.ceil(message.length / 160) || 1} SMS unit)
                </span>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deduplicateParents}
                onChange={(e) => setDeduplicateParents(e.target.checked)}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isDark ? '#CBD5E1' : '#334155' }}>
                Deduplicate parent phone numbers (Avoid sending duplicate SMS if parent has multiple kids in school)
              </span>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={isSending || estimates.total_unique_phones === 0}
            >
              <Send size={18} />
              <span>{isSending ? 'Dispatching SMS Broadcast...' : `Send SMS to ${estimates.total_unique_phones} Parents`}</span>
            </button>
          </form>
        </div>

        {/* Live Delivery Preview & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Recipient Counter Card */}
          <div className="card" style={{ background: isDark ? '#111827' : '#F8FAFC', border: isDark ? '1px solid #1E293B' : '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Audience Calculation
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: isDark ? '#1A2234' : '#FFFFFF', borderRadius: '8px', border: isDark ? '1px solid #2A364F' : '1px solid #E2E8F0' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem' }}>Selected Students:</span>
                <strong style={{ fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#0F172A' }}>{estimates.total_students_selected}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: isDark ? '#1A2234' : '#FFFFFF', borderRadius: '8px', border: isDark ? '1px solid #2A364F' : '1px solid #E2E8F0' }}>
                <span style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '0.9rem' }}>Parent Phone Numbers:</span>
                <strong style={{ fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#0F172A' }}>{estimates.total_unique_phones}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderRadius: '8px', border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #FCD34D' }}>
                <span style={{ color: isDark ? '#FBBF24' : '#92400E', fontWeight: 700, fontSize: '0.9rem' }}>Estimated SMS Count:</span>
                <strong style={{ fontSize: '1.2rem', color: isDark ? '#FBBF24' : '#B45309' }}>
                  {estimates.estimated_sms_count * (Math.ceil(message.length / 160) || 1)}
                </strong>
              </div>
            </div>
          </div>

          {/* Simulated Mobile Phone Preview */}
          <div className="card" style={{ background: '#0F172A', color: '#FFFFFF', border: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8' }}>SMS HANDSET PREVIEW</span>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>● LAKESIDE SENDER ID</span>
            </div>

            <div style={{ background: '#1E293B', borderRadius: '12px', padding: '1rem', minHeight: '90px', borderLeft: '3px solid #2563EB' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>Sender: LAKESIDE</div>
              <div style={{ fontSize: '0.9rem', color: '#F8FAFC', lineHeight: 1.5 }}>
                {message || <span style={{ color: '#64748B', fontStyle: 'italic' }}>Write your SMS announcement above to see a live preview here...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcasts History Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Past SMS Broadcasts & Delivery History</h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Title</th>
                <th>Sender</th>
                <th>Target Scope</th>
                <th>Recipients</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(b => (
                <tr key={b.id}>
                  <td style={{ fontSize: '0.825rem', fontFamily: 'monospace', color: isDark ? '#94A3B8' : '#64748B', whiteSpace: 'nowrap' }}>
                    {formatToEthiopian(b.created_at, 'long')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>{b.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.message_template}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.sender_name || 'System'}</div>
                    <div style={{ fontSize: '0.725rem', color: '#94A3B8', textTransform: 'uppercase' }}>{b.sender_role}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{b.target_type}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                      {b.sent_count} / {b.total_recipients}
                    </div>
                    {b.failed_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>{b.failed_count} failed</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleViewBroadcastDetails(b.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
                    >
                      <Eye size={13} /> View Delivery Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Recipients Status Modal */}
      {selectedBroadcastDetails && (
        <Modal
          isOpen={!!selectedBroadcastDetails}
          onClose={() => setSelectedBroadcastDetails(null)}
          title={`Delivery Report: ${selectedBroadcastDetails.broadcast.title}`}
          maxWidth="800px"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#EFF6FF', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 600 }}>Total Recipients</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E3E62' }}>{selectedBroadcastDetails.broadcast.total_recipients}</div>
            </div>
            <div style={{ background: '#ECFDF5', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: 600 }}>Delivered</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>{selectedBroadcastDetails.broadcast.sent_count}</div>
            </div>
            <div style={{ background: '#FEE2E2', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 600 }}>Failed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B91C1C' }}>{selectedBroadcastDetails.broadcast.failed_count}</div>
            </div>
            <div style={{ background: '#F1F5F9', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Status</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>{selectedBroadcastDetails.broadcast.status}</div>
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent / Guardian</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedBroadcastDetails.recipients.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.student_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{r.class_section || ''}</div>
                    </td>
                    <td>{r.parent_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.phone_number}</td>
                    <td>
                      <span className={`badge ${
                        r.status === 'Delivered' ? 'badge-success' :
                        r.status === 'Sent' ? 'badge-primary' : 'badge-danger'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'Failed' && (
                        <button
                          onClick={() => handleRetryRecipient(r.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
