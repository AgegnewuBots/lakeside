import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNotify } from '../../context/NotificationContext';
import { formatToEthiopian } from '../../utils/ethiopianDate';
import { 
  Smartphone, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  Search, 
  User, 
  MessageSquare,
  Sparkles,
  Phone
} from 'lucide-react';

export default function ParentSMSSimulator() {
  const [feed, setFeed] = useState([]);
  const [parents, setParents] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    loadSimulatorData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadFeedSilently();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadSimulatorData = async () => {
    setLoading(true);
    try {
      const [feedRes, parentsRes] = await Promise.all([
        api.get('/sms/simulator/feed'),
        api.get('/sms/simulator/parents')
      ]);
      setFeed(feedRes);
      setParents(parentsRes);
      if (parentsRes.length > 0 && !selectedPhone) {
        setSelectedPhone(parentsRes[0].phone);
      }
    } catch (err) {
      notify.error(err.message || 'Failed to connect to Parent SMS Gateway simulator.');
    } finally {
      setLoading(false);
    }
  };

  const loadFeedSilently = async () => {
    try {
      const feedRes = await api.get('/sms/simulator/feed');
      setFeed(feedRes);
    } catch (err) {
      // Silent error during polling
    }
  };

  const handleRetry = async (recipientId) => {
    setRetryingId(recipientId);
    try {
      const res = await api.post(`/sms/retry/${recipientId}`, {});
      notify.success(res.message || 'SMS re-sent successfully!');
      loadSimulatorData();
    } catch (err) {
      notify.error(err.message || 'Failed to re-send SMS.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleSyncStatus = async (recipientId) => {
    setSyncingId(recipientId);
    try {
      const res = await api.get(`/sms/sync-status/${recipientId}`);
      if (res.synced) {
        notify.success(`Status verified from SMSEthiopia gateway: ${res.liveStatus.status}`);
      } else {
        notify.info(res.message || 'No external gateway ID recorded');
      }
      loadSimulatorData();
    } catch (err) {
      notify.error(err.message || 'Failed to sync with gateway');
    } finally {
      setSyncingId(null);
    }
  };

  const filteredFeed = feed.filter(item => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch = !searchQuery || 
      item.recipient_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.parent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message_content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedParentFeed = feed.filter(item => item.recipient_phone === selectedPhone);
  const currentParentObj = parents.find(p => p.phone === selectedPhone);

  const stats = {
    total: feed.length,
    delivered: feed.filter(f => f.status === 'DELIVERED').length,
    sent: feed.filter(f => f.status === 'SENT').length,
    failed: feed.filter(f => f.status === 'FAILED').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Smartphone size={28} color="#1E3A8A" />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>
              Parent SMS Gateway Simulator
            </h2>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
              <Sparkles size={12} /> Real-time Handset Emulation
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Parents do not need an account or app login. All results, notices, and class updates arrive directly on their phones.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer', background: '#F1F5F9', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-sync (5s)
          </label>
          <button
            className="btn btn-secondary"
            onClick={loadSimulatorData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Carrier Gateway Active Banner */}
      <div style={{
        background: '#0B192C',
        color: '#FFFFFF',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid #1E293B',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FCD34D' }}>
              Carrier Gateway: SMSEthiopia API v2 (Live Ethio Telecom Connection)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
              Endpoint: https://smsethiopia.com/api/v2/sms/send • Normalized to 2519XXXXXXXX • Real ULID Tracking
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Online & Authenticated</span>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #1E3A8A' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Dispatched SMS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1E3A8A' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Delivered to Handset</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{stats.delivered}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Gateway Sent / In Transit</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563EB' }}>{stats.sent}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Failed Carrier Transmissions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626' }}>{stats.failed}</div>
        </div>
      </div>

      {/* Main Grid: Live Phone Handset Emulation (Left) & Full Gateway Log (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Mobile Phone Mockup */}
        <div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Select Parent Handset to Preview:</label>
            <select
              className="form-control"
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {parents.map(p => (
                <option key={p.phone} value={p.phone}>
                  {p.name} ({p.phone}) — {p.students?.length || 0} student(s)
                </option>
              ))}
            </select>
          </div>

          {/* Physical Phone Shell */}
          <div style={{
            width: '100%',
            maxWidth: '380px',
            background: '#0F172A',
            borderRadius: '40px',
            padding: '12px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '4px solid #334155'
          }}>
            {/* Screen Glass */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '30px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '560px'
            }}>
              {/* Phone Status Bar */}
              <div style={{
                background: '#1E293B',
                color: '#FFF',
                padding: '6px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <span>09:41</span>
                <div style={{
                  width: '90px',
                  height: '16px',
                  background: '#000',
                  borderRadius: '10px'
                }} />
                <span>5G 98%</span>
              </div>

              {/* Chat Header */}
              <div style={{
                background: '#FFF',
                borderBottom: '1px solid #E2E8F0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '2px solid #0B192C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  <img src="/logo.png" alt="Lake Side Academy Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                    Lake Side Academy
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    Official EthioTelecom SMS Sender
                  </div>
                </div>
              </div>

              {/* Recipient Details Sub-bar */}
              {currentParentObj && (
                <div style={{ background: '#EFF6FF', padding: '6px 12px', borderBottom: '1px solid #DBEAFE', fontSize: '0.75rem', color: '#1E40AF' }}>
                  <strong>Handset Owner:</strong> {currentParentObj.name} ({currentParentObj.phone})
                  <br />
                  <span style={{ color: '#4B5563' }}>Children enrolled: {currentParentObj.students?.map(s => s.full_name).join(', ')}</span>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div style={{
                flex: 1,
                padding: '14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#F1F5F9'
              }}>
                {selectedParentFeed.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '3rem', fontSize: '0.85rem' }}>
                    <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    No SMS messages received yet on this phone number.
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Try sending a broadcast or Result SMS from Admin, Directory, or Teacher portal!
                    </p>
                  </div>
                ) : (
                  selectedParentFeed.map(item => {
                    const isResult = item.broadcast_type === 'RESULT';
                    const isDelivered = item.status === 'DELIVERED';
                    const isFailed = item.status === 'FAILED';

                    return (
                      <div
                        key={item.id}
                        style={{
                          alignSelf: 'flex-start',
                          maxWidth: '92%',
                          background: isFailed ? '#FEF2F2' : '#FFFFFF',
                          border: isFailed ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                          borderRadius: '16px 16px 16px 4px',
                          padding: '10px 14px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: isResult ? '#B45309' : '#1E3A8A',
                            background: isResult ? '#FEF3C7' : '#DBEAFE',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {isResult ? 'RESULT SMS' : 'ANNOUNCEMENT'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                          {item.message_content}
                        </div>

                        {item.provider_message_id && (
                          <div style={{ fontSize: '0.68rem', color: '#D97706', marginTop: '6px', fontFamily: 'monospace' }}>
                            ULID: {item.provider_message_id} ({item.segments || 1} seg)
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', fontSize: '0.7rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isDelivered && <CheckCircle2 size={12} color="#059669" />}
                            {isFailed && <AlertTriangle size={12} color="#EF4444" />}
                            {!isDelivered && !isFailed && <Clock size={12} color="#3B82F6" />}
                            <span style={{ fontWeight: 600, color: isDelivered ? '#059669' : isFailed ? '#EF4444' : '#3B82F6' }}>
                              {item.provider_status || item.status}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            {item.provider_message_id && (
                              <button
                                onClick={() => handleSyncStatus(item.id)}
                                disabled={syncingId === item.id}
                                style={{
                                  border: '1px solid #CBD5E1',
                                  background: '#FFF',
                                  color: '#334155',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="Sync live status from SMSEthiopia gateway"
                              >
                                <RefreshCw size={10} className={syncingId === item.id ? 'animate-spin' : ''} />
                                Sync
                              </button>
                            )}

                            {isFailed && (
                              <button
                                onClick={() => handleRetry(item.id)}
                                disabled={retryingId === item.id}
                                style={{
                                  border: 'none',
                                  background: '#EF4444',
                                  color: '#FFF',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {retryingId === item.id ? 'Retrying...' : 'Retry'}
                              </button>
                            )}
                          </div>
                        </div>

                        {item.error_message && (
                          <div style={{ fontSize: '0.65rem', color: '#B91C1C', marginTop: '4px' }}>
                            Error: {item.error_message}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Emulated Bottom Bar */}
              <div style={{ background: '#FFF', padding: '8px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '120px', height: '4px', background: '#CBD5E1', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Live Carrier Transmission Log (Right Side) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} color="#1E3A8A" />
              Carrier Transmission Feed
            </h3>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '10px', color: '#94A3B8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter phone/name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '26px', height: '34px', fontSize: '0.8rem', width: '180px' }}
                />
              </div>

              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ height: '34px', fontSize: '0.8rem', width: '130px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Parent Contact</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Message Body & ULID</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeed.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                      No matching carrier SMS records found.
                    </td>
                  </tr>
                ) : (
                  filteredFeed.map(item => {
                    const isDelivered = item.status === 'DELIVERED';
                    const isFailed = item.status === 'FAILED';

                    return (
                      <tr key={item.id}>
                        <td>
                          <span className={`badge ${isDelivered ? 'badge-success' : isFailed ? 'badge-danger' : 'badge-info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem' }}>
                            {isDelivered && <CheckCircle2 size={10} />}
                            {isFailed && <AlertTriangle size={10} />}
                            {!isDelivered && !isFailed && <Clock size={10} />}
                            {item.provider_status || item.status}
                          </span>
                        </td>
                        <td style={{ color: '#64748B', whiteSpace: 'nowrap', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {formatToEthiopian(item.created_at, 'long')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.parent_name || 'Guardian'}</div>
                          <div style={{ fontFamily: 'monospace', color: '#2563EB', fontSize: '0.75rem' }}>{item.recipient_phone}</div>
                        </td>
                        <td>
                          {item.student_name ? (
                            <div>
                              <span style={{ fontWeight: 600 }}>{item.student_name}</span>
                              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>ID: {item.student_id_number}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>Broadcast</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            {item.broadcast_type}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: '#334155' }}>
                            {item.message_content}
                          </div>
                          {item.provider_message_id && (
                            <div style={{ fontSize: '0.68rem', color: '#B45309', fontFamily: 'monospace', marginTop: '2px' }}>
                              ULID: {item.provider_message_id} ({item.segments || 1} seg)
                            </div>
                          )}
                          {item.error_message && (
                            <div style={{ color: '#DC2626', fontSize: '0.7rem', marginTop: '2px' }}>
                              Error: {item.error_message}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            {item.provider_message_id && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => handleSyncStatus(item.id)}
                                disabled={syncingId === item.id}
                                title="Sync live status from SMSEthiopia gateway"
                              >
                                <RefreshCw size={11} className={syncingId === item.id ? 'animate-spin' : ''} />
                                Sync
                              </button>
                            )}

                            {isFailed ? (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleRetry(item.id)}
                                disabled={retryingId === item.id}
                              >
                                <RotateCcw size={12} className={retryingId === item.id ? 'animate-spin' : ''} />
                                Retry
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setSelectedPhone(item.recipient_phone)}
                              >
                                View on Phone
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
